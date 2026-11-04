"""
Province quarterly rainfall for the Philippines from HDX CHIRPS subnational indicators.

Source:
  https://data.humdata.org/dataset/phl-rainfall-subnational
  (CHIRPS v2 dekadal rainfall aggregated to admin units)

We stream the full CSV, keep province rows (adm_level=2) from 1990 onward,
sum dekadal rainfall (rfh) into calendar quarters, and compare each quarter
to the long-term mean for that province+quarter.
"""

from __future__ import annotations

import csv
import json
import math
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

try:
    from .paths import DATA_DIR, RAW_DIR, ensure_data_dirs
except ImportError:
    from paths import DATA_DIR, RAW_DIR, ensure_data_dirs

HDX_DATASET_ID = "phl-rainfall-subnational"
HDX_PACKAGE_API = f"https://data.humdata.org/api/3/action/package_show?id={HDX_DATASET_ID}"
SOURCE_PAGE = "https://data.humdata.org/dataset/phl-rainfall-subnational"
SOURCE_LABEL = "CHIRPS v2 via HDX (province rainfall)"
OUT_PATH = DATA_DIR / "rainfall_quarterly.json"
RAW_CSV_NAME = "phl-rainfall-subnat-full.csv"
CACHE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60  # 7 days
YEAR_FROM = 1990
USER_AGENT = "AgriStatDashboard/1.0 (rainfall watch; local)"

