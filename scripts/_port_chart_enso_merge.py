"""One-off merge: chart expand + RONI ENSO from dashboard-and-analytics into psa-data-analytics."""
from __future__ import annotations

from pathlib import Path

REF_JS = Path(r"M:/local_dev/dashboard-and-analytics/static/assets/dashboard.js")
PSA_JS = Path(r"m:/sys_dev/dept_agri/psa-data-analytics/static/assets/dashboard.js")
REF_CSS = Path(r"M:/local_dev/dashboard-and-analytics/static/assets/styles.css")
PSA_CSS = Path(r"m:/sys_dev/dept_agri/psa-data-analytics/static/assets/styles.css")

WANTS_ENSO = """function wantsEnsoOverlay() {
  const key = (CONFIG.dataset || "palay_corn").trim().toLowerCase();
  return [
    "palay_corn",
    "fruits",
    "vegetables",
    "industrial",
    "livestock",
    "fisheries",
  ].includes(key);
}"""


def line_index(lines: list[str], prefix: str, start: int = 0) -> int:
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    raise ValueError(f"Line starting with {prefix!r} not found from {start}")


def merge_dashboard_js() -> None:
    ref = REF_JS.read_text(encoding="utf-8").splitlines(keepends=True)
    psa = PSA_JS.read_text(encoding="utf-8").splitlines(keepends=True)

    enso_start_ref = line_index(ref, "const ensoBandsPlugin")
    enso_end_ref = line_index(ref, "const peakYearEffectPlugin", enso_start_ref + 1)
    expand_start_ref = line_index(ref, "const CHART_EXPAND_META")
    expand_end_ref = line_index(ref, "function ensureLeaveModal", expand_start_ref + 1)

    enso_start_psa = line_index(psa, "const ensoBandsPlugin")
    enso_end_psa = line_index(psa, "const progressiveLineRevealPlugin", enso_start_psa + 1)
    leave_psa = line_index(psa, "function ensureLeaveModal")

    enso_block = "".join(ref[enso_start_ref:enso_end_ref])
    enso_block = enso_block.replace(
        "function wantsEnsoOverlay() {\n  return true;\n}",
        WANTS_ENSO,
    )

    expand_block = "".join(ref[expand_start_ref:expand_end_ref])

    # Extra ENSO state vars
    out: list[str] = []
    for line in psa:
        out.append(line)
        if line.strip() == "let ensoByYear = null;":
            if "ensoByQuarter" not in "".join(psa):
                out.append("let ensoByQuarter = null;\n")
                out.append("let ensoBySemester = null;\n")
                out.append("let chartExpandModalChart = null;\n")
                out.append("let chartExpandPaintSeq = 0;\n")

    text = "".join(out)
    psa_lines = text.splitlines(keepends=True)

    enso_start_psa = line_index(psa_lines, "const ensoBandsPlugin")
    enso_end_psa = line_index(psa_lines, "const progressiveLineRevealPlugin", enso_start_psa + 1)
    leave_psa = line_index(psa_lines, "function ensureLeaveModal")

    merged = (
        psa_lines[:enso_start_psa]
        + [enso_block if enso_block.endswith("\n") else enso_block + "\n"]
        + psa_lines[enso_end_psa:leave_psa]
        + [expand_block if expand_block.endswith("\n") else expand_block + "\n"]
        + psa_lines[leave_psa:]
    )

    merged_text = "".join(merged)
    if "bindChartExpand();" not in merged_text:
        merged_text = merged_text.replace(
            "  bindSmartAnalysis();\n",
            "  bindSmartAnalysis();\n  bindChartExpand();\n",
            1,
        )

    PSA_JS.write_text(merged_text, encoding="utf-8")
    print(f"Merged dashboard.js -> {PSA_JS} ({len(merged_text.splitlines())} lines)")


def append_css() -> None:
    ref_lines = REF_CSS.read_text(encoding="utf-8").splitlines(keepends=True)
    start = line_index(ref_lines, ".panel-header-actions {")
    end = line_index(ref_lines, ".chart-box-growth {", start + 1)
    chunk = "".join(ref_lines[start:end])

    # enso guide + intensity + roni modal (after .enso-both in ref)
    enso_start = line_index(ref_lines, ".enso-guide-btn {")
    enso_end = line_index(ref_lines, ".chart-box-growth {", enso_start + 1)
    chunk += "".join(ref_lines[enso_start:enso_end])

    psa_text = PSA_CSS.read_text(encoding="utf-8")
    marker = "/* chart-expand + RONI ENSO (ported) */"
    if marker in psa_text:
        print("CSS already ported")
        return
    PSA_CSS.write_text(psa_text.rstrip() + "\n\n" + marker + "\n" + chunk, encoding="utf-8")
    print(f"Appended CSS to {PSA_CSS}")


if __name__ == "__main__":
    merge_dashboard_js()
    append_css()
