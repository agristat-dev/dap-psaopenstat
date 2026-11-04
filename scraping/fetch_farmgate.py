"""
Fetch crop farmgate prices from PSA OpenSTAT NFG tables (default).

Monthly prices in PHP/kg. Period dimension is Month (January–December).
The explorer caps queries at 5,000 points, so this pages by year and commodity.
"""

from __future__ import annotations

import csv
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from .data_source import px as bettergov
    from .geo import month_from_period
    from .paths import DATA_DIR, RAW_DIR, ensure_data_dirs
except ImportError:
    from data_source import px as bettergov
    from geo import month_from_period
    from paths import DATA_DIR, RAW_DIR, ensure_data_dirs

MAX_POINTS = 5000
OBS_FIELDS = ["classification", "crop_label", "geo_label", "year", "period", "value"]
CROP_DIMENSION = "Commodity"
PERIOD_DIMENSION = "Period"
YEAR_FROM = 2010

FARMGATE_TABLES = [
    {
        "classification": "Cereals",
        "path": "2M/NFG/0032M4AFN01",
        "csv": "farmgate_cereals_obs.csv",
    },
    {
        "classification": "Rootcrops",
        "path": "2M/NFG/0032M4AFN02",
        "csv": "farmgate_rootcrops_obs.csv",
    },
    {
        "classification": "Beans and Legumes",
        "path": "2M/NFG/0032M4AFN03",
        "csv": "farmgate_beans_obs.csv",
    },
    {
        "classification": "Condiments",
        "path": "2M/NFG/0032M4AFN04",
        "csv": "farmgate_condiments_obs.csv",
    },
    {
        "classification": "Fruit Vegetables",
        "path": "2M/NFG/0032M4AFN05",
        "csv": "farmgate_fruit_vegetables_obs.csv",
    },
    {
        "classification": "Leafy Vegetables",
        "path": "2M/NFG/0032M4AFN06",
        "csv": "farmgate_leafy_vegetables_obs.csv",
    },
    {
        "classification": "Fruits",
        "path": "2M/NFG/0032M4AFN07",
        "csv": "farmgate_fruits_obs.csv",
    },
    {
        "classification": "Commercial Crops",
        "path": "2M/NFG/0032M4AFN08",
        "csv": "farmgate_commercial_obs.csv",
    },
    {
        "classification": "Cutflowers",
        "path": "2M/NFG/0032M4AFN09",
        "csv": "farmgate_cutflowers_obs.csv",
    },
]


def _chunks(items: list[Any], size: int) -> list[list[Any]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _year_pairs(values: list[dict[str, str]], year_from: int) -> list[tuple[str, int]]:
    pairs: list[tuple[str, int]] = []
    for item in values:
        try:
            year = int(item["label"])
        except (TypeError, ValueError):
            continue
        if year >= year_from:
            pairs.append((str(item["code"]), year))
    pairs.sort(key=lambda item: item[1])
    return pairs


def _month_codes(values: list[dict[str, str]]) -> list[str]:
    return [str(item["code"]) for item in values if month_from_period(item.get("label"))]


def _crop_codes(values: list[dict[str, str]]) -> list[str]:
    return [str(item["code"]) for item in values if (item.get("label") or "").strip()]


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


def load_dataset(path: str) -> dict[str, Any]:
    summary = bettergov.find_dataset(path)
    dataset = bettergov.get_dataset(summary["id"])
    release = dataset["release"]
    return {
        "dataset": dataset,
        "geos": bettergov.list_all_values(dataset["id"], "Geolocation", release),
        "years": bettergov.list_all_values(dataset["id"], "Year", release),
        "crops": bettergov.list_all_values(dataset["id"], CROP_DIMENSION, release),
        "periods": bettergov.list_all_values(dataset["id"], PERIOD_DIMENSION, release),
    }


def query_to_csv(
    packed: dict[str, Any],
    out_csv: Path,
    *,
    classification: str,
) -> dict[str, Any]:
    dataset = packed["dataset"]
    geo_codes = [str(item["code"]) for item in packed["geos"]]
    year_pairs = _year_pairs(packed["years"], YEAR_FROM)
    crop_codes = _crop_codes(packed["crops"])
    period_codes = _month_codes(packed["periods"])
    if not year_pairs or not geo_codes or not crop_codes or not period_codes:
        raise RuntimeError(f"Incomplete dimensions for {dataset['id']}")

    per_crop_year = len(geo_codes) * len(period_codes)
    crop_chunk = max(1, min(len(crop_codes), MAX_POINTS // max(1, per_crop_year)))
    crop_groups = _chunks(crop_codes, crop_chunk)
    total_queries = len(year_pairs) * len(crop_groups)
    print(
        f"  {out_csv.name}: {len(year_pairs)} years × {len(crop_codes)} commodities "
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
                    print(f"    {classification} {year} query {query_i}/{total_queries}")
                result = bettergov.query_dataset(
                    dataset["id"],
                    dataset["release"],
                    {
                        CROP_DIMENSION: crops,
                        "Geolocation": geo_codes,
                        "Year": [year_code],
                        PERIOD_DIMENSION: period_codes,
                    },
                )
                time.sleep(0.4)
                dimensions = result.get("dimensions") or []
                for row in result.get("rows") or []:
                    mapped = _row_map(dimensions, row)
                    crop = mapped.get(CROP_DIMENSION) or {}
                    geo = mapped.get("Geolocation") or {}
                    period = mapped.get(PERIOD_DIMENSION) or {}
                    writer.writerow(
                        {
                            "classification": classification,
                            "crop_label": crop.get("label") or "",
                            "geo_label": geo.get("label") or "",
                            "year": year,
                            "period": period.get("label") or "",
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
        "classification": classification,
        "observation_count": count,
        "csv": out_csv.name,
    }


def _csv_has_rows(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 32:
        return False
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.reader(fh)
        next(reader, None)
        return next(reader, None) is not None


def fetch_farmgate(*, skip_existing: bool = True) -> dict[str, Any]:
    ensure_data_dirs()
    print("Discovering crop farmgate prices…")
    csv_paths: list[Path] = []
    tables: list[dict[str, Any]] = []
    for spec in FARMGATE_TABLES:
        out_csv = RAW_DIR / spec["csv"]
        if skip_existing and _csv_has_rows(out_csv):
            print(f"  Skipping {spec['classification']} (existing {out_csv.name})")
            csv_paths.append(out_csv)
            tables.append(
                {
                    "classification": spec["classification"],
                    "csv": out_csv.name,
                    "skipped": True,
                }
            )
            continue
        print(f"Discovering {spec['classification']} farmgate prices…")
        packed = load_dataset(spec["path"])
        meta = query_to_csv(packed, out_csv, classification=spec["classification"])
        csv_paths.append(out_csv)
        tables.append(meta)

    provenance = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": bettergov.API_ORIGIN,
        "tables": tables,
    }
    (DATA_DIR / "farmgate_source.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    return {"csv_paths": csv_paths, "provenance": provenance}


if __name__ == "__main__":
    fetch_farmgate()
