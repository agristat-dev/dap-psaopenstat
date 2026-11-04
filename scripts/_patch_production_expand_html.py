"""Add chart expand buttons to production dashboard HTML (mirror reference app)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"m:/sys_dev/dept_agri/psa-data-analytics/static/dashboards")
REF = Path(r"M:/local_dev/dashboard-and-analytics/static/dashboards")

PALAY_CORN = {"palay.html", "corn.html"}
MULTI = {"fruits.html", "vegetables.html", "industrial.html", "livestock.html", "fisheries.html"}


def extract_panel(ref_text: str, chart_id: str) -> str | None:
    """Find panel-header block containing data-chart-expand for chart_id."""
    pat = re.compile(
        rf'(<article class="panel">[\s\S]*?data-chart-expand="{re.escape(chart_id)}"[\s\S]*?</article>)',
        re.MULTILINE,
    )
    m = pat.search(ref_text)
    if not m:
        return None
    return m.group(1)


def replace_panel(psa_text: str, chart_id: str, new_panel: str) -> str:
    pat = re.compile(
        rf'<article class="panel">[\s\S]*?<canvas id="{re.escape(chart_id)}"[\s\S]*?</article>',
        re.MULTILINE,
    )
    if not pat.search(psa_text):
        raise ValueError(f"Panel for {chart_id} not found in PSA HTML")
    return pat.sub(new_panel, psa_text, count=1)


def patch_palay_corn(name: str) -> None:
    ref = (REF / name).read_text(encoding="utf-8")
    psa_path = ROOT / name
    psa = psa_path.read_text(encoding="utf-8")
    for cid in ("trendChart", "yieldTrendChart", "ecosystemTrendChart"):
        panel = extract_panel(ref, cid)
        if not panel:
            raise ValueError(f"{name}: missing ref panel for {cid}")
        psa = replace_panel(psa, cid, panel)
    psa_path.write_text(psa, encoding="utf-8")
    print(f"Patched {name} (palay/corn charts)")


def patch_multi(name: str) -> None:
    ref = (REF / name).read_text(encoding="utf-8")
    psa_path = ROOT / name
    psa = psa_path.read_text(encoding="utf-8")
    for cid in ("trendChart", "volumeGrowthChart"):
        panel = extract_panel(ref, cid)
        if not panel:
            raise ValueError(f"{name}: missing ref panel for {cid}")
        psa = replace_panel(psa, cid, panel)
    psa_path.write_text(psa, encoding="utf-8")
    print(f"Patched {name} (trend + growth)")


def bump_assets(html_path: Path) -> None:
    text = html_path.read_text(encoding="utf-8")
    text = re.sub(r'dashboard\.js\?v=\d+', "dashboard.js?v=233", text)
    text = re.sub(r'styles\.css\?v=\d+', "styles.css?v=233", text)
    html_path.write_text(text, encoding="utf-8")


def patch_fisheries_manual() -> None:
    """Reference repo has no fisheries dashboard; mirror fruits expand pattern."""
    psa_path = ROOT / "fisheries.html"
    psa = psa_path.read_text(encoding="utf-8")

    def add_expand(header_inner: str, chart_id: str, aria: str) -> str:
        if f'data-chart-expand="{chart_id}"' in psa:
            return psa
        old = header_inner
        new = old.replace(
            'panel-header-trend">',
            'panel-header-trend panel-header-with-control">',
            1,
        ).replace(
            "</h2>\n              </div>",
            f"</h2>\n                <div class=\"panel-header-actions\">\n"
            f'                  <button type="button" class="chart-expand-btn" data-chart-expand="{chart_id}" '
            f'aria-label="{aria}">Expand</button>\n                </div>\n              </div>',
            1,
        )
        return psa.replace(old, new, 1)

    # trend panel header (first volume trend)
    trend_hdr = """              <div class="panel-header panel-header-trend">
                <h2 class="trend-panel-title" id="volumeTrendTitle">
                  Annual Production Volume
                  <span class="trend-panel-title-rest">Trend</span>
                </h2>
              </div>"""
    growth_hdr = """              <div class="panel-header panel-header-trend">
                <h2 class="trend-panel-title" id="volumeGrowthTitle">
                  Year-on-Year Production Volume
                  <span class="trend-panel-title-rest">Growth Rate</span>
                </h2>
              </div>"""
    text = psa
    if 'data-chart-expand="trendChart"' not in text:
        text = text.replace(
            trend_hdr,
            trend_hdr.replace(
                'panel-header-trend">',
                'panel-header-trend panel-header-with-control">',
            ).replace(
                "</h2>\n              </div>",
                '</h2>\n                <div class="panel-header-actions">\n'
                '                  <button type="button" class="chart-expand-btn" data-chart-expand="trendChart" '
                'aria-label="Expand production volume trend chart">Expand</button>\n                </div>\n              </div>',
            ),
            1,
        )
    if 'data-chart-expand="volumeGrowthChart"' not in text:
        text = text.replace(
            growth_hdr,
            growth_hdr.replace(
                'panel-header-trend">',
                'panel-header-trend panel-header-with-control">',
            ).replace(
                "</h2>\n              </div>",
                '</h2>\n                <div class="panel-header-actions">\n'
                '                  <button type="button" class="chart-expand-btn" data-chart-expand="volumeGrowthChart" '
                'aria-label="Expand volume growth chart">Expand</button>\n                </div>\n              </div>',
            ),
            1,
        )
    psa_path.write_text(text, encoding="utf-8")
    print("Patched fisheries.html (manual)")


if __name__ == "__main__":
    for n in sorted(PALAY_CORN):
        if (ROOT / n).exists():
            patch_palay_corn(n)
    for n in sorted(MULTI - {"fisheries.html"}):
        ref_path = REF / n
        if ref_path.exists():
            patch_multi(n)
    patch_fisheries_manual()
    for n in sorted(PALAY_CORN | MULTI):
        if (ROOT / n).exists():
            bump_assets(ROOT / n)
