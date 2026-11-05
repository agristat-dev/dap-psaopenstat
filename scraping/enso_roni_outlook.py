"""
NOAA CPC RONI outlook → calendar-quarter El Niño / La Niña hints for forecast periods.

Source: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/outlook/
Uses the 50% probability (median) forecast column, mapped to calendar quarters the same
way as observed RONI in enso_roni.classify_periods (mean of overlapping seasons per quarter).
"""

from __future__ import annotations

import re
import ssl
import time
import urllib.request
from datetime import datetime, timezone
from typing import Any

_OUTLOOK_CACHE: dict[str, Any] | None = None
_OUTLOOK_CACHE_AT: float = 0.0
OUTLOOK_CACHE_TTL_SEC = 3600

try:
    from .enso_roni import THRESHOLD, _TableParser, _phase_from_roni_mean
except ImportError:
    from enso_roni import THRESHOLD, _TableParser, _phase_from_roni_mean

OUTLOOK_URL = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/outlook/"

# Calendar quarters used by the expanded production forecast chart (dashboard.js).
_OUTLOOK_CHART_HORIZONS = (
    "2026-Q4",
    "2027-Q1",
    "2027-Q2",
    "2027-Q3",
    "2027-Q4",
)

MONTH_ABBR = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}


def _https_context() -> ssl.SSLContext:
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def _fetch_outlook_html() -> str:
    req = urllib.request.Request(
        OUTLOOK_URL,
        headers={"User-Agent": "AgriStatDashboard/1.0 (RONI outlook overlay)"},
    )
    with urllib.request.urlopen(req, timeout=60, context=_https_context()) as resp:
        return resp.read().decode("utf-8", "replace")


def _parse_issue_date(html: str) -> tuple[int, int]:
    match = re.search(r"Issued\s+(\w+)\s+(\d{4})", html, re.I)
    if not match:
        now = datetime.now(timezone.utc)
        return now.year, now.month
    month_name = match.group(1).lower()[:3]
    year = int(match.group(2))
    month_map = {
        "jan": 1,
        "feb": 2,
        "mar": 3,
        "apr": 4,
        "may": 5,
        "jun": 6,
        "jul": 7,
        "aug": 8,
        "sep": 9,
        "oct": 10,
        "nov": 11,
        "dec": 12,
    }
    return year, month_map.get(month_name, 10)


