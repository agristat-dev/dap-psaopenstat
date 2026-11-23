"""Reconcile province long rows to PSA region rollups (official OpenSTAT totals)."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable

try:
    from .geo import build_geo_lookup, parse_value, standard_region_name
except ImportError:
    from geo import build_geo_lookup, parse_value, standard_region_name


def geo_labels_first_seen(rows: list[dict[str, Any]], label_key: str = "geo_label") -> list[str]:
    labels: list[str] = []
    seen: set[str] = set()
    for row in rows:
        label = row.get(label_key) or ""
        if label and label not in seen:
            labels.append(label)
            seen.add(label)
    return labels


def build_geo_lookup_from_obs(rows: list[dict[str, Any]], label_key: str = "geo_label") -> dict[str, dict[str, str]]:
    return build_geo_lookup(geo_labels_first_seen(rows, label_key))


def reconcile_region_rollups(
    long_map: dict[tuple, dict],
    obs_rows: list[dict[str, Any]],
    geo_by_label: dict[str, dict[str, str]],
    *,
    row_period_obs: Callable[[dict[str, Any]], Any],
    row_crop: Callable[[dict[str, Any]], tuple[str, str, int] | None],
    value_field: str,
    tolerance: float = 0.05,
) -> int:
    """Assign region–province gaps to provinces with missing PSA values (e.g. BARMM Sulu).

    Returns count of cells updated.
    """
    region_totals: dict[tuple, float] = {}
    long_by_region: dict[tuple, list[tuple]] = defaultdict(list)
    for key, row in long_map.items():
        if int(row.get("is_aggregate", 0)) != 0:
            continue
        q = _period_quarter(row)
        if q is None:
            continue
        bucket = (row["year"], q, row["crop_group"], row["region"])
        long_by_region[bucket].append((key, row))

    for row in obs_rows:
        crop = row_crop(row)
        if not crop:
            continue
        crop_group, crop_subtype, _is_agg = crop
        period = row_period_obs(row)
        if period is None:
            continue
        year = row.get("year")
        if year is None:
            continue
        geo = geo_by_label.get(row.get("geo_label") or "")
        if not geo or geo["geo_level"] != "region" or not geo["region"]:
            continue
        val = parse_value(row.get("value"))
        if val is None:
            continue
        region = geo["region"]
        key = (int(year), period, crop_group, crop_subtype, region)
        region_totals[key] = region_totals.get(key, 0.0) + val

    updates = 0
    for region_key, official in region_totals.items():
        year, period, crop_group, crop_subtype, region = region_key
        def _crop_match(row: dict) -> bool:
            if row["crop_group"] != crop_group:
                return False
            if crop_subtype == "__all__":
                return True
            return row["crop_subtype"] == crop_subtype

        bucket = long_by_region.get((year, period, crop_group, region), [])
        matching = [k for k, row in bucket if _crop_match(row)]
        if not matching:
            continue
        prov_sum = sum(float(long_map[k].get(value_field) or 0) for k in matching)
        gap = official - prov_sum
        if abs(gap) <= tolerance:
            continue
        null_keys = [
            k
            for k in matching
            if long_map[k].get(value_field) is None or float(long_map[k].get(value_field) or 0) == 0
        ]
        targets = null_keys or matching
        if not targets:
            continue
        if len(targets) == 1:
            long_map[targets[0]][value_field] = (float(long_map[targets[0]].get(value_field) or 0) + gap)
            updates += 1
            continue
        # Multiple withheld provinces: assign gap to the province PSA marks as null (not zero).
        strict_null = [k for k in targets if long_map[k].get(value_field) is None]
        use = strict_null or targets
        share = gap / len(use)
        for k in use:
            long_map[k][value_field] = (float(long_map[k].get(value_field) or 0) + share)
        updates += len(use)

    return updates


def _period_quarter(row: dict[str, Any]) -> int | None:
    q = row.get("quarter")
    if isinstance(q, int):
        return q
    try:
        if q is not None and str(q).strip().isdigit():
            return int(q)
    except (TypeError, ValueError):
        pass
    return None


def national_gap_vs_provinces(
    long_map: dict[tuple, dict],
    obs_rows: list[dict[str, Any]],
    *,
    row_period_obs: Callable[[dict[str, Any]], Any],
    row_crop: Callable[[dict[str, Any]], tuple[str, str, int] | None],
    value_field: str,
    crop_groups: tuple[str, ...] | None = None,
) -> list[tuple[tuple, float, float]]:
    """(key, province_sum, ph_official) tuples where province sum != PH total."""
    ph: dict[tuple, float] = defaultdict(float)
    for row in obs_rows:
        if (row.get("geo_label") or "") != "PHILIPPINES":
            continue
        crop = row_crop(row)
        if not crop:
            continue
        crop_group, crop_subtype, _ = crop
        if crop_groups and crop_group not in crop_groups:
            continue
        period = row_period_obs(row)
        if period is None:
            continue
        year = row.get("year")
        if year is None:
            continue
        val = parse_value(row.get("value"))
        if val is None:
            continue
        ph[(int(year), period, crop_group, crop_subtype)] += val

    out: list[tuple[tuple, float, float]] = []
    for key, official in sorted(ph.items()):
        year, period, crop_group, crop_subtype = key
        def _national_crop_match(row: dict) -> bool:
            if row["crop_group"] != crop_group:
                return False
            if crop_subtype == "__all__":
                return True
            return row["crop_subtype"] == crop_subtype

        prov_sum = sum(
            float(row.get(value_field) or 0)
            for row in long_map.values()
            if row["year"] == year
            and _period_quarter(row) == period
            and _national_crop_match(row)
            and int(row.get("is_aggregate", 0)) == 0
        )
        if abs(prov_sum - official) > 0.05:
            out.append((key, prov_sum, official))
    return out


def philippines_region_label() -> str:
    return standard_region_name("PHILIPPINES") or "Philippines"


def horticulture_crop_obs(
    row: dict[str, Any],
    classify: Callable[[str], tuple[str, str, bool]] | dict[str, tuple[str, str, bool]],
) -> tuple[str, str, int] | None:
    crop_type = row.get("crop_label") or ""
    if not crop_type:
        return None
    if isinstance(classify, dict):
        meta = classify.get(crop_type)
    else:
        meta = classify(crop_type)
    if not meta:
        return None
    crop_group, crop_subtype, is_agg = meta
    if is_agg:
        return crop_group, "__all__", 0
    return crop_group, crop_subtype, int(is_agg)


def horticulture_period_obs(row: dict[str, Any]) -> int | None:
    try:
        from .geo import quarter_from_period
    except ImportError:
        from geo import quarter_from_period
    return quarter_from_period(row.get("period"))


def apply_production_rollups(
    combined: dict[tuple, dict],
    volume_rows: list[dict[str, Any]],
    area_rows: list[dict[str, Any]],
    *,
    row_crop_obs: Callable[[dict[str, Any]], tuple[str, str, int] | None],
    row_period_obs: Callable[[dict[str, Any]], int | None],
    dataset_label: str,
    verify_volume: bool = True,
) -> None:
    geo_by_label = build_geo_lookup_from_obs(volume_rows + area_rows)
    reconcile_region_rollups(
        combined,
        volume_rows,
        geo_by_label,
        row_period_obs=row_period_obs,
        row_crop=row_crop_obs,
        value_field="volume_mt",
    )
    reconcile_region_rollups(
        combined,
        area_rows,
        geo_by_label,
        row_period_obs=row_period_obs,
        row_crop=row_crop_obs,
        value_field="area_ha",
    )
    if verify_volume:
        gaps = national_gap_vs_provinces(
            combined,
            volume_rows,
            row_period_obs=row_period_obs,
            row_crop=row_crop_obs,
            value_field="volume_mt",
        )
        if gaps:
            raise RuntimeError(
                f"{dataset_label} volume off vs PHILIPPINES official after reconcile "
                f"({len(gaps)} cells); sample={gaps[:3]}"
            )