# WFP / HDX PCODE (PH + region + old province code) → display metadata.
# Region codes align with HDX adm_level=1 (PH01…PH19).
PROVINCE_META: dict[str, dict[str, Any]] = {
    # Region I — Ilocos
    "PH01028": {"name": "Ilocos Norte", "region": "Region I", "region_id": "Region I", "island": "Luzon", "lat": 18.17, "lon": 120.71},
    "PH01029": {"name": "Ilocos Sur", "region": "Region I", "region_id": "Region I", "island": "Luzon", "lat": 17.23, "lon": 120.48},
    "PH01033": {"name": "La Union", "region": "Region I", "region_id": "Region I", "island": "Luzon", "lat": 16.62, "lon": 120.34},
    "PH01055": {"name": "Pangasinan", "region": "Region I", "region_id": "Region I", "island": "Luzon", "lat": 15.89, "lon": 120.29},
    # Region II — Cagayan Valley
    "PH02009": {"name": "Batanes", "region": "Region II", "region_id": "Region II", "island": "Luzon", "lat": 20.45, "lon": 121.97},
    "PH02015": {"name": "Cagayan", "region": "Region II", "region_id": "Region II", "island": "Luzon", "lat": 18.25, "lon": 121.81},
    "PH02031": {"name": "Isabela", "region": "Region II", "region_id": "Region II", "island": "Luzon", "lat": 16.98, "lon": 122.0},
    "PH02050": {"name": "Nueva Vizcaya", "region": "Region II", "region_id": "Region II", "island": "Luzon", "lat": 16.33, "lon": 121.17},
    "PH02057": {"name": "Quirino", "region": "Region II", "region_id": "Region II", "island": "Luzon", "lat": 16.29, "lon": 121.58},
    # Region III — Central Luzon
    "PH03008": {"name": "Bataan", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 14.64, "lon": 120.48},
    "PH03014": {"name": "Bulacan", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 14.85, "lon": 120.9},
    "PH03049": {"name": "Nueva Ecija", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 15.58, "lon": 121.0},
    "PH03054": {"name": "Pampanga", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 15.08, "lon": 120.62},
    "PH03069": {"name": "Tarlac", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 15.49, "lon": 120.6},
    "PH03071": {"name": "Zambales", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 15.34, "lon": 120.12},
    "PH03077": {"name": "Aurora", "region": "Region III", "region_id": "Region III", "island": "Luzon", "lat": 15.77, "lon": 121.56},
    # Region IV-A — CALABARZON
    "PH04010": {"name": "Batangas", "region": "Region IV-A", "region_id": "Region IV-A", "island": "Luzon", "lat": 13.83, "lon": 121.08},
    "PH04021": {"name": "Cavite", "region": "Region IV-A", "region_id": "Region IV-A", "island": "Luzon", "lat": 14.28, "lon": 120.87},
    "PH04034": {"name": "Laguna", "region": "Region IV-A", "region_id": "Region IV-A", "island": "Luzon", "lat": 14.27, "lon": 121.4},
    "PH04056": {"name": "Quezon", "region": "Region IV-A", "region_id": "Region IV-A", "island": "Luzon", "lat": 13.94, "lon": 121.96},
    "PH04058": {"name": "Rizal", "region": "Region IV-A", "region_id": "Region IV-A", "island": "Luzon", "lat": 14.6, "lon": 121.3},
    # MIMAROPA (often coded 17)
    "PH17040": {"name": "Marinduque", "region": "MIMAROPA", "region_id": "MIMAROPA", "island": "Luzon", "lat": 13.4, "lon": 121.95},
    "PH17041": {"name": "Occidental Mindoro", "region": "MIMAROPA", "region_id": "MIMAROPA", "island": "Luzon", "lat": 13.0, "lon": 120.8},
    "PH17042": {"name": "Oriental Mindoro", "region": "MIMAROPA", "region_id": "MIMAROPA", "island": "Luzon", "lat": 13.0, "lon": 121.2},
    "PH17059": {"name": "Palawan", "region": "MIMAROPA", "region_id": "MIMAROPA", "island": "Luzon", "lat": 9.83, "lon": 118.74},
    "PH17061": {"name": "Romblon", "region": "MIMAROPA", "region_id": "MIMAROPA", "island": "Luzon", "lat": 12.55, "lon": 122.27},
    # Region V — Bicol
    "PH05005": {"name": "Albay", "region": "Region V", "region_id": "Region V", "island": "Luzon", "lat": 13.18, "lon": 123.6},
    "PH05016": {"name": "Camarines Norte", "region": "Region V", "region_id": "Region V", "island": "Luzon", "lat": 14.1, "lon": 122.75},
    "PH05017": {"name": "Camarines Sur", "region": "Region V", "region_id": "Region V", "island": "Luzon", "lat": 13.55, "lon": 123.3},
    "PH05020": {"name": "Catanduanes", "region": "Region V", "region_id": "Region V", "island": "Luzon", "lat": 13.7, "lon": 124.2},
    "PH05041": {"name": "Masbate", "region": "Region V", "region_id": "Region V", "island": "Luzon", "lat": 12.3, "lon": 123.6},
    "PH05062": {"name": "Sorsogon", "region": "Region V", "region_id": "Region V", "island": "Luzon", "lat": 12.9, "lon": 124.0},
    # Region VI — Western Visayas
    "PH06004": {"name": "Aklan", "region": "Region VI", "region_id": "Region VI", "island": "Visayas", "lat": 11.7, "lon": 122.33},
    "PH06006": {"name": "Antique", "region": "Region VI", "region_id": "Region VI", "island": "Visayas", "lat": 11.2, "lon": 122.1},
    "PH06019": {"name": "Capiz", "region": "Region VI", "region_id": "Region VI", "island": "Visayas", "lat": 11.45, "lon": 122.75},
    "PH06030": {"name": "Iloilo", "region": "Region VI", "region_id": "Region VI", "island": "Visayas", "lat": 11.0, "lon": 122.55},
    "PH06045": {"name": "Negros Occidental", "region": "Region VI", "region_id": "Region VI", "island": "Visayas", "lat": 10.4, "lon": 123.0},
    "PH06079": {"name": "Guimaras", "region": "Region VI", "region_id": "Region VI", "island": "Visayas", "lat": 10.6, "lon": 122.6},
    # Region VII — Central Visayas
    "PH07012": {"name": "Bohol", "region": "Region VII", "region_id": "Region VII", "island": "Visayas", "lat": 9.85, "lon": 124.15},
    "PH07022": {"name": "Cebu", "region": "Region VII", "region_id": "Region VII", "island": "Visayas", "lat": 10.3, "lon": 123.9},
    "PH07046": {"name": "Negros Oriental", "region": "Region VII", "region_id": "Region VII", "island": "Visayas", "lat": 9.7, "lon": 123.1},
    "PH07061": {"name": "Siquijor", "region": "Region VII", "region_id": "Region VII", "island": "Visayas", "lat": 9.2, "lon": 123.55},
    # Region VIII — Eastern Visayas
    "PH08026": {"name": "Eastern Samar", "region": "Region VIII", "region_id": "Region VIII", "island": "Visayas", "lat": 11.5, "lon": 125.5},
    "PH08037": {"name": "Leyte", "region": "Region VIII", "region_id": "Region VIII", "island": "Visayas", "lat": 11.0, "lon": 124.85},
    "PH08048": {"name": "Northern Samar", "region": "Region VIII", "region_id": "Region VIII", "island": "Visayas", "lat": 12.35, "lon": 124.5},
    "PH08060": {"name": "Samar", "region": "Region VIII", "region_id": "Region VIII", "island": "Visayas", "lat": 11.8, "lon": 125.0},
    "PH08064": {"name": "Southern Leyte", "region": "Region VIII", "region_id": "Region VIII", "island": "Visayas", "lat": 10.35, "lon": 125.1},
    "PH08078": {"name": "Biliran", "region": "Region VIII", "region_id": "Region VIII", "island": "Visayas", "lat": 11.58, "lon": 124.47},
    # Region IX — Zamboanga Peninsula
    "PH09072": {"name": "Zamboanga del Norte", "region": "Region IX", "region_id": "Region IX", "island": "Mindanao", "lat": 8.15, "lon": 123.0},
    "PH09073": {"name": "Zamboanga del Sur", "region": "Region IX", "region_id": "Region IX", "island": "Mindanao", "lat": 7.7, "lon": 123.25},
    "PH09083": {"name": "Zamboanga Sibugay", "region": "Region IX", "region_id": "Region IX", "island": "Mindanao", "lat": 7.7, "lon": 122.6},
    "PH09901": {"name": "City of Zamboanga", "region": "Region IX", "region_id": "Region IX", "island": "Mindanao", "lat": 6.92, "lon": 122.08},
    "PH09907": {"name": "City of Isabela", "region": "Region IX", "region_id": "Region IX", "island": "Mindanao", "lat": 6.7, "lon": 122.0},
    # Region X — Northern Mindanao
    "PH10013": {"name": "Bukidnon", "region": "Region X", "region_id": "Region X", "island": "Mindanao", "lat": 8.05, "lon": 125.0},
    "PH10018": {"name": "Camiguin", "region": "Region X", "region_id": "Region X", "island": "Mindanao", "lat": 9.2, "lon": 124.7},
    "PH10035": {"name": "Lanao del Norte", "region": "Region X", "region_id": "Region X", "island": "Mindanao", "lat": 8.0, "lon": 124.0},
    "PH10042": {"name": "Misamis Occidental", "region": "Region X", "region_id": "Region X", "island": "Mindanao", "lat": 8.3, "lon": 123.75},
    "PH10043": {"name": "Misamis Oriental", "region": "Region X", "region_id": "Region X", "island": "Mindanao", "lat": 8.65, "lon": 124.75},
    # Region XI — Davao
    "PH11023": {"name": "Davao del Norte", "region": "Region XI", "region_id": "Region XI", "island": "Mindanao", "lat": 7.5, "lon": 125.7},
    "PH11024": {"name": "Davao del Sur", "region": "Region XI", "region_id": "Region XI", "island": "Mindanao", "lat": 6.75, "lon": 125.35},
    "PH11025": {"name": "Davao Oriental", "region": "Region XI", "region_id": "Region XI", "island": "Mindanao", "lat": 7.2, "lon": 126.3},
    "PH11082": {"name": "Davao de Oro", "region": "Region XI", "region_id": "Region XI", "island": "Mindanao", "lat": 7.55, "lon": 126.0},
    "PH11086": {"name": "Davao Occidental", "region": "Region XI", "region_id": "Region XI", "island": "Mindanao", "lat": 6.25, "lon": 125.55},
    "PH11802": {"name": "City of Davao", "region": "Region XI", "region_id": "Region XI", "island": "Mindanao", "lat": 7.19, "lon": 125.46},
    # Region XII — SOCCSKSARGEN
    "PH12047": {"name": "Cotabato", "region": "Region XII", "region_id": "Region XII", "island": "Mindanao", "lat": 7.2, "lon": 124.85},
    "PH12063": {"name": "South Cotabato", "region": "Region XII", "region_id": "Region XII", "island": "Mindanao", "lat": 6.2, "lon": 124.9},
    "PH12065": {"name": "Sultan Kudarat", "region": "Region XII", "region_id": "Region XII", "island": "Mindanao", "lat": 6.55, "lon": 124.45},
    "PH12080": {"name": "Sarangani", "region": "Region XII", "region_id": "Region XII", "island": "Mindanao", "lat": 5.9, "lon": 125.25},
    "PH12908": {"name": "City of General Santos", "region": "Region XII", "region_id": "Region XII", "island": "Mindanao", "lat": 6.12, "lon": 125.17},
    "PH12918": {"name": "City of Cotabato", "region": "Region XII", "region_id": "Region XII", "island": "Mindanao", "lat": 7.22, "lon": 124.25},
    # Region XIII — Caraga
    "PH16002": {"name": "Agusan del Norte", "region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao", "lat": 9.0, "lon": 125.5},
    "PH16003": {"name": "Agusan del Sur", "region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao", "lat": 8.5, "lon": 125.9},
    "PH16067": {"name": "Surigao del Norte", "region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao", "lat": 9.7, "lon": 125.5},
    "PH16068": {"name": "Surigao del Sur", "region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao", "lat": 8.7, "lon": 126.2},
    "PH16805": {"name": "Dinagat Islands", "region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao", "lat": 10.1, "lon": 125.6},
    "PH16801": {"name": "City of Butuan", "region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao", "lat": 8.95, "lon": 125.54},
    # NCR (often single unit or cities)
    "PH133900": {"name": "NCR", "region": "NCR", "region_id": "NCR", "island": "Luzon", "lat": 14.6, "lon": 121.0},
    "PH13000": {"name": "NCR", "region": "NCR", "region_id": "NCR", "island": "Luzon", "lat": 14.6, "lon": 121.0},
    "PH1339": {"name": "NCR", "region": "NCR", "region_id": "NCR", "island": "Luzon", "lat": 14.6, "lon": 121.0},
    # CAR
    "PH14001": {"name": "Abra", "region": "CAR", "region_id": "CAR", "island": "Luzon", "lat": 17.55, "lon": 120.8},
    "PH14011": {"name": "Benguet", "region": "CAR", "region_id": "CAR", "island": "Luzon", "lat": 16.5, "lon": 120.7},
    "PH14027": {"name": "Ifugao", "region": "CAR", "region_id": "CAR", "island": "Luzon", "lat": 16.85, "lon": 121.15},
    "PH14032": {"name": "Kalinga", "region": "CAR", "region_id": "CAR", "island": "Luzon", "lat": 17.4, "lon": 121.3},
    "PH14044": {"name": "Mountain Province", "region": "CAR", "region_id": "CAR", "island": "Luzon", "lat": 17.1, "lon": 121.1},
    "PH14081": {"name": "Apayao", "region": "CAR", "region_id": "CAR", "island": "Luzon", "lat": 18.0, "lon": 121.2},
    # BARMM / ARMM (codes vary by vintage)
    "PH15007": {"name": "Basilan", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 6.6, "lon": 122.0},
    "PH15036": {"name": "Lanao del Sur", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 7.8, "lon": 124.4},
    "PH15038": {"name": "Maguindanao", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 7.0, "lon": 124.4},
    "PH15066": {"name": "Sulu", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 6.0, "lon": 121.1},
    "PH15070": {"name": "Tawi-Tawi", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 5.15, "lon": 120.0},
    "PH19007": {"name": "Basilan", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 6.6, "lon": 122.0},
    "PH19036": {"name": "Lanao del Sur", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 7.8, "lon": 124.4},
    "PH19038": {"name": "Maguindanao", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 7.0, "lon": 124.4},
    "PH19066": {"name": "Sulu", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 6.0, "lon": 121.1},
    "PH19070": {"name": "Tawi-Tawi", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 5.15, "lon": 120.0},
    "PH19087": {"name": "Maguindanao del Norte", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 7.2, "lon": 124.25},
    "PH19088": {"name": "Maguindanao del Sur", "region": "BARMM", "region_id": "BARMM", "island": "Mindanao", "lat": 6.85, "lon": 124.55},
}

