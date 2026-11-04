"""Reshape BetterGov vegetable observations into vegetables_long.csv + vegetables.db."""

from __future__ import annotations

import csv
import re
import sqlite3
from pathlib import Path
from typing import Any

try:
    from .fetch_horticulture import RAW_DIR, VEGETABLES
    from .geo import (
        build_geo_lookup,
        ordered_unique,
        parse_value,
        quarter_from_period,
        semester_from_quarter,
    )
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from fetch_horticulture import RAW_DIR, VEGETABLES
    from geo import (
        build_geo_lookup,
        ordered_unique,
        parse_value,
        quarter_from_period,
        semester_from_quarter,
    )
    from paths import DATA_DIR, ensure_data_dirs

ensure_data_dirs()
DB_PATH = DATA_DIR / "vegetables.db"
FINAL_CSV = DATA_DIR / "vegetables_long.csv"
LONG_TABLE = "vegetables_long"
ANNUAL_TABLE = "vegetables_annual"
DIM_PREFIX = "vegetables_dim"
JOIN_KEYS = [
    "year",
    "quarter",
    "semester",
    "crop_group",
    "crop_subtype",
    "is_aggregate",
    "region",
    "province",
]
FINAL_FIELDS = JOIN_KEYS + ["volume_mt", "area_ha"]


def crop_depth(label: str) -> int:
    return len(label) - len(label.lstrip("."))


def clean_leaf_name(label: str) -> str:
    return re.sub(r"^\.+", "", label).strip()


def group_display_name(label: str) -> str:
    name = clean_leaf_name(label)
    name = re.split(r"\s*\[", name)[0].strip()
    if "," in name:
        name = name.split(",", 1)[0].strip()
    return name


def classify_crop_labels(ordered_labels: list[str]) -> dict[str, tuple[str, str, bool]]:
    depths = [crop_depth(label) for label in ordered_labels]
    has_child = [False] * len(ordered_labels)
    for i, depth in enumerate(depths):
        for j in range(i + 1, len(ordered_labels)):
            if depths[j] <= depth:
                break
            has_child[i] = True
            break

    result: dict[str, tuple[str, str, bool]] = {}
    stack: list[tuple[int, str]] = []
    for i, label in enumerate(ordered_labels):
        depth = depths[i]
        while stack and stack[-1][0] >= depth:
            stack.pop()
        leaf = clean_leaf_name(label)
        if not stack:
            group = group_display_name(label)
            if has_child[i]:
                result[label] = (group, "Total", True)
                stack.append((depth, group))
            else:
                result[label] = (group, leaf, False)
        else:
            root_group = stack[0][1]
            if has_child[i]:
                result[label] = (root_group, leaf, True)
                stack.append((depth, root_group))
            else:
                result[label] = (root_group, leaf, False)
    return result


