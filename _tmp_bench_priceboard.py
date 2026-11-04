import sqlite3
import time
from pathlib import Path

conn = sqlite3.connect(Path(r"j:\local_dev\psa-data-analytics\data\farmgate.db"))

def run(label, sql, params=()):
    t0 = time.perf_counter()
    rows = conn.execute(sql, params).fetchall()
    print(f"{time.perf_counter()-t0:6.3f}s {label} rows={len(rows)}")

for start in (2024, 2025):
    run(
        f"window {start}-2026",
        """
        WITH latest AS (
            SELECT crop_group, crop_subtype, MAX(year * 100 + month) AS ym
            FROM farmgate_long
            WHERE year >= ? AND year <= ? AND volume_mt > 0
            GROUP BY crop_group, crop_subtype
        ),
        ranked AS (
            SELECT f.crop_group, f.crop_subtype, f.year, f.month, f.region, f.province, f.volume_mt,
                   AVG(f.volume_mt) OVER (PARTITION BY f.crop_group, f.crop_subtype) AS current_price,
                   COUNT(*) OVER (PARTITION BY f.crop_group, f.crop_subtype) AS geo_count,
                   ROW_NUMBER() OVER (PARTITION BY f.crop_group, f.crop_subtype ORDER BY f.volume_mt ASC) AS rn_low,
                   ROW_NUMBER() OVER (PARTITION BY f.crop_group, f.crop_subtype ORDER BY f.volume_mt DESC) AS rn_high
            FROM farmgate_long f
            JOIN latest l
              ON f.crop_group = l.crop_group AND f.crop_subtype = l.crop_subtype
             AND (f.year * 100 + f.month) = l.ym
            WHERE f.volume_mt > 0
        )
        SELECT * FROM ranked WHERE rn_low = 1 OR rn_high = 1
        """,
        (start, 2026),
    )
    run(
        f"prev {start}-2026",
        """
        WITH latest AS (
            SELECT crop_group, crop_subtype, MAX(year * 100 + month) AS ym
            FROM farmgate_long
            WHERE year >= ? AND year <= ? AND volume_mt > 0
            GROUP BY crop_group, crop_subtype
        ),
        prev AS (
            SELECT p.crop_group, p.crop_subtype, MAX(p.year * 100 + p.month) AS ym
            FROM farmgate_long p
            JOIN latest l
              ON p.crop_group = l.crop_group AND p.crop_subtype = l.crop_subtype
            WHERE p.volume_mt > 0 AND p.year <= ?
              AND p.year >= (l.ym / 100) - 1
              AND (p.year * 100 + p.month) < l.ym
            GROUP BY p.crop_group, p.crop_subtype
        )
        SELECT p.crop_group, AVG(p.volume_mt), COUNT(*)
        FROM farmgate_long p
        JOIN prev v
          ON p.crop_group = v.crop_group AND p.crop_subtype = v.crop_subtype
         AND (p.year * 100 + p.month) = v.ym
        WHERE p.volume_mt > 0
        GROUP BY p.crop_group
        """,
        (start, 2026, 2026),
    )
