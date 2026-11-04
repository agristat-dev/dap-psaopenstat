"""
Fetch and classify El Niño / La Niña years from NOAA CPC Relative Oceanic Niño Index (RONI).

Source:
  https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/

Warm (El Niño) / cold (La Niña) episodes use a +/- 0.5°C RONI threshold for at least
five consecutive overlapping seasons (NOAA CPC definition on that page).
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

try:
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from paths import DATA_DIR, ensure_data_dirs

RONI_URL = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/"
OUT_PATH = DATA_DIR / "enso_roni.json"
THRESHOLD = 0.5
MIN_SEASONS = 5
# Peak |RONI| intensity bins (same magnitude bands CPC uses for ENSO strength).
INTENSITY_THRESHOLDS = (
    (2.0, "very_strong"),
    (1.5, "strong"),
    (1.0, "moderate"),
    (0.5, "weak"),
)
SEASONS = (
    "DJF",
    "JFM",
    "FMA",
    "MAM",
    "AMJ",
    "MJJ",
    "JJA",
    "JAS",
    "ASO",
    "SON",
    "OND",
    "NDJ",
)


def intensity_from_roni(peak_roni: float | None) -> str | None:
    """Map peak RONI (°C) to Weak / Moderate / Strong / Very Strong."""
    if peak_roni is None:
        return None
    try:
        mag = abs(float(peak_roni))
    except (TypeError, ValueError):
        return None
    for floor, label in INTENSITY_THRESHOLDS:
        if mag >= floor:
            return label
    return None


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_td = False
        self.in_th = False
        self.cell = ""
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self.in_td = tag == "td"
            self.in_th = tag == "th"
            self.cell = ""

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self._row is not None:
            self._row.append(self.cell.strip())
            self.in_td = False
            self.in_th = False
            self.cell = ""
        elif tag == "tr" and self._row is not None:
            if any(self._row):
                self.rows.append(self._row)
            self._row = None

    def handle_data(self, data: str) -> None:
        if self.in_td or self.in_th:
            self.cell += data


def _fetch_html() -> str:
    req = urllib.request.Request(
        RONI_URL,
        headers={"User-Agent": "AgriStatDashboard/1.0 (ENSO overlay; contact local)"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def _parse_year_rows(html: str) -> dict[int, list[float | None]]:
    parser = _TableParser()
    parser.feed(html)
    by_year: dict[int, list[float | None]] = {}
    for row in parser.rows:
        if not row:
            continue
        year_m = re.match(r"^(\d{4})$", row[0].strip())
        if not year_m:
            continue
        year = int(year_m.group(1))
        values: list[float | None] = []
        for cell in row[1:13]:
            text = cell.strip().replace("−", "-").replace("–", "-")
            if not text or text in {".", "..", "-"}:
                values.append(None)
                continue
            try:
                values.append(float(text))
            except ValueError:
                values.append(None)
        if len(values) < 12:
            values.extend([None] * (12 - len(values)))
        by_year[year] = values[:12]
    return by_year


def _season_series(by_year: dict[int, list[float | None]]) -> list[tuple[int, int, float]]:
    series: list[tuple[int, int, float]] = []
    for year in sorted(by_year):
        for idx, value in enumerate(by_year[year]):
            if value is None:
                continue
            series.append((year, idx, value))
    return series


def _episode_years(
    series: list[tuple[int, int, float]],
    *,
    warm: bool,
) -> dict[int, dict[str, Any]]:
    """Return years touched by qualifying warm/cold episodes."""
    out: dict[int, dict[str, Any]] = {}
    n = len(series)
    i = 0
    while i < n:
        _year, _season, value = series[i]
        hit = value >= THRESHOLD if warm else value <= -THRESHOLD
        if not hit:
            i += 1
            continue
        j = i
        while j < n:
            v = series[j][2]
            ok = v >= THRESHOLD if warm else v <= -THRESHOLD
            if not ok:
                break
            j += 1
        run = series[i:j]
        if len(run) >= MIN_SEASONS:
            peak = max((abs(v) for _, _, v in run), default=0.0)
            signed_peak = max((v for _, _, v in run), default=0.0) if warm else min(
                (v for _, _, v in run), default=0.0
            )
            for year, season_idx, _v in run:
                info = out.setdefault(
                    year,
                    {
                        "phase": "el_nino" if warm else "la_nina",
                        "peak_roni": signed_peak,
                        "seasons": 0,
                    },
                )
                info["seasons"] = int(info["seasons"]) + 1
                if abs(signed_peak) >= abs(float(info["peak_roni"])):
                    info["peak_roni"] = signed_peak
                info["phase"] = "el_nino" if warm else "la_nina"
        i = j if j > i else i + 1
    return out


def classify_years(by_year: dict[int, list[float | None]]) -> dict[str, Any]:
    series = _season_series(by_year)
    warm = _episode_years(series, warm=True)
    cold = _episode_years(series, warm=False)

    years: dict[str, dict[str, Any]] = {}
    for year in sorted(set(warm) | set(cold)):
        w = warm.get(year)
        c = cold.get(year)
        warm_seasons = int(w["seasons"]) if w else 0
        cold_seasons = int(c["seasons"]) if c else 0

        el_peak = float(w["peak_roni"]) if w else None
        la_peak = float(c["peak_roni"]) if c else None

        if warm_seasons and cold_seasons:
            if warm_seasons > cold_seasons:
                phase = "el_nino"
                peak = el_peak
            elif cold_seasons > warm_seasons:
                phase = "la_nina"
                peak = la_peak
            else:
                phase = "both"
                peak = (
                    el_peak
                    if abs(el_peak or 0) >= abs(la_peak or 0)
                    else la_peak
                )
        elif warm_seasons:
            phase = "el_nino"
            peak = el_peak
        else:
            phase = "la_nina"
            peak = la_peak

        entry: dict[str, Any] = {
            "phase": phase,
            "peak_roni": round(float(peak), 1),
            "intensity": intensity_from_roni(peak),
            "enso_seasons": warm_seasons + cold_seasons,
            "el_nino_seasons": warm_seasons,
            "la_nina_seasons": cold_seasons,
        }
        if el_peak is not None:
            entry["el_nino_peak_roni"] = round(el_peak, 1)
            entry["el_nino_intensity"] = intensity_from_roni(el_peak)
        if la_peak is not None:
            entry["la_nina_peak_roni"] = round(la_peak, 1)
            entry["la_nina_intensity"] = intensity_from_roni(la_peak)
        years[str(year)] = entry

    quarters, semesters = classify_periods(by_year)

    return {
        "source": RONI_URL,
        "source_label": "NOAA CPC Relative Oceanic Niño Index (RONI)",
        "threshold_c": THRESHOLD,
        "min_consecutive_seasons": MIN_SEASONS,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "year_min": min(by_year) if by_year else None,
        "year_max": max(by_year) if by_year else None,
        "years": years,
        "quarters": quarters,
        "semesters": semesters,
    }


# RONI columns are overlapping 3-month seasons: DJF, JFM, FMA, MAM, AMJ, MJJ,
# JJA, JAS, ASO, SON, OND, NDJ (indices 0–11).
_QUARTER_SEASON_IDX = {
    1: (0, 1, 2),    # DJF / JFM / FMA
    2: (3, 4, 5),    # MAM / AMJ / MJJ
    3: (6, 7, 8),    # JJA / JAS / ASO
    4: (9, 10, 11),  # SON / OND / NDJ
}


def _phase_from_roni_mean(values: list[float]) -> dict[str, Any] | None:
    if not values:
        return None
    mean = sum(values) / len(values)
    if mean >= THRESHOLD:
        phase = "el_nino"
    elif mean <= -THRESHOLD:
        phase = "la_nina"
    else:
        return None
    peak = round(mean, 1)
    return {
        "phase": phase,
        "peak_roni": peak,
        "intensity": intensity_from_roni(peak),
    }


def classify_periods(by_year: dict[int, list[float | None]]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Map RONI seasons to calendar quarters and semesters."""
    quarters: dict[str, Any] = {}
    semesters: dict[str, Any] = {}
    for year, seasons in by_year.items():
        if not seasons:
            continue
        padded = list(seasons[:12]) + [None] * max(0, 12 - len(seasons))
        q_means: dict[int, list[float]] = {1: [], 2: [], 3: [], 4: []}
        for q, idxs in _QUARTER_SEASON_IDX.items():
            vals = [float(padded[i]) for i in idxs if padded[i] is not None]
            q_means[q] = vals
            info = _phase_from_roni_mean(vals)
            if info:
                quarters[f"{year}-Q{q}"] = info
        for sem, qpair in ((1, (1, 2)), (2, (3, 4))):
            vals = [v for q in qpair for v in q_means[q]]
            info = _phase_from_roni_mean(vals)
            if info:
                semesters[f"{year}-S{sem}"] = info
    return quarters, semesters


