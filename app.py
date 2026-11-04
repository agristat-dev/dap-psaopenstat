"""
Data Analytics Platform (PSA OpenSTAT) — FastAPI backend.

- Serves analytics APIs from SQLite
- Production tables are fetched from the PSA OpenSTAT PX-Web API by default
  (https://openstat.psa.gov.ph/); set PSA_DATA_SOURCE=bettergov for the Explorer mirror
- Local CSV backups keep dashboards working if the API is unavailable
- Schedules automatic data refresh (default: weekly)
"""

from __future__ import annotations

import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from scraping import pipeline
from scraping.reshape_fruits import DB_PATH as FRUITS_DB, FINAL_CSV as FRUITS_CSV, ensure_fruits_perf
from scraping.reshape_industrial import (
    DB_PATH as INDUSTRIAL_DB,
    FINAL_CSV as INDUSTRIAL_CSV,
    ensure_industrial_perf,
)
from scraping.reshape_palay import DB_PATH as PALAY_DB, FINAL_CSV
from scraping.reshape_fisheries import (
    DB_PATH as FISHERIES_DB,
    ensure_fisheries_perf,
)
from scraping.reshape_farmgate import (
    DB_PATH as FARMGATE_DB,
    ensure_farmgate_perf,
)
from scraping.reshape_farmgate_fisheries import (
    DB_PATH as FARMGATE_FISHERIES_DB,
    ensure_farmgate_fisheries_perf,
)
from scraping.reshape_farmgate_livestock import (
    DB_PATH as FARMGATE_LIVESTOCK_DB,
    ensure_farmgate_livestock_perf,
)
from scraping.reshape_livestock import (
    DB_PATH as LIVESTOCK_DB,
    FINAL_CSV as LIVESTOCK_CSV,
    ensure_livestock_perf,
)
from scraping.reshape_vegetables import (
    DB_PATH as VEGETABLES_DB,
    FINAL_CSV as VEGETABLES_CSV,
    ensure_vegetables_perf,
)

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
IS_SERVERLESS = os.getenv("VERCEL") == "1"

DATASETS: dict[str, dict[str, Any]] = {
    "palay_corn": {
        "db_path": PALAY_DB,
        "table": "palay_long",
        "label": "Palay & Corn",
    },
    "fruits": {
        "db_path": FRUITS_DB,
        "table": "fruits_long",
        "label": "Fruit Crops",
        "annual_table": "fruits_annual",
        "dim_prefix": "fruits_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_fruits_perf,
    },
    "vegetables": {
        "db_path": VEGETABLES_DB,
        "table": "vegetables_long",
        "label": "Vegetables and Root Crops",
        "annual_table": "vegetables_annual",
        "dim_prefix": "vegetables_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_vegetables_perf,
    },
    "industrial": {
        "db_path": INDUSTRIAL_DB,
        "table": "industrial_long",
        "label": "Non-Food and Industrial Crops",
        "annual_table": "industrial_annual",
        "dim_prefix": "industrial_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_industrial_perf,
    },
    "livestock": {
        "db_path": LIVESTOCK_DB,
        "table": "livestock_long",
        "label": "Livestock and Poultry",
        "annual_table": "livestock_annual",
        "dim_prefix": "livestock_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_livestock_perf,
    },
    "fisheries": {
        "db_path": FISHERIES_DB,
        "table": "fisheries_long",
        "label": "Fisheries",
        "annual_table": "fisheries_annual",
        "dim_prefix": "fisheries_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_fisheries_perf,
    },
    "farmgate": {
        "db_path": FARMGATE_DB,
        "table": "farmgate_long",
        "label": "Crops Farmgate Prices",
        "annual_table": "farmgate_annual",
        "dim_prefix": "farmgate_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_farmgate_perf,
        "value_mode": "avg",
    },
    "farmgate_fisheries": {
        "db_path": FARMGATE_FISHERIES_DB,
        "table": "farmgate_fisheries_long",
        "label": "Fisheries Farmgate Prices",
        "annual_table": "farmgate_fisheries_annual",
        "dim_prefix": "farmgate_fisheries_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_farmgate_fisheries_perf,
        "value_mode": "avg",
        "period_grain": "quarter",
    },
    "farmgate_livestock": {
        "db_path": FARMGATE_LIVESTOCK_DB,
        "table": "farmgate_livestock_long",
        "label": "Livestock and Poultry Farmgate Prices",
        "annual_table": "farmgate_livestock_annual",
        "dim_prefix": "farmgate_livestock_dim",
        "priority_crop_top_n": 3,
        "ensure_perf": ensure_farmgate_livestock_perf,
        "value_mode": "avg",
        "board_family": "livestock_poultry",
    },
}

# Backward-compatible alias used by health / bootstrap messaging
DB_PATH = PALAY_DB

app = FastAPI(title="Data Analytics Platform (PSA OpenSTAT)", version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler: BackgroundScheduler | None = None
if not IS_SERVERLESS:
    scheduler = BackgroundScheduler()


def _is_sqlite_file(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 100:
        return False
    try:
        with path.open("rb") as fh:
            return fh.read(16).startswith(b"SQLite format 3")
    except OSError:
        return False


def resolve_dataset(dataset: Optional[str]) -> dict[str, Any]:
    key = (dataset or "palay_corn").strip().lower()
    if key not in DATASETS:
        raise HTTPException(status_code=400, detail=f"Unknown dataset: {dataset}")
    cfg = DATASETS[key]
    db_path = Path(cfg["db_path"])
    if not _is_sqlite_file(db_path):
        raise HTTPException(
            status_code=503,
            detail=f"Dataset '{key}' is not ready yet.",
        )
    return {"key": key, **cfg}


class RefreshResponse(BaseModel):
    status: str
    message: str
    last_success: Optional[str] = None
    last_error: Optional[str] = None
    last_started: Optional[str] = None


@contextmanager
def db(dataset: str = "palay_corn") -> Iterator[sqlite3.Connection]:
    cfg = resolve_dataset(dataset)
    db_path = Path(cfg["db_path"])
    if IS_SERVERLESS:
        conn = sqlite3.connect(
            f"file:{db_path.as_posix()}?mode=ro&immutable=1",
            uri=True,
            check_same_thread=False,
        )
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only=ON")
    else:
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA temp_store=MEMORY")
        conn.execute("PRAGMA cache_size=-64000")
        conn.execute("PRAGMA mmap_size=268435456")
    try:
        yield conn
    finally:
        conn.close()


def _volume_agg(cfg: dict[str, Any]) -> str:
    return "AVG(volume_mt)" if cfg.get("value_mode") == "avg" else "SUM(volume_mt)"


def _area_agg(cfg: dict[str, Any]) -> str:
    return "AVG(area_ha)" if cfg.get("value_mode") == "avg" else "SUM(area_ha)"


def _agg_table(
    cfg: dict[str, Any],
    *,
    quarter: Optional[list[int]] = None,
    semester: Optional[list[int]] = None,
    month: Optional[list[int]] = None,
) -> str:
    """Prefer annual rollup when intra-year filters are inactive."""
    annual = cfg.get("annual_table")
    if annual and not quarter and not semester and not month:
        return annual
    return cfg["table"]


def _ensure_perf_tables() -> None:
    for cfg in DATASETS.values():
        ensure_perf = cfg.get("ensure_perf")
        db_path = Path(cfg["db_path"])
        if not ensure_perf or not db_path.exists():
            continue
        try:
            conn = sqlite3.connect(db_path)
            try:
                ensure_perf(conn)
            finally:
                conn.close()
        except sqlite3.Error:
            pass


def _ensure_dataset() -> None:
    pipeline.bootstrap_db_from_csv_if_needed()
    if _is_sqlite_file(DB_PATH):
        source = "csv-backup" if FINAL_CSV.exists() else "local-db"
        try:
            import json

            provenance = ROOT / "data" / "palay_source.json"
            if provenance.exists():
                payload = json.loads(provenance.read_text(encoding="utf-8"))
                source = payload.get("api_origin") or source
        except Exception:
            pass
        pipeline._state.update(
            {
                "status": "ok",
                "message": "Using existing local datasets (CSV backups available)",
                "last_success": datetime.utcfromtimestamp(DB_PATH.stat().st_mtime).isoformat() + "Z",
                "source": source,
            }
        )
        missing = [
            key
            for key, cfg in DATASETS.items()
            if not _is_sqlite_file(Path(cfg["db_path"]))
        ]
        if missing and not IS_SERVERLESS:
            pipeline.refresh_in_background()
        return

    if IS_SERVERLESS:
        pipeline._state.update(
            {
                "status": "error",
                "message": "Dataset missing in deployment bundle.",
            }
        )
        return

    pipeline.refresh_in_background()


def _scheduled_refresh() -> None:
    try:
        pipeline.refresh_from_api()
    except Exception:
        pipeline.bootstrap_db_from_csv_if_needed()


@app.on_event("startup")
def on_startup() -> None:
    try:
        _ensure_dataset()
        if not IS_SERVERLESS:
            _ensure_perf_tables()
            if scheduler is not None and not scheduler.running:
                scheduler.add_job(
                    _scheduled_refresh,
                    trigger="cron",
                    day_of_week="mon",
                    hour=2,
                    minute=0,
                    id="palay_weekly_refresh",
                    replace_existing=True,
                )
                scheduler.start()
    except Exception:
        # Never crash the function on boot; serve a degraded health response instead.
        pass


@app.on_event("shutdown")
def on_shutdown() -> None:
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/api/health")
def health() -> dict[str, Any]:
    from scraping.data_source import active_source, api_origin, source_label

    return {
        "ok": True,
        "db_exists": _is_sqlite_file(PALAY_DB),
        "data_source": active_source(),
        "api_origin": api_origin(),
        "source_label": source_label(),
        "datasets": {
            key: {
                "ready": _is_sqlite_file(Path(cfg["db_path"])),
                "label": cfg["label"],
            }
            for key, cfg in DATASETS.items()
        },
        "refresh": pipeline.get_refresh_state(),
    }


@app.get("/api/enso")
def enso() -> dict[str, Any]:
    """El Niño / La Niña year tags from NOAA CPC Relative Oceanic Niño Index (RONI)."""
    try:
        from scraping import enso_roni
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"ENSO module unavailable: {exc}") from exc
    try:
        return enso_roni.get_enso(refresh_if_missing=not IS_SERVERLESS)
    except Exception as exc:
        cached = enso_roni.load_cached()
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"ENSO data unavailable: {exc}") from exc


