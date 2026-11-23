"""Probe PSA OpenSTAT for Q3 2026 PHILIPPINES values across commodities."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scraping.data_source import px


def query_cell(dataset_path: str, crop_dim: str, crop_label: str) -> float | None:
    summary = px.find_dataset(dataset_path)
    dataset = px.get_dataset(summary["id"])
    release = dataset["release"]
    crops = px.list_all_values(dataset["id"], crop_dim, release)
    geos = px.list_all_values(dataset["id"], "Geolocation", release)
    years = px.list_all_values(dataset["id"], "Year", release)
    periods = px.list_all_values(dataset["id"], "Period", release)

    def code_for(values, label: str) -> str:
        for v in values:
            if v["label"] == label:
                return v["code"]
        raise KeyError(label)

    try:
        crop_code = code_for(crops, crop_label)
    except KeyError:
        return None
    sel = {
        crop_dim: [crop_code],
        "Geolocation": [code_for(geos, "PHILIPPINES")],
        "Year": [code_for(years, "2026")],
        "Period": [code_for(periods, "Quarter 3") if any(p["label"] == "Quarter 3" for p in periods) else code_for(periods, "Quarter3")],
    }
    qr = px.query_dataset(dataset["id"], release, sel)
    rows = qr.get("rows") or []
    if len(rows) != 1:
        return None
    return rows[0].get("value")


def main() -> None:
    probes = [
        ("Palay irrigated", "0012E4EVCP0", "Ecosystem/Croptype", "Irrigated Palay"),
        ("Palay rainfed", "0012E4EVCP0", "Ecosystem/Croptype", "Rainfed Palay"),
        ("Corn white", "0012E4EVCP0", "Ecosystem/Croptype", "White Corn"),
        ("Banana", "0072E4EVCP2", "Crop", "Banana"),
        ("Tomato", "0082E4EVCP3", "Crop", "Tomato"),
        ("Sugarcane", "0072E4EVCP1", "Crop", "Sugarcane"),
    ]
    for name, path, dim, crop in probes:
        try:
            val = query_cell(path, dim, crop)
            print(f"{name:16} Q3 2026 PH: {val}")
        except Exception as exc:
            print(f"{name:16} ERROR: {exc}")


if __name__ == "__main__":
    main()