def _enrich_intensity(payload: dict[str, Any]) -> dict[str, Any]:
    """Attach intensity labels from peak_roni when missing (older caches)."""
    for meta in (payload.get("years") or {}).values():
        if not isinstance(meta, dict):
            continue
        peak = meta.get("peak_roni")
        if not meta.get("intensity"):
            meta["intensity"] = intensity_from_roni(peak)
        phase = meta.get("phase")
        if phase in ("el_nino", "both") and meta.get("el_nino_peak_roni") is None and peak is not None and float(peak) > 0:
            meta["el_nino_peak_roni"] = peak
        if phase in ("la_nina", "both") and meta.get("la_nina_peak_roni") is None and peak is not None and float(peak) < 0:
            meta["la_nina_peak_roni"] = peak
        if meta.get("el_nino_peak_roni") is not None and not meta.get("el_nino_intensity"):
            meta["el_nino_intensity"] = intensity_from_roni(meta["el_nino_peak_roni"])
        if meta.get("la_nina_peak_roni") is not None and not meta.get("la_nina_intensity"):
            meta["la_nina_intensity"] = intensity_from_roni(meta["la_nina_peak_roni"])
    for key in ("quarters", "semesters"):
        for meta in (payload.get(key) or {}).values():
            if isinstance(meta, dict) and not meta.get("intensity"):
                meta["intensity"] = intensity_from_roni(meta.get("peak_roni"))
    payload.setdefault(
        "intensity_guide",
        {
            "weak": {"min_abs_c": 0.5, "max_abs_c": 0.9, "label": "Weak"},
            "moderate": {"min_abs_c": 1.0, "max_abs_c": 1.4, "label": "Moderate"},
            "strong": {"min_abs_c": 1.5, "max_abs_c": 1.9, "label": "Strong"},
            "very_strong": {"min_abs_c": 2.0, "max_abs_c": None, "label": "Very Strong"},
            "note": (
                "Intensity uses peak |RONI| in °C. El Niño is positive RONI; "
                "La Niña is negative RONI. Episode declaration still requires "
                "RONI at or beyond ±0.5°C for at least five consecutive overlapping seasons."
            ),
        },
    )
    return payload


