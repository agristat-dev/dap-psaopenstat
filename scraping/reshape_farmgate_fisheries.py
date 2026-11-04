"""Reshape fisheries farmgate prices into farmgate_fisheries_long.csv + farmgate_fisheries.db."""

from __future__ import annotations

import csv
import re
import sqlite3
from pathlib import Path
from typing import Any

try:
    from .fetch_farmgate_fisheries import OBS_CSV, RAW_DIR
    from .geo import (
        build_geo_lookup,
        parse_value,
        quarter_from_period,
        semester_from_quarter,
    )
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from fetch_farmgate_fisheries import OBS_CSV, RAW_DIR
    from geo import (
        build_geo_lookup,
        parse_value,
        quarter_from_period,
        semester_from_quarter,
    )
    from paths import DATA_DIR, ensure_data_dirs

ensure_data_dirs()
DB_PATH = DATA_DIR / "farmgate_fisheries.db"
FINAL_CSV = DATA_DIR / "farmgate_fisheries_long.csv"
LONG_TABLE = "farmgate_fisheries_long"
ANNUAL_TABLE = "farmgate_fisheries_annual"
DIM_PREFIX = "farmgate_fisheries_dim"
JOIN_KEYS = [
    "year",
    "month",
    "quarter",
    "semester",
    "crop_group",
    "crop_subtype",
    "is_aggregate",
    "region",
    "province",
]
FINAL_FIELDS = JOIN_KEYS + ["volume_mt", "area_ha"]
OBS_CSVS = [RAW_DIR / OBS_CSV]
MONTH_FROM_QUARTER = {1: 3, 2: 6, 3: 9, 4: 12}


def clean_commodity(label: str) -> str | None:
    name = re.sub(r"^\.+", "", (label or "")).strip()
    name = re.sub(r"\s+", " ", name).strip()
    return name or None


