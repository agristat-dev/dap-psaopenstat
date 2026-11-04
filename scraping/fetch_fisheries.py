"""
Fetch fisheries production (four subsectors × species) from PSA OpenSTAT (default).

Volume-only tables. Period dimension is Quarter (Quarter 1–4 / Annual).
The explorer caps queries at 5,000 points, so this pages by year and species.
"""

from __future__ import annotations

import csv
import json
import re
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
SKIP_SPECIES = {"ALL SPECIES", "TOTAL", "FISH", "CRUSTACEANS", "MOLLUSCS", "FISHERIES"}


@dataclass(frozen=True)
class FisheriesTable:
    key: str
    path: str
    subsector: str
    year_from: int = 2002
    crop_dimension: str = "Species"
    period_dimension: str = "Quarter"


TABLES = (
    FisheriesTable("aquaculture", "0092E4GVAP1", "Aquaculture", year_from=1996),
    FisheriesTable("commercial", "0012E4GVCP0", "Commercial"),
    FisheriesTable("marine_municipal", "0032E4GVMP0", "Marine Municipal"),
    FisheriesTable("inland_municipal", "0052E4GVIP0", "Inland Municipal"),
)


def _chunks(items: list[Any], size: int) -> list[list[Any]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _clean_species(label: str) -> str:
    return re.sub(r"^\.+", "", (label or "")).strip()


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


def _quarter_codes(values: list[dict[str, str]]) -> list[str]:
    return [str(item["code"]) for item in values if quarter_from_period(item.get("label"))]


def _species_codes(values: list[dict[str, str]]) -> list[str]:
    codes: list[str] = []
    for item in values:
        name = _clean_species(item.get("label") or "")
        if not name or name.upper() in SKIP_SPECIES:
            continue
        codes.append(str(item["code"]))
    return codes


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


def load_dataset(table: FisheriesTable) -> dict[str, Any]:
    summary = bettergov.find_dataset(table.path)
    dataset = bettergov.get_dataset(summary["id"])
    release = dataset["release"]
    return {
        "table": table,
        "dataset": dataset,
        "geos": bettergov.list_all_values(dataset["id"], "Geolocation", release),
        "years": bettergov.list_all_values(dataset["id"], "Year", release),
        "crops": bettergov.list_all_values(dataset["id"], table.crop_dimension, release),
        "periods": bettergov.list_all_values(dataset["id"], table.period_dimension, release),
    }


def query_to_csv(packed: dict[str, Any], out_csv: Path) -> dict[str, Any]:
    table: FisheriesTable = packed["table"]
    dataset = packed["dataset"]
    geo_codes = [str(item["code"]) for item in packed["geos"]]
    year_pairs = _year_pairs(packed["years"], table.year_from)
    crop_codes = _species_codes(packed["crops"])
    period_codes = _quarter_codes(packed["periods"])
    if not year_pairs or not geo_codes or not crop_codes or not period_codes:
        raise RuntimeError(f"Incomplete dimensions for {dataset['id']}")

    per_crop_year = len(geo_codes) * len(period_codes)
    crop_chunk = max(1, min(len(crop_codes), MAX_POINTS // max(1, per_crop_year)))
    crop_groups = _chunks(crop_codes, crop_chunk)
    total_queries = len(year_pairs) * len(crop_groups)
    print(
        f"  {out_csv.name}: {len(year_pairs)} years × {len(crop_codes)} species "
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
                result = bettergov.query_dataset(
                    dataset["id"],
                    dataset["release"],
                    {
                        table.crop_dimension: crops,
                        "Geolocation": geo_codes,
                        "Year": [year_code],
                        table.period_dimension: period_codes,
                    },
                )
                time.sleep(0.4)
                dimensions = result.get("dimensions") or []
                for row in result.get("rows") or []:
                    mapped = _row_map(dimensions, row)
                    crop = mapped.get(table.crop_dimension) or {}
                    geo = mapped.get("Geolocation") or {}
                    period = mapped.get(table.period_dimension) or {}
                    writer.writerow(
                        {
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
        "observation_count": count,
        "csv": out_csv.name,
        "key": table.key,
        "subsector": table.subsector,
    }


def fetch_fisheries() -> dict[str, Any]:
    ensure_data_dirs()
    print("Discovering fisheries datasets…")
    provenance_tables: list[dict[str, Any]] = []
    csv_paths: list[Path] = []
    for table in TABLES:
        packed = load_dataset(table)
        out_csv = RAW_DIR / f"{table.key}_obs.csv"
        print(f"Fetching {table.subsector}…")
        meta = query_to_csv(packed, out_csv)
        provenance_tables.append(meta)
        csv_paths.append(out_csv)

    provenance = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": bettergov.API_ORIGIN,
        "tables": provenance_tables,
    }
    (DATA_DIR / "fisheries_source.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    return {"csv_paths": csv_paths, "provenance": provenance}


if __name__ == "__main__":
    fetch_fisheries()