REGION_CODE_META: dict[str, dict[str, str]] = {
    "01": {"region": "Region I", "region_id": "Region I", "island": "Luzon"},
    "02": {"region": "Region II", "region_id": "Region II", "island": "Luzon"},
    "03": {"region": "Region III", "region_id": "Region III", "island": "Luzon"},
    "04": {"region": "Region IV-A", "region_id": "Region IV-A", "island": "Luzon"},
    "05": {"region": "Region V", "region_id": "Region V", "island": "Luzon"},
    "06": {"region": "Region VI", "region_id": "Region VI", "island": "Visayas"},
    "07": {"region": "Region VII", "region_id": "Region VII", "island": "Visayas"},
    "08": {"region": "Region VIII", "region_id": "Region VIII", "island": "Visayas"},
    "09": {"region": "Region IX", "region_id": "Region IX", "island": "Mindanao"},
    "10": {"region": "Region X", "region_id": "Region X", "island": "Mindanao"},
    "11": {"region": "Region XI", "region_id": "Region XI", "island": "Mindanao"},
    "12": {"region": "Region XII", "region_id": "Region XII", "island": "Mindanao"},
    "13": {"region": "NCR", "region_id": "NCR", "island": "Luzon"},
    "14": {"region": "CAR", "region_id": "CAR", "island": "Luzon"},
    "15": {"region": "BARMM", "region_id": "BARMM", "island": "Mindanao"},
    "16": {"region": "Region XIII", "region_id": "Region XIII", "island": "Mindanao"},
    "17": {"region": "MIMAROPA", "region_id": "MIMAROPA", "island": "Luzon"},
    "18": {"region": "NIR", "region_id": "NIR", "island": "Visayas"},
    "19": {"region": "BARMM", "region_id": "BARMM", "island": "Mindanao"},
}


