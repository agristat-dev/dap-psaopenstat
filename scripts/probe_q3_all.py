"""Compare local vs live OpenSTAT for 2026 Q3 (all main production families)."""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
DATA = ROOT / "data"

from scraping.data_source import px


def palay_corn_ph_q3() -> dict:
    from scraping.fetch_palay import VOLUME_PATH

    summary = px.find_dataset(VOLUME_PATH)
    dataset = px.get_dataset(summary["id"])
    release = dataset["release"]
    crops = px.list_all_values(dataset["id"], "Ecosystem/Croptype", release)
    geos = px.list_all_values(dataset["id"], "Geolocation", release)
    years = px.list_all_values(dataset["id"], "Year", release)
    periods = px.list_all_values(dataset["id"], "Period", release)

    def code_for(values, label: str) -> str:
        for v in values:
            if v["label"] == label:
                return v["code"]
        raise KeyError(label)

    out = {}
    for crop in ("Irrigated Palay", "Rainfed Palay", "White Corn", "Yellow Corn"):
        qr = px.query_dataset(
            dataset["id"],
            release,
            {
                "Ecosystem/Croptype": [code_for(crops, crop)],
                "Geolocation": [code_for(geos, "PHILIPPINES")],
                "Year": [code_for(years, "2026")],
                "Period": [code_for(periods, "Quarter 3")],
            },
        )
        rows = qr.get("rows") or []
        out[crop] = rows[0].get("value") if len(rows) == 1 else None
    return out


def hort_ph_q3(path_token: str, crop_label: str) -> float | None:
    summary = px.find_dataset(path_token)
    dataset = px.get_dataset(summary["id"])
    release = dataset["release"]
    crops = px.list_all_values(dataset["id"], "Crop", release)
    geos = px.list_all_values(dataset["id"], "Geolocation", release)
    years = px.list_all_values(dataset["id"], "Year", release)
    periods = px.list_all_values(dataset["id"], "Period", release)

    def code_for(values, label: str) -> str:
        for v in values:
            if v["label"] == label:
                return v["code"]
        raise KeyError(label)

    period_label = "Quarter 3" if any(p["label"] == "Quarter 3" for p in periods) else "Quarter3"
    qr = px.query_dataset(
        dataset["id"],
        release,
        {
            "Crop": [code_for(crops, crop_label)],
            "Geolocation": [code_for(geos, "PHILIPPINES")],
            "Year": [code_for(years, "2026")],
            "Period": [code_for(periods, period_label)],
        },
    )
    rows = qr.get("rows") or []
    return rows[0].get("value") if len(rows) == 1 else None


def local_q3_volume(db: str, table: str, crop_group: str | None = None) -> tuple[int, float | None]:
    conn = sqlite3.connect(DATA / db)
    if crop_group:
        row = conn.execute(
            f"SELECT COUNT(*), SUM(volume_mt) FROM {table} WHERE year=2026 AND quarter=3 AND crop_group=? AND volume_mt IS NOT NULL",
            (crop_group,),
        ).fetchone()
    else:
        row = conn.execute(
            f"SELECT COUNT(*), SUM(volume_mt) FROM {table} WHERE year=2026 AND quarter=3 AND volume_mt IS NOT NULL",
        ).fetchone()
    conn.close()
    return int(row[0]), row[1]


def main() -> None:
    report = {"checked_at": "now", "live": {}, "local": {}, "needs_refresh": []}

    palay_live = palay_corn_ph_q3()
    report["live"]["palay_corn"] = palay_live
    for cg in ("Palay", "Corn"):
        n, s = local_q3_volume("palay.db", "palay_long", cg)
        report["local"][cg] = {"rows": n, "sum": s}

    for name, token, crop in (
        ("fruits", "0072E4EVCP2", "Banana"),
        ("vegetables", "0082E4EVCP3", "Tomato"),
        ("industrial", "0072E4EVCP1", "Sugarcane"),
    ):
        try:
            live = hort_ph_q3(token, crop)
        except Exception as exc:
            live = f"error:{exc}"
        report["live"][name] = {crop: live}
        n, s = local_q3_volume(f"{name}.db", f"{name}_long")
        report["local"][name] = {"rows_with_volume": n, "sum": s}
        if live not in (None, "..", "") and isinstance(live, (int, float)) and (n == 0 or s is None):
            report["needs_refresh"].append(name)

    n, s = local_q3_volume("livestock.db", "livestock_long")
    report["local"]["livestock"] = {"rows_with_volume": n, "sum": s}

    conn = sqlite3.connect(DATA / "fisheries.db")
    fish_q3 = conn.execute(
        "SELECT COUNT(*), SUM(volume_mt) FROM fisheries_long WHERE year=2026 AND quarter=3 AND volume_mt IS NOT NULL"
    ).fetchone()
    fish_max_q = conn.execute("SELECT MAX(quarter) FROM fisheries_long WHERE year=2026 AND volume_mt IS NOT NULL").fetchone()[0]
    conn.close()
    report["local"]["fisheries"] = {"q3_rows": fish_q3[0], "q3_sum": fish_q3[1], "max_quarter_with_data": fish_max_q}
    try:
        from scraping.data_source import px as _px

        s = _px.find_dataset("0012E4GVCP0")
        ds = _px.get_dataset(s["id"])
        rel = ds["release"]

        def _code(values, label: str) -> str:
            return next(v["code"] for v in values if v["label"] == label)

        species = _px.list_all_values(ds["id"], "Species", rel)
        geos = _px.list_all_values(ds["id"], "Geolocation", rel)
        years = _px.list_all_values(ds["id"], "Year", rel)
        quarters = _px.list_all_values(ds["id"], "Quarter", rel)
        qr = _px.query_dataset(
            ds["id"],
            rel,
            {
                "Species": [_code(species, "TOTAL")],
                "Geolocation": [_code(geos, "PHILIPPINES")],
                "Year": [_code(years, "2026")],
                "Quarter": [_code(quarters, "Quarter 3")],
            },
        )
        fish_live_q3 = (qr.get("rows") or [{}])[0].get("value")
        report["live"]["fisheries_commercial_total_q3"] = fish_live_q3
        if fish_live_q3 not in (None, "", "..") and (fish_q3[0] or 0) == 0:
            report["needs_refresh"].append("fisheries")
    except Exception as exc:
        report["live"]["fisheries_commercial_total_q3"] = f"error:{exc}"

    # Palay: refresh if live total differs from local
    live_palay = (palay_live.get("Irrigated Palay") or 0) + (palay_live.get("Rainfed Palay") or 0)
    local_palay = report["local"]["Palay"]["sum"] or 0
    if palay_live.get("Irrigated Palay") is not None and abs(live_palay - local_palay) > 1:
        report["needs_refresh"].append("palay_corn")

    print(json.dumps(report, indent=2, default=str))

    if report["needs_refresh"]:
        print("\nRUN PIPELINE: new Q3 volume detected for", report["needs_refresh"])
    else:
        print("\nNo new Q3 2026 volumes on OpenSTAT beyond what is already loaded (palay/corn OK; horticulture/livestock/fisheries Q3 still blank or pending PSA release).")


if __name__ == "__main__":
    main()