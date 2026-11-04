"""
Select PSA production data API: OpenSTAT (default) or Philippine Data Explorer mirror.
"""

from __future__ import annotations

import os
from typing import Any


def _source_name() -> str:
    return (os.environ.get("PSA_DATA_SOURCE") or "openstat").strip().lower()


def active_source() -> str:
    """Return 'openstat' or 'bettergov'."""
    name = _source_name()
    if name in ("bettergov", "explorer", "statistics.bettergov.ph"):
        return "bettergov"
    return "openstat"


def _load():
    if active_source() == "bettergov":
        from . import bettergov

        return bettergov
    from . import openstat_px

    return openstat_px


class _ApiProxy:
    def __getattr__(self, name: str) -> Any:
        return getattr(_load(), name)


# Import as: from .data_source import px as bettergov
px = _ApiProxy()


def api_origin() -> str:
    return str(getattr(_load(), "API_ORIGIN", ""))


def source_label() -> str:
    if active_source() == "bettergov":
        return "Philippine Data Explorer (statistics.bettergov.ph)"
    return "PSA OpenSTAT (openstat.psa.gov.ph)"
