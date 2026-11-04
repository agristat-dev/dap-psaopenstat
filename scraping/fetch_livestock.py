"""
Fetch livestock, poultry, and dairy production from BetterGov.

Tables are volume-only (no area harvested). The explorer caps queries at
5,000 points, so this pages by year. Period labels are Q1–Q4 / Annual.
"""

from __future__ import annotations

import csv
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from .data_source import px as bettergov
    from .geo import quarter_from_period
    from .paths import DATA_DIR, RAW_DIR, ensure_data_dirs
except ImportError:
    from data_source import px as bettergov
    from geo import quarter_from_period
    from paths import DATA_DIR, RAW_DIR, ensure_data_dirs

MAX_POINTS = 5000
OBS_FIELDS = ["crop_label", "geo_label", "year", "period", "value"]


@dataclass(frozen=True)
class LivestockTable:
    key: str
    path: str
    crop_dimension: str | None = "Animal Type"
    crop_label: str | None = None
    has_period: bool = True
    year_from: int = 2010
    year_to: int | None = None


TABLES = (
    LivestockTable("livestock_annual", "0102E4FPLS1", has_period=False, year_from=2010, year_to=2022),
    LivestockTable("livestock_quarter", "0082E4FPLS2", year_from=2023),
    LivestockTable("poultry_annual", "0112E4FPPE1", has_period=False, year_from=2010, year_to=2022),
    LivestockTable("poultry_quarter", "0092E4FPPE2", year_from=2023),
    LivestockTable("horse", "0122E4FPOA0", crop_dimension=None, crop_label="Horse", year_from=2021),
    LivestockTable("rabbit", "0132E4FPOA1", crop_dimension=None, crop_label="Rabbit", year_from=2021),
    LivestockTable("sheep", "0142E4FPOA2", crop_dimension=None, crop_label="Sheep", year_from=2021),
    LivestockTable("goose", "0152E4FPOA3", crop_dimension=None, crop_label="Goose", year_from=2021),
    LivestockTable("quail", "0162E4FPOA4", crop_dimension=None, crop_label="Quail", year_from=2021),
    LivestockTable("goose_egg", "0182E4FPOA6", crop_dimension=None, crop_label="Goose Egg", year_from=2023),
    LivestockTable("quail_egg", "0192E4FPOA7", crop_dimension=None, crop_label="Quail Egg", year_from=2023),
    LivestockTable(
        "dairy_region",
        "0072E4FPDY1",
        crop_dimension=None,
        crop_label="Dairy",
        year_from=2022,
        year_to=2025,
    ),
    LivestockTable("dairy_province", "0222E4FPDY3", year_from=2026),
)


