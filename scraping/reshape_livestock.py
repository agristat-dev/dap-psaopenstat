"""Reshape BetterGov livestock / poultry / dairy observations into livestock_long.csv + livestock.db."""

from __future__ import annotations

import csv
import re
import sqlite3
from pathlib import Path
from typing import Any

try:
    from .fetch_livestock import RAW_DIR, TABLES
    from .geo import (
        build_geo_lookup,
        ordered_unique,
        parse_value,
        quarter_from_period,
        semester_from_quarter,
    )
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from fetch_livestock import RAW_DIR, TABLES
    from geo import (
        build_geo_lookup,
        ordered_unique,
        parse_value,
        quarter_from_period,
        semester_from_quarter,
    )
    from paths import DATA_DIR, ensure_data_dirs

ensure_data_dirs()
DB_PATH = DATA_DIR / "livestock.db"
FINAL_CSV = DATA_DIR / "livestock_long.csv"
LONG_TABLE = "livestock_long"
ANNUAL_TABLE = "livestock_annual"
DIM_PREFIX = "livestock_dim"
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

SKIP_CROPS = {"DAIRY", "CHICKEN"}
CROP_ALIASES = {
    "Chicken eggs": "Chicken Egg",
    "Duck eggs": "Duck Egg",
    "Chicken Eggs": "Chicken Egg",
    "Duck Eggs": "Duck Egg",
}
DAIRY_ANIMALS = {"Carabao", "Cattle", "Goat"}
REGION_TABLE_KEYS = {"dairy_region"}


def normalize_crop(label: str) -> str | None:
    name = re.sub(r"^\.+", "", (label or "")).strip()
    if not name or name in SKIP_CROPS:
        return None
    return CROP_ALIASES.get(name, name)


def classify_crop(label: str, table_key: str) -> tuple[str, str] | None:
    name = normalize_crop(label)
    if not name:
        return None
    if table_key == "dairy_province" and name in DAIRY_ANIMALS:
        dairy_name = f"Dairy {name}"
        return dairy_name, dairy_name
    return name, name


def _read_obs_csv(path: Path, table_key: str) -> list[dict[str, Any]]:
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
                    "table_key": table_key,
                    "crop_label": row.get("crop_label") or "",
                    "geo_label": row.get("geo_label") or "",
                    "year": year,
                    "period": row.get("period") or "",
                    "value": row.get("value"),
                }
            )
    return rows


def _long_row(year: int, quarter: int, crop_group: str, crop_subtype: str, region: str, province: str, volume: float | None) -> dict:
    return {
        "year": year,
        "quarter": quarter,
        "semester": semester_from_quarter(quarter),
        "crop_group": crop_group,
        "crop_subtype": crop_subtype,
        "is_aggregate": 0,
        "region": region,
        "province": province,
        "volume_mt": volume,
        "area_ha": None,
    }


def observations_to_long(rows: list[dict[str, Any]]) -> list[dict]:
    geo_by_label = build_geo_lookup(ordered_unique([r["geo_label"] for r in rows]))
    quarterly: dict[tuple, dict] = {}
    annual: dict[tuple, float | None] = {}
    quarterly_coverage: set[tuple] = set()

    for row in rows:
        crop = classify_crop(row.get("crop_label") or "", row.get("table_key") or "")
        if not crop:
            continue
        crop_group, crop_subtype = crop
        year = row.get("year")
        if year is None:
            continue
        geo = geo_by_label.get(row.get("geo_label") or "")
        if not geo:
            continue
        allow_region = row.get("table_key") in REGION_TABLE_KEYS
        if allow_region:
            if geo["geo_level"] != "region" or not geo["region"]:
                continue
            region = geo["region"]
            province = geo["region"]
        else:
            if geo["geo_level"] != "province" or not geo["province"] or not geo["region"]:
                continue
            region = geo["region"]
            province = geo["province"]

        value = parse_value(row.get("value"))
        quarter = quarter_from_period(row.get("period"))
        coverage_key = (int(year), crop_group, crop_subtype, region, province)
        if quarter:
            key = (int(year), quarter, crop_group, crop_subtype, region, province)
            quarterly[key] = _long_row(int(year), quarter, crop_group, crop_subtype, region, province, value)
            quarterly_coverage.add(coverage_key)
        else:
            annual[coverage_key] = value

    combined = dict(quarterly)
    for coverage_key, value in annual.items():
        if coverage_key in quarterly_coverage or value is None:
            continue
        year, crop_group, crop_subtype, region, province = coverage_key
        share = value / 4.0
        for quarter in (1, 2, 3, 4):
            key = (year, quarter, crop_group, crop_subtype, region, province)
            if key not in combined:
                combined[key] = _long_row(year, quarter, crop_group, crop_subtype, region, province, share)

    rows_out = list(combined.values())
    rows_out.sort(
        key=lambda r: (r["year"], r["quarter"], r["region"], r["province"], r["crop_group"], r["crop_subtype"])
    )
    return rows_out


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


def ensure_livestock_perf(conn: sqlite3.Connection, *, force: bool = False) -> None:
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
        ensure_livestock_perf(conn, force=True)
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


def transform_from_csvs(csv_paths: list[Path] | None = None) -> list[dict]:
    paths = csv_paths or [RAW_DIR / f"{table.key}_obs.csv" for table in TABLES]
    observations: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists():
            continue
        key = path.name.replace("_obs.csv", "")
        observations.extend(_read_obs_csv(path, key))
    rows = observations_to_long(observations)
    if not rows:
        raise RuntimeError("No livestock / poultry / dairy production rows were produced")
    write_sqlite(rows)
    try:
        write_final_csv(rows)
    except PermissionError:
        print(f"Warning: could not update {FINAL_CSV.name}; SQLite is current.")
    return rows


def transform() -> list[dict]:
    return transform_from_csvs()


if __name__ == "__main__":
    rows = transform()
    print(f"Wrote {len(rows):,} livestock/poultry/dairy rows to {FINAL_CSV.name}")
