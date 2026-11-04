"""Refresh crop production from PSA OpenSTAT (default) or BetterGov mirror, with CSV backup."""

from __future__ import annotations

import json
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path

try:
    from .paths import DATA_DIR, ensure_data_dirs
except ImportError:
    from paths import DATA_DIR, ensure_data_dirs

ensure_data_dirs()
STATUS_PATH = DATA_DIR / "data_status.json"

_lock = threading.Lock()
_state: dict = {
    "status": "idle",
    "last_success": None,
    "last_error": None,
    "last_started": None,
    "message": "Not refreshed yet",
    "source": None,
}


def get_refresh_state() -> dict:
    return dict(_state)


def _write_status() -> None:
    STATUS_PATH.write_text(json.dumps(_state, indent=2), encoding="utf-8")


def _bootstrap_one(db_path: Path, csv_path: Path, load_csv_rows, write_sqlite, label: str) -> bool:
    if db_path.exists() and db_path.stat().st_size > 100:
        return False
    if not csv_path.exists():
        return False
    rows = load_csv_rows(csv_path)
    if not rows:
        return False
    write_sqlite(rows)
    return True


def bootstrap_db_from_csv_if_needed() -> bool:
    """Create SQLite files from CSV backups so dashboards can start without the API."""
    bootstrapped = []
    try:
        from . import (
            reshape_farmgate,
            reshape_farmgate_fisheries,
            reshape_farmgate_livestock,
            reshape_fisheries,
            reshape_fruits,
            reshape_industrial,
            reshape_livestock,
            reshape_palay,
            reshape_vegetables,
        )
    except ImportError:
        import reshape_farmgate
        import reshape_farmgate_fisheries
        import reshape_farmgate_livestock
        import reshape_fisheries
        import reshape_fruits
        import reshape_industrial
        import reshape_livestock
        import reshape_palay
        import reshape_vegetables

    if _bootstrap_one(
        reshape_palay.DB_PATH,
        reshape_palay.FINAL_CSV,
        reshape_palay.load_csv_rows,
        reshape_palay.write_sqlite,
        "palay/corn",
    ):
        bootstrapped.append("palay/corn")
    if _bootstrap_one(
        reshape_fruits.DB_PATH,
        reshape_fruits.FINAL_CSV,
        reshape_fruits.load_csv_rows,
        reshape_fruits.write_sqlite,
        "fruits",
    ):
        bootstrapped.append("fruits")
    if _bootstrap_one(
        reshape_vegetables.DB_PATH,
        reshape_vegetables.FINAL_CSV,
        reshape_vegetables.load_csv_rows,
        reshape_vegetables.write_sqlite,
        "vegetables",
    ):
        bootstrapped.append("vegetables")
    if _bootstrap_one(
        reshape_industrial.DB_PATH,
        reshape_industrial.FINAL_CSV,
        reshape_industrial.load_csv_rows,
        reshape_industrial.write_sqlite,
        "industrial",
    ):
        bootstrapped.append("industrial")
    if _bootstrap_one(
        reshape_livestock.DB_PATH,
        reshape_livestock.FINAL_CSV,
        reshape_livestock.load_csv_rows,
        reshape_livestock.write_sqlite,
        "livestock",
    ):
        bootstrapped.append("livestock")
    if _bootstrap_one(
        reshape_fisheries.DB_PATH,
        reshape_fisheries.FINAL_CSV,
        reshape_fisheries.load_csv_rows,
        reshape_fisheries.write_sqlite,
        "fisheries",
    ):
        bootstrapped.append("fisheries")
    if _bootstrap_one(
        reshape_farmgate.DB_PATH,
        reshape_farmgate.FINAL_CSV,
        lambda path: [1] if path.exists() and path.stat().st_size > 100 else [],
        lambda _rows: reshape_farmgate.write_sqlite_from_final_csv(),
        "farmgate",
    ):
        bootstrapped.append("farmgate")
    if _bootstrap_one(
        reshape_farmgate_fisheries.DB_PATH,
        reshape_farmgate_fisheries.FINAL_CSV,
        lambda path: [1] if path.exists() and path.stat().st_size > 100 else [],
        lambda _rows: reshape_farmgate_fisheries.write_sqlite_from_final_csv(),
        "farmgate_fisheries",
    ):
        bootstrapped.append("farmgate_fisheries")
    if _bootstrap_one(
        reshape_farmgate_livestock.DB_PATH,
        reshape_farmgate_livestock.FINAL_CSV,
        lambda path: [1] if path.exists() and path.stat().st_size > 100 else [],
        lambda _rows: reshape_farmgate_livestock.write_sqlite_from_final_csv(),
        "farmgate_livestock",
    ):
        bootstrapped.append("farmgate_livestock")

    if not bootstrapped:
        return False
    _state.update(
        {
            "status": "ok",
            "message": f"Bootstrapped from CSV backup ({', '.join(bootstrapped)})",
            "last_success": datetime.now(timezone.utc).isoformat(),
            "source": "csv-backup",
        }
    )
    _write_status()
    return True