def _request(url: str, timeout: int = 300) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def resolve_full_csv_url() -> str:
    raw = _request(HDX_PACKAGE_API, timeout=60)
    payload = json.loads(raw.decode("utf-8"))
    resources = payload.get("result", {}).get("resources") or []
    for res in resources:
        name = str(res.get("name") or "").lower()
        if "full" in name and str(res.get("format") or "").upper() == "CSV":
            url = res.get("url")
            if url:
                return str(url)
    for res in resources:
        if str(res.get("format") or "").upper() == "CSV" and res.get("url"):
            return str(res["url"])
    raise RuntimeError("Could not resolve HDX rainfall CSV download URL")


def _parse_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "null"}:
        return None
    try:
        num = float(text)
    except ValueError:
        return None
    if math.isnan(num):
        return None
    return num


def _quarter_from_month(month: int) -> int:
    return (month - 1) // 3 + 1


def province_meta_for(pcode: str) -> dict[str, Any]:
    code = str(pcode or "").strip().upper()
    if code in PROVINCE_META:
        return dict(PROVINCE_META[code])
    # Strip trailing zeros sometimes present in longer codes
    for key, meta in PROVINCE_META.items():
        if code.startswith(key) or key.startswith(code):
            return dict(meta)
    region_digits = ""
    if code.startswith("PH") and len(code) >= 4:
        region_digits = code[2:4]
    region_info = REGION_CODE_META.get(region_digits, {})
    return {
        "name": code.replace("PH", "Province "),
        "region": region_info.get("region", "Unknown"),
        "region_id": region_info.get("region_id", "Unknown"),
        "island": region_info.get("island", "Unknown"),
        "lat": None,
        "lon": None,
    }


