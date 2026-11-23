"""Spot-check local Q3 2026 vs PSA OpenSTAT for all commodity pipelines."""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
DATA = ROOT / "data"

PRODUCTION_DBS = [
    ("palay.db", "palay_long", "Palay/Corn"),
    ("fruits.db", "fruits_long", "Fruits"),
    ("vegetables.db", "vegetables_long", "Vegetables"),
    ("industrial.db", "industrial_long", "Industrial"),
    ("livestock.db", "livestock_long", "Livestock"),
    ("fisheries.db", "fisheries_long", "Fisheries"),
]


def local_q3_stats() -> list[dict]:
    out = []
    for db_name, table, label in PRODUCTION_DBS:
        path = DATA / db_name
        if not path.exists():
            out.append({"label": label, "error": "db missing"})
            continue
        conn = sqlite3.connect(path)
        q3_rows, q3_sum = conn.execute(
            f"SELECT COUNT(*), SUM(volume_mt) FROM {table} WHERE year=2026 AND quarter=3 AND volume_mt IS NOT NULL"
        ).fetchone()
        q4_rows = conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE year=2026 AND quarter=4 AND volume_mt IS NOT NULL"
        ).fetchone()[0]
        conn.close()
        out.append(
            {
                "label": label,
                "q3_rows": q3_rows,
                "q3_volume_sum": q3_sum,
                "q4_rows": q4_rows,
            }
        )
    return out


def live_palay_ph_q3() -> dict | None:
    from scraping.data_source import px
    from scraping.fetch_palay import VOLUME_PATH, PALAY_CROP_LABELS

    summary = px.find_dataset(VOLUME_PATH)
    dataset = px.get_dataset(summary["id"])
    release = dataset["release"]
    crops = px.list_all_values(dataset["id"], "Ecosystem/Croptype", release)
    geos = px.list_all_values(dataset["id"], "Geolocation", release)
    years = px.list_all_values(dataset["id"], "Year", release)
    periods = px.list_all_values(dataset["id"], "Period", release)

    def code_for(values: list[dict], label: str) -> str:
        for v in values:
            if v["label"] == label:
                return v["code"]
        raise KeyError(label)

    result = {}
    for crop in ("Irrigated Palay", "Rainfed Palay"):
        sel = {
            "Ecosystem/Croptype": [code_for(crops, crop)],
            "Geolocation": [code_for(geos, "PHILIPPINES")],
            "Year": [code_for(years, "2026")],
            "Period": [code_for(periods, "Quarter 3")],
        }
        qr = px.query_dataset(dataset["id"], release, sel)
        rows = qr.get("rows") or []
        val = rows[0].get("value") if len(rows) == 1 else None
        result[crop] = val
    result["total"] = (
        (result.get("Irrigated Palay") or 0) + (result.get("Rainfed Palay") or 0)
        if result.get("Irrigated Palay") is not None and result.get("Rainfed Palay") is not None
        else None
    )
    return result


def main() -> int:
    print("=== Local SQLite Q3 2026 ===")
    for row in local_q3_stats():
        print(json.dumps(row, default=str))

    print("\n=== Live OpenSTAT PH Q3 2026 (Palay volume) ===")
    try:
        live = live_palay_ph_q3()
        print(json.dumps(live, default=str))
        conn = sqlite3.connect(DATA / "palay.db")
        local = conn.execute(
            "SELECT SUM(volume_mt) FROM palay_long WHERE year=2026 AND quarter=3 AND crop_group='Palay'"
        ).fetchone()[0]
        conn.close()
        print(f"local palay Q3 sum: {local:,.2f}" if local else "local palay Q3 sum: (empty)")
        if live and live.get("total") is not None and local:
            diff = live["total"] - local
            print(f"diff live-local: {diff:,.2f} mt" if abs(diff) > 0.1 else "palay Q3 matches live (within 0.1)")
    except Exception as exc:
        print(f"live check failed: {exc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())