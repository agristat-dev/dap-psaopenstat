"""Shared PSA geography helpers."""

from __future__ import annotations

import re

# Palay dashboard region ids. All other dashboards must resolve to these names.
REGION_CANONICAL = {
    "PHILIPPINES": "Philippines",
    "NCR": "NCR",
    "NATIONAL CAPITAL REGION": "NCR",
    "NATIONAL CAPITAL REGION (NCR)": "NCR",
    "CAR": "CAR",
    "CORDILLERA ADMINISTRATIVE REGION": "CAR",
    "CORDILLERA ADMINISTRATIVE REGION (CAR)": "CAR",
    "REGION I": "Region I",
    "REGION I (ILOCOS REGION)": "Region I",
    "REGION II": "Region II",
    "REGION II (CAGAYAN VALLEY)": "Region II",
    "REGION III": "Region III",
    "REGION III (CENTRAL LUZON)": "Region III",
    "REGION IV-A": "Region IV-A",
    "REGION IV-A (CALABARZON)": "Region IV-A",
    "REGION IV-B": "MIMAROPA",
    "MIMAROPA": "MIMAROPA",
    "MIMAROPA REGION": "MIMAROPA",
    "REGION V": "Region V",
    "REGION V (BICOL REGION)": "Region V",
    "REGION VI": "Region VI",
    "REGION VI (WESTERN VISAYAS)": "Region VI",
    "NIR": "NIR",
    "NEGROS ISLAND REGION": "NIR",
    "NEGROS ISLAND REGION (NIR)": "NIR",
    "REGION VII": "Region VII",
    "REGION VII (CENTRAL VISAYAS)": "Region VII",
    "REGION VIII": "Region VIII",
    "REGION VIII (EASTERN VISAYAS)": "Region VIII",
    "REGION IX": "Region IX",
    "REGION IX (ZAMBOANGA PENINSULA)": "Region IX",
    "REGION X": "Region X",
    "REGION X (NORTHERN MINDANAO)": "Region X",
    "REGION X -(NORTHERN MINDANAO)": "Region X",
    "REGION XI": "Region XI",
    "REGION XI (DAVAO REGION)": "Region XI",
    "REGION XII": "Region XII",
    "REGION XII (SOCCSKSARGEN)": "Region XII",
    "REGION XIII": "Region XIII",
    "REGION XIII (CARAGA)": "Region XIII",
    "BARMM": "BARMM",
    "BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO": "BARMM",
    "BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO (BARMM)": "BARMM",
    "ARMM": "BARMM",
    "AUTONOMOUS REGION IN MUSLIM MINDANAO": "BARMM",
    "AUTONOMOUS REGION IN MUSLIM MINDANAO (ARMM)": "BARMM",
}

GEO_PROPER_NAMES = {
    **REGION_CANONICAL,
    "Davao de Oro (Compostela Valley)": "Davao de Oro",
    "Cotabato (North Cotabato)": "Cotabato",
    "City of Davao": "Davao City",
    "Tawi-tawi": "Tawi-Tawi",
    "Puerto Princesa City": "Puerto Princesa",
    "City of Puerto Princesa": "Puerto Princesa",
    "City of Bacolod": "Bacolod City",
    "City of Zamboanga": "Zamboanga City",
    "City of Butuan": "Butuan City",
}

_GEO_PROPER_NAMES_UPPER = {key.upper(): value for key, value in GEO_PROPER_NAMES.items()}

REGION_CODE_RE = re.compile(
    r"^REGION\s+(IV-A|IV-B|XIII|XII|XI|VIII|VII|VI|IX|IV|III|II|X|V|I)\b",
    re.I,
)
REGION_ACRONYM_RE = re.compile(r"\((CAR|BARMM|ARMM|NIR|NCR|CALABARZON)\)\s*$", re.I)


def semester_from_quarter(quarter: int) -> int:
    return 1 if quarter <= 2 else 2


