"""
Capture dashboard preview WebP images for the landing page and gallery.

Requires:
  pip install playwright
  playwright install chromium

Usage:
  python scripts/capture_dashboard_previews.py
  PREVIEW_BASE_URL=https://dap-psaopenstat.onrender.com python scripts/capture_dashboard_previews.py
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "static" / "assets" / "images" / "dashboard-previews"

SLUGS = [
    "palay",
    "corn",
    "fruits",
    "vegetables",
    "industrial",
    "livestock",
    "fisheries",
    "farmgate-crops",
    "farmgate-fisheries",
    "farmgate-livestock",
]

BASE_URL = os.environ.get("PREVIEW_BASE_URL", "https://dap-psaopenstat.onrender.com").rstrip("/")
VIEWPORT = {"width": 1280, "height": 800}

FARMGATE_PREVIEW_COMMODITY = {
    "farmgate-crops": "Sitao [Stringbeans]",
    "farmgate-fisheries": "Tilapia",
    "farmgate-livestock": "Hog for Slaughter",
}


async def main() -> None:
    from playwright.async_api import async_playwright

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport=VIEWPORT)
        page.set_default_timeout(120_000)

        for slug in SLUGS:
            url = f"{BASE_URL}/dashboards/{slug}?preview=1"
            commodity = FARMGATE_PREVIEW_COMMODITY.get(slug)
            if commodity:
                url = f"{url}&commodity={quote(commodity)}"
            out_path = OUT_DIR / f"{slug}.webp"
            print(f"Capturing {slug} …")
            await page.goto(url, wait_until="networkidle")
            try:
                if commodity:
                    await page.wait_for_function(
                        "() => document.body.classList.contains('is-farmgate-analysis') "
                        "&& document.getElementById('farmgateAnalysis')?.hidden === false",
                        timeout=90_000,
                    )
                else:
                    await page.wait_for_function(
                        "() => document.documentElement.classList.contains('dashboard-preview-embed') "
                        "|| document.querySelector('.score-card, .farmgate-board')",
                        timeout=90_000,
                    )
            except Exception:
                pass
            await page.wait_for_timeout(2500)
            await page.screenshot(path=str(out_path), type="webp", quality=82, full_page=False)
            print(f"  -> {out_path.relative_to(ROOT)}")

        await browser.close()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