def _chunks(items: list[Any], size: int) -> list[list[Any]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _year_pairs(values: list[dict[str, str]], year_from: int, year_to: int | None) -> list[tuple[str, int]]:
    pairs: list[tuple[str, int]] = []
    for item in values:
        try:
            year = int(item["label"])
        except (TypeError, ValueError):
            continue
        if year < year_from:
            continue
        if year_to is not None and year > year_to:
            continue
        pairs.append((str(item["code"]), year))
    pairs.sort(key=lambda item: item[1])
    return pairs


def _quarter_codes(values: list[dict[str, str]]) -> list[str]:
    return [str(item["code"]) for item in values if quarter_from_period(item.get("label"))]


def _row_map(dimensions: list[dict[str, str]], row: dict[str, Any]) -> dict[str, Any]:
    labels = row.get("labels") or []
    codes = row.get("codes") or []
    mapped: dict[str, Any] = {"value": row.get("value")}
    for index, dim in enumerate(dimensions):
        mapped[dim.get("code")] = {
            "code": codes[index] if index < len(codes) else None,
            "label": labels[index] if index < len(labels) else None,
        }
    return mapped


def load_dataset(table: LivestockTable) -> dict[str, Any]:
    summary = bettergov.find_dataset(table.path)
    dataset = bettergov.get_dataset(summary["id"])
    release = dataset["release"]
    packed: dict[str, Any] = {
        "table": table,
        "dataset": dataset,
        "geos": bettergov.list_all_values(dataset["id"], "Geolocation", release),
        "years": bettergov.list_all_values(dataset["id"], "Year", release),
        "crops": [],
        "periods": [],
    }
    if table.crop_dimension:
        packed["crops"] = bettergov.list_all_values(dataset["id"], table.crop_dimension, release)
    if table.has_period:
        packed["periods"] = bettergov.list_all_values(dataset["id"], "Period", release)
    return packed


def query_to_csv(packed: dict[str, Any], out_csv: Path) -> dict[str, Any]:
    table: LivestockTable = packed["table"]
    dataset = packed["dataset"]
    geo_codes = [str(item["code"]) for item in packed["geos"]]
    year_pairs = _year_pairs(packed["years"], table.year_from, table.year_to)
    crop_codes = [str(item["code"]) for item in packed["crops"]] if table.crop_dimension else [None]
    period_codes = _quarter_codes(packed["periods"]) if table.has_period else []
    if not year_pairs or not geo_codes:
        raise RuntimeError(f"Incomplete dimensions for {dataset['id']}")
    if table.crop_dimension and not crop_codes:
        raise RuntimeError(f"No crop codes for {dataset['id']}")
    if table.has_period and not period_codes:
        raise RuntimeError(f"No quarter codes for {dataset['id']}")

    period_count = max(1, len(period_codes))
    crop_count = max(1, len(crop_codes) if table.crop_dimension else 1)
    per_crop_year = len(geo_codes) * period_count
    crop_chunk = max(1, min(crop_count, MAX_POINTS // max(1, per_crop_year)))
    crop_groups = _chunks(crop_codes, crop_chunk)
    total_queries = len(year_pairs) * len(crop_groups)
    print(
        f"  {out_csv.name}: {len(year_pairs)} years × {crop_count} commodities "
        f"in groups of {crop_chunk} (~{total_queries} queries)"
    )

    count = 0
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=OBS_FIELDS)
        writer.writeheader()
        query_i = 0
        for year_code, year in year_pairs:
            for crops in crop_groups:
                query_i += 1
                if query_i == 1 or query_i % 10 == 0 or query_i == total_queries:
                    print(f"    {year} query {query_i}/{total_queries}")
                selection: dict[str, list[str]] = {
                    "Geolocation": geo_codes,
                    "Year": [year_code],
                }
                if table.has_period:
                    selection["Period"] = period_codes
                if table.crop_dimension:
                    selection[table.crop_dimension] = [str(code) for code in crops if code is not None]
                result = bettergov.query_dataset(dataset["id"], dataset["release"], selection)
                time.sleep(0.4)
                dimensions = result.get("dimensions") or []
                for row in result.get("rows") or []:
                    mapped = _row_map(dimensions, row)
                    if table.crop_dimension:
                        crop = mapped.get(table.crop_dimension) or {}
                        crop_label = crop.get("label") or ""
                    else:
                        crop_label = table.crop_label or ""
                    geo = mapped.get("Geolocation") or {}
                    period = mapped.get("Period") or {}
                    writer.writerow(
                        {
                            "crop_label": crop_label,
                            "geo_label": geo.get("label") or "",
                            "year": year,
                            "period": period.get("label") or ("Annual" if not table.has_period else ""),
                            "value": mapped.get("value") if mapped.get("value") is not None else "",
                        }
                    )
                    count += 1

    return {
        "id": dataset.get("id"),
        "title": dataset.get("title"),
        "path": dataset.get("path"),
        "source": dataset.get("source"),
        "sourceUpdated": dataset.get("sourceUpdated"),
        "retrieved": dataset.get("retrieved"),
        "release": dataset.get("release"),
        "unit": dataset.get("unit"),
        "observation_count": count,
        "csv": out_csv.name,
        "key": table.key,
    }


def fetch_livestock() -> dict[str, Any]:
    ensure_data_dirs()
    print("Discovering livestock / poultry / dairy datasets…")
    provenance_tables: list[dict[str, Any]] = []
    csv_paths: list[Path] = []
    for table in TABLES:
        packed = load_dataset(table)
        out_csv = RAW_DIR / f"{table.key}_obs.csv"
        print(f"Fetching {table.key}…")
        meta = query_to_csv(packed, out_csv)
        provenance_tables.append(meta)
        csv_paths.append(out_csv)

    provenance = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": bettergov.API_ORIGIN,
        "tables": provenance_tables,
    }
    (DATA_DIR / "livestock_source.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    return {"csv_paths": csv_paths, "provenance": provenance}


if __name__ == "__main__":
    fetch_livestock()
