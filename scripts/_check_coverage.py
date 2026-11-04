"""Quick coverage check for production and farmgate DBs."""
import sqlite3
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"


def max_yq(conn, table: str) -> tuple:
    cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
    if "quarter" in cols:
        row = conn.execute(
            f"""
            SELECT year, quarter FROM {table}
            ORDER BY year DESC, quarter DESC LIMIT 1
            """
        ).fetchone()
        return row or (None, None)
    if "month" in cols:
        row = conn.execute(
            f"""
            SELECT year, month FROM {table}
            ORDER BY year DESC, month DESC LIMIT 1
            """
        ).fetchone()
        return row or (None, None)
    y = conn.execute(f"SELECT MAX(year) FROM {table}").fetchone()[0]
    return (y, None)


def main() -> None:
    checks = [
        ("palay.db", "production_long"),
        ("farmgate.db", "farmgate_long"),
    ]
    for db_name, table in checks:
        p = DATA / db_name
        if not p.exists():
            print(f"{db_name}: missing")
            continue
        conn = sqlite3.connect(p)
        if not conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone():
            tables = [
                r[0]
                for r in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                )
            ]
            print(f"{db_name}: no {table}; tables={tables[:8]}")
            continue
        print(f"{db_name}/{table}: max period {max_yq(conn, table)}")


if __name__ == "__main__":
    main()