def _read_obs_csv(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            year_raw = row.get("year")
            try:
                year = int(year_raw) if year_raw not in (None, "") else None
            except ValueError:
                year = None
            rows.append(
                {
                    "crop_label": row.get("crop_label") or "",
                    "geo_label": row.get("geo_label") or "",
                    "year": year,
                    "period": row.get("period") or "",
                    "value": row.get("value"),
                }
            )
    return rows


def observations_to_long(
    rows: list[dict[str, Any]],
    value_field: str,
    classification: dict[str, tuple[str, str, bool]],
) -> dict[tuple, dict]:
    geo_by_label = build_geo_lookup(ordered_unique([r["geo_label"] for r in rows]))
    long_map: dict[tuple, dict] = {}
    for row in rows:
        crop_type = row.get("crop_label") or ""
        meta = classification.get(crop_type)
        if not meta:
            continue
        crop_group, crop_subtype, is_agg = meta
        if is_agg:
            continue
        quarter = quarter_from_period(row.get("period"))
        if not quarter:
            continue
        geo = geo_by_label.get(row.get("geo_label") or "")
        if not geo or geo["geo_level"] != "province" or not geo["province"] or not geo["region"]:
            continue
        year = row.get("year")
        if year is None:
            continue
        key = (
            int(year),
            quarter,
            semester_from_quarter(quarter),
            crop_group,
            crop_subtype,
            0,
            geo["region"],
            geo["province"],
        )
        long_map[key] = {
            "year": int(year),
            "quarter": quarter,
            "semester": semester_from_quarter(quarter),
            "crop_group": crop_group,
            "crop_subtype": crop_subtype,
            "is_aggregate": 0,
            "region": geo["region"],
            "province": geo["province"],
            value_field: parse_value(row.get("value")),
        }
    return long_map


def combine_long(volume_rows: list[dict], area_rows: list[dict]) -> list[dict]:
    classification = classify_crop_labels(
        ordered_unique([r["crop_label"] for r in volume_rows + area_rows])
    )
    combined: dict[tuple, dict] = {}
    for key, row in observations_to_long(volume_rows, "volume_mt", classification).items():
        combined[key] = {**{f: row[f] for f in JOIN_KEYS}, "volume_mt": row["volume_mt"], "area_ha": None}
    for key, row in observations_to_long(area_rows, "area_ha", classification).items():
        if key in combined:
            combined[key]["area_ha"] = row["area_ha"]
        else:
            combined[key] = {
                **{f: row[f] for f in JOIN_KEYS},
                "volume_mt": None,
                "area_ha": row["area_ha"],
            }
    rows = list(combined.values())
    rows.sort(key=lambda r: (r["year"], r["quarter"], r["region"], r["province"], r["crop_group"], r["crop_subtype"]))
    return rows


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        f"""
        DROP TABLE IF EXISTS {LONG_TABLE};
        DROP TABLE IF EXISTS {ANNUAL_TABLE};
        DROP TABLE IF EXISTS {DIM_PREFIX}_year;
        DROP TABLE IF EXISTS {DIM_PREFIX}_region;
        DROP TABLE IF EXISTS {DIM_PREFIX}_province;
        DROP TABLE IF EXISTS {DIM_PREFIX}_crop;
        DROP TABLE IF EXISTS {DIM_PREFIX}_quarter;
        DROP TABLE IF EXISTS {DIM_PREFIX}_semester;

        CREATE TABLE {LONG_TABLE} (
            year INTEGER NOT NULL,
            quarter INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            crop_group TEXT NOT NULL,
            crop_subtype TEXT NOT NULL,
            is_aggregate INTEGER NOT NULL,
            region TEXT NOT NULL,
            province TEXT NOT NULL,
            volume_mt REAL,
            area_ha REAL
        );
        CREATE INDEX idx_{LONG_TABLE}_year ON {LONG_TABLE}(year);
        CREATE INDEX idx_{LONG_TABLE}_crop_year ON {LONG_TABLE}(crop_group, year);
        CREATE INDEX idx_{LONG_TABLE}_year_crop ON {LONG_TABLE}(year, crop_group);
        CREATE INDEX idx_{LONG_TABLE}_region ON {LONG_TABLE}(region);
        """
    )