def _classify_anomaly(anomaly_pct: float | None) -> dict[str, Any]:
    if anomaly_pct is None:
        return {
            "tone": "muted",
            "label": "No reading",
            "plain": "Not enough rainfall data to compare with the usual amount for this quarter.",
            "attention": False,
        }
    if anomaly_pct >= 150:
        return {
            "tone": "warn",
            "label": "Very wet",
            "plain": "Rainfall is much higher than the long-term average for this quarter.",
            "attention": True,
        }
    if anomaly_pct >= 120:
        return {
            "tone": "info",
            "label": "Wet",
            "plain": "Rainfall is above the long-term average for this quarter.",
            "attention": False,
        }
    if anomaly_pct >= 80:
        return {
            "tone": "ok",
            "label": "Near normal",
            "plain": "Rainfall is close to the long-term average for this quarter.",
            "attention": False,
        }
    if anomaly_pct >= 50:
        return {
            "tone": "warn",
            "label": "Dry",
            "plain": "Rainfall is below the long-term average for this quarter.",
            "attention": True,
        }
    return {
        "tone": "danger",
        "label": "Very dry",
        "plain": "Rainfall is much lower than the long-term average for this quarter.",
        "attention": True,
    }


def _download_csv_to_raw() -> tuple[Any, str]:
    ensure_data_dirs()
    raw_path = RAW_DIR / RAW_CSV_NAME
    url = resolve_full_csv_url()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=600) as resp, raw_path.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    return raw_path.open("r", encoding="utf-8", newline=""), f"url:{url}"


