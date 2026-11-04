"""
Philippine dam water-level monitoring from public agency feeds.

Sources:
  - PAGASA Flood Monitoring (major Luzon dams, rich daily table)
    https://www.pagasa.dost.gov.ph/flood
  - National Power Corporation homepage dam status table
    https://www.napocor.gov.ph/
    (adds Mindanao: Pulangi 4, Lake Lanao, Agus cascade; also overlaps Luzon)

Visayas: no agency currently publishes a public live dam-elevation table.
We still list known major Visayas projects so coverage is transparent.
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from typing import Any

try:
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from paths import DATA_DIR, ensure_data_dirs

PAGASA_FLOOD_URL = "https://www.pagasa.dost.gov.ph/flood"
NPC_URL = "https://www.napocor.gov.ph/"
OUT_PATH = DATA_DIR / "dams_status.json"
CACHE_MAX_AGE_SECONDS = 3 * 60 * 60  # 3 hours

# Island + location metadata. Keys are canonical display names.
DAM_META: dict[str, dict[str, Any]] = {
    "Angat": {
        "island": "Luzon",
        "region": "Central Luzon",
        "province": "Bulacan",
        "basin": "Angat River",
        "role": "Metro Manila water supply & irrigation",
        "lat": 14.9078,
        "lon": 121.16,
    },
    "Ipo": {
        "island": "Luzon",
        "region": "Central Luzon",
        "province": "Bulacan",
        "basin": "Angat / Ipo",
        "role": "Metro Manila water supply",
        "lat": 14.87,
        "lon": 121.16,
    },
    "La Mesa": {
        "island": "Luzon",
        "region": "NCR",
        "province": "Quezon City",
        "basin": "La Mesa Watershed",
        "role": "Metro Manila water supply",
        "lat": 14.712,
        "lon": 121.073,
    },
    "Ambuklao": {
        "island": "Luzon",
        "region": "CAR",
        "province": "Benguet",
        "basin": "Agno River",
        "role": "Hydropower & flood control",
        "lat": 16.4597,
        "lon": 120.745,
    },
    "Binga": {
        "island": "Luzon",
        "region": "CAR",
        "province": "Benguet",
        "basin": "Agno River",
        "role": "Hydropower & flood control",
        "lat": 16.3917,
        "lon": 120.7367,
    },
    "San Roque": {
        "island": "Luzon",
        "region": "Ilocos Region",
        "province": "Pangasinan",
        "basin": "Agno River",
        "role": "Hydropower, irrigation & flood control",
        "lat": 16.14,
        "lon": 120.683,
    },
    "Pantabangan": {
        "island": "Luzon",
        "region": "Central Luzon",
        "province": "Nueva Ecija",
        "basin": "Pampanga River",
        "role": "Irrigation & hydropower",
        "lat": 15.812,
        "lon": 121.11,
    },
    "Magat Dam": {
        "island": "Luzon",
        "region": "Cagayan Valley",
        "province": "Isabela / Ifugao",
        "basin": "Magat River",
        "role": "Irrigation & hydropower",
        "lat": 16.825,
        "lon": 121.44,
    },
    "Caliraya": {
        "island": "Luzon",
        "region": "CALABARZON",
        "province": "Laguna",
        "basin": "Caliraya Lake",
        "role": "Hydropower / pumped storage",
        "lat": 14.3,
        "lon": 121.48,
    },
    "Pulangi 4": {
        "island": "Mindanao",
        "region": "Northern Mindanao",
        "province": "Bukidnon",
        "basin": "Pulangi River",
        "role": "Mindanao hydropower & irrigation support",
        "lat": 7.7864,
        "lon": 125.0236,
        "nhwl_m": 285.0,
        "min_operating_m": 282.0,
    },
    "Lake Lanao": {
        "island": "Mindanao",
        "region": "BARMM",
        "province": "Lanao del Sur",
        "basin": "Lake Lanao / Agus River",
        "role": "Main reservoir for Agus hydropower cascade",
        "lat": 7.88,
        "lon": 124.25,
        "nhwl_m": 701.10,
        "min_operating_m": 699.15,
    },
    "Agus 2": {
        "island": "Mindanao",
        "region": "BARMM",
        "province": "Lanao del Sur",
        "basin": "Agus River",
        "role": "Hydropower plant forebay",
        "lat": 8.0,
        "lon": 124.267,
        "kind": "forebay",
    },
    "Agus 4": {
        "island": "Mindanao",
        "region": "Northern Mindanao",
        "province": "Lanao del Norte",
        "basin": "Agus River",
        "role": "Hydropower plant forebay",
        "lat": 8.1167,
        "lon": 124.2167,
        "kind": "forebay",
    },
    "Agus 5": {
        "island": "Mindanao",
        "region": "Northern Mindanao",
        "province": "Lanao del Norte / Iligan",
        "basin": "Agus River",
        "role": "Hydropower plant forebay",
        "lat": 8.1667,
        "lon": 124.2167,
        "kind": "forebay",
    },
    "Agus 6": {
        "island": "Mindanao",
        "region": "Northern Mindanao",
        "province": "Iligan City",
        "basin": "Agus River",
        "role": "Hydropower plant forebay",
        "lat": 8.1833,
        "lon": 124.1944,
        "kind": "forebay",
    },
    "Agus 7": {
        "island": "Mindanao",
        "region": "Northern Mindanao",
        "province": "Iligan City",
        "basin": "Agus River",
        "role": "Hydropower plant forebay",
        "lat": 8.186,
        "lon": 124.21,
        "kind": "forebay",
    },
}

# Canonical name aliases for merging sources.
NAME_ALIASES = {
    "angat": "Angat",
    "ipo": "Ipo",
    "la mesa": "La Mesa",
    "ambuklao": "Ambuklao",
    "binga": "Binga",
    "san roque": "San Roque",
    "pantabangan": "Pantabangan",
    "magat": "Magat Dam",
    "magat dam": "Magat Dam",
    "caliraya": "Caliraya",
    "pulangi 4": "Pulangi 4",
    "pulangi iv": "Pulangi 4",
    "pulangui 4": "Pulangi 4",
    "lake lanao": "Lake Lanao",
    "agus 2": "Agus 2",
    "agus 4": "Agus 4",
    "agus 5": "Agus 5",
    "agus 6": "Agus 6",
    "agus 7": "Agus 7",
}

# Visayas projects with no public live elevation feed (shown for coverage honesty).
VISAYAS_PLACEHOLDERS: list[dict[str, Any]] = [
    {
        "name": "Jalaur High Dam",
        "island": "Visayas",
        "region": "Western Visayas",
        "province": "Iloilo",
        "basin": "Jalaur River",
        "role": "Irrigation, bulk water & hydropower (JRMP II)",
        "lat": 11.1667,
        "lon": 122.5,
        "note": "No agency publishes a public live elevation for this dam yet.",
    },
    {
        "name": "Jalaur Afterbay Dam",
        "island": "Visayas",
        "region": "Western Visayas",
        "province": "Iloilo",
        "basin": "Jalaur River",
        "role": "Irrigation support (JRMP II)",
        "lat": 11.14,
        "lon": 122.52,
        "note": "No agency publishes a public live elevation for this dam yet.",
    },
]

_CURRENT_OBS = re.compile(
    r'<td[^>]*class="[^"]*current-dam[^"]*"[^>]*>(?P<name>[^<]+)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*>(?P<time>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<rwl>[^<]*)</td>\s*'
    r'<td[^>]*rowspan="4"[^>]*>(?P<dev_hr>[^<]*)</td>\s*'
    r'<td[^>]*rowspan="4"[^>]*>(?P<dev_amt>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="4"[^>]*>(?P<nhwl>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<dev_nhwl>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<rule>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<dev_rule>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<gates>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<gate_m>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<inflow>[^<]*)</td>\s*'
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*rowspan="2"[^>]*>(?P<outflow>[^<]*)</td>\s*'
    r"</tr>\s*<tr>\s*"
    r'<td[^>]*class="[^"]*current-data[^"]*"[^>]*>(?P<date>[^<]*)</td>',
    re.IGNORECASE | re.DOTALL,
)

_NPC_ROW = re.compile(
    r'<span class="style8">(?P<name>[^<]+)</span>.*?'
    r"<strong>(?P<elevation>[^<]+)</strong>.*?"
    r"<strong>(?P<discharge>[^<]+)</strong>.*?"
    r"<strong>(?P<updated>[^<]+)</strong>",
    re.IGNORECASE | re.DOTALL,
)


def _fetch_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AgriStat-Data-Analytics/1.0 (+dam-monitoring; research)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def _to_float(raw: str | None) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip().replace(",", "")
    if not text or text in {"-", "—", "N/A", "n/a"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _canonical_name(raw: str) -> str:
    key = re.sub(r"\s+", " ", str(raw or "").strip().lower())
    return NAME_ALIASES.get(key, str(raw or "").strip())


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _fill_pct(rwl: float | None, nhwl: float | None, min_level: float | None = None) -> float | None:
    if rwl is None or nhwl is None or nhwl <= 0:
        return None
    low = min_level if min_level is not None and min_level < nhwl else nhwl * 0.85
    if nhwl <= low:
        return None
    pct = (rwl - low) / (nhwl - low) * 100.0
    return round(max(0.0, min(pct, 120.0)), 1)


def _classify_status(
    *,
    rwl: float | None,
    nhwl: float | None,
    rule: float | None,
    gates: float | None,
    spill_discharge: float | None,
    min_operating: float | None = None,
    has_live: bool = True,
    kind: str | None = None,
) -> dict[str, Any]:
    if not has_live:
        return {
            "code": "no_live",
            "label": "No live reading",
            "plain": "Live water level is not published publicly yet.",
            "tone": "muted",
            "attention": False,
        }

    if nhwl is not None and nhwl <= 0:
        nhwl = None
    if rule is not None and rule <= 0:
        rule = None

    if rwl is None:
        return {
            "code": "unknown",
            "label": "No data",
            "plain": "No water level was reported for this update.",
            "tone": "muted",
            "attention": False,
        }

    # Forebay cascade plants always pass some flow; only flag meaningful spillway release.
    meaningful_spill = spill_discharge is not None and spill_discharge >= 10.0
    gates_open = gates is not None and gates > 0
    releasing = gates_open or meaningful_spill

    if nhwl is not None:
        gap = rwl - nhwl
        if gap >= 0:
            return {
                "code": "critical",
                "label": "Near flood level",
                "plain": "Water is at or above the normal high / spill level. Flood risk downstream is higher.",
                "tone": "danger",
                "attention": True,
            }
        if gap >= -1.0:
            return {
                "code": "watch",
                "label": "Getting full",
                "plain": "Water is close to the normal high / spill level. Keep an eye on updates.",
                "tone": "warn",
                "attention": True,
            }

    if min_operating is not None and rwl <= min_operating:
        return {
            "code": "low",
            "label": "Running low",
            "plain": "Water is at or below the usual minimum operating level. Irrigation/power supply may be constrained.",
            "tone": "warn",
            "attention": True,
        }

    if releasing:
        return {
            "code": "releasing",
            "label": "Releasing water",
            "plain": "Gates or spillway are open — water is being released downstream.",
            "tone": "warn",
            "attention": True,
        }

    if rule is not None and rwl > rule:
        return {
            "code": "above_rule",
            "label": "Above target",
            "plain": "Water is above today's operating target (rule curve), but still below flood level.",
            "tone": "info",
            "attention": False,
        }

    if nhwl is not None:
        return {
            "code": "normal",
            "label": "Looking good",
            "plain": "Water is comfortably below the normal high / spill level.",
            "tone": "ok",
            "attention": False,
        }

    return {
        "code": "reported",
        "label": "Level reported",
        "plain": "Current elevation is available. No public flood-level mark was published for comparison.",
        "tone": "muted",
        "attention": False,
    }


def _lookup_meta(name: str) -> dict[str, Any]:
    meta = dict(DAM_META.get(name, {}))
    if meta:
        return meta
    for item in VISAYAS_PLACEHOLDERS:
        if item.get("name") == name:
            return {
                "island": item.get("island"),
                "region": item.get("region"),
                "province": item.get("province"),
                "basin": item.get("basin"),
                "role": item.get("role"),
                "lat": item.get("lat"),
                "lon": item.get("lon"),
            }
    return {}


def _enrich(dam: dict[str, Any]) -> dict[str, Any]:
    name = dam["name"]
    meta = _lookup_meta(name)
    for key in ("island", "region", "province", "basin", "role", "lat", "lon"):
        if dam.get(key) is None and meta.get(key) is not None:
            dam[key] = meta.get(key)
    dam["kind"] = meta.get("kind")
    if dam.get("nhwl_m") is None and meta.get("nhwl_m") is not None:
        dam["nhwl_m"] = meta["nhwl_m"]
        if dam.get("rwl_m") is not None:
            dam["deviation_from_nhwl_m"] = round(float(dam["rwl_m"]) - float(meta["nhwl_m"]), 2)

    min_op = meta.get("min_operating_m")
    dam["min_operating_m"] = min_op
    dam["fill_pct"] = _fill_pct(dam.get("rwl_m"), dam.get("nhwl_m"), min_op)
    dam["status"] = _classify_status(
        rwl=dam.get("rwl_m"),
        nhwl=dam.get("nhwl_m"),
        rule=dam.get("rule_curve_m"),
        gates=dam.get("gate_opening_count"),
        spill_discharge=dam.get("spill_discharge_cms"),
        min_operating=min_op,
        has_live=dam.get("has_live", True),
        kind=dam.get("kind"),
    )
    dam["id"] = _slug(name)
    dam.setdefault("island", "Unknown")
    return dam


def parse_pagasa_dams(html: str) -> list[dict[str, Any]]:
    table_match = re.search(
        r'<table[^>]*class="[^"]*dam-table[^"]*"[^>]*>.*?</table>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    if not table_match:
        raise RuntimeError("PAGASA dam-table not found on flood page")

    dams: list[dict[str, Any]] = []
    for match in _CURRENT_OBS.finditer(table_match.group(0)):
        name = _canonical_name(match.group("name"))
        rwl = _to_float(match.group("rwl"))
        nhwl = _to_float(match.group("nhwl"))
        rule = _to_float(match.group("rule"))
        if nhwl is not None and nhwl <= 0:
            nhwl = None
        if rule is not None and rule <= 0:
            rule = None
        gates = _to_float(match.group("gates"))
        obs_time = match.group("time").strip()
        obs_date = match.group("date").strip()
        observed_at = " ".join(part for part in (obs_time, obs_date) if part).strip() or None

        dams.append(
            {
                "name": name,
                "has_live": True,
                "source": "pagasa",
                "sources": ["pagasa"],
                "observed_at": observed_at,
                "observation_time": obs_time or None,
                "observation_date": obs_date or None,
                "rwl_m": rwl,
                "nhwl_m": nhwl,
                "deviation_from_nhwl_m": _to_float(match.group("dev_nhwl")) if nhwl is not None else None,
                "rule_curve_m": rule,
                "deviation_from_rule_m": _to_float(match.group("dev_rule")) if rule is not None else None,
                "water_level_change_hours": _to_float(match.group("dev_hr")),
                "water_level_change_m": _to_float(match.group("dev_amt")),
                "gate_opening_count": gates,
                "gate_opening_m": _to_float(match.group("gate_m")),
                "inflow_cms": _to_float(match.group("inflow")),
                "outflow_cms": _to_float(match.group("outflow")),
                "spill_discharge_cms": None,
            }
        )

    if not dams:
        raise RuntimeError("No current dam observations parsed from PAGASA table")
    return dams


def parse_npc_dams(html: str) -> list[dict[str, Any]]:
    section_idx = html.lower().find("status of npc dams")
    section = html[section_idx : section_idx + 20000] if section_idx >= 0 else html
    dams: list[dict[str, Any]] = []
    for match in _NPC_ROW.finditer(section):
        name = _canonical_name(match.group("name"))
        dams.append(
            {
                "name": name,
                "has_live": True,
                "source": "npc",
                "sources": ["npc"],
                "observed_at": match.group("updated").strip() or None,
                "observation_time": None,
                "observation_date": None,
                "rwl_m": _to_float(match.group("elevation")),
                "nhwl_m": None,
                "deviation_from_nhwl_m": None,
                "rule_curve_m": None,
                "deviation_from_rule_m": None,
                "water_level_change_hours": None,
                "water_level_change_m": None,
                "gate_opening_count": None,
                "gate_opening_m": None,
                "inflow_cms": None,
                "outflow_cms": None,
                "spill_discharge_cms": _to_float(match.group("discharge")),
            }
        )
    if not dams:
        raise RuntimeError("No NPC dam rows parsed from napocor.gov.ph")
    return dams


def _visayas_placeholders() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in VISAYAS_PLACEHOLDERS:
        out.append(
            {
                "name": item["name"],
                "has_live": False,
                "source": "catalog",
                "sources": ["catalog"],
                "observed_at": None,
                "observation_time": None,
                "observation_date": None,
                "rwl_m": None,
                "nhwl_m": None,
                "deviation_from_nhwl_m": None,
                "rule_curve_m": None,
                "deviation_from_rule_m": None,
                "water_level_change_hours": None,
                "water_level_change_m": None,
                "gate_opening_count": None,
                "gate_opening_m": None,
                "inflow_cms": None,
                "outflow_cms": None,
                "spill_discharge_cms": None,
                "island": item["island"],
                "region": item["region"],
                "province": item["province"],
                "basin": item["basin"],
                "role": item["role"],
                "lat": item.get("lat"),
                "lon": item.get("lon"),
                "coverage_note": item["note"],
            }
        )
    return out


def merge_dams(
    pagasa: list[dict[str, Any]],
    npc: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}

    for dam in pagasa:
        by_name[dam["name"]] = dam

    for dam in npc:
        existing = by_name.get(dam["name"])
        if not existing:
            by_name[dam["name"]] = dam
            continue
        # Prefer PAGASA detail; enrich with NPC spill discharge / timestamp if useful.
        sources = sorted(set(existing.get("sources", []) + dam.get("sources", [])))
        existing["sources"] = sources
        if existing.get("spill_discharge_cms") is None and dam.get("spill_discharge_cms") is not None:
            existing["spill_discharge_cms"] = dam["spill_discharge_cms"]
        if existing.get("outflow_cms") is None and dam.get("spill_discharge_cms") is not None:
            existing["outflow_cms"] = dam["spill_discharge_cms"]
        if dam.get("spill_discharge_cms") and (
            existing.get("gate_opening_count") is None or existing.get("gate_opening_count") == 0
        ):
            # Keep releasing signal even when PAGASA gate columns are blank.
            pass

    for dam in _visayas_placeholders():
        by_name.setdefault(dam["name"], dam)

    enriched = [_enrich(dict(d)) for d in by_name.values()]

    island_order = {"Luzon": 0, "Visayas": 1, "Mindanao": 2}
    enriched.sort(
        key=lambda d: (
            island_order.get(str(d.get("island")), 9),
            0 if d.get("has_live") else 1,
            str(d.get("name") or ""),
        )
    )
    return enriched


def _summary(dams: list[dict[str, Any]]) -> dict[str, Any]:
    live = [d for d in dams if d.get("has_live")]
    attention = [d for d in live if d.get("status", {}).get("attention")]
    releasing = [d for d in live if d.get("status", {}).get("code") == "releasing"]
    normal = [d for d in live if d.get("status", {}).get("code") in {"normal", "above_rule", "reported"}]
    by_island = {
        "Luzon": sum(1 for d in live if d.get("island") == "Luzon"),
        "Visayas": sum(1 for d in dams if d.get("island") == "Visayas" and d.get("has_live")),
        "Mindanao": sum(1 for d in live if d.get("island") == "Mindanao"),
    }
    return {
        "live_count": len(live),
        "attention_count": len(attention),
        "releasing_count": len(releasing),
        "normal_count": len(normal),
        "by_island": by_island,
        "headline": (
            f"{len(attention)} need attention · {len(releasing)} releasing water · {len(normal)} looking fine"
            if live
            else "No live dam readings available"
        ),
    }


def build_payload(dams: list[dict[str, Any]], *, sources_ok: dict[str, bool]) -> dict[str, Any]:
    return {
        "source": PAGASA_FLOOD_URL,
        "sources": {
            "pagasa": {"url": PAGASA_FLOOD_URL, "ok": bool(sources_ok.get("pagasa")), "label": "PAGASA"},
            "npc": {"url": NPC_URL, "ok": bool(sources_ok.get("npc")), "label": "National Power Corporation"},
        },
        "source_label": "PAGASA + NPC dam monitoring",
        "coverage_note": (
            "Live readings: PAGASA (major Luzon dams) and NPC (Luzon + Mindanao hydropower dams). "
            "Visayas dams are listed for awareness — no public live elevation feed is available yet."
        ),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "dam_count": len(dams),
        "live_count": sum(1 for d in dams if d.get("has_live")),
        "summary": _summary(dams),
        "dams": dams,
    }


def load_cached() -> dict[str, Any] | None:
    if not OUT_PATH.exists():
        return None
    try:
        return json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _cache_age_seconds(payload: dict[str, Any] | None) -> float | None:
    if not payload:
        return None
    raw = payload.get("updated_at")
    if not raw:
        return None
    try:
        stamp = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - stamp).total_seconds()
    except ValueError:
        return None


def refresh(*, force: bool = True) -> dict[str, Any]:
    ensure_data_dirs()
    if OUT_PATH.exists() and not force:
        cached = load_cached()
        if cached:
            return cached

    pagasa_dams: list[dict[str, Any]] = []
    npc_dams: list[dict[str, Any]] = []
    sources_ok = {"pagasa": False, "npc": False}
    errors: list[str] = []

    try:
        pagasa_dams = parse_pagasa_dams(_fetch_html(PAGASA_FLOOD_URL))
        sources_ok["pagasa"] = True
    except Exception as exc:  # noqa: BLE001 - collect source errors, still merge what we can
        errors.append(f"PAGASA: {exc}")

    try:
        npc_dams = parse_npc_dams(_fetch_html(NPC_URL))
        sources_ok["npc"] = True
    except Exception as exc:  # noqa: BLE001
        errors.append(f"NPC: {exc}")

    if not pagasa_dams and not npc_dams:
        raise RuntimeError("; ".join(errors) or "No dam sources available")

    dams = merge_dams(pagasa_dams, npc_dams)
    payload = build_payload(dams, sources_ok=sources_ok)
    if errors:
        payload["source_errors"] = errors

    try:
        OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except OSError:
        pass
    return payload


def _ensure_coords(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    """Backfill lat/lon on cached payloads without a full re-scrape."""
    if not payload or not isinstance(payload.get("dams"), list):
        return payload
    for dam in payload["dams"]:
        if not isinstance(dam, dict):
            continue
        if dam.get("lat") is not None and dam.get("lon") is not None:
            continue
        meta = _lookup_meta(str(dam.get("name") or ""))
        if dam.get("lat") is None and meta.get("lat") is not None:
            dam["lat"] = meta["lat"]
        if dam.get("lon") is None and meta.get("lon") is not None:
            dam["lon"] = meta["lon"]
    return payload


def get_dams(
    *,
    refresh_if_missing: bool = True,
    refresh_if_stale: bool = True,
    force: bool = False,
) -> dict[str, Any]:
    if force and refresh_if_missing:
        return refresh(force=True)

    cached = _ensure_coords(load_cached())
    age = _cache_age_seconds(cached)
    stale = age is None or age > CACHE_MAX_AGE_SECONDS

    if cached and not (refresh_if_stale and stale):
        return cached

    if refresh_if_missing or (refresh_if_stale and stale):
        try:
            return refresh(force=True)
        except Exception:
            if cached:
                return cached
            raise

    return {
        "source": PAGASA_FLOOD_URL,
        "source_label": "PAGASA + NPC dam monitoring",
        "coverage_note": (
            "Live readings: PAGASA (major Luzon dams) and NPC (Luzon + Mindanao hydropower dams). "
            "Visayas dams are listed for awareness — no public live elevation feed is available yet."
        ),
        "updated_at": None,
        "dam_count": 0,
        "live_count": 0,
        "summary": {"headline": "Dam status cache missing", "live_count": 0},
        "dams": [],
        "message": "Dam status cache missing",
    }


def main() -> None:
    payload = refresh(force=True)
    print(f"Wrote {OUT_PATH}")
    print(f"Dams: {payload['dam_count']} (live {payload['live_count']})")
    print(payload["summary"]["headline"])
    for dam in payload["dams"]:
        mark = "live" if dam.get("has_live") else "n/a"
        print(
            f"  [{dam.get('island')}] {dam['name']}: "
            f"RWL={dam.get('rwl_m')} · {dam['status']['label']} ({mark})"
        )


if __name__ == "__main__":
    main()