def refresh_from_api(*, force: bool = True) -> dict:
    if not _lock.acquire(blocking=False):
        return {**_state, "message": "Refresh already in progress"}

    try:
        from . import (
            fetch_farmgate,
            fetch_farmgate_fisheries,
            fetch_farmgate_livestock,
            fetch_fisheries,
            fetch_horticulture,
            fetch_livestock,
            fetch_palay,
            reshape_farmgate,
            reshape_farmgate_fisheries,
            reshape_farmgate_livestock,
            reshape_fisheries,
            reshape_fruits,
            reshape_industrial,
            reshape_livestock,
            reshape_palay,
            reshape_vegetables,
        )
    except ImportError:
        import fetch_farmgate
        import fetch_farmgate_fisheries
        import fetch_farmgate_livestock
        import fetch_fisheries
        import fetch_horticulture
        import fetch_livestock
        import fetch_palay
        import reshape_farmgate
        import reshape_farmgate_fisheries
        import reshape_farmgate_livestock
        import reshape_fisheries
        import reshape_fruits
        import reshape_industrial
        import reshape_livestock
        import reshape_palay
        import reshape_vegetables

    counts: list[str] = []
    try:
        _state.update(
            {
                "status": "running",
                "last_started": datetime.now(timezone.utc).isoformat(),
                "last_error": None,
                "message": "Fetching Palay and Corn from PSA OpenSTAT…",
                "source": fetch_palay.bettergov.API_ORIGIN,
            }
        )
        _write_status()
        palay = fetch_palay.fetch_palay()
        palay_rows = reshape_palay.transform_from_observations(palay["volume_rows"], palay["area_rows"])
        counts.append(f"palay/corn {len(palay_rows):,}")

        _state["message"] = "Fetching fruit crops…"
        _write_status()
        fruits = fetch_horticulture.fetch_fruits()
        fruit_rows = reshape_fruits.transform_from_csvs(fruits["volume_csv"], fruits["area_csv"])
        counts.append(f"fruits {len(fruit_rows):,}")

        _state["message"] = "Fetching vegetables and root crops…"
        _write_status()
        veg = fetch_horticulture.fetch_vegetables()
        veg_rows = reshape_vegetables.transform_from_csvs(veg["volume_csv"], veg["area_csv"])
        counts.append(f"vegetables {len(veg_rows):,}")

        _state["message"] = "Fetching non-food and industrial crops…"
        _write_status()
        industrial = fetch_horticulture.fetch_industrial()
        industrial_rows = reshape_industrial.transform_from_csvs(
            industrial["volume_csv"], industrial["area_csv"]
        )
        counts.append(f"industrial {len(industrial_rows):,}")

        _state["message"] = "Fetching livestock, poultry, and dairy…"
        _write_status()
        livestock = fetch_livestock.fetch_livestock()
        livestock_rows = reshape_livestock.transform_from_csvs(livestock["csv_paths"])
        counts.append(f"livestock {len(livestock_rows):,}")

        _state["message"] = "Fetching fisheries…"
        _write_status()
        fisheries = fetch_fisheries.fetch_fisheries()
        fisheries_rows = reshape_fisheries.transform_from_csvs(fisheries["csv_paths"])
        counts.append(f"fisheries {len(fisheries_rows):,}")

        _state["message"] = "Fetching crop farmgate prices…"
        _write_status()
        farmgate = fetch_farmgate.fetch_farmgate(skip_existing=False)
        farmgate_count = reshape_farmgate.transform_from_csvs(farmgate["csv_paths"])
        counts.append(f"farmgate {farmgate_count:,}")

        _state["message"] = "Fetching fisheries farmgate prices…"
        _write_status()
        farmgate_fish = fetch_farmgate_fisheries.fetch_farmgate_fisheries()
        farmgate_fish_count = reshape_farmgate_fisheries.transform_from_csvs(farmgate_fish["csv_paths"])
        counts.append(f"farmgate_fisheries {farmgate_fish_count:,}")

        _state["message"] = "Fetching livestock and poultry farmgate prices…"
        _write_status()
        farmgate_live = fetch_farmgate_livestock.fetch_farmgate_livestock(skip_existing=False)
        farmgate_live_count = reshape_farmgate_livestock.transform_from_csvs(farmgate_live["csv_paths"])
        counts.append(f"farmgate_livestock {farmgate_live_count:,}")

        _state.update(
            {
                "status": "ok",
                "last_success": datetime.now(timezone.utc).isoformat(),
                "last_error": None,
                "message": f"Data refreshed from {fetch_palay.bettergov.API_ORIGIN} ({'; '.join(counts)}). CSV backups updated.",
                "source": fetch_palay.bettergov.API_ORIGIN,
            }
        )
        _write_status()
        return dict(_state)
    except Exception as exc:
        _state.update(
            {
                "status": "error",
                "last_error": str(exc),
                "message": "API refresh failed; using CSV backup if available",
                "traceback": traceback.format_exc(),
            }
        )
        _write_status()
        raise
    finally:
        _lock.release()


def refresh_in_background() -> dict:
    if _state.get("status") == "running":
        return get_refresh_state()

    def _run() -> None:
        try:
            refresh_from_api()
        except Exception:
            bootstrap_db_from_csv_if_needed()

    threading.Thread(target=_run, daemon=True, name="crop-refresh").start()
    return {
        **get_refresh_state(),
        "status": "running",
        "message": "Refresh started in background",
    }


if __name__ == "__main__":
    try:
        state = refresh_from_api()
        print(state.get("message") or "Refresh complete")
    except Exception as exc:
        raise SystemExit(f"Refresh failed: {exc}") from exc