def _open_csv_stream() -> tuple[Any, str]:
    ensure_data_dirs()
    raw_path = RAW_DIR / RAW_CSV_NAME
    # Prefer a complete local copy (~19MB). Partial downloads are ignored.
    if raw_path.exists() and raw_path.stat().st_size > 8_000_000:
        return raw_path.open("r", encoding="utf-8", newline=""), f"file:{raw_path}"
    return _download_csv_to_raw()


def aggregate_quarterly_from_rows(rows) -> dict[str, Any]:
    """
    Aggregate dekadal province rainfall into quarterly totals.

    Key: (pcode, year, quarter) -> rainfall_mm sum, dekads count
    """
    totals: dict[tuple[str, int, int], dict[str, float]] = defaultdict(
        lambda: {"rainfall_mm": 0.0, "dekads": 0.0}
    )
    for row in rows:
        try:
            adm_level = int(float(row.get("adm_level") or 0))
        except (TypeError, ValueError):
            continue
        if adm_level != 2:
            continue
        version = str(row.get("version") or "").strip().lower()
        if version and version not in {"final", "preliminary", "prelim"}:
            # Keep final/preliminary; skip forecasts.
            if "forecast" in version:
                continue
        date_text = str(row.get("date") or "").strip()
        if len(date_text) < 7:
            continue
        try:
            year = int(date_text[0:4])
            month = int(date_text[5:7])
        except ValueError:
            continue
        if year < YEAR_FROM:
            continue
        rainfall = _parse_float(row.get("rfh"))
        if rainfall is None:
            continue
        pcode = str(row.get("PCODE") or "").strip().upper()
        if not pcode:
            continue
        quarter = _quarter_from_month(month)
        slot = totals[(pcode, year, quarter)]
        slot["rainfall_mm"] += rainfall
        slot["dekads"] += 1

    return totals


