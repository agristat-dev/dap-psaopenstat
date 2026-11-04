"""
Fetch Palay volume of production and area harvested from PSA OpenSTAT
(PX-Web API) by default, or the Philippine Data Explorer mirror when
PSA_DATA_SOURCE=bettergov. Queries are capped at 5,000
points, so this module pages by year and keeps a CSV-friendly observation
list for reshape_palay.py.

Run from project root:
  python -m scraping.fetch_palay
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any

try:
    from .data_source import px as bettergov
    from .paths import DATA_DIR, RAW_DIR, ensure_data_dirs
except ImportError:
    from data_source import px as bettergov
    from paths import DATA_DIR, RAW_DIR, ensure_data_dirs

YEAR_FROM = 1990
VOLUME_PATH = "0012E4EVCP0"
AREA_PATH = "0022E4EAHC0"
PALAY_CROP_LABELS = ("Irrigated Palay", "Rainfed Palay", "White Corn", "Yellow Corn")
QUARTER_LABELS = ("Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4")
YEAR_CHUNK = 5
MAX_POINTS = 5000

PROVENANCE_PATH = DATA_DIR / "palay_source.json"
RAW_VOLUME_PATH = RAW_DIR / "palay_volume_obs.json"
RAW_AREA_PATH = RAW_DIR / "palay_area_obs.json"


def _codes_for_labels(values: list[dict[str, str]], wanted: set[str] | None = None) -> list[str]:
    if wanted is None:
        return [str(item["code"]) for item in values]
    lookup = {item["label"]: str(item["code"]) for item in values}
    missing = [label for label in wanted if label not in lookup]
    if missing:
        raise RuntimeError(f"Missing dimension labels: {missing}")
    return [lookup[label] for label in wanted]


def _year_codes(values: list[dict[str, str]], year_from: int) -> list[tuple[str, int]]:
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


def _chunks(items: list[Any], size: int) -> list[list[Any]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _safe_chunk_years(n_crops: int, n_geo: int, n_periods: int) -> int:
    per_year = n_crops * n_geo * n_periods
    if per_year <= 0:
        return 1
    return max(1, min(YEAR_CHUNK, MAX_POINTS // per_year))


def _row_map(dimensions: list[dict[str, str]], row: dict[str, Any]) -> dict[str, Any]:
    labels = row.get("labels") or []
    codes = row.get("codes") or []
    mapped: dict[str, Any] = {
        "value": row.get("value"),
        "status": row.get("status") or "",
    }
    for index, dim in enumerate(dimensions):
        code = dim.get("code")
        mapped[code] = {
            "code": codes[index] if index < len(codes) else None,
            "label": labels[index] if index < len(labels) else None,
        }
    return mapped


def load_dataset(path_token: str) -> dict[str, Any]:
    summary = bettergov.find_dataset(path_token)
    dataset = bettergov.get_dataset(summary["id"])
    release = dataset["release"]
    crops = bettergov.list_all_values(dataset["id"], "Ecosystem/Croptype", release)
    geos = bettergov.list_all_values(dataset["id"], "Geolocation", release)
    years = bettergov.list_all_values(dataset["id"], "Year", release)
    periods = bettergov.list_all_values(dataset["id"], "Period", release)
    return {
        "dataset": dataset,
        "crops": crops,
        "geos": geos,
        "years": years,
        "periods": periods,
    }


def query_observations(
    packed: dict[str, Any],
    *,
    metric: str,
    year_from: int = YEAR_FROM,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    dataset = packed["dataset"]
    crop_codes = _codes_for_labels(packed["crops"], set(PALAY_CROP_LABELS))
    period_codes = _codes_for_labels(packed["periods"], set(QUARTER_LABELS))
    geo_codes = _codes_for_labels(packed["geos"])
    year_pairs = _year_codes(packed["years"], year_from)
    if not year_pairs:
        raise RuntimeError(f"No years at or after {year_from} in {dataset['id']}")

    chunk_size = _safe_chunk_years(len(crop_codes), len(geo_codes), len(period_codes))
    observations: list[dict[str, Any]] = []
    dimensions = None

    print(
        f"  {metric}: {len(year_pairs)} years in chunks of {chunk_size} "
        f"({len(crop_codes)} crops × {len(geo_codes)} places × {len(period_codes)} quarters)"
    )

    for chunk in _chunks(year_pairs, chunk_size):
        year_codes = [code for code, _ in chunk]
        year_span = f"{chunk[0][1]}-{chunk[-1][1]}"
        print(f"    querying {year_span}…")
        result = bettergov.query_dataset(
            dataset["id"],
            dataset["release"],
            {
                "Ecosystem/Croptype": crop_codes,
                "Geolocation": geo_codes,
                "Year": year_codes,
                "Period": period_codes,
            },
        )
        time.sleep(0.4)
        dimensions = result.get("dimensions") or dimensions
        for row in result.get("rows") or []:
            mapped = _row_map(result.get("dimensions") or [], row)
            crop = mapped.get("Ecosystem/Croptype") or {}
            geo = mapped.get("Geolocation") or {}
            year = mapped.get("Year") or {}
            period = mapped.get("Period") or {}
            observations.append(
                {
                    "metric": metric,
                    "crop_label": crop.get("label"),
                    "geo_label": geo.get("label"),
                    "year": int(year.get("label")) if year.get("label") else None,
                    "period": period.get("label"),
                    "value": mapped.get("value"),
                    "status": mapped.get("status"),
                }
            )

    provenance = {
        "id": dataset.get("id"),
        "title": dataset.get("title"),
        "path": dataset.get("path"),
        "source": dataset.get("source"),
        "sourceUpdated": dataset.get("sourceUpdated"),
        "retrieved": dataset.get("retrieved"),
        "release": dataset.get("release"),
        "unit": dataset.get("unit"),
        "observation_count": len(observations),
    }
    return observations, provenance


def fetch_palay(*, year_from: int = YEAR_FROM) -> dict[str, Any]:
    ensure_data_dirs()
    print("Discovering Palay volume and area datasets…")
    volume_pack = load_dataset(VOLUME_PATH)
    area_pack = load_dataset(AREA_PATH)

    print("Fetching Palay volume of production…")
    volume_rows, volume_meta = query_observations(
        volume_pack, metric="volume_mt", year_from=year_from
    )
    print("Fetching Palay area harvested…")
    area_rows, area_meta = query_observations(
        area_pack, metric="area_ha", year_from=year_from
    )

    RAW_VOLUME_PATH.write_text(json.dumps(volume_rows), encoding="utf-8")
    RAW_AREA_PATH.write_text(json.dumps(area_rows), encoding="utf-8")

    provenance = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "api_origin": bettergov.API_ORIGIN,
        "year_from": year_from,
        "volume": volume_meta,
        "area": area_meta,
    }
    PROVENANCE_PATH.write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    return {
        "volume_rows": volume_rows,
        "area_rows": area_rows,
        "provenance": provenance,
    }


def load_cached_observations() -> dict[str, Any] | None:
    if not RAW_VOLUME_PATH.exists() or not RAW_AREA_PATH.exists():
        return None
    volume_rows = json.loads(RAW_VOLUME_PATH.read_text(encoding="utf-8"))
    area_rows = json.loads(RAW_AREA_PATH.read_text(encoding="utf-8"))
    provenance = {}
    if PROVENANCE_PATH.exists():
        provenance = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
    return {
        "volume_rows": volume_rows,
        "area_rows": area_rows,
        "provenance": provenance,
    }


def main() -> None:
    result = fetch_palay()
    print(
        f"Fetched {len(result['volume_rows'])} volume rows and "
        f"{len(result['area_rows'])} area rows."
    )


if __name__ == "__main__":
    main()
