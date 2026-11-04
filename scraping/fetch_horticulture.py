"""
Fetch horticulture (fruits / vegetables) volume and area from PSA OpenSTAT (default).

The explorer caps queries at 5,000 points, so this pages by year and crop.
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
class HorticultureSpec:
    slug: str
    volume_path: str
    area_path: str
    year_from: int = 2010
    crop_dimension: str = "Crop"


FRUITS = HorticultureSpec(
    slug="fruits",
    volume_path="0072E4EVCP2",
    area_path="0102E4EAHM2",
)
VEGETABLES = HorticultureSpec(
    slug="vegetables",
    volume_path="0082E4EVCP3",
    area_path="0112E4EAHM3",
)
INDUSTRIAL = HorticultureSpec(
    slug="industrial",
    volume_path="0072E4EVCP1",
    area_path="0092E4EAHM1",
)


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


def load_dataset(path_token: str, crop_dimension: str) -> dict[str, Any]:
    summary = bettergov.find_dataset(path_token)
    dataset = bettergov.get_dataset(summary["id"])
    release = dataset["release"]
    return {
        "dataset": dataset,
        "crops": bettergov.list_all_values(dataset["id"], crop_dimension, release),
        "geos": bettergov.list_all_values(dataset["id"], "Geolocation", release),
        "years": bettergov.list_all_values(dataset["id"], "Year", release),
        "periods": bettergov.list_all_values(dataset["id"], "Period", release),
    }


def query_to_csv(
    packed: dict[str, Any],
    *,
    crop_dimension: str,
    year_from: int,
    out_csv: Path,
) -> dict[str, Any]:
    dataset = packed["dataset"]
    crop_codes = [str(item["code"]) for item in packed["crops"]]
    geo_codes = [str(item["code"]) for item in packed["geos"]]
    period_codes = _quarter_codes(packed["periods"])
    year_pairs = _year_pairs(packed["years"], year_from)
    if not year_pairs or not crop_codes or not geo_codes or not period_codes:
        raise RuntimeError(f"Incomplete dimensions for {dataset['id']}")

    per_crop_year = len(geo_codes) * len(period_codes)
    crop_chunk = max(1, min(len(crop_codes), MAX_POINTS // max(1, per_crop_year)))
    total_queries = len(year_pairs) * ((len(crop_codes) + crop_chunk - 1) // crop_chunk)
    print(
        f"  {out_csv.name}: {len(year_pairs)} years × {len(crop_codes)} crops "
        f"in groups of {crop_chunk} (~{total_queries} queries)"
    )

    count = 0
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=OBS_FIELDS)
        writer.writeheader()
        query_i = 0
        for year_code, year in year_pairs:
            for crops in _chunks(crop_codes, crop_chunk):
                query_i += 1
                if query_i == 1 or query_i % 10 == 0 or query_i == total_queries:
                    print(f"    {year} query {query_i}/{total_queries}")
                result = bettergov.query_dataset(
                    dataset["id"],
                    dataset["release"],
                    {
                        crop_dimension: crops,
                        "Geolocation": geo_codes,
                        "Year": [year_code],
                        "Period": period_codes,
                    },
                )
                time.sleep(0.4)
                dimensions = result.get("dimensions") or []
                for row in result.get("rows") or []:
                    mapped = _row_map(dimensions, row)
                    crop = mapped.get(crop_dimension) or {}
                    geo = mapped.get("Geolocation") or {}
                    period = mapped.get("Period") or {}
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
    }


def fetch_horticulture(spec: HorticultureSpec) -> dict[str, Any]:
    ensure_data_dirs()
    print(f"Discovering {spec.slug} datasets…")
    volume_pack = load_dataset(spec.volume_path, spec.crop_dimension)
    area_pack = load_dataset(spec.area_path, spec.crop_dimension)
    volume_csv = RAW_DIR / f"{spec.slug}_volume_obs.csv"
    area_csv = RAW_DIR / f"{spec.slug}_area_obs.csv"
    print(f"Fetching {spec.slug} volume…")
    volume_meta = query_to_csv(
        volume_pack,
        crop_dimension=spec.crop_dimension,
        year_from=spec.year_from,
        out_csv=volume_csv,
    )
    print(f"Fetching {spec.slug} area…")
    area_meta = query_to_csv(
        area_pack,
        crop_dimension=spec.crop_dimension,
        year_from=spec.year_from,
        out_csv=area_csv,
    )
    provenance = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": bettergov.API_ORIGIN,
        "year_from": spec.year_from,
        "volume": volume_meta,
        "area": area_meta,
    }
    (DATA_DIR / f"{spec.slug}_source.json").write_text(
        json.dumps(provenance, indent=2), encoding="utf-8"
    )
    return {"volume_csv": volume_csv, "area_csv": area_csv, "provenance": provenance}


def fetch_fruits() -> dict[str, Any]:
    return fetch_horticulture(FRUITS)


def fetch_vegetables() -> dict[str, Any]:
    return fetch_horticulture(VEGETABLES)


def fetch_industrial() -> dict[str, Any]:
    return fetch_horticulture(INDUSTRIAL)


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "crop",
        choices=["fruits", "vegetables", "industrial", "both", "all"],
        nargs="?",
        default="both",
    )
    args = parser.parse_args()
    if args.crop in ("fruits", "both", "all"):
        fetch_fruits()
    if args.crop in ("vegetables", "both", "all"):
        fetch_vegetables()
    if args.crop in ("industrial", "all"):
        fetch_industrial()


if __name__ == "__main__":
    main()
