"""
Turn BetterGov Palay observation lists into a province-level long CSV + SQLite DB.

Final long form (province-level, quarter rows only):
  year, quarter, semester, crop_group, crop_subtype, is_aggregate,
  region, province, volume_mt, area_ha
"""

from __future__ import annotations

import csv
import sqlite3
from pathlib import Path
from typing import Any

try:
    from .geo import (
        build_geo_lookup,
        parse_value,
        semester_from_quarter,
    )
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from geo import (
        build_geo_lookup,
        parse_value,
        semester_from_quarter,
    )
    from paths import DATA_DIR, ensure_data_dirs

ensure_data_dirs()
DB_PATH = DATA_DIR / "palay.db"
FINAL_CSV = DATA_DIR / "palay_long.csv"

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

QUARTER_META = {
    "Quarter 1": 1,
    "Quarter 2": 2,
    "Quarter 3": 3,
    "Quarter 4": 4,
}

CROP_META = {
    "Irrigated Palay": ("Palay", "Irrigated", False),
    "Rainfed Palay": ("Palay", "Rainfed", False),
    "White Corn": ("Corn", "White", False),
    "Yellow Corn": ("Corn", "Yellow", False),
}


def observations_to_long(rows: list[dict[str, Any]], value_field: str) -> dict[tuple, dict]:
    labels = []
    seen = set()
    for row in rows:
        label = row.get("geo_label")
        if label and label not in seen:
            labels.append(label)
            seen.add(label)
    geo_by_label = build_geo_lookup(labels)

    long_map: dict[tuple, dict] = {}
    for row in rows:
        crop_type = row.get("crop_label")
        if crop_type not in CROP_META:
            continue
        period = row.get("period")
        if period not in QUARTER_META:
            continue
        geo = geo_by_label.get(row.get("geo_label") or "")
        if not geo or geo["geo_level"] != "province" or not geo["province"] or not geo["region"]:
            continue
        year = row.get("year")
        if year is None:
            continue
        crop_group, crop_subtype, is_agg = CROP_META[crop_type]
        quarter = QUARTER_META[period]
        key = (
            int(year),
            quarter,
            semester_from_quarter(quarter),
            crop_group,
            crop_subtype,
            int(is_agg),
            geo["region"],
            geo["province"],
        )
        long_map[key] = {
            "year": int(year),
            "quarter": quarter,
            "semester": semester_from_quarter(quarter),
            "crop_group": crop_group,
            "crop_subtype": crop_subtype,
            "is_aggregate": int(is_agg),
            "region": geo["region"],
            "province": geo["province"],
            value_field: parse_value(row.get("value")),
        }
    return long_map


def combine_long(volume_rows: list[dict[str, Any]], area_rows: list[dict[str, Any]]) -> list[dict]:
    combined: dict[tuple, dict] = {}
    for key, row in observations_to_long(volume_rows, "volume_mt").items():
        combined[key] = {**{f: row[f] for f in JOIN_KEYS}, "volume_mt": row["volume_mt"], "area_ha": None}
    for key, row in observations_to_long(area_rows, "area_ha").items():
        if key in combined:
            combined[key]["area_ha"] = row["area_ha"]
        else:
            combined[key] = {
                **{f: row[f] for f in JOIN_KEYS},
                "volume_mt": None,
                "area_ha": row["area_ha"],
            }
    rows = list(combined.values())
    rows.sort(
        key=lambda r: (
            r["year"],
            r["quarter"],
            r["region"],
            r["province"],
            r["crop_subtype"],
        )
    )
    return rows


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS palay_long;
        DROP TABLE IF EXISTS palay_corn_long;

        CREATE TABLE palay_long (
            year INTEGER NOT NULL,
            quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
            semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
            crop_group TEXT NOT NULL,
            crop_subtype TEXT NOT NULL,
            is_aggregate INTEGER NOT NULL,
            region TEXT NOT NULL,
            province TEXT NOT NULL,
            volume_mt REAL,
            area_ha REAL
        );

        CREATE INDEX idx_palay_year ON palay_long(year);
        CREATE INDEX idx_palay_quarter ON palay_long(quarter);
        CREATE INDEX idx_palay_region ON palay_long(region);
        CREATE INDEX idx_palay_province ON palay_long(province);
        CREATE INDEX idx_palay_subtype ON palay_long(crop_subtype);
        CREATE INDEX idx_palay_crop_group ON palay_long(crop_group);

        """
    )


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
            f"""
            INSERT INTO palay_long ({", ".join(FINAL_FIELDS)})
            VALUES ({", ".join(":" + f for f in FINAL_FIELDS)})
            """,
            rows,
        )
        conn.commit()
    finally:
        conn.close()
    return DB_PATH


def transform_from_observations(volume_rows: list[dict[str, Any]], area_rows: list[dict[str, Any]]) -> list[dict]:
    rows = combine_long(volume_rows, area_rows)
    if not rows:
        raise RuntimeError("No province-level Palay/Corn quarter rows were produced")
    write_final_csv(rows)
    write_sqlite(rows)
    return rows


def transform() -> list[dict]:
    try:
        from .fetch_palay import load_cached_observations
    except ImportError:
        from fetch_palay import load_cached_observations

    cached = load_cached_observations()
    if not cached:
        raise RuntimeError("No cached Palay observations. Run python -m scraping.fetch_palay first.")
    return transform_from_observations(cached["volume_rows"], cached["area_rows"])


def load_csv_rows(path: Path | None = None) -> list[dict]:
    csv_path = path or FINAL_CSV
    rows: list[dict] = []
    with csv_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
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


if __name__ == "__main__":
    rows = transform()
    print(f"Wrote {len(rows):,} Palay rows to {FINAL_CSV.name} and {DB_PATH.name}")
