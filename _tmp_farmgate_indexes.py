import sqlite3
from pathlib import Path

root = Path(r"j:\local_dev\psa-data-analytics\data")
specs = [
    ("farmgate.db", "farmgate_long"),
    ("farmgate_fisheries.db", "farmgate_fisheries_long"),
    ("farmgate_livestock.db", "farmgate_livestock_long"),
]
for name, table in specs:
    path = root / name
    conn = sqlite3.connect(path)
    idx = f"idx_{table}_crop_subtype_ym"
    conn.execute(
        f"CREATE INDEX IF NOT EXISTS {idx} ON {table}(crop_group, crop_subtype, year, month)"
    )
    conn.commit()
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?", (idx,)
    ).fetchone()
    print(name, idx, "ok" if exists else "MISSING")
    conn.close()