def ensure_vegetables_perf(conn: sqlite3.Connection, *, force: bool = False) -> None:
    has_annual = conn.execute(
        f"SELECT 1 FROM sqlite_master WHERE type='table' AND name='{ANNUAL_TABLE}'"
    ).fetchone()
    needs_rebuild = force or not has_annual
    if has_annual and not force:
        long_n = conn.execute(f"SELECT COUNT(*) FROM {LONG_TABLE}").fetchone()[0]
        annual_n = conn.execute(f"SELECT COUNT(*) FROM {ANNUAL_TABLE}").fetchone()[0]
        if annual_n <= 0 or long_n <= 0 or long_n / annual_n >= 6:
            needs_rebuild = True
    if needs_rebuild:
        conn.execute(f"DROP TABLE IF EXISTS {ANNUAL_TABLE}")
        conn.execute(
            f"""
            CREATE TABLE {ANNUAL_TABLE} AS
            SELECT year, crop_group, crop_subtype, region, province,
                   SUM(volume_mt) AS volume_mt, SUM(area_ha) AS area_ha
            FROM {LONG_TABLE}
            GROUP BY year, crop_group, crop_subtype, region, province
            """
        )
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{ANNUAL_TABLE}_crop_year ON {ANNUAL_TABLE}(crop_group, year)")
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{ANNUAL_TABLE}_year_crop ON {ANNUAL_TABLE}(year, crop_group)")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_year")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_region")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_province")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_crop")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_quarter")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_semester")
    conn.execute(f"CREATE TABLE {DIM_PREFIX}_year AS SELECT DISTINCT year AS value FROM {ANNUAL_TABLE} ORDER BY year")
    conn.execute(f"CREATE TABLE {DIM_PREFIX}_region AS SELECT DISTINCT region AS value FROM {ANNUAL_TABLE} ORDER BY region")
    conn.execute(
        f"CREATE TABLE {DIM_PREFIX}_province AS SELECT DISTINCT region, province FROM {ANNUAL_TABLE} ORDER BY region, province"
    )
    conn.execute(
        f"CREATE TABLE {DIM_PREFIX}_crop AS SELECT DISTINCT crop_group, crop_subtype FROM {ANNUAL_TABLE} ORDER BY crop_group, crop_subtype"
    )
    conn.execute(f"CREATE TABLE {DIM_PREFIX}_quarter AS SELECT DISTINCT quarter AS value FROM {LONG_TABLE} ORDER BY quarter")
    conn.execute(f"CREATE TABLE {DIM_PREFIX}_semester AS SELECT DISTINCT semester AS value FROM {LONG_TABLE} ORDER BY semester")
    conn.commit()


def write_final_csv(rows: list[dict]) -> Path:
    tmp = FINAL_CSV.with_suffix(".tmp.csv")
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FINAL_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    try:
        tmp.replace(FINAL_CSV)
    except PermissionError:
        FINAL_CSV.write_bytes(tmp.read_bytes())
        tmp.unlink(missing_ok=True)
    return FINAL_CSV


def write_sqlite(rows: list[dict]) -> Path:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_schema(conn)
        conn.executemany(
            f"INSERT INTO {LONG_TABLE} ({', '.join(FINAL_FIELDS)}) VALUES ({', '.join(':' + f for f in FINAL_FIELDS)})",
            rows,
        )
        conn.commit()
        ensure_vegetables_perf(conn, force=True)
    finally:
        conn.close()
    return DB_PATH


def load_csv_rows(path: Path | None = None) -> list[dict]:
    csv_path = path or FINAL_CSV
    rows: list[dict] = []
    with csv_path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            rows.append(
                {
                    "year": int(row["year"]),
                    "quarter": int(row["quarter"]),
                    "semester": int(row["semester"]),
                    "crop_group": row["crop_group"],
                    "crop_subtype": row["crop_subtype"],
                    "is_aggregate": int(float(row["is_aggregate"] or 0)),
                    "region": row["region"],
                    "province": row["province"],
                    "volume_mt": None if row.get("volume_mt") in ("", None) else float(row["volume_mt"]),
                    "area_ha": None if row.get("area_ha") in ("", None) else float(row["area_ha"]),
                }
            )
    return rows


def transform_from_csvs(volume_csv: Path, area_csv: Path) -> list[dict]:
    volume_rows = _read_obs_csv(volume_csv) if volume_csv.exists() else []
    area_rows = _read_obs_csv(area_csv) if area_csv.exists() else []
    rows = combine_long(volume_rows, area_rows)
    if not rows:
        raise RuntimeError("No province-level vegetable quarter rows were produced")
    write_sqlite(rows)
    try:
        write_final_csv(rows)
    except PermissionError:
        print(f"Warning: could not update {FINAL_CSV.name}; SQLite is current.")
    return rows


def transform() -> list[dict]:
    return transform_from_csvs(
        RAW_DIR / f"{VEGETABLES.slug}_volume_obs.csv",
        RAW_DIR / f"{VEGETABLES.slug}_area_obs.csv",
    )


if __name__ == "__main__":
    rows = transform()
    print(f"Wrote {len(rows):,} vegetable rows to {FINAL_CSV.name}")
