"""
Quarterly forecast methods for the expanded production trend chart.

Horizons match dashboard.js CHART_EXPAND_FORECAST_HORIZONS.
"""

from __future__ import annotations

import math
from typing import Any

FORECAST_HORIZONS: tuple[tuple[int, int], ...] = (
    (2026, 4),
    (2027, 1),
    (2027, 2),
    (2027, 3),
    (2027, 4),
)

MIN_ETS_POINTS = 8
MIN_ARIMA_POINTS = 12

_METRIC_LABEL = {
    "volume_mt": "production volume",
    "area_ha": "area harvested",
}


def _normalize_rows(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for p in points or []:
        year = int(p.get("year") or 0)
        quarter = int(p.get("quarter") or 0)
        if year <= 0 or quarter not in (1, 2, 3, 4):
            continue
        vol = p.get("volume_mt")
        area = p.get("area_ha")
        rows.append(
            {
                "year": year,
                "quarter": quarter,
                "volume_mt": float(vol) if vol is not None and _finite(vol) else None,
                "area_ha": float(area) if area is not None and _finite(area) else None,
            }
        )
    rows.sort(key=lambda r: (r["year"], r["quarter"]))
    return rows


def _finite(x: Any) -> bool:
    try:
        return math.isfinite(float(x))
    except (TypeError, ValueError):
        return False


def _before(y: int, q: int, hy: int, hq: int) -> bool:
    return (y, q) < (hy, hq)


def _steps_ahead(ly: int, lq: int, hy: int, hq: int) -> int:
    return (hy - ly) * 4 + (hq - lq)


def _has_actual(rows: list[dict[str, Any]], metric_key: str, hy: int, hq: int) -> bool:
    for r in rows:
        if r["year"] == hy and r["quarter"] == hq:
            val = r.get(metric_key)
            if val is not None and _finite(val):
                return True
    return False


def _series_for_metric(rows: list[dict[str, Any]], metric_key: str) -> list[dict[str, Any]]:
    return [r for r in rows if _finite(r.get(metric_key))]


def _training_rows_for_metric(rows: list[dict[str, Any]], metric_key: str) -> list[dict[str, Any]]:
    """Observed quarters only — excludes forecast-window rows without a reported metric."""
    first_hy, first_hq = FORECAST_HORIZONS[0]
    observed = [
        r
        for r in rows
        if _finite(r.get(metric_key)) and _before(r["year"], r["quarter"], first_hy, first_hq)
    ]
    return _trailing_contiguous_quarters(observed)


def _trailing_contiguous_quarters(series_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep the longest trailing run of consecutive calendar quarters (for ETS/ARIMA)."""
    if not series_rows:
        return []
    ordered = sorted(series_rows, key=lambda r: (r["year"], r["quarter"]))
    tail = [ordered[-1]]
    for idx in range(len(ordered) - 2, -1, -1):
        prev = ordered[idx]
        cur = tail[0]
        if _steps_ahead(prev["year"], prev["quarter"], cur["year"], cur["quarter"]) == 1:
            tail.insert(0, prev)
        else:
            break
    return tail


def _metric_values(series_rows: list[dict[str, Any]], metric_key: str) -> list[float]:
    return [float(r[metric_key]) for r in series_rows]


def _label(metric_key: str) -> str:
    return _METRIC_LABEL.get(metric_key, metric_key)


def _row_metric(rows: list[dict[str, Any]], year: int, quarter: int, metric_key: str) -> float | None:
    for r in rows:
        if r["year"] == year and r["quarter"] == quarter:
            val = r.get(metric_key)
            if val is not None and _finite(val):
                return float(val)
    return None


def _seasonal_naive_metric(
    rows: list[dict[str, Any]],
    metric_key: str,
) -> dict[tuple[int, int], float | None]:
    """Same-quarter seasonal naive (lag 4), chaining earlier forecast horizons when PSA rows are placeholders."""
    out: dict[tuple[int, int], float | None] = {}
    for hy, hq in FORECAST_HORIZONS:
        if _has_actual(rows, metric_key, hy, hq):
            out[(hy, hq)] = None
            continue

        val: float | None = None
        # Prefer value from the same quarter one year earlier (observed or already forecast).
        prev_y = hy - 1
        observed_prev = _row_metric(rows, prev_y, hq, metric_key)
        if observed_prev is not None:
            val = observed_prev
        else:
            prev_forecast = out.get((prev_y, hq))
            if prev_forecast is not None and _finite(prev_forecast):
                val = float(prev_forecast)

        if val is None:
            pool = [
                r
                for r in rows
                if r["quarter"] == hq
                and _before(r["year"], r["quarter"], hy, hq)
                and _finite(r.get(metric_key))
            ]
            if pool:
                val = float(pool[-1][metric_key])

        if val is None:
            for (py, pq), pval in reversed(out.items()):
                if pq == hq and pval is not None and _finite(pval) and _before(py, pq, hy, hq):
                    val = float(pval)
                    break

        out[(hy, hq)] = val if val is not None and _finite(val) else None
    return out


def _fit_ets_forecast(values: list[float], max_step: int, warnings: list[str], metric_key: str) -> list[float] | None:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    label = _label(metric_key)
    n = len(values)
    attempts: list[tuple[str, dict[str, Any]]] = []
    if n >= MIN_ETS_POINTS:
        attempts.append(
            (
                "Holt-Winters (trend + seasonality, period 4)",
                {"trend": "add", "seasonal": "add", "seasonal_periods": 4},
            )
        )
    if n >= 4:
        attempts.append(
            ("Holt linear trend (no seasonality)", {"trend": "add", "seasonal": None}),
        )
    attempts.append(("Simple exponential smoothing", {"trend": None, "seasonal": None}))

    last_error: str | None = None
    for name, kwargs in attempts:
        try:
            model = ExponentialSmoothing(values, **kwargs)
            fit = model.fit(optimized=True, use_brute=True)
            return [float(x) for x in fit.forecast(max_step)]
        except Exception as exc:
            last_error = f"{name}: {exc}"
    if last_error:
        warnings.append(f"{label}: ETS failed ({last_error}).")
    return None


def _fit_arima_forecast(values: list[float], max_step: int, warnings: list[str], metric_key: str) -> list[float] | None:
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    label = _label(metric_key)
    specs: list[tuple[tuple[int, int, int], tuple[int, int, int, int] | None]] = [
        ((1, 0, 1), (1, 0, 1, 4)),
        ((1, 0, 1), None),
    ]
    last_error: str | None = None
    for order, seasonal in specs:
        try:
            model = SARIMAX(
                values,
                order=order,
                seasonal_order=seasonal or (0, 0, 0, 0),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            fit = model.fit(disp=False, maxiter=50)
            return [float(x) for x in fit.forecast(max_step)]
        except Exception as exc:
            last_error = str(exc)
    warnings.append(f"{label}: ARIMA failed ({last_error or 'unknown error'}).")
    return None


def _model_forecast_metric(
    rows: list[dict[str, Any]],
    metric_key: str,
    *,
    method: str,
    warnings: list[str],
) -> dict[tuple[int, int], float | None]:
    label = _label(metric_key)
    series_rows = _training_rows_for_metric(rows, metric_key)
    if not series_rows:
        warnings.append(
            f"{label}: no quarterly history before Q{FORECAST_HORIZONS[0][1]} {FORECAST_HORIZONS[0][0]}; using seasonal naive."
        )
        return _seasonal_naive_metric(rows, metric_key)

    last = series_rows[-1]
    ly, lq = last["year"], last["quarter"]
    needed_steps = [
        _steps_ahead(ly, lq, hy, hq)
        for hy, hq in FORECAST_HORIZONS
        if _steps_ahead(ly, lq, hy, hq) > 0 and not _has_actual(rows, metric_key, hy, hq)
    ]
    if not needed_steps:
        return {(hy, hq): None for hy, hq in FORECAST_HORIZONS}

    max_step = max(needed_steps)
    values = _metric_values(series_rows, metric_key)

    forecast_vals: list[float] | None = None

    if method == "ets":
        if len(values) < 4:
            warnings.append(f"{label}: need at least 4 quarterly points for ETS; using seasonal naive.")
            return _seasonal_naive_metric(rows, metric_key)
        forecast_vals = _fit_ets_forecast(values, max_step, warnings, metric_key)
        if forecast_vals is None:
            warnings.append(f"{label}: falling back to seasonal naive.")
            return _seasonal_naive_metric(rows, metric_key)

    elif method == "arima":
        if len(values) < MIN_ARIMA_POINTS:
            warnings.append(
                f"{label}: need at least {MIN_ARIMA_POINTS} quarterly points for ARIMA; using seasonal naive."
            )
            return _seasonal_naive_metric(rows, metric_key)
        forecast_vals = _fit_arima_forecast(values, max_step, warnings, metric_key)
        if forecast_vals is None:
            warnings.append(f"{label}: falling back to seasonal naive.")
            return _seasonal_naive_metric(rows, metric_key)
    else:
        return _seasonal_naive_metric(rows, metric_key)

    out: dict[tuple[int, int], float | None] = {}
    for hy, hq in FORECAST_HORIZONS:
        if _has_actual(rows, metric_key, hy, hq):
            out[(hy, hq)] = None
            continue
        step = _steps_ahead(ly, lq, hy, hq)
        if step <= 0 or forecast_vals is None or step > len(forecast_vals):
            out[(hy, hq)] = None
            continue
        val = forecast_vals[step - 1]
        out[(hy, hq)] = max(0.0, float(val)) if _finite(val) else None
    return out


def forecast_quarterly_metrics(
    points: list[dict[str, Any]],
    *,
    method: str,
) -> dict[str, Any]:
    method_key = (method or "seasonal_naive").strip().lower()
    if method_key in {"exponential_smoothing", "exp_smoothing", "holt_winters"}:
        method_key = "ets"
    if method_key not in {"seasonal_naive", "ets", "arima"}:
        raise ValueError("method must be seasonal_naive, ets, or arima")

    rows = _normalize_rows(points)
    warnings: list[str] = []

    if not rows:
        warnings.append("No quarterly history under the current filters.")

    if method_key == "seasonal_naive":
        vol_map = _seasonal_naive_metric(rows, "volume_mt")
        area_map = _seasonal_naive_metric(rows, "area_ha")
    else:
        vol_map = _model_forecast_metric(rows, "volume_mt", method=method_key, warnings=warnings)
        area_map = _model_forecast_metric(rows, "area_ha", method=method_key, warnings=warnings)

    horizons: list[dict[str, Any]] = []
    for hy, hq in FORECAST_HORIZONS:
        vol_skip = _has_actual(rows, "volume_mt", hy, hq)
        area_skip = _has_actual(rows, "area_ha", hy, hq)
        horizons.append(
            {
                "year": hy,
                "quarter": hq,
                "volume_mt": None if vol_skip else vol_map.get((hy, hq)),
                "area_ha": None if area_skip else area_map.get((hy, hq)),
                "skipped": vol_skip and area_skip,
                "volume_skipped": vol_skip,
                "area_skipped": area_skip,
            }
        )

    return {
        "method": method_key,
        "horizons": horizons,
        "warnings": warnings,
        "history_quarters": len(rows),
    }