def build_payload(totals: dict[tuple[str, int, int], dict[str, float]], *, source_ref: str) -> dict[str, Any]:
    # Long-term normals by province+quarter across all available years.
    by_pq: dict[tuple[str, int], list[float]] = defaultdict(list)
    for (pcode, year, quarter), slot in totals.items():
        if slot["dekads"] <= 0:
            continue
        by_pq[(pcode, quarter)].append(slot["rainfall_mm"])

    normals: dict[tuple[str, int], float] = {
        key: sum(vals) / len(vals) for key, vals in by_pq.items() if vals
    }

    by_province: dict[str, list[dict[str, Any]]] = defaultdict(list)
    quarter_dekads: dict[tuple[int, int], list[int]] = defaultdict(list)
    for (pcode, year, quarter), slot in totals.items():
        if slot["dekads"] <= 0:
            continue
        rainfall = round(slot["rainfall_mm"], 1)
        normal = normals.get((pcode, quarter))
        anomaly = None
        if normal is not None and normal > 0:
            anomaly = round((rainfall / normal) * 100.0, 1)
        status = _classify_anomaly(anomaly)
        # Keep history compact for the API payload (plain text only needed live in UI).
        point = {
            "year": year,
            "quarter": quarter,
            "rainfall_mm": rainfall,
            "normal_mm": round(normal, 1) if normal is not None else None,
            "anomaly_pct": anomaly,
            "dekads": int(slot["dekads"]),
            "tone": status["tone"],
            "label": status["label"],
            "attention": status["attention"],
        }
        by_province[pcode].append(point)
        quarter_dekads[(year, quarter)].append(int(slot["dekads"]))

    # Prefer the latest quarter with enough dekads (~9 per quarter) so partial
    # current-quarter rows do not dominate the watch view.
    complete_quarters = [
        key
        for key, counts in quarter_dekads.items()
        if counts and (sum(counts) / len(counts)) >= 8
    ]
    if complete_quarters:
        latest_key = max(complete_quarters)
    elif quarter_dekads:
        latest_key = max(quarter_dekads)
    else:
        raise RuntimeError("No province quarterly rainfall rows found after 1990")

    latest_year, latest_quarter = latest_key
    periods = [
        {"year": year, "quarter": quarter}
        for year, quarter in sorted(complete_quarters or quarter_dekads.keys())
    ]
    available_years = sorted({p["year"] for p in periods})

    provinces: list[dict[str, Any]] = []
    wet = dry = near = attention = 0
    region_anomaly: dict[str, list[float]] = defaultdict(list)

    for pcode, series in sorted(by_province.items(), key=lambda item: province_meta_for(item[0])["name"]):
        series.sort(key=lambda p: (p["year"], p["quarter"]))
        latest = next(
            (p for p in reversed(series) if p["year"] == latest_year and p["quarter"] == latest_quarter),
            series[-1],
        )
        latest_full = {
            **latest,
            **_classify_anomaly(latest.get("anomaly_pct")),
        }
        meta = province_meta_for(pcode)
        if latest_full.get("anomaly_pct") is not None:
            region_anomaly[meta["region_id"]].append(float(latest_full["anomaly_pct"]))
        label = latest_full.get("label")
        if label in {"Wet", "Very wet"}:
            wet += 1
        elif label in {"Dry", "Very dry"}:
            dry += 1
        elif label == "Near normal":
            near += 1
        if latest_full.get("attention"):
            attention += 1
        provinces.append(
            {
                "id": pcode,
                "name": meta["name"],
                "region": meta["region"],
                "region_id": meta["region_id"],
                "island": meta["island"],
                "lat": meta.get("lat"),
                "lon": meta.get("lon"),
                "latest": latest_full,
                "quarters": series,
                "recent_quarters": [
                    p
                    for p in series
                    if (p["year"], p["quarter"]) >= (latest_year - 2, latest_quarter)
                ][-8:],
            }
        )

    regions = []
    for region_id, values in sorted(region_anomaly.items()):
        avg = sum(values) / len(values) if values else None
        status = _classify_anomaly(round(avg, 1) if avg is not None else None)
        sample = next((p for p in provinces if p["region_id"] == region_id), None)
        regions.append(
            {
                "id": region_id,
                "name": sample["region"] if sample else region_id,
                "island": sample["island"] if sample else "Unknown",
                "province_count": len(values),
                "anomaly_pct": round(avg, 1) if avg is not None else None,
                **status,
            }
        )

    by_island = {"Luzon": 0, "Visayas": 0, "Mindanao": 0}
    for p in provinces:
        island = p.get("island")
        if island in by_island:
            by_island[island] += 1

    headline = (
        f"Q{latest_quarter} {latest_year}: {wet} wet · {near} near normal · {dry} dry "
        f"across {len(provinces)} provinces"
    )

    return {
        "source": SOURCE_PAGE,
        "source_label": SOURCE_LABEL,
        "source_ref": source_ref,
        "coverage_note": (
            "CHIRPS quarterly province rainfall via HDX (satellite + gauge estimates, "
            "not PAGASA stations). Compared with each province’s long-term average "
            "for the same quarter."
        ),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "year_from": YEAR_FROM,
        "latest_year": latest_year,
        "latest_quarter": latest_quarter,
        "available_years": available_years,
        "periods": periods,
        "province_count": len(provinces),
        "summary": {
            "headline": headline,
            "wet_count": wet,
            "dry_count": dry,
            "near_normal_count": near,
            "attention_count": attention,
            "by_island": by_island,
        },
        "regions": regions,
        "provinces": provinces,
    }