def strip_psa_markup(label: str) -> str:
    name = re.sub(r"^[\.\x85\u2026\u00b7]+", "", label).strip()
    name = re.sub(r"\s*\d+/\s*$", "", name).strip()
    name = re.sub(r"\)(\d+)$", ")", name).strip()
    name = re.sub(r"\s+\d+$", "", name).strip()
    name = re.sub(r"[a-z]/$", "", name, flags=re.I).strip()
    name = re.sub(r"\s+[a-z]/?\s*$", "", name, flags=re.I).strip()
    return re.sub(r"\s+", " ", name).strip()


def standard_region_name(label: str) -> str | None:
    """Map any PSA region label to the Palay dashboard region id."""
    stripped = strip_psa_markup(label)
    if not stripped:
        return None
    key = stripped.upper()
    if key in REGION_CANONICAL:
        return REGION_CANONICAL[key]
    acronym = REGION_ACRONYM_RE.search(key)
    if acronym:
        token = acronym.group(1).upper()
        if token == "CALABARZON":
            return "Region IV-A"
        if token == "ARMM":
            return "BARMM"
        return token
    coded = REGION_CODE_RE.match(key)
    if coded:
        code = coded.group(1).upper()
        if code == "IV-A":
            return "Region IV-A"
        if code == "IV-B":
            return "MIMAROPA"
        return f"Region {code}"
    if "BANGSAMORO" in key or "MUSLIM MINDANAO" in key or re.search(r"\bARMM\b", key):
        return "BARMM"
    if key.startswith("CORDILLERA"):
        return "CAR"
    if "MIMAROPA" in key:
        return "MIMAROPA"
    if "NEGROS ISLAND" in key:
        return "NIR"
    if "NATIONAL CAPITAL" in key:
        return "NCR"
    return None


def proper_geo_name(label: str) -> str:
    region = standard_region_name(label)
    if region:
        return region
    stripped = strip_psa_markup(label)
    if stripped in GEO_PROPER_NAMES:
        return GEO_PROPER_NAMES[stripped]
    upper = stripped.upper()
    if upper in _GEO_PROPER_NAMES_UPPER:
        return _GEO_PROPER_NAMES_UPPER[upper]
    return stripped


def geo_level_from_label(label: str) -> str:
    """Region vs province from PSA indent dots.

    Region headers are usually prefixed with '..'. Some price tables omit those
    dots (for example 'NEGROS ISLAND REGION 2/'), so a recognized region name
    is still a region. A corrupted indent such as '\\x85.Sulu c/' stays a
    province of whichever region came before it.
    """
    region = standard_region_name(label)
    if region == "Philippines":
        return "national"
    if region:
        return "region"
    indent = len(label) - len(label.lstrip(".\x85\u2026\u00b7"))
    if indent == 0:
        return "national"
    dots = len(label) - len(label.lstrip("."))
    if dots and dots <= 2:
        return "region"
    return "province"


def month_from_period(label: str | None) -> int | None:
    if not label:
        return None
    text = str(label).strip().lower()
    months = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    return months.get(text)


def quarter_from_month(month: int) -> int:
    return (int(month) - 1) // 3 + 1


def quarter_from_period(label: str | None) -> int | None:
    if not label:
        return None
    text = str(label).strip()
    match = re.match(r"Quarter\s*([1-4])", text, flags=re.I)
    if match:
        return int(match.group(1))
    match = re.match(r"Q([1-4])\b", text, flags=re.I)
    if match:
        return int(match.group(1))
    return None


def parse_value(raw) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if text in {"", "..", "...", "-", "NA", "N/A"}:
        return None
    return float(text.replace(",", ""))


def build_geo_lookup(labels: list[str]) -> dict[str, dict[str, str]]:
    lookup: dict[str, dict[str, str]] = {}
    current_region = ""
    for raw_label in labels:
        level = geo_level_from_label(raw_label)
        name = proper_geo_name(raw_label)
        if level == "region":
            current_region = name
            lookup[raw_label] = {"geo_level": level, "region": name, "province": ""}
        elif level == "province":
            lookup[raw_label] = {
                "geo_level": level,
                "region": current_region,
                "province": name,
            }
        else:
            lookup[raw_label] = {"geo_level": level, "region": "", "province": ""}
    return lookup


def ordered_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out