@app.get("/api/dams")
def dams(refresh: bool = False) -> dict[str, Any]:
    """Major Philippine dam water levels from PAGASA Flood Monitoring."""
    try:
        from scraping import dams_pagasa
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"Dams module unavailable: {exc}") from exc
    try:
        return dams_pagasa.get_dams(
            refresh_if_missing=not IS_SERVERLESS,
            refresh_if_stale=not IS_SERVERLESS,
            force=bool(refresh) and not IS_SERVERLESS,
        )
    except Exception as exc:
        cached = dams_pagasa.load_cached()
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"Dam data unavailable: {exc}") from exc


@app.get("/api/rainfall")
def rainfall(refresh: bool = False) -> dict[str, Any]:
    """Province quarterly rainfall (CHIRPS via HDX), 1990–present."""
    try:
        from scraping import rainfall_chirps
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=f"Rainfall module unavailable: {exc}") from exc
    try:
        return rainfall_chirps.get_rainfall(
            refresh_if_missing=not IS_SERVERLESS,
            refresh_if_stale=not IS_SERVERLESS,
            force=bool(refresh) and not IS_SERVERLESS,
        )
    except Exception as exc:
        cached = rainfall_chirps.load_cached()
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"Rainfall data unavailable: {exc}") from exc


@app.get("/api/refresh/status", response_model=RefreshResponse)
def refresh_status() -> dict:
    return pipeline.get_refresh_state()


@app.post("/api/refresh", response_model=RefreshResponse)
def refresh_now() -> dict:
    """Kick off a background OpenSTAT (or Explorer) pull + reshape. Falls back to CSV backup."""
    if IS_SERVERLESS:
        raise HTTPException(
            status_code=501,
            detail="Live refresh is disabled on Vercel. Update the CSV backup locally and redeploy.",
        )
    return pipeline.refresh_in_background()


@app.get("/api/meta")
def meta(dataset: str = Query("palay_corn")) -> dict[str, Any]:
    from scraping.data_source import api_origin, source_label

    cfg = resolve_dataset(dataset)
    table = cfg["table"]
    with db(dataset) as conn:
        dim_prefix = cfg.get("dim_prefix")
        annual_table = cfg.get("annual_table")
        use_dims = bool(
            dim_prefix
            and annual_table
            and conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
                (f"{dim_prefix}_year",),
            ).fetchone()
        )
        if use_dims:
            years = [
                r[0]
                for r in conn.execute(f"SELECT value FROM {dim_prefix}_year ORDER BY value")
            ]
            regions = [
                r[0]
                for r in conn.execute(f"SELECT value FROM {dim_prefix}_region ORDER BY value")
            ]
            provinces = [
                {"region": r["region"], "province": r["province"]}
                for r in conn.execute(
                    f"SELECT region, province FROM {dim_prefix}_province "
                    "ORDER BY region, province"
                )
            ]
            crops = [
                {"crop_group": r["crop_group"], "crop_subtype": r["crop_subtype"]}
                for r in conn.execute(
                    f"SELECT crop_group, crop_subtype FROM {dim_prefix}_crop "
                    "ORDER BY crop_group, crop_subtype"
                )
            ]
            crop_groups = sorted({c["crop_group"] for c in crops})
            quarters = [
                r[0]
                for r in conn.execute(f"SELECT value FROM {dim_prefix}_quarter ORDER BY value")
            ]
            semesters = [
                r[0]
                for r in conn.execute(f"SELECT value FROM {dim_prefix}_semester ORDER BY value")
            ]
            month_table = f"{dim_prefix}_month"
            months = []
            if conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
                (month_table,),
            ).fetchone():
                months = [
                    r[0]
                    for r in conn.execute(f"SELECT value FROM {month_table} ORDER BY value")
                ]
            totals = conn.execute(
                f"""
                SELECT COUNT(*) AS rows,
                       MIN(year) AS year_min,
                       MAX(year) AS year_max,
                       {_volume_agg(cfg)} AS volume_sum,
                       {_area_agg(cfg)} AS area_sum
                FROM {annual_table}
                """
            ).fetchone()
            totals = dict(totals)
            totals["rows"] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        else:
            years = [r[0] for r in conn.execute(f"SELECT DISTINCT year FROM {table} ORDER BY year")]
            regions = [
                r[0] for r in conn.execute(f"SELECT DISTINCT region FROM {table} ORDER BY region")
            ]
            provinces = [
                {"region": r["region"], "province": r["province"]}
                for r in conn.execute(
                    f"SELECT DISTINCT region, province FROM {table} ORDER BY region, province"
                )
            ]
            crops = [
                {"crop_group": r["crop_group"], "crop_subtype": r["crop_subtype"]}
                for r in conn.execute(
                    f"SELECT DISTINCT crop_group, crop_subtype FROM {table} "
                    "ORDER BY crop_group, crop_subtype"
                )
            ]
            crop_groups = sorted({c["crop_group"] for c in crops})
            quarters = [
                r[0] for r in conn.execute(f"SELECT DISTINCT quarter FROM {table} ORDER BY quarter")
            ]
            semesters = [
                r[0]
                for r in conn.execute(f"SELECT DISTINCT semester FROM {table} ORDER BY semester")
            ]
            col_names = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            months = []
            if "month" in col_names:
                months = [
                    r[0]
                    for r in conn.execute(f"SELECT DISTINCT month FROM {table} ORDER BY month")
                ]
            totals = conn.execute(
                f"""
                SELECT COUNT(*) AS rows,
                       MIN(year) AS year_min,
                       MAX(year) AS year_max,
                       {_volume_agg(cfg)} AS volume_sum,
                       {_area_agg(cfg)} AS area_sum
                FROM {table}
                """
            ).fetchone()

    return {
        "dataset": cfg["key"],
        "years": years,
        "regions": regions,
        "provinces": provinces,
        "crops": crops,
        "crop_groups": crop_groups,
        "quarters": quarters,
        "semesters": semesters,
        "months": months,
        "value_mode": cfg.get("value_mode") or "sum",
        "summary": dict(totals) if totals else {},
        "refresh": pipeline.get_refresh_state(),
        "source": source_label(),
        "api_origin": api_origin(),
        "csv_backup": FINAL_CSV.name if FINAL_CSV.exists() else None,
    }


