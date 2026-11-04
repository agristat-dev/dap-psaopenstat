"""HTTP client for the Philippine Data Explorer (BetterGov) REST API."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from http.client import IncompleteRead
from typing import Any

API_ORIGIN = "https://statistics.bettergov.ph"
API_BASE = f"{API_ORIGIN}/api/v1"
USER_AGENT = "AgriStatDataAnalytics/1.0 (palay dashboard; local)"
DEFAULT_TIMEOUT = 120


class BetterGovError(RuntimeError):
    def __init__(self, message: str, *, status: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def _headers(*, json_body: bool = False) -> dict[str, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    if json_body:
        headers["Content-Type"] = "application/json"
    return headers


def _error_message(raw: bytes, status: int) -> str:
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return f"HTTP {status}"
    try:
        body = json.loads(text)
    except json.JSONDecodeError:
        return text[:300]
    err = body.get("error") if isinstance(body, dict) else None
    if isinstance(err, dict):
        code = err.get("code") or "error"
        message = err.get("message") or text[:300]
        return f"{code}: {message}"
    return text[:300]


def request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = DEFAULT_TIMEOUT,
    retries: int = 5,
) -> Any:
    query = urllib.parse.urlencode(params or {}, doseq=True)
    url = f"{API_BASE}{path}"
    if query:
        url = f"{url}?{query}"

    payload = None if body is None else json.dumps(body).encode("utf-8")
    last_error: Exception | None = None

    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            data=payload,
            headers=_headers(json_body=body is not None),
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
            if not raw:
                return None
            return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read() if exc.fp else b""
            if exc.code == 503 and attempt < retries - 1:
                wait = 2
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                if retry_after:
                    try:
                        wait = max(wait, int(float(retry_after)))
                    except ValueError:
                        pass
                time.sleep(wait)
                last_error = BetterGovError(
                    _error_message(raw, exc.code), status=exc.code
                )
                continue
            raise BetterGovError(_error_message(raw, exc.code), status=exc.code) from exc
        except (TimeoutError, urllib.error.URLError, ConnectionResetError, ConnectionAbortedError, BrokenPipeError, IncompleteRead, OSError) as exc:
            if isinstance(exc, OSError) and not isinstance(
                exc,
                (TimeoutError, ConnectionResetError, ConnectionAbortedError, BrokenPipeError, urllib.error.URLError),
            ):
                winerr = getattr(exc, "winerror", None)
                if winerr not in {10053, 10054, 10060}:
                    raise
            last_error = exc
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise BetterGovError(f"Network error talking to BetterGov: {exc}") from exc

    raise BetterGovError(str(last_error or "BetterGov request failed"))


def get_json(path: str, **params: Any) -> Any:
    return request("GET", path, params=params or None)


def post_json(path: str, body: dict[str, Any], **params: Any) -> Any:
    return request("POST", path, params=params or None, body=body)


def list_all_values(dataset_id: str, dimension: str, release: str) -> list[dict[str, str]]:
    values: list[dict[str, str]] = []
    offset = 0
    limit = 200
    while True:
        payload = get_json(
            f"/datasets/{dataset_id}/values",
            dimension=dimension,
            release=release,
            limit=limit,
            offset=offset,
        )
        chunk = payload.get("data") or []
        values.extend(chunk)
        next_offset = (payload.get("pagination") or {}).get("nextOffset")
        if next_offset is None:
            break
        offset = int(next_offset)
    return values


def find_dataset(query: str) -> dict[str, Any]:
    payload = get_json("/datasets", q=query, ready="true", limit=20)
    rows = payload.get("data") or []
    if not rows:
        raise BetterGovError(f"No ready dataset matched {query!r}")
    needle = query.lower()
    for row in rows:
        path = str(row.get("path") or "").lower()
        if needle in path or needle in str(row.get("title") or "").lower():
            return row
    return rows[0]


def get_dataset(dataset_id: str) -> dict[str, Any]:
    payload = get_json(f"/datasets/{dataset_id}")
    data = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(data, dict):
        raise BetterGovError(f"Unexpected dataset payload for {dataset_id}")
    return data


def query_dataset(dataset_id: str, release: str, selection: dict[str, list[str]]) -> dict[str, Any]:
    def _query(active_release: str) -> dict[str, Any]:
        payload = request(
            "POST",
            f"/datasets/{dataset_id}/query",
            body={"release": active_release, "selection": selection},
            timeout=180,
        )
        data = payload.get("data") if isinstance(payload, dict) else payload
        if not isinstance(data, dict):
            raise BetterGovError(f"Unexpected query payload for {dataset_id}")
        return data

    try:
        return _query(release)
    except BetterGovError as exc:
        if exc.status != 409:
            raise
        latest = get_dataset(dataset_id)
        latest_release = latest.get("release")
        if not latest_release or latest_release == release:
            raise
        return _query(str(latest_release))
