import json
import time
import urllib.request

urls = [
    "http://127.0.0.1:8770/api/price-board?dataset=farmgate&year_from=2010&year_to=2026",
    "http://127.0.0.1:8770/api/price-board?dataset=farmgate_fisheries&year_from=2010&year_to=2026",
    "http://127.0.0.1:8770/api/price-board?dataset=farmgate_livestock&year_from=2010&year_to=2026&crop_subtype=Establishment",
    "http://127.0.0.1:8770/api/price-board?dataset=farmgate&year_from=2020&year_to=2026&crop_group=Sitao+%5BStringbeans%5D",
]
for url in urls:
    t0 = time.perf_counter()
    with urllib.request.urlopen(url, timeout=60) as r:
        payload = json.loads(r.read().decode("utf-8"))
    dt = time.perf_counter() - t0
    items = payload.get("items") or []
    sample = items[0] if items else {}
    print(
        f"{dt:6.2f}s n={len(items):3d} as_of={payload.get('as_of')} "
        f"keys={list(sample.keys())} name={sample.get('name')} "
        f"cur={sample.get('current')} prev={sample.get('previous')} "
        f"low={sample.get('low')} period={sample.get('period_average')}"
    )
    print(" ", url.split("dataset=")[1][:80])
