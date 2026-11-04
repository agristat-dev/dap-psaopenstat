import sqlite3
from pathlib import Path

for name in ("palay.db", "fruits.db"):
    p = Path("data") / name
    c = sqlite3.connect(p)
    tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1")]
    print(name, "tables", tables[:8])
    t = next((x for x in tables if "fact" in x or x == "production"), tables[0] if tables else None)
    if not t:
        continue
    cols = [r[1] for r in c.execute(f"PRAGMA table_info({t})")]
    print("  table", t, "cols", cols)
    if "quarter" in cols:
        row = c.execute(f"SELECT year, quarter, semester, volume_mt FROM {t} WHERE quarter IS NOT NULL LIMIT 2").fetchone()
        print("  sample", row)
