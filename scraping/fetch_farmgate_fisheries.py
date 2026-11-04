"""
Fetch fisheries farmgate prices from BetterGov (new NFG series).

Quarterly prices in PHP/kg. Period dimension is Quarter (Q1–Q4).
The explorer caps queries at 5,000 points, so this pages by year and species.
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
    from .geo import quarter_from_period
    from .paths import DATA_DIR, RAW_DIR, ensure_data_dirs
except ImportError:
    from data_source import px as bettergov
    from geo import quarter_from_period
    from paths import DATA_DIR, RAW_DIR, ensure_data_dirs

MAX_POINTS = 5000
OBS_FIELDS = ["classification", "crop_label", "geo_label", "year", "period", "value"]
SPECIES_DIMENSION = "Species"
PERIOD_DIMENSION = "Quarter"
YEAR_FROM = 2010
TABLE_PATH = "2M/NFG/0152M4GFPF0"
OBS_CSV = "farmgate_fisheries_obs.csv"


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


def _quarter_codes(values: list[dict[str, str]]) -> list[str]:
    return [str(item["code"]) for item in values if quarter_from_period(item.get("label"))]


def _clean_species(label: str | None) -> str:
    return (label or "").lstrip(".").strip()


def species_class_map(values: list[dict[str, str]]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    mode = "Marine Fisheries"
    for item in values:
        name = _clean_species(item.get("label"))
        if not name or name.upper() == "ALL SPECIES":
            continue
        mapping[name] = mode
        if name == "Others (Marine Fisheries)":
            mode = "Aquaculture"
        elif name == "Seaweed":
            mode = "Inland Fisheries"
    return mapping


def _species_codes(values: list[dict[str, str]]) -> list[str]:
    codes: list[str] = []
    for item in values:
        name = _clean_species(item.get("label"))
        if not name or name.upper() == "ALL SPECIES":
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


def load_dataset() -> dict[str, Any]:
    summary = bettergov.find_dataset(TABLE_PATH)
    dataset = bettergov.get_dataset(summary["id"])
    release = dataset["release"]
    species = bettergov.list_all_values(dataset["id"], SPECIES_DIMENSION, release)
    return {
        "dataset": dataset,
        "geos": bettergov.list_all_values(dataset["id"], "Geolocation", release),
        "years": bettergov.list_all_values(dataset["id"], "Year", release),
        "species": species,
        "periods": bettergov.list_all_values(dataset["id"], PERIOD_DIMENSION, release),
        "class_map": species_class_map(species),
    }


def query_to_csv(packed: dict[str, Any], out_csv: Path) -> dict[str, Any]:
    dataset = packed["dataset"]
    class_map: dict[str, str] = packed["class_map"]
    geo_codes = [str(item["code"]) for item in packed["geos"]]
    year_pairs = _year_pairs(packed["years"], YEAR_FROM)
    species_codes = _species_codes(packed["species"])
    period_codes = _quarter_codes(packed["periods"])
    if not year_pairs or not geo_codes or not species_codes or not period_codes:
        raise RuntimeError(f"Incomplete dimensions for {dataset['id']}")

    per_species_year = len(geo_codes) * len(period_codes)
    species_chunk = max(1, min(len(species_codes), MAX_POINTS // max(1, per_species_year)))
    species_groups = _chunks(species_codes, species_chunk)
    total_queries = len(year_pairs) * len(species_groups)
    print(
        f"  {out_csv.name}: {len(year_pairs)} years × {len(species_codes)} species "
        f"in groups of {species_chunk} (~{total_queries} queries)"
    )

    count = 0
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=OBS_FIELDS)
        writer.writeheader()
        query_i = 0
        for year_code, year in year_pairs:
            for species in species_groups:
                query_i += 1
                if query_i == 1 or query_i % 10 == 0 or query_i == total_queries:
                    print(f"    Fisheries {year} query {query_i}/{total_queries}")
                result = bettergov.query_dataset(
                    dataset["id"],
                    dataset["release"],
                    {
                        SPECIES_DIMENSION: species,
                        "Geolocation": geo_codes,
                        "Year": [year_code],
                        PERIOD_DIMENSION: period_codes,
                    },
                )
                time.sleep(0.4)
                dimensions = result.get("dimensions") or []
                for row in result.get("rows") or []:
                    mapped = _row_map(dimensions, row)
                    crop = mapped.get(SPECIES_DIMENSION) or {}
                    geo = mapped.get("Geolocation") or {}
                    period = mapped.get(PERIOD_DIMENSION) or {}
                    name = _clean_species(crop.get("label"))
                    writer.writerow(
                        {
                            "classification": class_map.get(name) or "Other fisheries",
                            "crop_label": name,
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
        "classification": "Fisheries",
        "observation_count": count,
        "csv": out_csv.name,
    }


def fetch_farmgate_fisheries() -> dict[str, Any]:
    ensure_data_dirs()
    print("Discovering fisheries farmgate prices…")
    packed = load_dataset()
    out_csv = RAW_DIR / OBS_CSV
    meta = query_to_csv(packed, out_csv)
    provenance = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": bettergov.API_ORIGIN,
        "tables": [meta],
    }
    (DATA_DIR / "farmgate_fisheries_source.json").write_text(
        json.dumps(provenance, indent=2), encoding="utf-8"
    )
    return {"csv_paths": [out_csv], "provenance": provenance}


if __name__ == "__main__":
    fetch_farmgate_fisheries()