def _parse_obs_year(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _long_row_from_obs(
    row: dict[str, Any],
    *,
    fallback: str,
    geo_by_label: dict[str, dict[str, Any]],
    regions_with_provinces: set[str],
) -> dict | None:
    commodity = clean_commodity(row.get("crop_label") or "")
    if not commodity or commodity.upper() == "ALL SPECIES":
        return None
    quarter = quarter_from_period(row.get("period"))
    if not quarter:
        return None
    year = _parse_obs_year(row.get("year"))
    if year is None:
        return None
    price = parse_value(row.get("value"))
    if price is None:
        return None
    geo = geo_by_label.get(row.get("geo_label") or "")
    if not geo or not geo["region"]:
        return None
    if geo["geo_level"] == "province" and geo["province"]:
        region = geo["region"]
        province = geo["province"]
    elif geo["geo_level"] == "region" and geo["region"] not in regions_with_provinces:
        region = geo["region"]
        province = geo["region"]
    else:
        return None
    classification = (row.get("classification") or fallback).strip() or fallback
    month = MONTH_FROM_QUARTER[quarter]
    return {
        "year": year,
        "month": month,
        "quarter": quarter,
        "semester": semester_from_quarter(quarter),
        "crop_group": commodity,
        "crop_subtype": classification,
        "is_aggregate": 0,
        "region": region,
        "province": province,
        "volume_mt": price,
        "area_ha": None,
    }


def _geo_labels_in_source_order(path: Path) -> list[str]:
    """Keep the first-seen PSA order. A set scrambles region headers ahead of provinces."""
    labels: list[str] = []
    seen: set[str] = set()
    with path.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            label = row.get("geo_label") or ""
            if label in seen:
                continue
            seen.add(label)
            labels.append(label)
    return labels


def iter_long_rows_from_obs(path: Path):
    fallback = "Other fisheries"
    geo_by_label = build_geo_lookup(_geo_labels_in_source_order(path))
    regions_with_provinces = {
        geo["region"]
        for geo in geo_by_label.values()
        if geo["geo_level"] == "province" and geo["region"]
    }
    with path.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            long_row = _long_row_from_obs(
                row,
                fallback=fallback,
                geo_by_label=geo_by_label,
                regions_with_provinces=regions_with_provinces,
            )
            if long_row:
                yield long_row


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
        DROP TABLE IF EXISTS {DIM_PREFIX}_month;

        CREATE TABLE {LONG_TABLE} (
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
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
        CREATE INDEX idx_{LONG_TABLE}_subtype ON {LONG_TABLE}(crop_subtype);
        CREATE INDEX idx_{LONG_TABLE}_month ON {LONG_TABLE}(month);
        CREATE INDEX idx_{LONG_TABLE}_region ON {LONG_TABLE}(region);
        CREATE INDEX idx_{LONG_TABLE}_crop_subtype_ym ON {LONG_TABLE}(crop_group, crop_subtype, year, month);
        CREATE UNIQUE INDEX idx_{LONG_TABLE}_key ON {LONG_TABLE}(
            year, month, crop_subtype, crop_group, region, province
        );
        """
    )


def ensure_farmgate_fisheries_perf(conn: sqlite3.Connection, *, force: bool = False) -> None:
    has_annual = conn.execute(
        f"SELECT 1 FROM sqlite_master WHERE type='table' AND name='{ANNUAL_TABLE}'"
    ).fetchone()
    needs_rebuild = force or not has_annual
    if has_annual and not force:
        long_n = conn.execute(f"SELECT COUNT(*) FROM {LONG_TABLE}").fetchone()[0]
        annual_n = conn.execute(f"SELECT COUNT(*) FROM {ANNUAL_TABLE}").fetchone()[0]
        if annual_n <= 0 or long_n <= 0 or long_n / max(annual_n, 1) >= 8:
            needs_rebuild = True
    if needs_rebuild:
        conn.execute(f"DROP TABLE IF EXISTS {ANNUAL_TABLE}")
        conn.execute(
            f"""
            CREATE TABLE {ANNUAL_TABLE} AS
            SELECT year, crop_group, crop_subtype, region, province,
                   AVG(volume_mt) AS volume_mt, SUM(area_ha) AS area_ha
            FROM {LONG_TABLE}
            GROUP BY year, crop_group, crop_subtype, region, province
            """
        )
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{ANNUAL_TABLE}_crop_year ON {ANNUAL_TABLE}(crop_group, year)")
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{ANNUAL_TABLE}_year_crop ON {ANNUAL_TABLE}(year, crop_group)")
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{ANNUAL_TABLE}_subtype ON {ANNUAL_TABLE}(crop_subtype)")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_year")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_region")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_province")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_crop")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_quarter")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_semester")
    conn.execute(f"DROP TABLE IF EXISTS {DIM_PREFIX}_month")
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
    conn.execute(f"CREATE TABLE {DIM_PREFIX}_month AS SELECT DISTINCT month AS value FROM {LONG_TABLE} ORDER BY month")
    conn.execute(
        f"CREATE INDEX IF NOT EXISTS idx_{LONG_TABLE}_crop_subtype_ym "
        f"ON {LONG_TABLE}(crop_group, crop_subtype, year, month)"
    )
    conn.commit()


INSERT_SQL = (
    f"INSERT OR REPLACE INTO {LONG_TABLE} ({', '.join(FINAL_FIELDS)}) "
    f"VALUES ({', '.join(':' + f for f in FINAL_FIELDS)})"
)
BATCH_SIZE = 8000


def _flush_batch(conn: sqlite3.Connection, batch: list[dict]) -> None:
    if batch:
        conn.executemany(INSERT_SQL, batch)
        batch.clear()


def write_final_csv_from_db(conn: sqlite3.Connection) -> Path:
    tmp = FINAL_CSV.with_suffix(".tmp.csv")
    query = (
        f"SELECT {', '.join(FINAL_FIELDS)} FROM {LONG_TABLE} "
        "ORDER BY year, month, region, province, crop_subtype, crop_group"
    )
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FINAL_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in conn.execute(query):
            writer.writerow(dict(zip(FINAL_FIELDS, row)))
    try:
        tmp.replace(FINAL_CSV)
    except PermissionError:
        FINAL_CSV.write_bytes(tmp.read_bytes())
        tmp.unlink(missing_ok=True)
    return FINAL_CSV


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
        conn.executemany(INSERT_SQL, rows)
        conn.commit()
        ensure_farmgate_fisheries_perf(conn, force=True)
    finally:
        conn.close()
    return DB_PATH


def write_sqlite_from_final_csv(path: Path | None = None) -> Path:
    csv_path = path or FINAL_CSV
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_schema(conn)
        batch: list[dict] = []
        with csv_path.open(encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                batch.append(
                    {
                        "year": int(row["year"]),
                        "month": int(row["month"]),
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
                if len(batch) >= BATCH_SIZE:
                    _flush_batch(conn, batch)
        _flush_batch(conn, batch)
        conn.commit()
        ensure_farmgate_fisheries_perf(conn, force=True)
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
                    "month": int(row["month"]),
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


def transform_from_csvs(csv_paths: list[Path] | None = None) -> int:
    paths = [path for path in (csv_paths or OBS_CSVS) if path.exists()]
    if not paths:
        raise RuntimeError("No farmgate observation CSVs were found")
    conn = sqlite3.connect(DB_PATH)
    inserted = 0
    try:
        ensure_schema(conn)
        batch: list[dict] = []
        for path in paths:
            print(f"  Reshaping {path.name}…")
            for long_row in iter_long_rows_from_obs(path):
                batch.append(long_row)
                if len(batch) >= BATCH_SIZE:
                    inserted += len(batch)
                    _flush_batch(conn, batch)
            if batch:
                inserted += len(batch)
                _flush_batch(conn, batch)
        conn.commit()
        count = conn.execute(f"SELECT COUNT(*) FROM {LONG_TABLE}").fetchone()[0]
        if not count:
            raise RuntimeError("No province-level fisheries farmgate quarterly prices were produced")
        print(f"  Building fisheries farmgate annual table from {count:,} quarterly rows…")
        ensure_farmgate_fisheries_perf(conn, force=True)
        try:
            write_final_csv_from_db(conn)
        except PermissionError:
            print(f"Warning: could not update {FINAL_CSV.name}; SQLite is current.")
    finally:
        conn.close()
    return count


def transform() -> int:
    return transform_from_csvs()


if __name__ == "__main__":
    count = transform()
    print(f"Wrote {count:,} fisheries farmgate price rows to {FINAL_CSV.name}")