def refresh(*, force: bool = True) -> dict[str, Any]:
    ensure_data_dirs()
    if OUT_PATH.exists() and not force:
        cached = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        # Older caches lack period maps; rebuild so quarter/semester overlays work.
        if isinstance(cached.get("quarters"), dict) and isinstance(cached.get("semesters"), dict):
            return _enrich_intensity(cached)
    html = _fetch_html()
    by_year = _parse_year_rows(html)
    if not by_year:
        raise RuntimeError("No RONI year rows parsed from NOAA CPC page")
    payload = _enrich_intensity(classify_years(by_year))
    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def load_cached() -> dict[str, Any] | None:
    if not OUT_PATH.exists():
        return None
    try:
        return _enrich_intensity(json.loads(OUT_PATH.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError):
        return None


def get_enso(*, refresh_if_missing: bool = True) -> dict[str, Any]:
    cached = load_cached()
    if cached and isinstance(cached.get("quarters"), dict) and isinstance(cached.get("semesters"), dict):
        return cached
    if refresh_if_missing:
        return refresh(force=True)
    if cached:
        return cached
    return {
        "source": RONI_URL,
        "source_label": "NOAA CPC Relative Oceanic Niño Index (RONI)",
        "years": {},
        "quarters": {},
        "semesters": {},
        "message": "ENSO RONI cache missing",
    }


def main() -> None:
    payload = refresh(force=True)
    years = payload["years"]
    el_nino = sorted(int(y) for y, meta in years.items() if meta["phase"] in ("el_nino", "both"))
    la_nina = sorted(int(y) for y, meta in years.items() if meta["phase"] in ("la_nina", "both"))
    print(f"Wrote {OUT_PATH}")
    print(f"Years classified: {len(years)}")
    print(f"El Niño years ({len(el_nino)}): {el_nino[-12:]}")
    print(f"La Niña years ({len(la_nina)}): {la_nina[-12:]}")


if __name__ == "__main__":
    main()
