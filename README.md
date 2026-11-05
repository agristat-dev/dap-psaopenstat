# Data Analytics Platform (PSA OpenSTAT)

Replica of the AgriStat landing page and commodity-production dashboards. The UI matches the previous `dashboard-and-analytics` app. By default, observations are fetched from the [PSA OpenSTAT](https://openstat.psa.gov.ph/) **PX-Web API** (`/PXWeb/api/v1/en/DB/...`). Set `PSA_DATA_SOURCE=bettergov` to use the [Philippine Data Explorer](https://statistics.bettergov.ph/) mirror instead. CSV backups are stored locally so dashboards still work if the API is down.

## What is included

- Landing page with dashboard selection
- Palay Production (irrigated / rainfed)
- Corn Production (white / yellow)
- Fruit Crops Production
- Vegetables & Root Crops Production
- Non-Food and Industrial Crops Production
- Livestock, Poultry, and Dairy Production
- Fisheries Production (aquaculture, commercial, marine municipal, inland municipal)
- Crops Farmgate Prices (Marketing & Trade)
- Fisheries Farmgate Prices (Marketing & Trade)
- Livestock and Poultry Farmgate Prices (Marketing & Trade)

## Data

| Dataset | Explorer source |
| --- | --- |
| Palay and Corn volume | [Palay and Corn: Volume of Production](https://statistics.bettergov.ph/datasets/9b78cb1fa95ae59f78d4) |
| Palay and Corn area | [Palay and Corn: Area Harvested](https://statistics.bettergov.ph/datasets/c22ae91fc7712bbf0d5f) |
| Fruit crops volume | [Fruit Crops: Volume of Production](https://statistics.bettergov.ph/datasets/f8aba099bcc31dd2d742) |
| Fruit crops area | [Fruit Crops: Area Harvested](https://statistics.bettergov.ph/datasets/7cf4d7f5e568a42ba52f) |
| Vegetables volume | [Vegetables and Root Crops: Volume of Production](https://statistics.bettergov.ph/datasets/8194410e56c7345c98e9) |
| Vegetables area | [Vegetables and Root Crops: Area Harvested](https://statistics.bettergov.ph/datasets/de847546b0851c9a96de) |
| Industrial volume | [Non-Food and Industrial Crops: Volume of Production](https://statistics.bettergov.ph/datasets/6a479d58b085d9b66578) |
| Industrial area | [Non-Food and Industrial Crops: Area Planted/Harvested](https://statistics.bettergov.ph/datasets/d4a8c81b30996f149b1e) |
| Livestock volume | [Livestock: Annual Volume of Production](https://statistics.bettergov.ph/datasets/95854ff78fd769fde9c5) · [quarterly](https://statistics.bettergov.ph/datasets/5e4e06f6a5a92d608681) |
| Poultry volume | [Poultry: Annual Volume of Production](https://statistics.bettergov.ph/datasets/de3846c1bbba9ae94a86) · [quarterly](https://statistics.bettergov.ph/datasets/f88d58325593bf2c1800) |
| Other animals | Horse, sheep, rabbit, goose, quail, and eggs ([explorer livestock topic](https://statistics.bettergov.ph/)) |
| Dairy volume | [Dairy by region and quarter](https://statistics.bettergov.ph/datasets/dcbbcc53e619f8866a9f) · [2026 by province](https://statistics.bettergov.ph/datasets/6c01a72292c999dce1bb) |
| Aquaculture volume | [Aquaculture: Volume of Production by Species](https://statistics.bettergov.ph/datasets/5ab8c995129eeadbc081) |
| Commercial fisheries | [Commercial Fisheries: Volume of Production](https://statistics.bettergov.ph/datasets/e5eaa1a6785870d2ab28) |
| Marine municipal | [Marine Municipal Fisheries: Volume of Production](https://statistics.bettergov.ph/datasets/d72a898b5f50719a2c08) |
| Inland municipal | [Inland Municipal Fisheries: Volume of Production](https://statistics.bettergov.ph/datasets/9482c96e097f7ca5b5a7) |
| Crops farmgate | [Cereals](https://statistics.bettergov.ph/datasets/c16f51dde0a9e8048be4) · [Rootcrops](https://statistics.bettergov.ph/datasets/e695cef62866db6b5cdd) · [Beans and Legumes](https://statistics.bettergov.ph/datasets/1264a127526ff73f5870) · [Condiments](https://statistics.bettergov.ph/datasets/87fbb875154a02b0cfde) · [Fruit Vegetables](https://statistics.bettergov.ph/datasets/30adf875b54e8cc5ac8e) · [Leafy Vegetables](https://statistics.bettergov.ph/datasets/26fa523ae83232075a93) · [Fruits](https://statistics.bettergov.ph/datasets/d6ae42fc3c987f95b7a9) · [Commercial Crops](https://statistics.bettergov.ph/datasets/1ed8ace41d324c4810b6) · [Cutflowers](https://statistics.bettergov.ph/datasets/51111d52be7c143ac62d) |
| Fisheries farmgate | [Fisheries: Farmgate Price by Geolocation, Species, Year and Quarter](https://statistics.bettergov.ph/datasets/8521bcd3bc7186171ed8) |
| Livestock farmgate | [Establishment](https://statistics.bettergov.ph/datasets/32e162a1ec492dc64ee8) · [Household](https://statistics.bettergov.ph/datasets/feafc8eb09de247247d5) |

Palay and corn keep irrigated/rainfed palay and white/yellow corn, quarters only, at province level. Fruit and vegetable tables skip parent aggregates and store leaf commodities. Livestock and poultry combine carabao, cattle, hog, goat, chicken, duck, eggs, and other animals; dairy is included in the same dashboard. Annual 2010–2022 livestock/poultry figures are stored as equal quarterly shares so yearly totals stay correct. Fisheries combine [four volume-of-production tables](https://statistics.bettergov.ph/search?topic=Agriculture%2C+Forestry%2C+Fisheries&folder=2E%2FFS&sort=recommended) and keep leaf species under Aquaculture, Commercial, Marine Municipal, and Inland Municipal. Crop farmgate prices use the newer NFG tables for cereals, rootcrops, beans and legumes, condiments, fruit vegetables, leafy vegetables, fruits, commercial crops, and cutflowers. Fisheries farmgate prices use the quarterly NFG table by species (Marine Fisheries, Aquaculture, Inland Fisheries). Livestock and poultry farmgate prices use the monthly NFG tables for establishment and household sources. Province-level ₱/kg values are stored as unweighted averages (never summed).

On a successful refresh the app writes:

- `data/palay_long.csv` + `data/palay.db`
- `data/fruits_long.csv` + `data/fruits.db`
- `data/vegetables_long.csv` + `data/vegetables.db`
- `data/industrial_long.csv` + `data/industrial.db`
- `data/livestock_long.csv` + `data/livestock.db`
- `data/fisheries_long.csv` + `data/fisheries.db`
- `data/farmgate_long.csv` + `data/farmgate.db`
- `data/farmgate_fisheries_long.csv` + `data/farmgate_fisheries.db`
- `data/farmgate_livestock_long.csv` + `data/farmgate_livestock.db`
- `data/*_source.json` — snapshot release and retrieval dates

If the API fails, the app bootstraps SQLite from those CSV backups.

## Run locally

```bash
python -m pip install -r requirements.txt
python -m scraping.pipeline
python -m uvicorn app:app --host 127.0.0.1 --port 8765
```

Or fetch one commodity group:

```bash
python -m scraping.fetch_palay
python -m scraping.fetch_horticulture fruits
python -m scraping.fetch_horticulture vegetables
python -m scraping.fetch_horticulture industrial
python -m scraping.fetch_livestock
python -m scraping.fetch_fisheries
python -m scraping.fetch_farmgate
python -m scraping.fetch_farmgate_fisheries
python -m scraping.fetch_farmgate_livestock
```

Double-click `run_dashboard.bat`. Open [http://127.0.0.1:8765](http://127.0.0.1:8765).

The first start will try the API. If CSV backups are already present, dashboards load immediately from those files.

## Render cold starts

On Render’s free/starter tier, the web service **sleeps after about 15 minutes** with no traffic. The first request after that wakes the container and can take **30–90+ seconds** (boot + loading SQLite from disk).

Mitigations used in this project:

| Approach | What it does |
| --- | --- |
| **`GET /api/ping`** | Tiny endpoint (no DB) for keep-alive and browser warm-up |
| **`api-hints.js`** | On the Vercel site, preconnects and fires `/api/ping` as soon as a page loads |
| **GitHub Action** | [`.github/workflows/render-keep-alive.yml`](.github/workflows/render-keep-alive.yml) pings every 14 minutes (enable Actions on the repo). Optional repo variable **`RENDER_API_URL`** overrides the default `https://dap-psaopenstat.onrender.com`. |
| **Paid Render plan** | Always-on instance — best fix for production; keep-alive is a workaround, not a guarantee. |

External monitors (UptimeRobot, Better Stack, etc.) can hit `/api/ping` on the same schedule if you prefer not to use GitHub Actions.

## Refresh

`POST /api/refresh` (or `python -m scraping.pipeline`) pulls the latest tables from OpenSTAT and rewrites the CSV backups. Farmgate tables are always re-downloaded on refresh (no stale CSV skip). `GET /api/health` reports whether each dataset is ready and the last refresh state.

After a refresh, run `python scripts/verify_openstat_accuracy.py` to confirm SQLite/CSV match the OpenSTAT raw pulls and live API spot checks.

| Source | Env | API |
| --- | --- | --- |
| **PSA OpenSTAT (default)** | `PSA_DATA_SOURCE=openstat` or unset | `https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/...` |
| Philippine Data Explorer | `PSA_DATA_SOURCE=bettergov` | `https://statistics.bettergov.ph/api/v1` |
