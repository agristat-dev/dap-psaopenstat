"""
Verify local CSV/SQLite matches OpenSTAT raw pulls and spot-check live API cells.

Run after `python -m scraping.pipeline` completes:
  python scripts/verify_openstat_accuracy.py
"""

from __future__ import annotations

import csv
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DATA = ROOT / "data"
RAW = DATA / "raw"
TOL = 1e-4


class CheckResult:
    def __init__(self, name: str):
        self.name = name
        self.ok = True
        self.notes: list[str] = []

    def fail(self, msg: str) -> None:
        self.ok = False
        self.notes.append(f"FAIL: {msg}")

    def info(self, msg: str) -> None:
        self.notes.append(msg)


def _load_csv_rows(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _norm_key_part(field: str, value: Any) -> Any:
    if value in (None, ""):
        return None
    if field in ("year", "quarter", "semester", "month", "is_aggregate"):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return value
    return value


def _row_key(row: dict, fields: list[str]) -> tuple:
    return tuple(_norm_key_part(f, row.get(f)) for f in fields)


def _float(v: Any) -> float | None:
    if v in (None, "", "..", "..."):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _compare_long_tables(
    result: CheckResult,
    *,
    rebuilt: list[dict],
    csv_path: Path,
    db_path: Path,
    table: str,
    key_fields: list[str],
    value_fields: list[str],
) -> None:
    if not csv_path.exists():
        result.fail(f"missing CSV {csv_path.name}")
        return
    on_disk = _load_csv_rows(csv_path)
    if len(rebuilt) != len(on_disk):
        result.fail(f"row count rebuilt={len(rebuilt):,} csv={len(on_disk):,}")
    else:
        result.info(f"row count {len(on_disk):,} matches reshape")

    def index(rows: list[dict]) -> dict[tuple, dict]:
        return {_row_key(r, key_fields): r for r in rows}

    rb = index(rebuilt)
    od = index(on_disk)
    if set(rb.keys()) != set(od.keys()):
        only_rb = len(set(rb) - set(od))
        only_od = len(set(od) - set(rb))
        result.fail(f"key mismatch vs CSV: only rebuilt={only_rb}, only csv={only_od}")
    else:
        mism = 0
        for k in rb:
            for vf in value_fields:
                a, b = _float(rb[k].get(vf)), _float(od[k].get(vf))
                if a is None and b is None:
                    continue
                if a is None or b is None or abs(a - b) > TOL:
                    mism += 1
                    if mism <= 3:
                        result.fail(f"CSV value {vf} @ {k}: rebuilt={a} csv={b}")
                    break
        if mism == 0:
            result.info("CSV values match reshape (all keys)")

    if not db_path.exists():
        result.fail(f"missing DB {db_path.name}")
        return
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    db_rows = [dict(r) for r in conn.execute(f"SELECT * FROM {table}")]
    conn.close()
    if len(db_rows) != len(rebuilt):
        result.fail(f"SQLite row count {len(db_rows):,} != rebuilt {len(rebuilt):,}")
    else:
        db_idx = index(db_rows)
        mism = 0
        for k, row in rb.items():
            if k not in db_idx:
                result.fail(f"SQLite missing key {k}")
                mism += 1
                continue
            for vf in value_fields:
                a, b = _float(row.get(vf)), _float(db_idx[k].get(vf))
                if a is None and b is None:
                    continue
                if a is None or b is None or abs(a - b) > TOL:
                    mism += 1
                    if mism <= 3:
                        result.fail(f"SQLite {vf} @ {k}: rebuilt={a} db={b}")
                    break
        if mism == 0:
            result.info(f"SQLite `{table}` matches reshape")


def _check_source_json(result: CheckResult, path: Path) -> None:
    if not path.exists():
        result.fail(f"missing {path.name}")
        return
    doc = json.loads(path.read_text(encoding="utf-8"))
    origin = doc.get("api_origin") or doc.get("source", "")
    if "openstat.psa.gov.ph" not in str(origin) and "openstat.psa.gov.ph" not in json.dumps(doc):
        result.fail(f"{path.name} does not reference OpenSTAT")
    else:
        result.info(f"{path.name} from OpenSTAT")


def check_palay() -> CheckResult:
    from scraping.fetch_palay import load_cached_observations
    from scraping.reshape_palay import FINAL_CSV, DB_PATH, JOIN_KEYS, combine_long

    result = CheckResult("palay/corn")
    _check_source_json(result, DATA / "palay_source.json")
    cached = load_cached_observations()
    if not cached:
        result.fail("no cached palay raw JSON")
        return result
    rebuilt = combine_long(cached["volume_rows"], cached["area_rows"])
    _compare_long_tables(
        result,
        rebuilt=rebuilt,
        csv_path=FINAL_CSV,
        db_path=DB_PATH,
        table="palay_long",
        key_fields=JOIN_KEYS,
        value_fields=["volume_mt", "area_ha"],
    )
    return result


def _check_horticulture(
    name: str,
    slug: str,
    source_name: str,
    module_name: str,
) -> CheckResult:
    mod = __import__(f"scraping.reshape_{module_name}", fromlist=["*"])

    result = CheckResult(name)
    _check_source_json(result, DATA / source_name)
    vol = RAW / f"{slug}_volume_obs.csv"
    area = RAW / f"{slug}_area_obs.csv"
    if not vol.exists() or not area.exists():
        result.fail("missing raw volume/area CSV")
        return result
    volume_rows = mod._read_obs_csv(vol)
    area_rows = mod._read_obs_csv(area)
    import inspect

    sig = inspect.signature(mod.combine_long)
    if len(sig.parameters) >= 3:
        rebuilt = mod.combine_long(volume_rows, area_rows, mod.classify_crop)
    else:
        rebuilt = mod.combine_long(volume_rows, area_rows)
    _compare_long_tables(
        result,
        rebuilt=rebuilt,
        csv_path=mod.FINAL_CSV,
        db_path=mod.DB_PATH,
        table=mod.LONG_TABLE,
        key_fields=mod.JOIN_KEYS,
        value_fields=["volume_mt", "area_ha"],
    )
    return result


def check_fruits() -> CheckResult:
    return _check_horticulture("fruits", "fruits", "fruits_source.json", "fruits")


def check_vegetables() -> CheckResult:
    return _check_horticulture("vegetables", "vegetables", "vegetables_source.json", "vegetables")


def check_industrial() -> CheckResult:
    return _check_horticulture("industrial", "industrial", "industrial_source.json", "industrial")


def check_livestock() -> CheckResult:
    from scraping.fetch_livestock import RAW_DIR, TABLES
    from scraping.reshape_livestock import (
        DB_PATH,
        FINAL_CSV,
        JOIN_KEYS,
        LONG_TABLE,
        transform_from_csvs,
    )

    result = CheckResult("livestock")
    _check_source_json(result, DATA / "livestock_source.json")
    paths = [RAW_DIR / f"{table.key}_obs.csv" for table in TABLES]
    missing = [p for p in paths if not p.exists()]
    if missing:
        result.fail(f"missing raw: {[p.name for p in missing[:5]]}")
        return result
    from scraping.reshape_livestock import _read_obs_csv, observations_to_long

    observations: list[dict[str, Any]] = []
    for path in paths:
        key = path.name.replace("_obs.csv", "")
        observations.extend(_read_obs_csv(path, key))
    rebuilt = observations_to_long(observations)
    _compare_long_tables(
        result,
        rebuilt=rebuilt,
        csv_path=FINAL_CSV,
        db_path=DB_PATH,
        table=LONG_TABLE,
        key_fields=JOIN_KEYS,
        value_fields=["volume_mt", "area_ha"],
    )
    return result


def check_fisheries() -> CheckResult:
    from scraping.fetch_fisheries import RAW_DIR, TABLES
    from scraping.reshape_fisheries import (
        DB_PATH,
        FINAL_CSV,
        JOIN_KEYS,
        LONG_TABLE,
        transform_from_csvs,
    )

    result = CheckResult("fisheries")
    _check_source_json(result, DATA / "fisheries_source.json")
    paths = [RAW_DIR / f"{table.key}_obs.csv" for table in TABLES]
    missing = [p for p in paths if not p.exists()]
    if missing:
        result.fail(f"missing raw fisheries CSV: {[p.name for p in missing]}")
        return result
    from scraping.reshape_fisheries import _read_obs_csv, observations_to_long

    observations: list[dict[str, Any]] = []
    for path in paths:
        key = path.name.replace("_obs.csv", "")
        observations.extend(_read_obs_csv(path, key))
    rebuilt = observations_to_long(observations)
    _compare_long_tables(
        result,
        rebuilt=rebuilt,
        csv_path=FINAL_CSV,
        db_path=DB_PATH,
        table=LONG_TABLE,
        key_fields=JOIN_KEYS,
        value_fields=["volume_mt", "area_ha"],
    )
    return result


def check_farmgate_module(name: str, source_file: str, mod_name: str) -> CheckResult:
    mod = __import__(f"scraping.reshape_{mod_name}", fromlist=["*"])

    result = CheckResult(name)
    _check_source_json(result, DATA / source_file)
    csv_paths = [p for p in mod.OBS_CSVS if p.exists()]
    missing = [p for p in mod.OBS_CSVS if not p.exists()]
    if missing:
        result.fail(f"missing raw: {[p.name for p in missing]}")
        return result
    rebuilt: list[dict] = []
    for path in csv_paths:
        rebuilt.extend(mod.iter_long_rows_from_obs(path))
    _compare_long_tables(
        result,
        rebuilt=rebuilt,
        csv_path=mod.FINAL_CSV,
        db_path=mod.DB_PATH,
        table=mod.LONG_TABLE,
        key_fields=mod.JOIN_KEYS,
        value_fields=["volume_mt", "area_ha"],
    )
    return result


def spot_check_palay_live() -> CheckResult:
    """Compare one known raw cell to a live OpenSTAT query."""
    from scraping.data_source import px
    from scraping.fetch_palay import VOLUME_PATH, QUARTER_LABELS, PALAY_CROP_LABELS

    result = CheckResult("live API spot (palay volume 2026 Q3 PH irrigated)")
    raw = json.loads((RAW / "palay_volume_obs.json").read_text(encoding="utf-8"))
    target = next(
        r
        for r in raw
        if r.get("year") == 2026
        and r.get("period") == "Quarter 3"
        and r.get("crop_label") == "Irrigated Palay"
        and r.get("geo_label") == "PHILIPPINES"
    )
    expected = _float(target.get("value"))
    if expected is None:
        result.fail("raw target value is null")
        return result

    summary = px.find_dataset(VOLUME_PATH)
    dataset = px.get_dataset(summary["id"])
    crops = px.list_all_values(dataset["id"], "Ecosystem/Croptype", dataset["release"])
    geos = px.list_all_values(dataset["id"], "Geolocation", dataset["release"])
    years = px.list_all_values(dataset["id"], "Year", dataset["release"])
    periods = px.list_all_values(dataset["id"], "Period", dataset["release"])

    def code_for(values: list[dict], label: str) -> str:
        for v in values:
            if v["label"] == label:
                return v["code"]
        raise KeyError(label)

    selection = {
        "Ecosystem/Croptype": [code_for(crops, "Irrigated Palay")],
        "Geolocation": [code_for(geos, "PHILIPPINES")],
        "Year": [code_for(years, "2026")],
        "Period": [code_for(periods, "Quarter 3")],
    }
    qr = px.query_dataset(dataset["id"], dataset["release"], selection)
    live = qr.get("rows") or []
    if len(live) != 1:
        result.fail(f"expected 1 live row, got {len(live)}")
        return result
    got = live[0].get("value")
    if got is None or abs(got - expected) > TOL:
        result.fail(f"live={got} raw={expected}")
    else:
        result.info(f"live OpenSTAT matches raw pull ({expected:,.2f} mt)")
    return result


def spot_check_farmgate_live() -> CheckResult:
    """Compare a 2026 September farmgate cell to live OpenSTAT."""
    import csv

    from scraping.data_source import px
    from scraping.fetch_farmgate import FARMGATE_TABLES, CROP_DIMENSION, PERIOD_DIMENSION
    from scraping.paths import RAW_DIR

    result = CheckResult("live API spot (farmgate 2026 Sep PH palay fancy)")
    cereals_csv = RAW_DIR / "farmgate_cereals_obs.csv"
    expected = None
    with cereals_csv.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            if (
                str(row.get("year")) == "2026"
                and row.get("period") == "September"
                and row.get("geo_label") == "PHILIPPINES"
                and "Palay [Paddy] Fancy, dry" in (row.get("crop_label") or "")
            ):
                expected = _float(row.get("value"))
                break
    if expected is None:
        result.fail("no matching September row in raw pull for PH palay fancy")
        return result

    spec = FARMGATE_TABLES[0]
    summary = px.find_dataset(spec["path"])
    dataset = px.get_dataset(summary["id"])
    crops = px.list_all_values(dataset["id"], CROP_DIMENSION, dataset["release"])
    geos = px.list_all_values(dataset["id"], "Geolocation", dataset["release"])
    years = px.list_all_values(dataset["id"], "Year", dataset["release"])
    periods = px.list_all_values(dataset["id"], PERIOD_DIMENSION, dataset["release"])

    def code_for(values: list[dict], label: str) -> str:
        for v in values:
            if v["label"] == label:
                return v["code"]
        raise KeyError(label)

    crop_label = next(
        c["label"] for c in crops if "Palay [Paddy] Fancy, dry (conv. to 14% mc)" in c["label"]
    )
    qr = px.query_dataset(
        dataset["id"],
        dataset["release"],
        {
            CROP_DIMENSION: [code_for(crops, crop_label)],
            "Geolocation": [code_for(geos, "PHILIPPINES")],
            "Year": [code_for(years, "2026")],
            PERIOD_DIMENSION: [code_for(periods, "September")],
        },
    )
    live = (qr.get("rows") or [{}])[0].get("value")
    if live is None or abs(live - expected) > TOL:
        result.fail(f"live={live} local={expected}")
    else:
        result.info(f"live OpenSTAT matches local reshape ({expected:.2f} PHP/kg)")
    return result


def coverage_checks() -> CheckResult:
    result = CheckResult("coverage (2026 production Q3 & farmgate Sep)")
    import sqlite3

    from scraping.reshape_farmgate import OBS_CSVS, iter_long_rows_from_obs

    c = sqlite3.connect(DATA / "palay.db")
    q3 = c.execute(
        "SELECT SUM(volume_mt) FROM palay_long WHERE year=2026 AND quarter=3"
    ).fetchone()[0]
    if not q3:
        result.fail("palay 2026 Q3 volume sum is empty")
    else:
        result.info(f"palay 2026 Q3 total volume {q3:,.1f} mt")

    sep_long = sum(
        1
        for path in OBS_CSVS
        if path.exists()
        for row in iter_long_rows_from_obs(path)
        if row.get("year") == 2026 and row.get("month") == 9
    )
    c = sqlite3.connect(DATA / "farmgate.db")
    sep_db = c.execute(
        "SELECT COUNT(*) FROM farmgate_long WHERE year=2026 AND month=9"
    ).fetchone()[0]
    if sep_long != sep_db:
        result.fail(f"farmgate 2026-09 reshape={sep_long} db={sep_db}")
    elif sep_db == 0:
        result.fail("farmgate 2026-09 has no published prices in OpenSTAT raw pull")
    else:
        result.info(
            f"farmgate 2026-09: {sep_db:,} province-level price rows "
            "(OpenSTAT partial release; early-2026 months have wider coverage)"
        )
    return result


def main() -> int:
    status_path = DATA / "data_status.json"
    if status_path.exists():
        st = json.loads(status_path.read_text(encoding="utf-8"))
        if st.get("status") == "running":
            print("WARNING: pipeline still running — results may be incomplete.\n")

    checks: list[Callable[[], CheckResult]] = [
        check_palay,
        check_fruits,
        check_vegetables,
        check_industrial,
        check_livestock,
        check_fisheries,
        lambda: check_farmgate_module("farmgate crops", "farmgate_source.json", "farmgate"),
        lambda: check_farmgate_module(
            "farmgate fisheries", "farmgate_fisheries_source.json", "farmgate_fisheries"
        ),
        lambda: check_farmgate_module(
            "farmgate livestock", "farmgate_livestock_source.json", "farmgate_livestock"
        ),
        spot_check_palay_live,
        spot_check_farmgate_live,
        coverage_checks,
    ]

    failed = 0
    for fn in checks:
        r = fn()
        icon = "OK" if r.ok else "ERR"
        print(f"[{icon}] {r.name}")
        for line in r.notes:
            print(f"      {line}")
        if not r.ok:
            failed += 1
        print()

    if failed:
        print(f"{failed} check group(s) failed.")
        return 1
    print("All checks passed — local data matches OpenSTAT raw pulls and live spot check.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