def _parse_float(cell: str) -> float | None:
    text = cell.strip().replace("−", "-").replace("–", "-")
    if not text or text in {".", "..", "-"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_outlook_season_rows(html: str) -> list[dict[str, Any]]:
    parser = _TableParser()
    parser.feed(html)
    rows: list[dict[str, Any]] = []
    header_idx: int | None = None
    for row in parser.rows:
        if not row:
            continue
        head = " ".join(row[:3]).lower()
        if "50%" in head or (len(row) >= 8 and row[1].strip().endswith("%")):
            for i, cell in enumerate(row):
                if cell.strip() == "50%":
                    header_idx = i
                    break
            if header_idx is None and len(row) >= 5:
                header_idx = 4
            continue
        season_match = re.match(r"^([A-Z]{3})\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+){2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)", row[0])
        if not season_match:
            continue
        season = season_match.group(1)
        month_names = re.findall(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)", row[0])
        if len(month_names) != 3:
            continue
        idx = header_idx if header_idx is not None else 4
        if idx >= len(row):
            continue
        roni_50 = _parse_float(row[idx])
        if roni_50 is None:
            continue
        rows.append(
            {
                "season": season,
                "months": month_names,
                "roni_50": roni_50,
            }
        )
    return rows


def _year_for_next_season_first_month(
    mn0: int,
    *,
    prev_y: int,
    prev_m: int,
) -> int:
    """Calendar year for the first month of the next overlapping ENSO season."""
    if mn0 > prev_m:
        if mn0 >= 10 and prev_m <= 3:
            return prev_y - 1
        return prev_y
    if mn0 <= 3 and prev_m >= 10:
        return prev_y + 1
    return prev_y


def _season_calendar_months(
    month_names: list[str],
    *,
    prev_y: int | None,
    prev_m: int | None,
    issue_year: int,
    issue_month: int,
) -> tuple[list[tuple[int, int]], int, int]:
    """Map one overlapping ENSO season (3 month names) to calendar (year, month) triples."""
    nums = [MONTH_ABBR[n] for n in month_names]
    if prev_y is None or prev_m is None:
        y = issue_year if nums[0] <= issue_month else issue_year - 1
    else:
        y = _year_for_next_season_first_month(nums[0], prev_y=prev_y, prev_m=prev_m)
    out: list[tuple[int, int]] = []
    for i, mn in enumerate(nums):
        if i > 0 and mn < nums[i - 1]:
            y += 1
        out.append((y, mn))
    return out, out[-1][0], out[-1][1]


def _quarter_from_month(month: int) -> int:
    return (month - 1) // 3 + 1


def outlook_rows_to_quarters(
    season_rows: list[dict[str, Any]],
    *,
    issue_year: int,
    issue_month: int,
) -> dict[str, Any]:
    """Map outlook season medians to calendar-quarter phase hints."""
    by_quarter_values: dict[str, list[float]] = {}
    prev_y: int | None = None
    prev_m: int | None = None
    for row in season_rows:
        ym_list, prev_y, prev_m = _season_calendar_months(
            row["months"],
            prev_y=prev_y,
            prev_m=prev_m,
            issue_year=issue_year,
            issue_month=issue_month,
        )
        roni = float(row["roni_50"])
        for year, month in ym_list:
            key = f"{year}-Q{_quarter_from_month(month)}"
            by_quarter_values.setdefault(key, []).append(roni)

    quarters: dict[str, Any] = {}
    for key, values in by_quarter_values.items():
        info = _phase_from_roni_mean(values)
        if not info:
            continue
        info = dict(info)
        info["outlook"] = True
        info["roni_outlook_median"] = round(sum(values) / len(values), 2)
        info["source"] = "noaa_cpc_roni_outlook_50pct"
        quarters[key] = info

    last_season_roni = float(season_rows[-1]["roni_50"]) if season_rows else None
    for key in _OUTLOOK_CHART_HORIZONS:
        if key in quarters:
            continue
        values = by_quarter_values.get(key)
        if values:
            info = _phase_from_roni_mean(values)
        elif last_season_roni is not None:
            info = _phase_from_roni_mean([last_season_roni])
        else:
            continue
        if not info:
            continue
        info = dict(info)
        info["outlook"] = True
        info["roni_outlook_median"] = round(
            sum(values) / len(values) if values else last_season_roni,
            2,
        )
        info["source"] = "noaa_cpc_roni_outlook_50pct"
        if not values:
            info["outlook_extrapolated"] = True
        quarters[key] = info
    return quarters


def fetch_roni_outlook() -> dict[str, Any]:
    html = _fetch_outlook_html()
    issue_year, issue_month = _parse_issue_date(html)
    season_rows = _parse_outlook_season_rows(html)
    quarters = outlook_rows_to_quarters(
        season_rows,
        issue_year=issue_year,
        issue_month=issue_month,
    )
    return {
        "source": OUTLOOK_URL,
        "source_label": "NOAA CPC RONI Outlook (50% forecast)",
        "issued": f"{issue_year}-{issue_month:02d}",
        "threshold_c": THRESHOLD,
        "quarters": quarters,
        "seasons_parsed": len(season_rows),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_roni_outlook(*, refresh: bool = True) -> dict[str, Any]:
    global _OUTLOOK_CACHE, _OUTLOOK_CACHE_AT
    if not refresh:
        return {"source": OUTLOOK_URL, "quarters": {}, "message": "outlook refresh disabled"}
    now = time.monotonic()
    if _OUTLOOK_CACHE is not None and now - _OUTLOOK_CACHE_AT < OUTLOOK_CACHE_TTL_SEC:
        return _OUTLOOK_CACHE
    try:
        payload = fetch_roni_outlook()
        _OUTLOOK_CACHE = payload
        _OUTLOOK_CACHE_AT = now
        return payload
    except Exception as exc:
        if _OUTLOOK_CACHE is not None:
            return _OUTLOOK_CACHE
        return {
            "source": OUTLOOK_URL,
            "quarters": {},
            "error": str(exc),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