def _filters_sql(
    *,
    year_from: Optional[int],
    year_to: Optional[int],
    region: Optional[list[str]],
    province: Optional[list[str]],
    crop_group: Optional[list[str]],
    crop_subtype: Optional[list[str]],
    quarter: Optional[list[int]],
    semester: Optional[list[int]],
    month: Optional[list[int]] = None,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    if year_from is not None:
        clauses.append("year >= ?")
        params.append(year_from)
    if year_to is not None:
        clauses.append("year <= ?")
        params.append(year_to)
    if region:
        clauses.append(f"region IN ({','.join('?' for _ in region)})")
        params.extend(region)
    if province:
        clauses.append(f"province IN ({','.join('?' for _ in province)})")
        params.extend(province)
    if crop_group:
        clauses.append(f"crop_group IN ({','.join('?' for _ in crop_group)})")
        params.extend(crop_group)
    if crop_subtype:
        clauses.append(f"crop_subtype IN ({','.join('?' for _ in crop_subtype)})")
        params.extend(crop_subtype)
    if quarter:
        clauses.append(f"quarter IN ({','.join('?' for _ in quarter)})")
        params.extend(quarter)
    if semester:
        clauses.append(f"semester IN ({','.join('?' for _ in semester)})")
        params.extend(semester)
    if month:
        clauses.append(f"month IN ({','.join('?' for _ in month)})")
        params.extend(month)

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


_SQL_IDENTIFIERS = (
    "volume_mt",
    "crop_subtype",
    "crop_group",
    "semester",
    "quarter",
    "province",
    "region",
    "month",
    "year",
)


def _qualify_sql(sql: str, alias: str) -> str:
    out = sql
    for col in _SQL_IDENTIFIERS:
        out = re.sub(rf"\b{col}\b", f"{alias}.{col}", out)
    return out


@app.get("/api/series")
def series(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
    grain: str = Query("year"),
) -> dict[str, Any]:
    """Filtered time series for charts.

    grain=year (default): one point per year (uses annual rollup when available).
    grain=quarter|semester: one point per year+period from the long table.
    """
    cfg = resolve_dataset(dataset)
    grain_key = (grain or "year").strip().lower()
    if grain_key not in {"year", "quarter", "semester"}:
        raise HTTPException(status_code=400, detail="grain must be year, quarter, or semester")

    if grain_key == "year":
        table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
        where, params = _filters_sql(
            year_from=year_from,
            year_to=year_to,
            region=region,
            province=province,
            crop_group=crop_group,
            crop_subtype=crop_subtype,
            quarter=quarter if table == cfg["table"] else None,
            semester=semester if table == cfg["table"] else None,
            month=month if table == cfg["table"] else None,
        )
        sql = f"""
            SELECT year,
                   {_volume_agg(cfg)} AS volume_mt,
                   {_area_agg(cfg)} AS area_ha,
                   CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
            FROM {table}
            {where}
            GROUP BY year
            ORDER BY year
        """
    else:
        table = cfg["table"]
        where, params = _filters_sql(
            year_from=year_from,
            year_to=year_to,
            region=region,
            province=province,
            crop_group=crop_group,
            crop_subtype=crop_subtype,
            quarter=quarter,
            semester=semester,
            month=month,
        )
        period_col = "quarter" if grain_key == "quarter" else "semester"
        sql = f"""
            SELECT year,
                   {period_col} AS {period_col},
                   {_volume_agg(cfg)} AS volume_mt,
                   {_area_agg(cfg)} AS area_ha,
                   CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
            FROM {table}
            {where}
            GROUP BY year, {period_col}
            ORDER BY year, {period_col}
        """

    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {
        "grain": grain_key,
        "quarter": quarter,
        "semester": semester,
        "month": month,
        "points": rows,
    }


@app.get("/api/series-by-month")
def series_by_month(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Monthly series for seasonality (always from the long table)."""
    cfg = resolve_dataset(dataset)
    table = cfg["table"]
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter,
        semester=semester,
        month=month,
    )
    sql = f"""
        SELECT year,
               month,
               {_volume_agg(cfg)} AS volume_mt
        FROM {table}
        {where}
        GROUP BY year, month
        ORDER BY year, month
    """
    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {"points": rows}


_MONTH_LABELS = (
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
)


_QUARTER_END_MONTHS = {3: 1, 6: 2, 9: 3, 12: 4}


def _month_label(year: int, month: int) -> str:
    if month < 1 or month > 12:
        return str(year)
    return f"{_MONTH_LABELS[month - 1]} {year}"


def _period_label(year: int, month: int, grain: str = "month") -> str:
    if grain == "quarter":
        quarter = _QUARTER_END_MONTHS.get(month) or ((max(1, min(12, month)) - 1) // 3 + 1)
        return f"Q{quarter} {year}"
    return _month_label(year, month)


def _previous_month(year: int, month: int) -> tuple[int, int]:
    if month <= 1:
        return year - 1, 12
    return year, month - 1


def _place_label(region: Optional[str], province: Optional[str]) -> str:
    region_name = (region or "").strip()
    province_name = (province or "").strip()
    if province_name and region_name and province_name != region_name:
        return f"{province_name}, {region_name}"
    return province_name or region_name


def _period_payload(year: int, month: int, grain: str = "month") -> dict[str, Any]:
    payload: dict[str, Any] = {
        "year": year,
        "month": month,
        "label": _period_label(year, month, grain),
    }
    if grain == "quarter":
        payload["quarter"] = _QUARTER_END_MONTHS.get(month) or (
            (max(1, min(12, month)) - 1) // 3 + 1
        )
    return payload


def _price_month_pair(
    conn: sqlite3.Connection,
    table: str,
    *,
    year_from: Optional[int],
    year_to: Optional[int],
    region: Optional[list[str]],
    province: Optional[list[str]],
    crop_group: Optional[list[str]],
    crop_subtype: Optional[list[str]],
    quarter: Optional[list[int]],
    semester: Optional[list[int]],
    month: Optional[list[int]],
) -> tuple[Optional[tuple[int, int]], Optional[tuple[int, int]]]:
    """Latest month matching year/quarter/semester/month filters, then the prior calendar month.

    Previous is not constrained by month/quarter/semester so a June filter still
    compares June vs May, and January can roll back to December of the prior year.
    """
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter,
        semester=semester,
        month=month,
    )
    latest_sql = f"{where} AND volume_mt > 0" if where else " WHERE volume_mt > 0"
    latest = conn.execute(
        f"SELECT year, month FROM {table} {latest_sql} ORDER BY year DESC, month DESC LIMIT 1",
        params,
    ).fetchone()
    if not latest:
        return None, None
    latest_year = int(latest["year"])
    latest_month = int(latest["month"])

    where_prev, params_prev = _filters_sql(
        year_from=None,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=None,
        semester=None,
        month=None,
    )
    prev_clause = (
        f"{where_prev} AND volume_mt > 0 AND (year < ? OR (year = ? AND month < ?))"
        if where_prev
        else " WHERE volume_mt > 0 AND (year < ? OR (year = ? AND month < ?))"
    )
    previous = conn.execute(
        f"""
        SELECT year, month
        FROM {table}
        {prev_clause}
        ORDER BY year DESC, month DESC
        LIMIT 1
        """,
        [*params_prev, latest_year, latest_year, latest_month],
    ).fetchone()
    if not previous:
        return (latest_year, latest_month), None
    return (latest_year, latest_month), (int(previous["year"]), int(previous["month"]))


@app.get("/api/price-board")
def price_board(
    dataset: str = Query("farmgate"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Latest-month farmgate board: national average, prior period, and local high/low."""
    cfg = resolve_dataset(dataset)
    if cfg.get("value_mode") != "avg":
        return {"as_of": None, "previous": None, "items": []}

    table = cfg["table"]
    board_year_from = year_from
    if year_from is not None and year_to is not None:
        board_year_from = max(int(year_from), int(year_to) - 1)
    with db(dataset) as conn:
        where, params = _filters_sql(
            year_from=board_year_from,
            year_to=year_to,
            region=region,
            province=province,
            crop_group=crop_group,
            crop_subtype=crop_subtype,
            quarter=quarter,
            semester=semester,
            month=month,
        )
        where_prev, params_prev = _filters_sql(
            year_from=None,
            year_to=year_to,
            region=region,
            province=province,
            crop_group=crop_group,
            crop_subtype=crop_subtype,
            quarter=None,
            semester=None,
            month=None,
        )
        latest_sql = f"{where} AND volume_mt > 0" if where else " WHERE volume_mt > 0"
        prev_sql = f"{where_prev} AND volume_mt > 0" if where_prev else " WHERE volume_mt > 0"
        prev_where = _qualify_sql(prev_sql, "p") if prev_sql else " WHERE p.volume_mt > 0"
        if prev_where.upper().startswith(" WHERE "):
            prev_where = (
                f"{prev_where} AND (p.year * 100 + p.month) < l.ym "
                f"AND p.year >= (l.ym / 100) - 1"
            )
        else:
            prev_where = (
                " WHERE p.volume_mt > 0 AND (p.year * 100 + p.month) < l.ym "
                "AND p.year >= (l.ym / 100) - 1"
            )
        current_rows = [
            dict(r)
            for r in conn.execute(
                f"""
                WITH latest AS (
                    SELECT crop_group, crop_subtype, MAX(year * 100 + month) AS ym
                    FROM {table}
                    {latest_sql}
                    GROUP BY crop_group, crop_subtype
                ),
                ranked AS (
                    SELECT f.crop_group, f.crop_subtype, f.year, f.month, f.region, f.province, f.volume_mt,
                           AVG(f.volume_mt) OVER (PARTITION BY f.crop_group, f.crop_subtype) AS current_price,
                           COUNT(*) OVER (PARTITION BY f.crop_group, f.crop_subtype) AS geo_count,
                           ROW_NUMBER() OVER (
                             PARTITION BY f.crop_group, f.crop_subtype
                             ORDER BY f.volume_mt ASC, f.province ASC, f.region ASC
                           ) AS rn_low,
                           ROW_NUMBER() OVER (
                             PARTITION BY f.crop_group, f.crop_subtype
                             ORDER BY f.volume_mt DESC, f.province ASC, f.region ASC
                           ) AS rn_high
                    FROM {table} f
                    JOIN latest l
                      ON f.crop_group = l.crop_group
                     AND f.crop_subtype = l.crop_subtype
                     AND (f.year * 100 + f.month) = l.ym
                    WHERE f.volume_mt > 0
                )
                SELECT * FROM ranked WHERE rn_low = 1 OR rn_high = 1
                """,
                params,
            )
        ]
        if not current_rows:
            return {"as_of": None, "previous": None, "items": []}

        previous_rows = [
            dict(r)
            for r in conn.execute(
                f"""
                WITH latest AS (
                    SELECT crop_group, crop_subtype, MAX(year * 100 + month) AS ym
                    FROM {table}
                    {latest_sql}
                    GROUP BY crop_group, crop_subtype
                ),
                prev AS (
                    SELECT p.crop_group, p.crop_subtype, MAX(p.year * 100 + p.month) AS ym
                    FROM {table} p
                    JOIN latest l
                      ON p.crop_group = l.crop_group
                     AND p.crop_subtype = l.crop_subtype
                    {prev_where}
                    GROUP BY p.crop_group, p.crop_subtype
                )
                SELECT p.crop_group, AVG(p.volume_mt) AS volume_mt, COUNT(*) AS geo_count,
                       MAX(p.year) AS year, MAX(p.month) AS month
                FROM {table} p
                JOIN prev v
                  ON p.crop_group = v.crop_group
                 AND p.crop_subtype = v.crop_subtype
                 AND (p.year * 100 + p.month) = v.ym
                WHERE p.volume_mt > 0
                GROUP BY p.crop_group
                """,
                [*params, *params_prev],
            )
        ]
        period_year_rows: list[dict[str, Any]] = []
        if crop_group:
            period_where, period_params = _filters_sql(
                year_from=year_from,
                year_to=year_to,
                region=region,
                province=province,
                crop_group=crop_group,
                crop_subtype=crop_subtype,
                quarter=quarter,
                semester=semester,
                month=month,
            )
            period_avg_sql = f"{period_where} AND volume_mt > 0" if period_where else " WHERE volume_mt > 0"
            period_year_rows = [
                dict(r)
                for r in conn.execute(
                    f"""
                    SELECT crop_group, year, AVG(volume_mt) AS volume_mt
                    FROM {table}
                    {period_avg_sql}
                    GROUP BY crop_group, year
                    """,
                    period_params,
                )
            ]

    as_of_pair = None
    for row in current_rows:
        pair = (int(row["year"]), int(row["month"]))
        if as_of_pair is None or pair > as_of_pair:
            as_of_pair = pair

    previous_by_name = {
        row["crop_group"]: {
            "price": float(row["volume_mt"]),
            "geo_count": int(row["geo_count"] or 0),
            "year": int(row["year"]) if row.get("year") is not None else None,
            "month": int(row["month"]) if row.get("month") is not None else None,
        }
        for row in previous_rows
        if row.get("crop_group") and row.get("volume_mt") is not None
    }
    period_years_by_name: dict[str, list[float]] = {}
    for row in period_year_rows:
        name = row.get("crop_group")
        price = row.get("volume_mt")
        if not name or price is None:
            continue
        period_years_by_name.setdefault(name, []).append(float(price))
    grouped: dict[str, dict[str, Any]] = {}
    for row in current_rows:
        name = row.get("crop_group")
        current = row.get("current_price")
        price = row.get("volume_mt")
        if not name or current is None or price is None:
            continue
        price = float(price)
        bucket = grouped.setdefault(
            name,
            {
                "name": name,
                "family": (
                    _livestock_farmgate_family(name)
                    if cfg.get("board_family") == "livestock_poultry"
                    else row.get("crop_subtype")
                    or ("Other fisheries" if cfg.get("period_grain") == "quarter" else "Other crops")
                ),
                "current": float(current),
                "geo_count": int(row.get("geo_count") or 0),
                "low": None,
                "high": None,
                "year": int(row["year"]),
                "month": int(row["month"]),
            },
        )
        place = {
            "price": price,
            "region": row.get("region") or "",
            "province": row.get("province") or "",
            "place": _place_label(row.get("region"), row.get("province")),
        }
        if int(row.get("rn_low") or 0) == 1:
            bucket["low"] = place
        if int(row.get("rn_high") or 0) == 1:
            bucket["high"] = place

    items = []
    for name in sorted(grouped, key=lambda value: value.lower()):
        bucket = grouped[name]
        previous_row = previous_by_name.get(name) or {}
        previous = previous_row.get("price")
        year_avgs = period_years_by_name.get(name) or []
        period_average = sum(year_avgs) / len(year_avgs) if year_avgs else None
        items.append(
            {
                "name": name,
                "family": bucket["family"],
                "current": bucket["current"],
                "previous": previous,
                "period_average": period_average,
                "period_years": len(year_avgs),
                "geo_count": bucket["geo_count"],
                "previous_geo_count": previous_row.get("geo_count") or None,
                "low": bucket["low"],
                "high": bucket["high"],
            }
        )
    prev_pairs = {
        (row.get("year"), row.get("month"))
        for row in previous_by_name.values()
        if row.get("year") is not None and row.get("month") is not None
    }
    previous_pair = next(iter(prev_pairs)) if len(prev_pairs) == 1 else None
    grain = cfg.get("period_grain") or "month"
    return {
        "as_of": _period_payload(*as_of_pair, grain=grain) if as_of_pair else None,
        "previous": _period_payload(int(previous_pair[0]), int(previous_pair[1]), grain=grain)
        if previous_pair
        else None,
        "items": items,
    }


def _farmgate_volume_crops(
    crop_group: Optional[list[str]] = None,
    crop_subtype: Optional[list[str]] = None,
) -> list[str]:
    by_commodity = {
        "Bush Sitao, Paayap [Cowpea]": ["Cowpea"],
        "Sitao [Stringbeans]": ["Sitao"],
        "Patani [Lima beans]": ["Patani"],
        "Mongo [Mungbean] yellow, labo": ["Mongo"],
        "Mongo [Mungbean], green, labo": ["Mongo"],
        "Mongo [Mungbean], green, shiny": ["Mongo"],
        "Mongo [Mungbean], yellow, shiny": ["Mongo"],
        "Peanut without shell, fresh": ["Peanut"],
        "Peanut, with shell, dry": ["Peanut"],
        "Peanut, with shell, fresh": ["Peanut"],
        "Peanut, without shell, dry": ["Peanut"],
        "Kadios [Pigeon pea]": ["Kadios"],
        "Kadios [Pigeon pea], dry": ["Kadios"],
        "Habitchuelas [Snap beans]": ["Habitchuelas"],
        "Soybeans": ["Soybeans"],
        "Sweet Peas, Native": ["Sweet peas"],
        "Sweet peas, Baguio (Chinese)": ["Sweet peas"],
        "Sigarilyas [Winged beans]": ["Sigarilyas"],
        "Yam beans": ["Yam beans"],
    }
    by_family = {
        "Beans and Legumes": ["Sitao", "Cowpea", "Patani", "Mongo", "Peanut", "Kadios", "Habitchuelas", "Soybeans", "Sweet peas", "Sigarilyas", "Yam beans"],
    }
    mapped: list[str] = []
    for name in crop_group or []:
        if name in by_commodity:
            mapped.extend(by_commodity[name])
            continue
        key = name.lower()
        if key.startswith("mongo"):
            mapped.append("Mongo")
        elif key.startswith("peanut"):
            mapped.append("Peanut")
        elif key.startswith("kadios"):
            mapped.append("Kadios")
        elif "sitao" in key and "bush" in key:
            mapped.append("Cowpea")
        elif "sitao" in key:
            mapped.append("Sitao")
    if not mapped:
        for family in crop_subtype or []:
            mapped.extend(by_family.get(family, []))
    if not mapped:
        for crops in by_commodity.values():
            mapped.extend(crops)
    unique: list[str] = []
    seen: set[str] = set()
    for name in mapped:
        if name not in seen:
            seen.add(name)
            unique.append(name)
    return unique


def _quarters_from_months(month: Optional[list[int]]) -> Optional[list[int]]:
    if not month:
        return None
    quarters = sorted({((int(value) - 1) // 3) + 1 for value in month if 1 <= int(value) <= 12})
    if not quarters or quarters == [1, 2, 3, 4]:
        return None
    return quarters


def _livestock_farmgate_family(name: str) -> str:
    key = (name or "").lower()
    if any(token in key for token in ("chicken", "duck", "gamefowl", "egg")):
        return "Poultry"
    return "Livestock"


def _farmgate_livestock_volume_crops(crop_group: Optional[list[str]] = None) -> list[str]:
    mapping = (
        ("chicken egg", "Chicken Egg"),
        ("duck egg", "Duck Egg"),
        ("carabao", "Carabao"),
        ("cattle", "Cattle"),
        ("goat", "Goat"),
        ("hog", "Hog"),
        ("chicken", "Chicken"),
        ("duck", "Duck"),
    )
    mapped: list[str] = []
    seen: set[str] = set()
    for name in crop_group or []:
        key = name.lower()
        match = next((dest for needle, dest in mapping if needle in key), None)
        if match and match not in seen:
            seen.add(match)
            mapped.append(match)
    return mapped


def _overlay_species_names(crop_group: Optional[list[str]] = None) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for raw in crop_group or []:
        candidates = [raw]
        if "(" in raw and ")" in raw:
            candidates.append(raw.split("(")[0].strip())
            inner = raw[raw.find("(") + 1 : raw.rfind(")")].strip()
            if inner:
                candidates.append(inner)
        for name in candidates:
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return names


@app.get("/api/overlay-volume")
def overlay_volume(
    dataset: str = Query("farmgate"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Annual production volume to overlay on farmgate price trends."""
    key = (dataset or "").strip().lower()
    overlay_quarter = quarter or _quarters_from_months(month)
    if key == "farmgate_fisheries":
        overlay_key = "fisheries"
        overlay_crops = _overlay_species_names(crop_group)
        overlay_subtype = crop_subtype
    elif key == "farmgate_livestock":
        overlay_key = "livestock"
        overlay_crops = _farmgate_livestock_volume_crops(crop_group)
        overlay_subtype = None
    elif key == "farmgate":
        overlay_key = "vegetables"
        overlay_crops = _farmgate_volume_crops(crop_group, crop_subtype)
        overlay_subtype = None
    else:
        return {"points": [], "source": None, "crops": []}

    cfg = DATASETS[overlay_key]
    table = _agg_table(cfg, quarter=overlay_quarter, semester=semester, month=None)
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=overlay_crops,
        crop_subtype=overlay_subtype,
        quarter=overlay_quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=None,
    )
    sql = f"""
        SELECT year, {_volume_agg(cfg)} AS volume_mt
        FROM {table}
        {where}
        GROUP BY year
        ORDER BY year
    """
    with db(overlay_key) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {"points": rows, "source": overlay_key, "crops": overlay_crops}


@app.get("/api/series-by-ecosystem")
def series_by_ecosystem(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
    split_by: str = Query("crop_subtype"),
    grain: str = Query("year"),
) -> dict[str, Any]:
    """Time series split by subtype or crop group (optional quarter/semester grain)."""
    cfg = resolve_dataset(dataset)
    grain_key = (grain or "year").strip().lower()
    if grain_key not in {"year", "quarter", "semester"}:
        raise HTTPException(status_code=400, detail="grain must be year, quarter, or semester")
    dim = "crop_group" if split_by == "crop_group" else "crop_subtype"

    if grain_key == "year":
        table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
        where, params = _filters_sql(
            year_from=year_from,
            year_to=year_to,
            region=region,
            province=province,
            crop_group=crop_group,
            crop_subtype=crop_subtype,
            quarter=quarter if table == cfg["table"] else None,
            semester=semester if table == cfg["table"] else None,
            month=month if table == cfg["table"] else None,
        )
        sql = f"""
            SELECT year,
                   {dim} AS crop_subtype,
                   {_volume_agg(cfg)} AS volume_mt,
                   {_area_agg(cfg)} AS area_ha,
                   CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
            FROM {table}
            {where}
            GROUP BY year, {dim}
            ORDER BY year, {dim}
        """
    else:
        table = cfg["table"]
        where, params = _filters_sql(
            year_from=year_from,
            year_to=year_to,
            region=region,
            province=province,
            crop_group=crop_group,
            crop_subtype=crop_subtype,
            quarter=quarter,
            semester=semester,
            month=month,
        )
        period_col = "quarter" if grain_key == "quarter" else "semester"
        sql = f"""
            SELECT year,
                   {period_col} AS {period_col},
                   {dim} AS crop_subtype,
                   {_volume_agg(cfg)} AS volume_mt,
                   {_area_agg(cfg)} AS area_ha,
                   CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
            FROM {table}
            {where}
            GROUP BY year, {period_col}, {dim}
            ORDER BY year, {period_col}, {dim}
        """

    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {
        "grain": grain_key,
        "points": rows,
        "split_by": dim,
        "quarter": quarter,
        "semester": semester,
        "month": month,
    }


@app.get("/api/series-by-region")
def series_by_region(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Annual time series split by region. Farmgate prices compare latest vs previous month."""
    cfg = resolve_dataset(dataset)
    if cfg.get("value_mode") == "avg":
        table = cfg["table"]
        with db(dataset) as conn:
            current, previous = _price_month_pair(
                conn,
                table,
                year_from=year_from,
                year_to=year_to,
                region=region,
                province=province,
                crop_group=crop_group,
                crop_subtype=crop_subtype,
                quarter=quarter,
                semester=semester,
                month=month,
            )
            if not current:
                return {"as_of": None, "previous": None, "points": [], "province_points": []}

            points: list[dict[str, Any]] = []
            province_points: list[dict[str, Any]] = []
            for period in (current, previous):
                if not period:
                    continue
                period_year, period_month = period
                where, params = _filters_sql(
                    year_from=period_year,
                    year_to=period_year,
                    region=region,
                    province=province,
                    crop_group=crop_group,
                    crop_subtype=crop_subtype,
                    quarter=None,
                    semester=None,
                    month=[period_month],
                )
                rows = conn.execute(
                    f"""
                    SELECT year,
                           month,
                           region,
                           {_volume_agg(cfg)} AS volume_mt
                    FROM {table}
                    {where}
                      AND volume_mt > 0
                    GROUP BY year, month, region
                    ORDER BY region
                    """,
                    params,
                )
                points.extend(dict(r) for r in rows)
                province_rows = conn.execute(
                    f"""
                    SELECT year,
                           month,
                           region,
                           province,
                           {_volume_agg(cfg)} AS volume_mt
                    FROM {table}
                    {where}
                      AND volume_mt > 0
                    GROUP BY year, month, region, province
                    ORDER BY region, province
                    """,
                    params,
                )
                province_points.extend(dict(r) for r in province_rows)
            latest_year, latest_month = current
            grain = cfg.get("period_grain") or "month"
            return {
                "as_of": _period_payload(latest_year, latest_month, grain=grain),
                "previous": _period_payload(*previous, grain=grain) if previous else None,
                "points": points,
                "province_points": province_points,
            }

    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=month if table == cfg["table"] else None,
    )
    sql = f"""
        SELECT year,
               region,
               {_volume_agg(cfg)} AS volume_mt,
               {_area_agg(cfg)} AS area_ha,
               CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
        FROM {table}
        {where}
        GROUP BY year, region
        ORDER BY year, region
    """
    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {"points": rows}


@app.get("/api/annual-by-region")
def annual_by_region(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Year columns of regional (and provincial) values for the annual matrix table."""
    cfg = resolve_dataset(dataset)
    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=month if table == cfg["table"] else None,
    )
    positive = " AND volume_mt > 0" if cfg.get("value_mode") == "avg" else ""
    if positive and not where:
        where = " WHERE volume_mt > 0"
        positive = ""
    with db(dataset) as conn:
        region_rows = [
            dict(r)
            for r in conn.execute(
                f"""
                SELECT year,
                       region,
                       {_volume_agg(cfg)} AS volume_mt
                FROM {table}
                {where}
                {positive}
                GROUP BY year, region
                ORDER BY year, region
                """,
                params,
            )
        ]
        province_rows = [
            dict(r)
            for r in conn.execute(
                f"""
                SELECT year,
                       region,
                       province,
                       {_volume_agg(cfg)} AS volume_mt
                FROM {table}
                {where}
                {positive}
                GROUP BY year, region, province
                ORDER BY year, region, province
                """,
                params,
            )
        ]
    years = sorted({int(row["year"]) for row in region_rows if row.get("year") is not None})
    return {"years": years, "points": region_rows, "province_points": province_rows}


@app.get("/api/series-by-province")
def series_by_province(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Annual production volume split by province."""
    cfg = resolve_dataset(dataset)
    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=month if table == cfg["table"] else None,
    )
    sql = f"""
        SELECT year,
               region,
               province,
               {_volume_agg(cfg)} AS volume_mt
        FROM {table}
        {where}
        GROUP BY year, region, province
        ORDER BY year, region, province
    """
    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {"points": rows}


@app.get("/api/by-region-ecosystem")
def by_region_ecosystem(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
    split_by: str = Query("crop_subtype"),
) -> dict[str, Any]:
    """Region × subtype/crop aggregates for volume, area, and yield."""
    cfg = resolve_dataset(dataset)
    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    dim = "crop_group" if split_by == "crop_group" else "crop_subtype"
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=month if table == cfg["table"] else None,
    )
    sql = f"""
        SELECT region,
               {dim} AS crop_subtype,
               {_volume_agg(cfg)} AS volume_mt,
               {_area_agg(cfg)} AS area_ha,
               CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
        FROM {table}
        {where}
        GROUP BY region, {dim}
        ORDER BY region, {dim}
    """
    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {"rows": rows, "split_by": dim}


@app.get("/api/by-region")
def by_region(
    dataset: str = Query("palay_corn"),
    year: Optional[int] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    cfg = resolve_dataset(dataset)
    if year is not None:
        year_from = year
        year_to = year
    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=None,
        province=None,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=month if table == cfg["table"] else None,
    )
    sql = f"""
        SELECT region,
               {_volume_agg(cfg)} AS volume_mt,
               {_area_agg(cfg)} AS area_ha,
               CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
        FROM {table}
        {where}
        GROUP BY region
        ORDER BY volume_mt DESC
    """
    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, params)]
    return {"quarter": quarter, "semester": semester, "rows": rows}


@app.get("/api/by-province")
def by_province(
    dataset: str = Query("palay_corn"),
    year: Optional[int] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    cfg = resolve_dataset(dataset)
    if year is not None:
        year_from = year
        year_to = year
    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    where, params = _filters_sql(
        year_from=year_from,
        year_to=year_to,
        region=region,
        province=province,
        crop_group=crop_group,
        crop_subtype=crop_subtype,
        quarter=quarter if table == cfg["table"] else None,
        semester=semester if table == cfg["table"] else None,
        month=month if table == cfg["table"] else None,
    )
    sql = f"""
        SELECT region, province,
               {_volume_agg(cfg)} AS volume_mt,
               {_area_agg(cfg)} AS area_ha,
               CASE WHEN {_area_agg(cfg)} > 0 THEN {_volume_agg(cfg)} / {_area_agg(cfg)} END AS yield_mt_ha
        FROM {table}
        {where}
        GROUP BY region, province
        ORDER BY volume_mt DESC
        LIMIT ?
    """
    with db(dataset) as conn:
        rows = [dict(r) for r in conn.execute(sql, [*params, limit])]
    return {"quarter": quarter, "semester": semester, "rows": rows}


@app.get("/api/kpis")
def kpis(
    dataset: str = Query("palay_corn"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    year: Optional[int] = None,
    region: Optional[list[str]] = Query(None),
    province: Optional[list[str]] = Query(None),
    crop_group: Optional[list[str]] = Query(None),
    crop_subtype: Optional[list[str]] = Query(None),
    quarter: Optional[list[int]] = Query(None),
    semester: Optional[list[int]] = Query(None),
    month: Optional[list[int]] = Query(None),
) -> dict[str, Any]:
    """Scorecard averages = period totals ÷ number of selected years."""
    cfg = resolve_dataset(dataset)
    table = _agg_table(cfg, quarter=quarter, semester=semester, month=month)
    q_filter = quarter if table == cfg["table"] else None
    s_filter = semester if table == cfg["table"] else None
    m_filter = month if table == cfg["table"] else None
    price_mode = cfg.get("value_mode") == "avg"

    with db(dataset) as conn:
        bounds = conn.execute(
            f"SELECT MIN(year) AS y_min, MAX(year) AS y_max FROM {table}"
        ).fetchone()
        y_min = int(bounds["y_min"]) if bounds and bounds["y_min"] is not None else 1990
        y_max = int(bounds["y_max"]) if bounds and bounds["y_max"] is not None else 2026

        if year is not None and year_from is None and year_to is None:
            year_from = year
            year_to = year
        if year_from is None:
            year_from = y_min
        if year_to is None:
            year_to = y_max
        if year_from > year_to:
            year_from, year_to = year_to, year_from

        # Match right-hand volume tables: selected end year vs previous year.
        compare_to = year_to
        compare_from = max(y_min, compare_to - 1)

        year_count = year_to - year_from + 1

        def _avgs_from_sums(
            volume_sum: Optional[float], area_sum: Optional[float], n_years: int
        ) -> dict[str, Any]:
            denom = n_years if n_years > 0 else None
            if price_mode:
                volume_avg = volume_sum
                area_avg = area_sum
            else:
                volume_avg = (volume_sum / denom) if volume_sum is not None and denom else None
                area_avg = (area_sum / denom) if area_sum is not None and denom else None
            yield_mt_ha = (
                (volume_avg / area_avg)
                if volume_avg is not None and area_avg not in (None, 0)
                else None
            )
            return {
                "volume_mt_avg": volume_avg,
                "area_ha_avg": area_avg,
                "yield_mt_ha": yield_mt_ha,
                "years_with_data": n_years,
            }

        def _period_year_avgs(
            yf: int,
            yt: int,
            n_years: int,
            *,
            subtypes: Optional[list[str]] = None,
            groups: Optional[list[str]] = None,
        ) -> dict[str, Any]:
            where, params = _filters_sql(
                year_from=yf,
                year_to=yt,
                region=region,
                province=province,
                crop_group=groups if groups is not None else crop_group,
                crop_subtype=subtypes if subtypes is not None else crop_subtype,
                quarter=q_filter,
                semester=s_filter,
                month=m_filter,
            )
            row = conn.execute(
                f"""
                SELECT {_volume_agg(cfg)} AS volume_sum,
                       {_area_agg(cfg)} AS area_sum
                FROM {table}
                {where}
                """,
                params,
            ).fetchone()
            volume_sum = row["volume_sum"] if row else None
            area_sum = row["area_sum"] if row else None
            return _avgs_from_sums(volume_sum, area_sum, n_years)

        def _total_volume(y: int) -> Optional[float]:
            where, params = _filters_sql(
                year_from=y,
                year_to=y,
                region=region,
                province=province,
                crop_group=crop_group,
                crop_subtype=crop_subtype,
                quarter=q_filter,
                semester=s_filter,
                month=m_filter,
            )
            row = conn.execute(
                f"SELECT {_volume_agg(cfg)} AS volume_mt FROM {table} {where}",
                params,
            ).fetchone()
            return row["volume_mt"] if row else None

        by_priority_crop: list[dict[str, Any]] = []
        priority_top_n = cfg.get("priority_crop_top_n")
        priority = list(cfg.get("priority_crops") or [])

        if priority_top_n or priority:
            where, params = _filters_sql(
                year_from=year_from,
                year_to=year_to,
                region=region,
                province=province,
                crop_group=crop_group,
                crop_subtype=crop_subtype,
                quarter=q_filter,
                semester=s_filter,
                month=m_filter,
            )
            by_group = {
                r["crop_group"]: dict(r)
                for r in conn.execute(
                    f"""
                    SELECT crop_group,
                           {_volume_agg(cfg)} AS volume_sum,
                           {_area_agg(cfg)} AS area_sum
                    FROM {table}
                    {where}
                    GROUP BY crop_group
                    ORDER BY {_volume_agg(cfg)} IS NULL, {_volume_agg(cfg)} DESC, crop_group
                    """,
                    params,
                )
            }
            volume_sum = None
            if price_mode:
                current = _period_year_avgs(year_from, year_to, year_count)
            elif by_group:
                volume_sum = sum((r["volume_sum"] or 0) for r in by_group.values())
                area_sum = sum((r["area_sum"] or 0) for r in by_group.values())
                current = _avgs_from_sums(volume_sum, area_sum, year_count)
            else:
                current = _avgs_from_sums(None, None, year_count)

            ranked = list(by_group.keys())
            if priority_top_n:
                priority = ranked[: int(priority_top_n)]
            subtype_pair = (ranked + list(priority)[:2])[:2]
            while len(subtype_pair) < 2:
                subtype_pair.append("—")

            def _group_avgs(group_name: str) -> dict[str, Any]:
                if not group_name or group_name == "—":
                    return _avgs_from_sums(None, None, year_count)
                row = by_group.get(group_name)
                return _avgs_from_sums(
                    row["volume_sum"] if row else None,
                    row["area_sum"] if row else None,
                    year_count,
                )

            subtype_a = _group_avgs(subtype_pair[0])
            subtype_b = _group_avgs(subtype_pair[1])

            missing = [c for c in priority if c not in by_group]
            priority_map = {k: by_group[k] for k in priority if k in by_group}
            if missing and not priority_top_n:
                p_where, p_params = _filters_sql(
                    year_from=year_from,
                    year_to=year_to,
                    region=region,
                    province=province,
                    crop_group=list(priority),
                    crop_subtype=[],
                    quarter=q_filter,
                    semester=s_filter,
                    month=m_filter,
                )
                for r in conn.execute(
                    f"""
                    SELECT crop_group,
                           {_volume_agg(cfg)} AS volume_sum,
                           {_area_agg(cfg)} AS area_sum
                    FROM {table}
                    {p_where}
                    GROUP BY crop_group
                    """,
                    p_params,
                ):
                    priority_map[r["crop_group"]] = dict(r)

            # Share denominator: filtered view uses selected crops; otherwise all crops.
            crop_filter_active = bool(crop_group) or bool(crop_subtype)
            if crop_filter_active:
                share_denominator = volume_sum
            else:
                all_where, all_params = _filters_sql(
                    year_from=year_from,
                    year_to=year_to,
                    region=region,
                    province=province,
                    crop_group=None,
                    crop_subtype=[],
                    quarter=q_filter,
                    semester=s_filter,
                    month=m_filter,
                )
                all_row = conn.execute(
                    f"SELECT {_volume_agg(cfg)} AS volume_sum FROM {table} {all_where}",
                    all_params,
                ).fetchone()
                share_denominator = all_row["volume_sum"] if all_row else None

            for crop_name in priority:
                row = priority_map.get(crop_name)
                av = _avgs_from_sums(
                    row["volume_sum"] if row else None,
                    row["area_sum"] if row else None,
                    year_count,
                )
                crop_sum = row["volume_sum"] if row else None
                share_pct = None
                if (
                    not price_mode
                    and crop_sum is not None
                    and share_denominator is not None
                    and share_denominator != 0
                ):
                    share_pct = (crop_sum / share_denominator) * 100.0
                by_priority_crop.append(
                    {
                        "crop_group": crop_name,
                        "volume_mt_avg": av["volume_mt_avg"],
                        "share_pct": share_pct,
                    }
                )
        else:
            current = _period_year_avgs(year_from, year_to, year_count)
            primary_group = (crop_group[0] if crop_group else None) or "Palay"
            subtype_defaults = {
                "Palay": ["Irrigated", "Rainfed"],
                "Corn": ["Yellow", "White"],
            }
            defaults = list(
                subtype_defaults.get(primary_group, subtype_defaults["Palay"])
            )
            subtype_pair = defaults[:]
            if crop_subtype:
                requested = [s for s in defaults if s in crop_subtype]
                extras = [s for s in crop_subtype if s not in requested]
                ordered = requested + extras
                for name in defaults:
                    if name not in ordered:
                        ordered.append(name)
                subtype_pair = ordered[:2] or defaults[:]
            # KPI cards always expect a pair; pad from defaults if needed.
            while len(subtype_pair) < 2:
                fallback = defaults[len(subtype_pair)] if len(subtype_pair) < len(defaults) else "—"
                subtype_pair.append(fallback)

            empty_avgs = _avgs_from_sums(None, None, year_count)
            subtype_a = (
                _period_year_avgs(
                    year_from,
                    year_to,
                    year_count,
                    subtypes=[subtype_pair[0]],
                    groups=[primary_group],
                )
                if subtype_pair[0] and subtype_pair[0] != "—"
                else empty_avgs
            )
            subtype_b = (
                _period_year_avgs(
                    year_from,
                    year_to,
                    year_count,
                    subtypes=[subtype_pair[1]],
                    groups=[primary_group],
                )
                if subtype_pair[1] and subtype_pair[1] != "—"
                else empty_avgs
            )

        vol_2025 = _total_volume(compare_to)
        vol_2024 = _total_volume(compare_from)

    variance = None
    growth_rate_pct = None
    if vol_2025 is not None and vol_2024 is not None:
        variance = vol_2025 - vol_2024
        if vol_2024 != 0:
            growth_rate_pct = (variance / vol_2024) * 100.0

    a_vol = subtype_a["volume_mt_avg"]
    b_vol = subtype_b["volume_mt_avg"]
    subtype_total = None
    if a_vol is not None or b_vol is not None:
        subtype_total = (a_vol or 0) + (b_vol or 0)

    def _share(part: Optional[float]) -> Optional[float]:
        if price_mode or part is None or subtype_total in (None, 0):
            return None
        return part / subtype_total * 100.0

    return {
        "year_from": year_from,
        "year_to": year_to,
        "year_count": year_count,
        "years_with_data": current["years_with_data"],
        "quarter": quarter,
        "semester": semester,
        "month": month,
        "volume_mt_avg": current["volume_mt_avg"],
        "area_ha_avg": current["area_ha_avg"],
        "yield_mt_ha": current["yield_mt_ha"],
        "by_subtype": [
            {
                "crop_subtype": subtype_pair[0],
                "volume_mt_avg": a_vol,
                "area_ha_avg": subtype_a["area_ha_avg"],
                "yield_mt_ha": subtype_a["yield_mt_ha"],
                "share_pct": _share(a_vol),
            },
            {
                "crop_subtype": subtype_pair[1],
                "volume_mt_avg": b_vol,
                "area_ha_avg": subtype_b["area_ha_avg"],
                "yield_mt_ha": subtype_b["yield_mt_ha"],
                "share_pct": _share(b_vol),
            },
        ],
        "by_priority_crop": by_priority_crop,
        "comparison": {
            "year_from": compare_from,
            "year_to": compare_to,
            "volume_mt_from": vol_2024,
            "volume_mt_to": vol_2025,
            "variance_mt": variance,
            "growth_rate_pct": growth_rate_pct,
        },
    }


LANDING_SNAPSHOTS: list[dict[str, Any]] = [
    {"id": "palay", "dataset": "palay_corn", "label": "Palay", "crop_group": "Palay"},
    {"id": "corn", "dataset": "palay_corn", "label": "Corn", "crop_group": "Corn"},
    {"id": "fruits", "dataset": "fruits", "label": "Fruit Crops", "crop_group": None},
    {"id": "vegetables", "dataset": "vegetables", "label": "Vegetables", "crop_group": None},
]

LANDING_BREAKDOWN: dict[str, dict[str, Any]] = {
    "palay": {"title": "Ecosystem", "subtypes": ("Irrigated", "Rainfed")},
    "corn": {"title": "Variety", "subtypes": ("Yellow", "White")},
}


def _volume_for_years(
    conn: sqlite3.Connection,
    table: str,
    year_from: int,
    year_to: int,
    *,
    crop_group: Optional[str] = None,
) -> Optional[float]:
    clauses = ["year >= ?", "year <= ?"]
    params: list[Any] = [year_from, year_to]
    if crop_group:
        clauses.append("crop_group = ?")
        params.append(crop_group)
    row = conn.execute(
        f"SELECT SUM(volume_mt) AS volume_mt FROM {table} WHERE {' AND '.join(clauses)}",
        params,
    ).fetchone()
    if not row or row["volume_mt"] is None:
        return None
    return float(row["volume_mt"])


def _top_crop_group(
    conn: sqlite3.Connection,
    table: str,
    year_from: int,
    year_to: int,
    *,
    cfg: dict[str, Any],
) -> Optional[dict[str, Any]]:
    row = conn.execute(
        f"""
        SELECT crop_group,
               {_volume_agg(cfg)} AS volume_sum
        FROM {table}
        WHERE year >= ? AND year <= ?
        GROUP BY crop_group
        ORDER BY SUM(volume_mt) IS NULL, SUM(volume_mt) DESC, crop_group
        LIMIT 1
        """,
        (year_from, year_to),
    ).fetchone()
    return dict(row) if row else None


def _annual_volume_series(
    conn: sqlite3.Connection,
    table: str,
    year_from: int,
    year_to: int,
    *,
    crop_group: Optional[str] = None,
) -> list[dict[str, Any]]:
    clauses = ["year >= ?", "year <= ?"]
    params: list[Any] = [year_from, year_to]
    if crop_group:
        clauses.append("crop_group = ?")
        params.append(crop_group)
    rows = conn.execute(
        f"""
        SELECT year, SUM(volume_mt) AS volume_mt
        FROM {table}
        WHERE {' AND '.join(clauses)}
        GROUP BY year
        ORDER BY year
        """,
        params,
    ).fetchall()
    return [
        {
            "year": int(r["year"]),
            "volume_mt": float(r["volume_mt"]) if r["volume_mt"] is not None else None,
        }
        for r in rows
    ]


def _subtype_breakdown(
    conn: sqlite3.Connection,
    table: str,
    year_from: int,
    year_to: int,
    crop_group: str,
    subtypes: tuple[str, ...],
) -> Optional[list[dict[str, Any]]]:
    placeholders = ",".join("?" for _ in subtypes)
    year_count = year_to - year_from + 1
    rows = conn.execute(
        f"""
        SELECT crop_subtype, SUM(volume_mt) AS volume_sum
        FROM {table}
        WHERE year >= ? AND year <= ?
          AND crop_group = ?
          AND crop_subtype IN ({placeholders})
        GROUP BY crop_subtype
        """,
        [year_from, year_to, crop_group, *subtypes],
    ).fetchall()
    by_subtype = {
        r["crop_subtype"]: float(r["volume_sum"])
        for r in rows
        if r["volume_sum"] is not None
    }
    if not by_subtype:
        return None
    total = sum(by_subtype.values())
    if total <= 0:
        return None
    items: list[dict[str, Any]] = []
    for name in subtypes:
        vol_sum = by_subtype.get(name)
        if vol_sum is None:
            continue
        items.append(
            {
                "label": name,
                "volume_mt_avg": vol_sum / year_count if year_count else None,
                "share_pct": (vol_sum / total) * 100.0,
            }
        )
    return items if len(items) >= 2 else None


def _landing_snapshot_item(item: dict[str, Any]) -> dict[str, Any]:
    if item.get("enabled") is False:
        return {
            "id": item["id"],
            "label": item["label"],
            "ready": False,
        }
    cfg = DATASETS.get(item["dataset"])
    if not cfg or not Path(cfg["db_path"]).exists():
        return {
            "id": item["id"],
            "label": item["label"],
            "ready": False,
        }

    table = _agg_table(cfg)
    crop_group = item.get("crop_group")
    with sqlite3.connect(cfg["db_path"]) as conn:
        conn.row_factory = sqlite3.Row
        bounds = conn.execute(
            f"SELECT MIN(year) AS y_min, MAX(year) AS y_max FROM {table}"
        ).fetchone()
        if not bounds or bounds["y_max"] is None:
            return {"id": item["id"], "label": item["label"], "ready": False}

        y_min = int(bounds["y_min"])
        y_max = int(bounds["y_max"])
        current_year = datetime.now().year
        # Prefer the latest complete year so partial current-year rows do not skew YoY.
        complete_through = y_max if y_max < current_year else max(y_min, y_max - 1)
        compare_to = complete_through
        compare_from = max(y_min, compare_to - 1)
        window_years = min(5, compare_to - y_min + 1)
        year_from = max(y_min, compare_to - window_years + 1)
        year_to = compare_to

        total_sum = _volume_for_years(conn, table, year_from, year_to, crop_group=crop_group)
        year_count = year_to - year_from + 1
        volume_avg = (total_sum / year_count) if total_sum is not None and year_count else None

        vol_to = _volume_for_years(conn, table, compare_to, compare_to, crop_group=crop_group)
        vol_from = _volume_for_years(
            conn, table, compare_from, compare_from, crop_group=crop_group
        )
        growth_rate_pct = None
        if vol_to is not None and vol_from is not None and vol_from != 0:
            growth_rate_pct = ((vol_to - vol_from) / abs(vol_from)) * 100.0

        top_crop = None
        if not crop_group:
            leader = _top_crop_group(conn, table, year_from, year_to, cfg=cfg)
            if leader and leader.get("crop_group"):
                leader_vol = leader.get("volume_sum")
                total_vol = _volume_for_years(conn, table, year_from, year_to)
                share_pct = None
                if (
                    leader_vol is not None
                    and total_vol is not None
                    and total_vol > 0
                ):
                    share_pct = (float(leader_vol) / float(total_vol)) * 100.0
                top_crop = {
                    "crop_group": leader["crop_group"],
                    "volume_sum": leader_vol,
                    "share_pct": share_pct,
                }

        spark_from = max(y_min, compare_to - 9)
        series = _annual_volume_series(
            conn, table, spark_from, compare_to, crop_group=crop_group
        )

        breakdown = None
        bd_cfg = LANDING_BREAKDOWN.get(item["id"])
        if bd_cfg and crop_group:
            bd_items = _subtype_breakdown(
                conn,
                table,
                year_from,
                year_to,
                crop_group,
                bd_cfg["subtypes"],
            )
            if bd_items:
                breakdown = {"title": bd_cfg["title"], "items": bd_items}

    return {
        "id": item["id"],
        "label": item["label"],
        "ready": True,
        "year_from": year_from,
        "year_to": year_to,
        "year_count": year_count,
        "volume_mt_avg": volume_avg,
        "comparison": {
            "year_from": compare_from,
            "year_to": compare_to,
            "volume_mt_from": vol_from,
            "volume_mt_to": vol_to,
            "growth_rate_pct": growth_rate_pct,
        },
        "top_crop": top_crop,
        "series": series,
        "breakdown": breakdown,
    }


@app.get("/api/landing/summary")
def landing_summary() -> dict[str, Any]:
    """Aggregated KPIs and freshness metadata for the platform landing page."""
    snapshots = []
    for item in LANDING_SNAPSHOTS:
        try:
            snapshots.append(_landing_snapshot_item(item))
        except Exception:
            snapshots.append({"id": item["id"], "label": item["label"], "ready": False})
    year_through = max(
        (s["year_to"] for s in snapshots if s.get("ready") and s.get("year_to") is not None),
        default=None,
    )
    ready_count = sum(1 for s in snapshots if s.get("ready"))
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "year_through": year_through,
        "ready_count": ready_count,
        "snapshot_count": len(snapshots),
        "refresh": pipeline.get_refresh_state(),
        "snapshots": snapshots,
    }


# Static dashboard UI
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


def _static_html(name: str, missing_detail: str) -> FileResponse:
    path = (STATIC_DIR / name).resolve()
    static_root = STATIC_DIR.resolve()
    try:
        path.relative_to(static_root)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=missing_detail) from exc
    if not path.is_file():
        raise HTTPException(status_code=404, detail=missing_detail)
    return FileResponse(path)


def _static_html_first(names: tuple[str, ...], missing_detail: str) -> FileResponse:
    for name in names:
        path = STATIC_DIR / name
        if path.is_file():
            return _static_html(name, missing_detail)
    raise HTTPException(status_code=404, detail=missing_detail)


@app.get("/")
def portal_landing() -> FileResponse:
    """Public statistics portal (entry landing)."""
    return _static_html_first(("index.html", "portal.html"), "Landing page missing")


@app.get("/dashboards")
def dashboard_gallery() -> FileResponse:
    """Dashboard gallery with live previews and favorites."""
    return _static_html_first(
        ("dashboards/index.html", "gallery.html"),
        "Dashboard gallery missing",
    )


@app.get("/hub")
def dashboard_hub_alias() -> RedirectResponse:
    return RedirectResponse("/dashboards", status_code=301)


@app.get("/portal")
def portal_alias() -> RedirectResponse:
    return RedirectResponse("/", status_code=301)


@app.get("/dashboards/{crop}")
def crop_dashboard(crop: str):
    slug = crop.lower().strip()
    if slug in ("index", "gallery"):
        return RedirectResponse("/dashboards", status_code=301)
    if slug == "farmgate":
        return RedirectResponse("/dashboards/farmgate-crops", status_code=301)
    dashboard_path = STATIC_DIR / "dashboards" / f"{slug}.html"
    if not dashboard_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(dashboard_path)
