"""
HTTP client for PSA OpenSTAT PX-Web API (direct).

Docs: https://openstat.psa.gov.ph/ — tables expose JSON metadata and POST queries at
  https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/<folder>/<table>.px

This module mirrors the surface used by fetch_*.py (same as bettergov.py) so pipelines
can switch sources without rewriting reshape logic.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from http.client import IncompleteRead
from typing import Any

API_ORIGIN = "https://openstat.psa.gov.ph"
API_BASE = f"{API_ORIGIN}/PXWeb/api/v1/en/DB"
PXWEB_UI = f"{API_ORIGIN}/PXWeb/pxweb/en/DB"
USER_AGENT = "AgriStatDataAnalytics/1.0 (PSA OpenSTAT; local)"
DEFAULT_TIMEOUT = 120

# Folder prefixes used when callers pass a bare table id (e.g. 0012E4EVCP0).
_PATH_PREFIXES = (
    "2E/CS",
    "2E/FS",
    "2E/LP/PDN",
    "2M/NFG",
)

_meta_cache: dict[str, dict[str, Any]] = {}


class BetterGovError(RuntimeError):
    """Kept for drop-in compatibility with fetch modules."""

    def __init__(self, message: str, *, status: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def _decode(raw: bytes) -> str:
    return raw.decode("utf-8-sig")


def _request(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    timeout: int = DEFAULT_TIMEOUT,
    retries: int = 5,
) -> Any:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
                **({"Content-Type": "application/json"} if body is not None else {}),
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
            if not raw:
                return None
            return json.loads(_decode(raw))
        except urllib.error.HTTPError as exc:
            raw = exc.read() if exc.fp else b""
            if exc.code in (429, 503) and attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                last_error = BetterGovError(_decode(raw)[:300] or f"HTTP {exc.code}", status=exc.code)
                continue
            raise BetterGovError(_decode(raw)[:300] or f"HTTP {exc.code}", status=exc.code) from exc
        except (
            TimeoutError,
            urllib.error.URLError,
            ConnectionResetError,
            ConnectionAbortedError,
            BrokenPipeError,
            IncompleteRead,
            OSError,
        ) as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise BetterGovError(f"Network error talking to OpenSTAT: {exc}") from exc
    raise BetterGovError(str(last_error or "OpenSTAT request failed"))


def _normalize_path_token(query: str) -> str:
    token = (query or "").strip().replace("\\", "/")
    if token.lower().endswith(".px"):
        token = token[:-3]
    return token.strip("/")


def _api_url(db_path: str) -> str:
    return f"{API_BASE}/{db_path}.px"


def _ui_source_url(db_path: str) -> str:
    ui_path = "DB__" + db_path.replace("/", "__")
    return f"{PXWEB_UI}/{ui_path}.px"


def _load_metadata(db_path: str) -> dict[str, Any]:
    if db_path in _meta_cache:
        return _meta_cache[db_path]
    meta = _request(_api_url(db_path), timeout=180)
    if not isinstance(meta, dict) or "variables" not in meta:
        raise BetterGovError(f"Unexpected metadata for {db_path}")
    _meta_cache[db_path] = meta
    return meta


def _metadata_exists(db_path: str) -> bool:
    try:
        _load_metadata(db_path)
        return True
    except BetterGovError:
        return False


def resolve_db_path(query: str) -> str:
    token = _normalize_path_token(query)
    if not token:
        raise BetterGovError("Empty dataset path")
    if "/" in token:
        return token
    needle = token.lower()
    for prefix in _PATH_PREFIXES:
        candidate = f"{prefix}/{token}"
        if _metadata_exists(candidate):
            return candidate
    raise BetterGovError(f"No OpenSTAT table matched {query!r}")


def find_dataset(query: str) -> dict[str, Any]:
    db_path = resolve_db_path(query)
    meta = _load_metadata(db_path)
    return {
        "id": db_path,
        "path": f"{db_path}.px",
        "title": meta.get("title") or db_path,
        "source": _ui_source_url(db_path),
    }


def get_dataset(dataset_id: str) -> dict[str, Any]:
    db_path = _normalize_path_token(dataset_id)
    meta = _load_metadata(db_path)
    updated = meta.get("updated") or meta.get("lastUpdated")
    return {
        "id": db_path,
        "release": "openstat-live",
        "title": meta.get("title") or db_path,
        "path": f"{db_path}.px",
        "source": _ui_source_url(db_path),
        "sourceUpdated": updated,
        "retrieved": None,
        "unit": meta.get("unit") or "Reported value — see source for units",
    }


def list_all_values(dataset_id: str, dimension: str, release: str | None = None) -> list[dict[str, str]]:
    del release  # OpenSTAT serves the current table; no release id.
    db_path = _normalize_path_token(dataset_id)
    meta = _load_metadata(db_path)
    var = next((v for v in meta.get("variables") or [] if v.get("code") == dimension), None)
    if not var:
        raise BetterGovError(f"Dimension {dimension!r} not found on {db_path}")
    values = var.get("values") or []
    texts = var.get("valueTexts") or []
    out: list[dict[str, str]] = []
    for code, label in zip(values, texts):
        out.append({"code": str(code), "label": str(label)})
    return out


def _parse_value(raw: Any) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if text in ("", "..", "...", "-", "NA", "N/A"):
        return None
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _px_json_to_query_result(meta: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    variables = meta.get("variables") or []
    dim_vars = [v for v in variables if v.get("code")]
    label_by_code: dict[str, dict[str, str]] = {}
    for var in dim_vars:
        code = var["code"]
        label_by_code[code] = {
            str(c): str(t) for c, t in zip(var.get("values") or [], var.get("valueTexts") or [])
        }

    dimensions = [{"code": v["code"]} for v in dim_vars]
    rows: list[dict[str, Any]] = []
    for item in payload.get("data") or []:
        keys = item.get("key") or []
        values = item.get("values") or []
        labels: list[str] = []
        codes: list[str] = []
        for index, var in enumerate(dim_vars):
            if index >= len(keys):
                labels.append("")
                codes.append("")
                continue
            code = str(keys[index])
            codes.append(code)
            labels.append(label_by_code.get(var["code"], {}).get(code, code))
        rows.append(
            {
                "labels": labels,
                "codes": codes,
                "value": _parse_value(values[0] if values else None),
                "status": "",
            }
        )
    return {"dimensions": dimensions, "rows": rows}


def query_dataset(dataset_id: str, release: str, selection: dict[str, list[str]]) -> dict[str, Any]:
    del release
    db_path = _normalize_path_token(dataset_id)
    meta = _load_metadata(db_path)
    query_items: list[dict[str, Any]] = []
    for dim_code, codes in selection.items():
        if not codes:
            continue
        query_items.append(
            {
                "code": dim_code,
                "selection": {"filter": "item", "values": [str(c) for c in codes]},
            }
        )
    body = {"query": query_items, "response": {"format": "json"}}
    payload = _request(_api_url(db_path), method="POST", body=body, timeout=300)
    if not isinstance(payload, dict):
        raise BetterGovError(f"Unexpected query payload for {db_path}")
    return _px_json_to_query_result(meta, payload)