def refresh(*, force: bool = True) -> dict[str, Any]:
    ensure_data_dirs()
    if OUT_PATH.exists() and not force:
        cached = load_cached()
        if cached:
            return cached

    stream = None
    source_ref = ""
    try:
        stream, source_ref = _open_csv_stream()
        reader = csv.DictReader(stream)
        totals = aggregate_quarterly_from_rows(reader)
    finally:
        if stream is not None:
            try:
                stream.close()
            except Exception:
                pass

    payload = build_payload(totals, source_ref=source_ref)
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return payload


def load_cached() -> dict[str, Any] | None:
    if not OUT_PATH.exists():
        return None
    try:
        return json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def cache_has_full_history(payload: dict[str, Any] | None) -> bool:
    """Require periods + province quarter series so year filters can go back to 1990."""
    if not payload:
        return False
    periods = payload.get("periods")
    if not isinstance(periods, list) or len(periods) < 40:
        return False
    provinces = payload.get("provinces") or []
    if not provinces:
        return False
    sample = provinces[0]
    quarters = sample.get("quarters")
    return isinstance(quarters, list) and len(quarters) >= 40


def cache_is_fresh(max_age: int = CACHE_MAX_AGE_SECONDS) -> bool:
    if not OUT_PATH.exists():
        return False
    age = datetime.now(timezone.utc).timestamp() - OUT_PATH.stat().st_mtime
    return age <= max_age


def get_rainfall(
    *,
    refresh_if_missing: bool = True,
    refresh_if_stale: bool = False,
    force: bool = False,
) -> dict[str, Any]:
    if force:
        return refresh(force=True)
    cached = load_cached()
    if cached and not cache_has_full_history(cached):
        # Older/truncated caches only keep recent_quarters (~2024+). Rebuild when possible.
        if refresh_if_missing or refresh_if_stale:
            try:
                return refresh(force=True)
            except Exception:
                return cached
        return cached
    if cached and (not refresh_if_stale or cache_is_fresh()):
        return cached
    if cached and refresh_if_stale and not cache_is_fresh():
        try:
            return refresh(force=True)
        except Exception:
            return cached
    if cached:
        return cached
    if refresh_if_missing:
        return refresh(force=True)
    return {
        "source": SOURCE_PAGE,
        "source_label": SOURCE_LABEL,
        "provinces": [],
        "regions": [],
        "summary": {"headline": "Rainfall cache missing"},
        "message": "Rainfall cache missing",
    }


def main() -> None:
    payload = refresh(force=True)
    print(f"Wrote {OUT_PATH}")
    print(
        f"Provinces={payload['province_count']} · "
        f"latest=Q{payload['latest_quarter']} {payload['latest_year']} · "
        f"{payload['summary']['headline']}"
    )


if __name__ == "__main__":
    main()
