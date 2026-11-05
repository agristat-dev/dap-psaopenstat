/* AgriStat crop dashboards — config from window.DASHBOARD_CONFIG in each HTML page */

const fmt = {
  compact(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-PH", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n);
  },
  number(n, digits = 0) {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-PH", {
      maximumFractionDigits: digits,
    }).format(n);
  },
  /** Format number; returns display text, raw (non-compact) text, and whether compact was used. */
  scoreDetail(n, { compact = true, fixed = false } = {}) {
    if (n == null || Number.isNaN(n)) {
      return { text: "—", raw: null, compact: false };
    }
    const num = Number(n);
    const abs = Math.abs(num);
    const useCompact = !fixed && compact && abs >= 1000;
    const format = (useCompactNotation) => {
      let formatted = new Intl.NumberFormat("en-PH", {
        notation: useCompactNotation ? "compact" : "standard",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
      if (!fixed) {
        formatted = formatted.replace(/\.00(?=[A-Za-z\u00A0\s]|$)/, "");
      }
      return formatted;
    };
    return {
      text: format(useCompact),
      raw: format(false),
      compact: useCompact,
    };
  },
  /** Scorecard values: 2 decimals, omit trailing .00 unless fixed */
  score(n, opts) {
    return fmt.scoreDetail(n, opts).text;
  },
  /** Farmgate prices: always exactly 2 decimal digits. */
  price(n, { signed = false } = {}) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    const num = Number(n);
    const body = new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(signed ? Math.abs(num) : num);
    if (!signed) return body;
    if (num > 0) return `+${body}`;
    if (num < 0) return `−${body}`;
    return body;
  },
  pct(n) {
    if (n == null || Number.isNaN(n)) return "No YoY";
    const sign = n > 0 ? "+" : "";
    return `${sign}${fmt.score(n, { compact: false })}% YoY`;
  },
};

function resolveDashboardConfig() {
  const provided = window.DASHBOARD_CONFIG;
  if (provided?.mode === "multiCrop" && provided.dataset) {
    return {
      groupLabel: "Fruit",
      groupNoun: "fruit",
      groupPlural: "fruits",
      groupAllLabel: "All fruits",
      subtypeLabel: "Variety",
      subtypeNoun: "variety",
      subtypePlural: "varieties",
      subtypeAllLabel: "All varieties",
      subtypes: [],
      defaultCrops: "all",
      chartSeriesLimit: 12,
      seriesSplit: "crop_group",
      ...provided,
    };
  }
  if (provided && provided.cropGroup && Array.isArray(provided.subtypes) && provided.subtypes.length >= 2) {
    return {
      dataset: "palay_corn",
      mode: "binary",
      seriesSplit: "crop_subtype",
      ...provided,
    };
  }
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("/fruits")) {
    return {
      dataset: "fruits",
      mode: "multiCrop",
      cropGroup: null,
      slug: "fruits",
      title: "Fruit Crops Production Dashboard",
      groupLabel: "Fruit",
      groupNoun: "fruit",
      groupPlural: "fruits",
      groupAllLabel: "All fruits",
      subtypeLabel: "Variety",
      subtypeNoun: "variety",
      subtypePlural: "varieties",
      subtypeAllLabel: "All varieties",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
    };
  }
  if (path.includes("/farmgate-fisheries")) {
    return {
      dataset: "farmgate_fisheries",
      mode: "multiCrop",
      cropGroup: null,
      slug: "farmgate-fisheries",
      title: "Fisheries Farmgate Prices Dashboard",
      groupLabel: "Species",
      groupNoun: "species",
      groupPlural: "species",
      groupAllLabel: "All species",
      subtypeLabel: "Classification",
      subtypeNoun: "classification",
      subtypePlural: "classifications",
      subtypeAllLabel: "All classifications",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      showShare: false,
      valueMode: "avg",
      metric: "price",
      metricUnit: "₱/kg",
      metricNoun: "farmgate price",
      metricTitle: "Farmgate Price",
      periodGrain: "quarter",
      boardKicker: "Fisheries",
      boardTitle: "Farmgate Prices",
      boardHint: "Click a species row to view the farmgate price analysis of that fishery species.",
      boardSearchPlaceholder: "Search species…",
      overlayVolumeDataset: "fisheries",
      commodityBoard: true,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
      previewCommodity: "Tilapia",
    };
  }
  if (path.includes("/fisheries")) {
    return {
      dataset: "fisheries",
      mode: "multiCrop",
      cropGroup: null,
      slug: "fisheries",
      title: "Fisheries Production Dashboard",
      groupLabel: "Species",
      groupNoun: "species",
      groupPlural: "species",
      groupAllLabel: "All species",
      subtypeLabel: "Subsector",
      subtypeNoun: "subsector",
      subtypePlural: "subsectors",
      subtypeAllLabel: "All subsectors",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
    };
  }
  if (path.includes("/farmgate-crops")) {
    return {
      dataset: "farmgate",
      mode: "multiCrop",
      cropGroup: null,
      slug: "farmgate-crops",
      title: "Crops Farmgate Prices Dashboard",
      groupLabel: "Commodity",
      groupNoun: "commodity",
      groupPlural: "commodities",
      groupAllLabel: "All commodities",
      subtypeLabel: "Classification",
      subtypeNoun: "classification",
      subtypePlural: "classifications",
      subtypeAllLabel: "All classifications",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      showShare: false,
      valueMode: "avg",
      metric: "price",
      metricUnit: "₱/kg",
      metricNoun: "farmgate price",
      metricTitle: "Farmgate Price",
      overlayVolumeDataset: "vegetables",
      commodityBoard: true,
      periodGrain: "month",
      boardKicker: "Crops",
      boardTitle: "Farmgate Prices",
      boardHint: "Click a commodity row to view the farmgate price analysis of that crop commodity.",
      boardSearchPlaceholder: "Search commodity…",
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
      previewCommodity: "Sitao [Stringbeans]",
    };
  }
  if (path.includes("/farmgate-livestock")) {
    return {
      dataset: "farmgate_livestock",
      mode: "multiCrop",
      cropGroup: null,
      slug: "farmgate-livestock",
      title: "Livestock and Poultry Farmgate Prices Dashboard",
      groupLabel: "Commodity",
      groupNoun: "commodity",
      groupPlural: "commodities",
      groupAllLabel: "All commodities",
      subtypeLabel: "Classification",
      subtypeNoun: "classification",
      subtypePlural: "classifications",
      subtypeAllLabel: "All classifications",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      showShare: false,
      valueMode: "avg",
      metric: "price",
      metricUnit: "₱/kg",
      metricNoun: "farmgate price",
      metricTitle: "Farmgate Price",
      periodGrain: "month",
      boardKicker: "Livestock and Poultry",
      boardTitle: "Farmgate Prices",
      boardHint: "Click a commodity row to view the farmgate price analysis of that livestock or poultry commodity.",
      boardSearchPlaceholder: "Search commodity…",
      boardFamilyMode: "livestock_poultry",
      sourceToggle: ["Establishment", "Household"],
      defaultSource: "Establishment",
      hideSubtypeFilter: true,
      overlayVolumeDataset: "livestock",
      commodityBoard: true,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
      previewCommodity: "Hog for Slaughter",
    };
  }
  if (path.includes("/livestock")) {
    return {
      dataset: "livestock",
      mode: "multiCrop",
      cropGroup: null,
      slug: "livestock",
      title: "Livestock and Poultry Production Dashboard",
      groupLabel: "Commodity",
      groupNoun: "commodity",
      groupPlural: "commodities",
      groupAllLabel: "All commodities",
      subtypeLabel: "Type",
      subtypeNoun: "type",
      subtypePlural: "types",
      subtypeAllLabel: "All types",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
    };
  }
  if (path.includes("/industrial")) {
    return {
      dataset: "industrial",
      mode: "multiCrop",
      cropGroup: null,
      slug: "industrial",
      title: "Non-Food and Industrial Crops Dashboard",
      groupLabel: "Crop",
      groupNoun: "crop",
      groupPlural: "crops",
      groupAllLabel: "All crops",
      subtypeLabel: "Variety",
      subtypeNoun: "variety",
      subtypePlural: "varieties",
      subtypeAllLabel: "All varieties",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
    };
  }
  if (path.includes("/vegetables")) {
    return {
      dataset: "vegetables",
      mode: "multiCrop",
      cropGroup: null,
      slug: "vegetables",
      title: "Vegetables and Root Crops Production Dashboard",
      groupLabel: "Vegetable",
      groupNoun: "vegetable",
      groupPlural: "vegetables",
      groupAllLabel: "All vegetables",
      subtypeLabel: "Variety",
      subtypeNoun: "variety",
      subtypePlural: "varieties",
      subtypeAllLabel: "All varieties",
      seriesSplit: "crop_group",
      showAreaYield: false,
      showSubtypeAverages: false,
      priorityCropTopN: 3,
      defaultCrops: "all",
      chartSeriesLimit: 12,
      subtypes: [],
    };
  }
  if (path.includes("/corn")) {
    return {
      dataset: "palay_corn",
      mode: "binary",
      seriesSplit: "crop_subtype",
      cropGroup: "Corn",
      slug: "corn",
      title: "Corn Production Dashboard",
      subtypeLabel: "Variety",
      subtypeNoun: "variety",
      subtypePlural: "varieties",
      subtypeAllLabel: "All varieties",
      subtypes: [
        { value: "Yellow", label: "Yellow", color: "#09663f" },
        { value: "White", label: "White", color: "#9ae856" },
      ],
    };
  }
  return {
    dataset: "palay_corn",
    mode: "binary",
    seriesSplit: "crop_subtype",
    cropGroup: "Palay",
    slug: "palay",
    title: "Palay Production Dashboard",
    subtypeLabel: "Ecosystem",
    subtypeNoun: "ecosystem",
    subtypePlural: "ecosystems",
    subtypeAllLabel: "All ecosystems",
    subtypes: [
      { value: "Irrigated", label: "Irrigated", color: "#09663f" },
      { value: "Rainfed", label: "Rainfed", color: "#9ae856" },
    ],
  };
}

const CONFIG = resolveDashboardConfig();

function isPreviewEmbed() {
  try {
    if (new URLSearchParams(window.location.search).get("preview") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return window.self !== window.top;
  } catch {
    return false;
  }
}

const PREVIEW_EMBED = isPreviewEmbed();
let previewReadySignaled = false;

function previewCommodityName() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("commodity");
    if (fromUrl?.trim()) return fromUrl.trim();
  } catch {
    /* ignore */
  }
  const configured = CONFIG.previewCommodity;
  return typeof configured === "string" && configured.trim() ? configured.trim() : "";
}

function shouldDeferPreviewReadyForFarmgateOverview() {
  return PREVIEW_EMBED && hasCommodityBoard() && previewCommodityName() && !selectedFarmgateCommodity;
}

function signalPreviewReady() {
  if (!PREVIEW_EMBED || previewReadySignaled) return;
  previewReadySignaled = true;
  try {
    window.parent.postMessage(
      { type: "dap-dashboard-preview-ready", path: window.location.pathname },
      "*"
    );
  } catch {
    /* ignore */
  }
}

const IS_MULTI_CROP = CONFIG.mode === "multiCrop";
const DATASET = CONFIG.dataset || "palay_corn";
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isPriceMode() {
  return CONFIG.valueMode === "avg" || CONFIG.metric === "price";
}

function isQuarterGrain() {
  return CONFIG.periodGrain === "quarter";
}

function farmgatePeriodNoun() {
  return isQuarterGrain() ? "quarter" : "month";
}

function farmgateGroupNoun() {
  return CONFIG.groupNoun || "commodity";
}

function farmgateGroupPlural() {
  return CONFIG.groupPlural || "commodities";
}

function farmgateGroupLabel() {
  return CONFIG.groupLabel || "Commodity";
}

function farmgateSubtypeLabel() {
  return CONFIG.subtypeLabel || "Classification";
}

function farmgateDomainLabel() {
  return CONFIG.boardKicker || (isQuarterGrain() ? "Fisheries" : "Crops");
}

function farmgateOtherFamily() {
  return isQuarterGrain() ? "Other fisheries" : "Other crops";
}

function livestockFarmgateFamily(name) {
  const key = String(name || "").toLowerCase();
  if (/chicken|duck|gamefowl|egg/.test(key)) return "Poultry";
  return "Livestock";
}

function farmgateSourceOptions() {
  return Array.isArray(CONFIG.sourceToggle) ? CONFIG.sourceToggle : [];
}

function farmgateSourceValue() {
  const options = farmgateSourceOptions();
  if (!options.length) return null;
  return options.includes(farmgateSource) ? farmgateSource : options[0];
}

const QUARTER_END_MONTHS = [3, 6, 9, 12];
const QUARTER_FROM_END_MONTH = { 3: 1, 6: 2, 9: 3, 12: 4 };
const MONTH_FROM_QUARTER_END = { 1: 3, 2: 6, 3: 9, 4: 12 };

function farmgateSeasonMonths() {
  if (isQuarterGrain()) {
    const selected = checkedValues(els.quarter).map(Number);
    if (selected.length && selected.length < checkboxCount(els.quarter)) {
      return selected
        .slice()
        .sort((a, b) => a - b)
        .map((quarter) => MONTH_FROM_QUARTER_END[quarter])
        .filter(Boolean);
    }
    return [...QUARTER_END_MONTHS];
  }
  const selected = checkedValues(els.month).map(Number);
  return selected.length && selected.length < checkboxCount(els.month)
    ? [...selected].sort((a, b) => a - b)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

function farmgateSeasonLabel(month) {
  if (isQuarterGrain()) {
    const quarter = QUARTER_FROM_END_MONTH[Number(month)];
    return quarter ? `Q${quarter}` : monthShort(month);
  }
  return monthShort(month);
}

function farmgateSeasonFullLabel(month) {
  if (isQuarterGrain()) {
    const quarter = QUARTER_FROM_END_MONTH[Number(month)];
    return quarter ? `Q${quarter}` : monthLabel(month);
  }
  return monthLabel(month);
}

function numericChartValue(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function brokenLineOptions() {
  return {
    spanGaps: true,
    segment: {
      borderDash: (ctx) =>
        ctx.p0?.parsed?.y === 0 || ctx.p1?.parsed?.y === 0 ? [2, 3] : undefined,
    },
  };
}

function wantsVolumeOverlay() {
  return Boolean(CONFIG.overlayVolumeDataset);
}

function isMixedTrendChart() {
  return CONFIG.showAreaYield !== false || wantsVolumeOverlay();
}

function showShareColumn() {
  return CONFIG.showShare !== false && !isPriceMode();
}

function metricUnit() {
  return CONFIG.metricUnit || (isPriceMode() ? "₱/kg" : "MT");
}

function metricNoun() {
  return CONFIG.metricNoun || (isPriceMode() ? "farmgate price" : "production volume");
}

function metricTitle() {
  return CONFIG.metricTitle || (isPriceMode() ? "Farmgate Price" : "Production Volume");
}

function metricCompact() {
  if (CONFIG.metricCompact != null) return Boolean(CONFIG.metricCompact);
  return !isPriceMode();
}

function monthLabel(n) {
  const i = Number(n);
  return MONTH_LABELS[i - 1] || String(n);
}

function monthShort(n) {
  return monthLabel(n).slice(0, 3);
}

const CROP_PALETTE = [
  "#09663f",
  "#9ae856",
  "#0a7a4b",
  "#c4e87a",
  "#06402b",
  "#5cb85c",
  "#2e7d32",
  "#aed581",
  "#81c784",
  "#33691e",
];

let SUBTYPE_VALUES = (CONFIG.subtypes || []).map((s) => s.value);
let latestPriorityCropGroups = [];
let SUBTYPE_A = CONFIG.subtypes?.[0] || { value: "", label: "—", color: CROP_PALETTE[0] };
let SUBTYPE_B = CONFIG.subtypes?.[1] || { value: "", label: "—", color: CROP_PALETTE[1] };

function pairSubtypeValues() {
  return [SUBTYPE_A.value, SUBTYPE_B.value].filter(Boolean);
}

function seriesDimLabel() {
  if (CONFIG.seriesSplit === "crop_group") {
    return CONFIG.groupLabel || CONFIG.subtypeLabel || "Fruit";
  }
  return CONFIG.subtypeLabel || "Variety";
}

function seriesDimNoun() {
  if (CONFIG.seriesSplit === "crop_group") {
    return CONFIG.groupNoun || CONFIG.subtypeNoun || "fruit";
  }
  return CONFIG.subtypeNoun || "variety";
}

function filterDimLabel() {
  if (IS_MULTI_CROP) return CONFIG.groupLabel || CONFIG.subtypeLabel || "Fruit";
  return CONFIG.subtypeLabel || "Ecosystem";
}

function filterAllLabel() {
  if (IS_MULTI_CROP) {
    return CONFIG.groupAllLabel || CONFIG.subtypeAllLabel || "All fruits";
  }
  return CONFIG.subtypeAllLabel || "All";
}

function defaultCropSelection(groups) {
  const all = groups || [];
  if (CONFIG.defaultCrops === "all" || CONFIG.defaultCrops == null) return [...all];
  if (Array.isArray(CONFIG.defaultCrops)) {
    const defaults = CONFIG.defaultCrops.filter((g) => all.includes(g));
    return defaults.length ? defaults : [...all];
  }
  return [...all];
}

function chartSeriesValues() {
  if (!IS_MULTI_CROP) return (CONFIG.subtypes || []).map((s) => s.value);
  const cropEl = document.getElementById("crop");
  const selected = checkedValues(cropEl);
  const all = (CONFIG.subtypes || []).map((s) => s.value);
  let names =
    !selected.length || selected.length === checkboxCount(cropEl)
      ? defaultCropSelection(all)
      : [...selected];
  const limit = CONFIG.chartSeriesLimit;
  if (limit && names.length > limit) {
    if (Array.isArray(ecosystemSeriesPoints) && ecosystemSeriesPoints.length) {
      const totals = new Map();
      for (const p of ecosystemSeriesPoints) {
        if (!names.includes(p.crop_subtype)) continue;
        totals.set(p.crop_subtype, (totals.get(p.crop_subtype) || 0) + (Number(p.volume_mt) || 0));
      }
      names = [...names].sort((a, b) => (totals.get(b) || 0) - (totals.get(a) || 0));
    } else {
      const priority = (CONFIG.priorityCrops || latestPriorityCropGroups || []).filter((g) =>
        names.includes(g)
      );
      const rest = names.filter((g) => !priority.includes(g));
      names = [...priority, ...rest];
    }
    return names.slice(0, limit);
  }
  return names;
}

function syncSubtypePairUI() {
  const labelA = document.getElementById("subtypeLabelA");
  const labelB = document.getElementById("subtypeLabelB");
  if (labelA) labelA.textContent = SUBTYPE_A.label;
  if (labelB) labelB.textContent = SUBTYPE_B.label;
  const thA = document.getElementById("regionEcoThA");
  const thB = document.getElementById("regionEcoThB");
  if (thA) {
    thA.textContent = SUBTYPE_A.label;
    thA.title = `Sort by ${SUBTYPE_A.label}`;
  }
  if (thB) {
    thB.textContent = SUBTYPE_B.label;
    thB.title = `Sort by ${SUBTYPE_B.label}`;
  }
}

function setSubtypePairFromKpi(bySubtype) {
  if (!Array.isArray(bySubtype) || bySubtype.length < 2) return;
  const colorByValue = Object.fromEntries(
    (CONFIG.subtypes || []).map((s) => [s.value, s.color])
  );
  SUBTYPE_A = {
    value: bySubtype[0].crop_subtype,
    label: bySubtype[0].crop_subtype,
    color: colorByValue[bySubtype[0].crop_subtype] || CROP_PALETTE[0],
  };
  SUBTYPE_B = {
    value: bySubtype[1].crop_subtype,
    label: bySubtype[1].crop_subtype,
    color: colorByValue[bySubtype[1].crop_subtype] || CROP_PALETTE[1],
  };
  syncSubtypePairUI();
}

function ecosystemChartColors() {
  return Object.fromEntries(
    (CONFIG.subtypes || []).map((s) => [s.value, { bg: s.color, hover: s.color, border: s.color }])
  );
}

function withAlpha(color, alpha) {
  const c = String(color || "").trim();
  if (c.startsWith("rgba(")) return c;
  const rgb = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  let hex = c.startsWith("#") ? c.slice(1) : c;
  if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  return color;
}

const els = {
  yearFrom: document.getElementById("yearFrom"),
  yearTo: document.getElementById("yearTo"),
  yearTooltip: document.getElementById("yearTooltip"),
  yearRangeTrack: document.getElementById("yearRangeTrack"),
  yearRangeScale: document.getElementById("yearRangeScale"),
  yearRangeCount: document.getElementById("yearRangeCount"),
  quarter: document.getElementById("quarter"),
  semester: document.getElementById("semester"),
  month: document.getElementById("month"),
  crop: document.getElementById("crop"),
  subsector: document.getElementById("subsector"),
  region: document.getElementById("region"),
  province: document.getElementById("province"),
  refreshBtn: document.getElementById("refreshBtn"),
  statusMeta: document.getElementById("statusMeta"),
  kpiVolume: document.getElementById("kpiVolume"),
  kpiArea: document.getElementById("kpiArea"),
  kpiYield: document.getElementById("kpiYield"),
  kpiVolumeHint: document.getElementById("kpiVolumeHint"),
  kpiAreaHint: document.getElementById("kpiAreaHint"),
  kpiIrrigated: document.getElementById("kpiIrrigated"),
  kpiRainfed: document.getElementById("kpiRainfed"),
  kpiIrrigatedShare: document.getElementById("kpiIrrigatedShare"),
  kpiRainfedShare: document.getElementById("kpiRainfedShare"),
  subtypeBarIrrigated: document.getElementById("subtypeBarIrrigated"),
  subtypeBarRainfed: document.getElementById("subtypeBarRainfed"),
  subtypeBarHint: document.getElementById("subtypeBarHint"),
  cmpVolume2025: document.getElementById("cmpVolume2025"),
  cmpVolume2024: document.getElementById("cmpVolume2024"),
  cmpVariance: document.getElementById("cmpVariance"),
  cmpGrowth: document.getElementById("cmpGrowth"),
  cmpVarianceCard: document.getElementById("cmpVarianceCard"),
  cmpGrowthCard: document.getElementById("cmpGrowthCard"),
  trendChartSub: document.getElementById("trendChartSub"),
  volumeGrowthChartSub: document.getElementById("volumeGrowthChartSub"),
  monthSeasonalityChartSub: document.getElementById("monthSeasonalityChartSub"),
  subsectorVolumeChartSub: document.getElementById("subsectorVolumeChartSub"),
  yieldTrendChartSub: document.getElementById("yieldTrendChartSub"),
  ecosystemTrendTitle: document.getElementById("ecosystemTrendTitle"),
  ecosystemTrendChartSub: document.getElementById("ecosystemTrendChartSub"),
  ecosystemMetric: document.getElementById("ecosystemMetric"),
  ecosystemVolumeTableSub: document.getElementById("ecosystemVolumeTableSub"),
  ecosystemVolumeTableBody: document.getElementById("ecosystemVolumeTableBody"),
  subsectorVolumeTableSub: document.getElementById("subsectorVolumeTableSub"),
  subsectorVolumeTableBody: document.getElementById("subsectorVolumeTableBody"),
  regionVolumeTableSub: document.getElementById("regionVolumeTableSub"),
  regionVolumeTableBody: document.getElementById("regionVolumeTableBody"),
  regionAnnualTableSub: document.getElementById("regionAnnualTableSub"),
  regionAnnualTableHead: document.getElementById("regionAnnualTableHead"),
  regionAnnualTableBody: document.getElementById("regionAnnualTableBody"),
  regionEcosystemMetric: document.getElementById("regionEcosystemMetric"),
  regionEcosystemTableSub: document.getElementById("regionEcosystemTableSub"),
  regionEcosystemTableBody: document.getElementById("regionEcosystemTableBody"),
  provinceVolumeTableSub: document.getElementById("provinceVolumeTableSub"),
  provinceVolumeTableBody: document.getElementById("provinceVolumeTableBody"),
  provinceVolumeTableWrap: document.querySelector(".province-volume-table-wrap"),
  provinceVolumeTopN: document.getElementById("provinceVolumeTopN"),
  ecosystemVolumeTopN: document.getElementById("ecosystemVolumeTopN"),
  ecosystemVolumeTableWrap: document.querySelector(".ecosystem-volume-table-wrap"),
  filterSummaryChips: document.getElementById("filterSummaryChips"),
};

let trendChart;
let volumeGrowthChart;
let monthSeasonalityChart;
let subsectorVolumeChart;
let yieldTrendChart;
let ensoByYear = null;
let ensoByQuarter = null;
let ensoBySemester = null;
let ensoOutlookByQuarter = null;
let chartExpandModalChart = null;
let chartExpandPaintSeq = 0;
let chartExpandShowForecast = false;
let chartExpandForecastMethod = "seasonal_naive";
let chartExpandLastForecastWarnings = [];
let chartExpandLastForecastSnapshot = null;

/** Statistical projection window shown in expanded production trend (quarterly). */
const CHART_EXPAND_FORECAST_HORIZONS = [
  { year: 2026, quarter: 4 },
  { year: 2027, quarter: 1 },
  { year: 2027, quarter: 2 },
  { year: 2027, quarter: 3 },
  { year: 2027, quarter: 4 },
];

const CHART_EXPAND_FORECAST_METHODS = [
  {
    value: "seasonal_naive",
    label: "Seasonal naive",
    short: "same quarter baseline + ENSO",
    methodBlurb:
      "Each quarter is projected from the latest same-calendar-quarter value under your filters, chaining earlier outlook quarters when PSA has not published that period yet.",
  },
  {
    value: "ets",
    label: "Exponential smoothing",
    short: "Holt-Winters ETS + ENSO",
    methodBlurb:
      "The statistical baseline comes from Holt–Winters exponential smoothing on your filtered quarterly history (computed on the server).",
  },
  {
    value: "arima",
    label: "ARIMA",
    short: "seasonal ARIMA + ENSO",
    methodBlurb:
      "The statistical baseline comes from a seasonal ARIMA model on your filtered quarterly history (computed on the server).",
  },
];

function normalizeChartExpandForecastMethod(value) {
  const key = String(value || "").trim();
  return CHART_EXPAND_FORECAST_METHODS.some((m) => m.value === key)
    ? key
    : CHART_EXPAND_FORECAST_METHODS[0].value;
}

function chartExpandForecastMethodMeta(value = chartExpandForecastMethod) {
  const normalized = normalizeChartExpandForecastMethod(value);
  return (
    CHART_EXPAND_FORECAST_METHODS.find((m) => m.value === normalized) ||
    CHART_EXPAND_FORECAST_METHODS[0]
  );
}

function chartExpandForecastDisclaimerText(meta = chartExpandForecastMethodMeta()) {
  const method = meta?.label || "Seasonal naive";
  const blurb = meta?.methodBlurb || meta?.short || "";
  return (
    `Exploratory outlook for Q4 2026–Q4 2027. Not an official PSA forecast. ` +
    `${method}: ${blurb} ` +
    `El Niño and La Niña adjustments follow NOAA CPC RONI on your current filters (±25% cap).`
  );
}

function renderChartExpandForecastNote(noteEl, meta = chartExpandForecastMethodMeta()) {
  if (!noteEl) return;
  const method = escapeHtml(meta?.label || "Seasonal naive");
  const blurb = escapeHtml(meta?.methodBlurb || meta?.short || "");
  noteEl.innerHTML =
    '<span class="chart-expand-forecast-note-kicker">Exploratory outlook · Q4 2026–Q4 2027</span>' +
    '<span class="chart-expand-forecast-note-disclaimer">Not an official PSA forecast.</span>' +
    `<span class="chart-expand-forecast-note-method"><strong>${method}.</strong> ${blurb}</span>` +
    '<span class="chart-expand-forecast-note-enso">El Niño and La Niña adjustments use the NOAA CPC RONI outlook on your current filters (±25% cap).</span>';
}

let ensoSourceLabel = "";
let ecosystemTrendChart;
let pollTimer;
let dashboardRefreshSeq = 0;
let syncingPeriodFilters = false;
let provinceMeta = [];
let cropMeta = [];
let ecosystemSeriesPoints = [];
let regionEcosystemRows = [];
let provinceComparePoints = [];
let ecoVolumePoints = [];
let regionVolumePoints = [];
let subsectorVolumePoints = [];
let monthSeasonalityPoints = [];
let subsectorSeriesPoints = [];
let ecoVolumeLatestYear = null;
let regionVolumeLatestYear = null;
let regionVolumePeriods = { asOf: null, previous: null };
let regionProvincePoints = [];
let expandedRegionNames = new Set();
let expandedAnnualRegionNames = new Set();
let regionAnnualYears = [];
let regionAnnualPoints = [];
let regionAnnualProvincePoints = [];
let subsectorVolumeLatestYear = null;
let dashboardSnapshot = null;
let latestAnalysisModel = null;
const PROVINCE_VOLUME_TOP_N_DEFAULT = 10;
const PROVINCE_VOLUME_SCROLL_AT = 15;
const ECOSYSTEM_VOLUME_TOP_N_DEFAULT = 10;
const ECOSYSTEM_VOLUME_SCROLL_AT = 10;
const tableSortState = {
  ecosystemVolume: { key: IS_MULTI_CROP ? "latest" : "name", dir: IS_MULTI_CROP ? "desc" : "asc" },
  subsectorVolume: { key: "latest", dir: "desc" },
  regionVolume: { key: "latest", dir: "desc" },
  regionAnnual: { key: "latest", dir: "desc" },
  regionEcosystem: { key: "total", dir: "desc" },
  provinceVolume: { key: "latest", dir: "desc" },
};
let yearBounds = { min: 1990, max: 2026 };
let yearRefreshTimer = null;
let activeYearThumb = "to";

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return;
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, item));
    else sp.set(k, v);
  });
  return sp.toString();
}

async function api(path, options) {
  const res = await fetch(window.agriApiUrl(path), options);
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const payload = JSON.parse(text);
          if (payload?.detail) {
            message =
              typeof payload.detail === "string"
                ? payload.detail
                : JSON.stringify(payload.detail);
          } else {
            message = text.slice(0, 180);
          }
        } catch {
          message = text.slice(0, 180);
        }
      }
    } catch {
      /* keep statusText */
    }
    throw new Error(message);
  }
  return res.json();
}

function checkedValues(groupEl) {
  if (!groupEl) return [];
  return [...groupEl.querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
}

function checkboxCount(groupEl) {
  if (!groupEl) return 0;
  return groupEl.querySelectorAll('input[type="checkbox"]').length;
}

function isPartialMultiSelect(groupEl) {
  const total = checkboxCount(groupEl);
  const selected = checkedValues(groupEl).length;
  return total > 0 && selected > 0 && selected < total;
}

function syncMultiSelectSummary(groupEl) {
  if (!groupEl) return;
  const summary = groupEl.querySelector(".multi-select-summary");
  if (!summary) return;
  const allLabel = groupEl.dataset.allLabel || "All";
  const boxes = [...groupEl.querySelectorAll('input[type="checkbox"]')];
  const selected = boxes.filter((b) => b.checked);
  if (selected.length === boxes.length) {
    summary.textContent = allLabel;
    return;
  }
  if (!selected.length) {
    summary.textContent = groupEl.id === "crop" ? `None selected · ${allLabel}` : allLabel;
    return;
  }
  summary.textContent = `${selected.length} selected`;
}

function setMultiSelectOpen(groupEl, open) {
  if (!groupEl) return;
  const panel = groupEl.querySelector(".multi-select-panel");
  const toggle = groupEl.querySelector(".multi-select-toggle");
  groupEl.classList.toggle("is-open", open);
  if (panel) panel.hidden = !open;
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open && isMultiSelectSearchable(groupEl)) {
    resetMultiSelectSearch(groupEl);
    const searchInput = groupEl.querySelector(".multi-select-search-input");
    requestAnimationFrame(() => searchInput?.focus());
  } else if (!open) {
    resetMultiSelectSearch(groupEl);
  }
}

function closeAllMultiSelects(exceptEl) {
  document.querySelectorAll(".multi-select.is-open").forEach((el) => {
    if (el !== exceptEl) setMultiSelectOpen(el, false);
  });
}

function setCheckedValues(groupEl, values) {
  if (!groupEl) return;
  const wanted = new Set(values.map(String));
  groupEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = wanted.has(input.value);
  });
  syncMultiSelectSummary(groupEl);
}

function multiSelectSearchHtml(placeholder = "Search…") {
  return `<div class="multi-select-search">
      <input type="search" class="multi-select-search-input" placeholder="${escapeAttr(
        placeholder
      )}" aria-label="${escapeAttr(placeholder)}" autocomplete="off" />
    </div>`;
}

function multiSelectActionsHtml({ searchable = false, searchPlaceholder = "Search…" } = {}) {
  const search = searchable ? multiSelectSearchHtml(searchPlaceholder) : "";
  return `${search}<div class="multi-select-actions">
      <button type="button" class="multi-select-action" data-multi-action="select-all">Select all</button>
      <span class="multi-select-actions-sep" aria-hidden="true">·</span>
      <button type="button" class="multi-select-action" data-multi-action="clear">Deselect all</button>
    </div>`;
}

function isMultiSelectSearchable(groupEl) {
  return groupEl?.dataset?.searchable === "true";
}

function multiSelectSearchPlaceholder(groupEl) {
  return groupEl?.dataset?.searchPlaceholder || "Search…";
}

function filterMultiSelectOptions(groupEl, query) {
  if (!groupEl) return;
  const panel = groupEl.querySelector(".multi-select-panel");
  if (!panel) return;
  const q = String(query || "")
    .trim()
    .toLowerCase();
  let visible = 0;
  panel.querySelectorAll(".multi-select-option").forEach((opt) => {
    const text = (opt.textContent || "").trim().toLowerCase();
    const show = !q || text.includes(q);
    opt.hidden = !show;
    if (show) visible += 1;
  });
  let empty = panel.querySelector(".multi-select-empty");
  if (!empty) {
    empty = document.createElement("div");
    empty.className = "multi-select-empty";
    empty.textContent = "No matches";
    panel.appendChild(empty);
  }
  empty.hidden = !q || visible > 0;
}

function resetMultiSelectSearch(groupEl) {
  if (!groupEl || !isMultiSelectSearchable(groupEl)) return;
  const input = groupEl.querySelector(".multi-select-search-input");
  if (input) input.value = "";
  filterMultiSelectOptions(groupEl, "");
}

function checkAllValues(groupEl, { visibleOnly = false } = {}) {
  if (!groupEl) return;
  groupEl.querySelectorAll(".multi-select-option").forEach((opt) => {
    if (visibleOnly && opt.hidden) return;
    const input = opt.querySelector('input[type="checkbox"]');
    if (input) input.checked = true;
  });
  syncMultiSelectSummary(groupEl);
}

function clearAllValues(groupEl, { visibleOnly = false } = {}) {
  if (!groupEl) return;
  groupEl.querySelectorAll(".multi-select-option").forEach((opt) => {
    if (visibleOnly && opt.hidden) return;
    const input = opt.querySelector('input[type="checkbox"]');
    if (input) input.checked = false;
  });
  syncMultiSelectSummary(groupEl);
}

function ensureAtLeastOne(groupEl) {
  // Empty selection is treated as "all" in the filter params and summary label.
  syncMultiSelectSummary(groupEl);
}

function fillMultiSelectOptions(groupEl, values, { preserve = true, checkAll = true } = {}) {
  if (!groupEl) return;
  const panel = groupEl.querySelector(".multi-select-panel");
  if (!panel) return;
  const previous = preserve ? new Set(checkedValues(groupEl)) : new Set();
  const hadPrevious = previous.size > 0;
  const searchable = isMultiSelectSearchable(groupEl);
  const optionsHtml = values
    .map((value) => {
      const checked = checkAll && (!hadPrevious || previous.has(value));
      return `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(
        value
      )}"${checked ? " checked" : ""} /><span>${escapeHtml(value)}</span></label>`;
    })
    .join("");
  panel.innerHTML = `${multiSelectActionsHtml({
    searchable,
    searchPlaceholder: multiSelectSearchPlaceholder(groupEl),
  })}${optionsHtml}`;
  if (hadPrevious && !checkedValues(groupEl).length && checkAll) {
    checkAllValues(groupEl);
  } else {
    syncMultiSelectSummary(groupEl);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

let rawTipEl = null;
let rawTipAnchor = null;

function ensureRawTip() {
  if (rawTipEl) return rawTipEl;
  rawTipEl = document.createElement("div");
  rawTipEl.className = "raw-tip";
  rawTipEl.setAttribute("role", "tooltip");
  rawTipEl.hidden = true;
  document.body.appendChild(rawTipEl);
  return rawTipEl;
}

function positionRawTip(anchor) {
  const tip = ensureRawTip();
  const anchorRect = anchor.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
  let top = anchorRect.top - tipRect.height - 8;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  if (top < 8) top = anchorRect.bottom + 8;
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function showRawTip(anchor, text) {
  if (!text) return;
  const tip = ensureRawTip();
  rawTipAnchor = anchor;
  tip.textContent = text;
  tip.hidden = false;
  tip.classList.remove("is-visible");
  positionRawTip(anchor);
  requestAnimationFrame(() => {
    if (rawTipAnchor !== anchor) return;
    positionRawTip(anchor);
    tip.classList.add("is-visible");
  });
}

function hideRawTip(anchor) {
  if (!rawTipEl || (anchor && rawTipAnchor !== anchor)) return;
  rawTipEl.classList.remove("is-visible");
  rawTipAnchor = null;
  window.setTimeout(() => {
    if (!rawTipEl.classList.contains("is-visible")) {
      rawTipEl.hidden = true;
      rawTipEl.textContent = "";
    }
  }, 120);
}

function setRawTip(el, text) {
  if (!el) return;
  if (!text) {
    el.removeAttribute("data-raw-tip");
    el.classList.remove("has-raw-tip");
    if (rawTipAnchor === el) hideRawTip(el);
    return;
  }
  el.setAttribute("data-raw-tip", text);
  el.classList.add("has-raw-tip");
}

function bindRawTips() {
  document.addEventListener(
    "mouseover",
    (event) => {
      const el = event.target.closest("[data-raw-tip]");
      if (!el) return;
      showRawTip(el, el.getAttribute("data-raw-tip"));
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (event) => {
      const el = event.target.closest("[data-raw-tip]");
      if (!el) return;
      const related = event.relatedTarget;
      if (related && el.contains(related)) return;
      hideRawTip(el);
    },
    true
  );

  window.addEventListener("scroll", () => {
    if (rawTipAnchor && rawTipEl?.classList.contains("is-visible")) {
      positionRawTip(rawTipAnchor);
    }
  }, true);

  window.addEventListener("resize", () => {
    if (rawTipAnchor && rawTipEl?.classList.contains("is-visible")) {
      positionRawTip(rawTipAnchor);
    }
  });
}

function cropParams() {
  if (selectedFarmgateCommodity) {
    return { crop_group: [selectedFarmgateCommodity] };
  }
  if (IS_MULTI_CROP) {
    const selected = checkedValues(els.crop);
    const total = checkboxCount(els.crop);
    const params = {};
    if (selected.length > 0 && total > 0 && selected.length < total) {
      params.crop_group = selected;
    }
    if (els.subsector) {
      const sub = checkedValues(els.subsector);
      const subTotal = checkboxCount(els.subsector);
      if (sub.length > 0 && subTotal > 0 && sub.length < subTotal) {
        params.crop_subtype = sub;
      }
    }
    const source = farmgateSourceValue();
    if (source) params.crop_subtype = [source];
    return params;
  }
  const selected = checkedValues(els.crop);
  const params = { crop_group: CONFIG.cropGroup };
  if (selected.length && selected.length < checkboxCount(els.crop)) {
    params.crop_subtype = selected;
  }
  return params;
}

let selectedFarmgateCommodity = null;
let selectedFarmgateItem = null;
let farmgateBoardItems = [];
let farmgateBoardPeriod = { asOf: null, previous: null };
let farmgateBoardSearch = "";
let farmgateBoardClass = "";
let farmgateOverviewReady = false;
let farmgateSource = (CONFIG.defaultSource || farmgateSourceOptions()[0] || "Establishment");

function hasCommodityBoard() {
  return Boolean(CONFIG.commodityBoard && document.getElementById("farmgateOverview"));
}

function farmgateFamilyFor(name) {
  if (CONFIG.boardFamilyMode === "livestock_poultry") return livestockFarmgateFamily(name);
  const row = (cropMeta || []).find((crop) => crop.crop_group === name);
  return row?.crop_subtype || farmgateOtherFamily();
}

function farmgatePriceText(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return fmt.price(Number(value));
}

function farmgateMove(item) {
  const current = Number(item.current);
  const previous = Number(item.previous);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { className: "is-even", text: `No prior ${farmgatePeriodNoun()}`, arrow: "" };
  }
  const growth = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(growth) < 0.05) {
    return { className: "is-even", text: "Unchanged", arrow: "→" };
  }
  const up = growth > 0;
  return {
    className: up ? "is-above" : "is-below",
    text: `${up ? "↑" : "↓"} ${fmt.score(Math.abs(growth), { compact: false, fixed: true })}%`,
    arrow: up ? "↑" : "↓",
  };
}

function farmgatePlaceText(bound) {
  if (!bound) return "No location";
  return bound.place || bound.province || bound.region || "No location";
}

function farmgateBoundCell(bound, tone) {
  if (!bound || bound.price == null || Number.isNaN(Number(bound.price))) {
    return `<span class="farmgate-board-muted">—</span>`;
  }
  const toneClass = tone ? ` is-${tone}` : "";
  return `<span class="farmgate-board-bound${toneClass}">
    <strong>₱${escapeHtml(farmgatePriceText(bound.price))}</strong>
    <small>${escapeHtml(farmgatePlaceText(bound))}</small>
  </span>`;
}

function farmgateAreaPhrase(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return "reporting areas";
  return n === 1 ? "1 reporting area" : `${fmt.number(n)} reporting areas`;
}

function farmgatePesoDelta(current, previous) {
  const diff = Number(current) - Number(previous);
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.005) return "almost unchanged";
  const amount = farmgatePriceText(Math.abs(diff));
  return diff > 0 ? `up ₱${amount} from` : `down ₱${amount} from`;
}

function farmgateBoundKind(bound) {
  if (!bound) return "area";
  if (!bound.province || bound.province === bound.region) return "region";
  return "province";
}

function setFarmgateView(mode) {
  const isAnalysis = mode === "analysis";
  const overview = document.getElementById("farmgateOverview");
  const analysis = document.getElementById("farmgateAnalysis");
  if (overview) {
    overview.hidden = isAnalysis;
    overview.setAttribute("aria-hidden", isAnalysis ? "true" : "false");
  }
  if (analysis) {
    analysis.hidden = !isAnalysis;
    analysis.setAttribute("aria-hidden", isAnalysis ? "false" : "true");
  }
  document.body.classList.toggle("is-farmgate-analysis", isAnalysis);
  const main = document.querySelector(".app-main");
  if (main) main.scrollTop = 0;
}

function formatFarmgateHeroName(name) {
  const raw = String(name || "").trim();
  const match = raw.match(/^(.*?)(\s*\[[^\]]+\])\s*$/);
  if (!match || !match[1].trim()) return escapeHtml(raw);
  return `${escapeHtml(match[1].trim())}<span class="farmgate-analysis-hero-alias">${escapeHtml(
    match[2].trim()
  )}</span>`;
}

function renderFarmgateHero(item) {
  const host = document.getElementById("farmgateAnalysisHero");
  if (!host) return;
  if (!item) {
    host.innerHTML = "";
    return;
  }
  const family = item.family ? `<p class="farmgate-analysis-hero-family">${escapeHtml(item.family)}</p>` : "";
  host.innerHTML = `
    ${family}
    <h2 class="farmgate-analysis-hero-name">${formatFarmgateHeroName(item.name)}</h2>
  `;
}

function renderFarmgateAnalysisScores(item) {
  if (!document.getElementById("farmgateMonthScores")) return;
  const asOf = farmgateBoardPeriod.asOf?.label || `latest ${farmgatePeriodNoun()}`;
  const previousLabel = farmgateBoardPeriod.previous?.label || `previous ${farmgatePeriodNoun()}`;
  const groupLabel = document.getElementById("farmgateMonthScoresLabel");
  if (groupLabel) groupLabel.textContent = "Overview";

  const move = farmgateMove(item || {});

  setCompactScore(document.getElementById("fgPeriod"), item?.period_average, { compact: false });
  setCompactScore(document.getElementById("fgCurrent"), item?.current, { compact: false });
  setCompactScore(document.getElementById("fgPrevious"), item?.previous, { compact: false });
  setCompactScore(document.getElementById("fgLow"), item?.low?.price, { compact: false });
  setCompactScore(document.getElementById("fgHigh"), item?.high?.price, { compact: false });

  const moveEl = document.getElementById("fgCurrentMove");
  if (moveEl) {
    moveEl.className = `farmgate-card-move ${move.className}`;
    moveEl.textContent = move.arrow ? move.text : "";
  }
  const periodHint = document.getElementById("fgPeriodHint");
  if (periodHint) {
    const { year_from, year_to } = getYearRange();
    const years = Number(item?.period_years);
    const n = Number.isFinite(years) && years > 0 ? years : year_to - year_from + 1;
    const range = year_from === year_to ? String(year_from) : `${year_from}–${year_to}`;
    const yearText = n === 1 ? "1 year" : `${n} years`;
    periodHint.textContent = `Unweighted mean of yearly averages of ${farmgateAreaPhrase(item?.geo_count)} · ${range} · ${yearText}`;
  }
  const currentHint = document.getElementById("fgCurrentHint");
  if (currentHint) {
    const coverage = `Unweighted mean of ${farmgateAreaPhrase(item?.geo_count)} in ${asOf}`;
    if (item?.current != null && item?.previous != null) {
      const prevMonth = previousLabel.replace(/\s+\d{4}$/, "");
      currentHint.textContent = `${coverage} · ${farmgatePesoDelta(item.current, item.previous)} ${prevMonth}`;
    } else {
      currentHint.textContent = coverage;
    }
  }
  const previousHint = document.getElementById("fgPreviousHint");
  if (previousHint) {
    previousHint.textContent = `Unweighted mean of ${farmgateAreaPhrase(item?.previous_geo_count || item?.geo_count)} in ${previousLabel}, the previous reporting ${farmgatePeriodNoun()}`;
  }
  const lowHint = document.getElementById("fgLowHint");
  if (lowHint) {
    lowHint.textContent = item?.low
      ? `Lowest reported ${farmgateBoundKind(item.low)} price in ${asOf} · ${farmgatePlaceText(item.low)}`
      : `No reported low in ${asOf}`;
  }
  const highHint = document.getElementById("fgHighHint");
  if (highHint) {
    highHint.textContent = item?.high
      ? `Highest reported ${farmgateBoundKind(item.high)} price in ${asOf} · ${farmgatePlaceText(item.high)}`
      : `No reported high in ${asOf}`;
  }
}

async function refreshFarmgateAnalysisScores() {
  if (!selectedFarmgateCommodity) return;
  const payload = await api(`/api/price-board?${qs({ ...farmgateBoardParams(), crop_group: [selectedFarmgateCommodity] })}`);
  farmgateBoardPeriod = {
    asOf: payload.as_of || farmgateBoardPeriod.asOf,
    previous: payload.previous || farmgateBoardPeriod.previous,
  };
  const item = (payload.items || []).find((row) => row.name === selectedFarmgateCommodity) || payload.items?.[0] || null;
  if (item) {
    selectedFarmgateItem = {
      name: item.name,
      family: item.family || farmgateFamilyFor(item.name),
      current: item.current,
      previous: item.previous,
      period_average: item.period_average,
      period_years: item.period_years,
      latest: item.current,
      geo_count: item.geo_count,
      previous_geo_count: item.previous_geo_count,
      low: item.low || null,
      high: item.high || null,
    };
  }
  renderFarmgateAnalysisScores(selectedFarmgateItem);
}

function farmgateBoardParams() {
  const saved = selectedFarmgateCommodity;
  selectedFarmgateCommodity = null;
  const params = commonParams();
  selectedFarmgateCommodity = saved;
  delete params.split_by;
  return params;
}

function farmgateBoardClassifications() {
  const names = new Set();
  for (const item of farmgateBoardItems) {
    const family = item.family || farmgateFamilyFor(item.name);
    if (family) names.add(family);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function visibleFarmgateBoardItems() {
  const query = farmgateBoardSearch.trim().toLowerCase();
  return farmgateBoardItems.filter((item) => {
    const family = item.family || farmgateFamilyFor(item.name) || "";
    if (farmgateBoardClass && family !== farmgateBoardClass) return false;
    if (!query) return true;
    return `${item.name} ${family}`.toLowerCase().includes(query);
  });
}

function farmgateBoardRowHtml(item) {
  const family = item.family || farmgateFamilyFor(item.name) || farmgateOtherFamily();
  const move = farmgateMove(item);
  return `<tr class="farmgate-board-row" data-commodity="${escapeAttr(item.name)}" tabindex="0" aria-label="Open analysis for ${escapeAttr(item.name)}">
    <td class="farmgate-board-family">${escapeHtml(family)}</td>
    <td class="farmgate-board-commodity">${formatFarmgateHeroName(item.name)}</td>
    <td class="farmgate-board-num">₱${escapeHtml(farmgatePriceText(item.current))}</td>
    <td class="farmgate-board-num">₱${escapeHtml(farmgatePriceText(item.previous))}</td>
    <td class="farmgate-board-move"><span class="farmgate-card-move ${move.className}">${escapeHtml(move.text)}</span></td>
    <td class="farmgate-board-bound-cell">${farmgateBoundCell(item.low, "low")}</td>
    <td class="farmgate-board-bound-cell">${farmgateBoundCell(item.high, "high")}</td>
  </tr>`;
}

function syncFarmgateBoardControls(host) {
  const search = host.querySelector("#farmgateBoardSearch");
  if (search && document.activeElement !== search) search.value = farmgateBoardSearch;
  const klass = host.querySelector("#farmgateClassFilter");
  if (!klass) return;
  const current = farmgateBoardClassifications().includes(farmgateBoardClass)
    ? farmgateBoardClass
    : "";
  farmgateBoardClass = current;
  const options = ['<option value="">All classifications</option>']
    .concat(
      farmgateBoardClassifications().map(
        (name) =>
          `<option value="${escapeAttr(name)}"${name === current ? " selected" : ""}>${escapeHtml(name)}</option>`
      )
    )
    .join("");
  if (klass.innerHTML !== options) {
    klass.innerHTML = options;
    klass.value = current;
  }
}

function renderFarmgateBoardRows(host) {
  const tbody = host.querySelector("#farmgateBoardBody");
  if (!tbody) return;
  const rows = [...visibleFarmgateBoardItems()].sort((a, b) => {
    const familyA = a.family || farmgateFamilyFor(a.name) || farmgateOtherFamily();
    const familyB = b.family || farmgateFamilyFor(b.name) || farmgateOtherFamily();
    const familyCmp = familyA.localeCompare(familyB, "en", { sensitivity: "base" });
    if (familyCmp) return familyCmp;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
  if (!rows.length) {
    tbody.innerHTML = `<tr class="farmgate-board-empty-row"><td colspan="7">No ${escapeHtml(farmgateGroupPlural())} match the current classification or search.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(farmgateBoardRowHtml).join("");
}

function renderFarmgateBoard() {
  const host = document.getElementById("farmgateGroups");
  if (!host) return;
  if (!farmgateBoardItems.length) {
    host.innerHTML = `<p class="farmgate-empty">No priced ${escapeHtml(farmgateGroupPlural())} for the current filters.</p>`;
    return;
  }

  const boardKicker = CONFIG.boardKicker || farmgateDomainLabel();
  const boardTitle = CONFIG.boardTitle || "Farmgate Prices";
  const boardHint =
    CONFIG.boardHint ||
    `Click a ${farmgateGroupNoun()} row to view the farmgate price analysis.`;
  const searchPlaceholder = CONFIG.boardSearchPlaceholder || `Search ${farmgateGroupNoun()}…`;

  if (!host.querySelector(".farmgate-board")) {
    host.innerHTML = `<section class="farmgate-board" aria-label="${escapeAttr(boardKicker)} farmgate prices">
      <header class="farmgate-board-head">
        <div class="farmgate-board-head-copy">
          <p class="farmgate-board-kicker">${escapeHtml(boardKicker)}</p>
          <h3 class="farmgate-board-title">${escapeHtml(boardTitle)}</h3>
          <p class="farmgate-board-hint">${escapeHtml(boardHint)}</p>
        </div>
      </header>
      <div class="farmgate-board-toolbar">
        <label class="farmgate-board-filter">
          <span>${escapeHtml(farmgateSubtypeLabel())}</span>
          <select id="farmgateClassFilter" aria-label="Filter by ${escapeAttr(farmgateSubtypeLabel().toLowerCase())}">
            <option value="">All classifications</option>
          </select>
        </label>
        <label class="farmgate-board-search">
          <span>Search</span>
          <input id="farmgateBoardSearch" type="search" placeholder="${escapeAttr(searchPlaceholder)}" autocomplete="off" aria-label="${escapeAttr(searchPlaceholder)}" />
        </label>
      </div>
      <div class="farmgate-board-table-wrap">
        <table class="farmgate-board-table">
          <thead>
            <tr>
              <th scope="col">${escapeHtml(farmgateSubtypeLabel())}</th>
              <th scope="col">${escapeHtml(farmgateGroupLabel())}</th>
              <th scope="col">Latest avg farmgate price</th>
              <th scope="col">Previous avg farmgate price</th>
              <th scope="col">Movement</th>
              <th scope="col">Lowest</th>
              <th scope="col">Highest</th>
            </tr>
          </thead>
          <tbody id="farmgateBoardBody"></tbody>
        </table>
      </div>
    </section>`;
  }

  syncFarmgateBoardControls(host);
  renderFarmgateBoardRows(host);
}

async function refreshFarmgateOverview() {
  const seq = dashboardRefreshSeq;
  const payload = await api(`/api/price-board?${qs(farmgateBoardParams())}`);
  if (seq !== dashboardRefreshSeq) return;
  farmgateBoardPeriod = {
    asOf: payload.as_of || null,
    previous: payload.previous || null,
  };
  farmgateBoardItems = (payload.items || []).map((item) => ({
    name: item.name,
    family: item.family || farmgateFamilyFor(item.name),
    current: item.current,
    previous: item.previous,
    latest: item.current,
    geo_count: item.geo_count,
    previous_geo_count: item.previous_geo_count,
    low: item.low || null,
    high: item.high || null,
  }));
  renderFarmgateBoard();
  farmgateOverviewReady = true;
  if (!shouldDeferPreviewReadyForFarmgateOverview()) {
    signalPreviewReady();
  }
}

function selectFarmgateCommodity(name, { scheduleRefresh = true } = {}) {
  const item = farmgateBoardItems.find((row) => row.name === name) || { name, family: farmgateFamilyFor(name) };
  selectedFarmgateCommodity = name;
  selectedFarmgateItem = item;
  setFarmgateView("analysis");
  renderFarmgateHero(item);
  renderFarmgateAnalysisScores(item);
  if (scheduleRefresh) {
    requestAnimationFrame(() => {
      refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
    });
  }
}

function resolvePreviewFarmgateCommodity() {
  const target = previewCommodityName();
  if (!target || !farmgateBoardItems.length) return null;
  return (
    farmgateBoardItems.find((row) => row.name === target) ||
    farmgateBoardItems.find((row) => row.name.toLowerCase().includes(target.toLowerCase())) ||
    null
  );
}

async function openPreviewFarmgateCommodityIfNeeded() {
  if (!PREVIEW_EMBED || !hasCommodityBoard() || selectedFarmgateCommodity) return;
  const pick = resolvePreviewFarmgateCommodity();
  if (!pick) {
    signalPreviewReady();
    return;
  }
  selectFarmgateCommodity(pick.name, { scheduleRefresh: false });
  await refreshDashboard();
}

function clearFarmgateCommodity() {
  selectedFarmgateCommodity = null;
  selectedFarmgateItem = null;
  setFarmgateView("overview");
  renderFarmgateHero(null);
  refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
}

function bindFarmgateBoard() {
  if (!hasCommodityBoard()) return;
  setFarmgateView("overview");
  const host = document.getElementById("farmgateGroups");
  if (host && !host.innerHTML.trim()) {
    host.innerHTML = `<p class="farmgate-empty">Loading ${escapeHtml(farmgateGroupPlural())}…</p>`;
  }
  document.getElementById("farmgateGroups")?.addEventListener("click", (event) => {
    if (event.target.closest(".farmgate-board-toolbar")) return;
    const row = event.target.closest("[data-commodity]");
    if (!row) return;
    selectFarmgateCommodity(row.dataset.commodity);
  });
  document.getElementById("farmgateGroups")?.addEventListener("input", (event) => {
    const search = event.target.closest("#farmgateBoardSearch");
    if (!search) return;
    farmgateBoardSearch = search.value || "";
    renderFarmgateBoard();
  });
  document.getElementById("farmgateGroups")?.addEventListener("change", (event) => {
    const klass = event.target.closest("#farmgateClassFilter");
    if (!klass) return;
    farmgateBoardClass = klass.value || "";
    renderFarmgateBoard();
  });
  document.getElementById("farmgateGroups")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("[data-commodity]");
    if (!row) return;
    event.preventDefault();
    selectFarmgateCommodity(row.dataset.commodity);
  });
  document.getElementById("farmgateBackBtn")?.addEventListener("click", () => {
    clearFarmgateCommodity();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.querySelector(".app-modal.is-open")) return;
    if (selectedFarmgateCommodity) {
      event.preventDefault();
      clearFarmgateCommodity();
    }
  });
  bindFarmgateSourceToggle();
}

function bindFarmgateSourceToggle() {
  const options = farmgateSourceOptions();
  const bar = document.getElementById("farmgateSourceBar");
  if (bar) bar.hidden = !options.length;
  if (!options.length) return;
  farmgateSource = farmgateSourceValue();
  syncFarmgateSourceToggle();
  bar?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-farmgate-source]");
    if (!btn) return;
    setFarmgateSource(btn.dataset.farmgateSource);
  });
}

function syncFarmgateSourceToggle() {
  const current = farmgateSourceValue();
  document.querySelectorAll("[data-farmgate-source]").forEach((btn) => {
    const on = btn.dataset.farmgateSource === current;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
}

function setFarmgateSource(source) {
  const options = farmgateSourceOptions();
  if (!options.includes(source) || source === farmgateSourceValue()) return;
  farmgateSource = source;
  farmgateBoardClass = "";
  farmgateBoardSearch = "";
  const host = document.getElementById("farmgateGroups");
  if (host) host.innerHTML = "";
  syncFarmgateSourceToggle();
  populateSpeciesOptions({ preserve: false });
  const stillExists = (cropMeta || []).some(
    (crop) => crop.crop_group === selectedFarmgateCommodity && crop.crop_subtype === source
  );
  if (selectedFarmgateCommodity && stillExists) {
    selectFarmgateCommodity(selectedFarmgateCommodity);
    return;
  }
  if (selectedFarmgateCommodity) {
    clearFarmgateCommodity();
    return;
  }
  refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
}

function isCropFilterNarrowed() {
  if (!IS_MULTI_CROP || !els.crop) return false;
  const total = checkboxCount(els.crop);
  const selected = checkedValues(els.crop);
  return total > 0 && selected.length > 0 && selected.length < total;
}

function selectedCropFilterValues() {
  if (!isCropFilterNarrowed()) return [];
  return checkedValues(els.crop);
}

function filterSeriesPointsByCrop(points) {
  const allowed = selectedCropFilterValues();
  if (!allowed.length) return points || [];
  const set = new Set(allowed);
  return (points || []).filter((p) => set.has(p.crop_subtype));
}

function multiFilterParams() {
  const quarters = checkedValues(els.quarter).map(Number);
  const semesters = checkedValues(els.semester).map(Number);
  const months = checkedValues(els.month).map(Number);
  const params = {};
  if (quarters.length && quarters.length < checkboxCount(els.quarter)) params.quarter = quarters;
  if (semesters.length && semesters.length < checkboxCount(els.semester)) params.semester = semesters;
  if (months.length && months.length < checkboxCount(els.month)) params.month = months;
  return params;
}

const QUARTERS_BY_SEMESTER = {
  1: ["1", "2"],
  2: ["3", "4"],
};
const SEMESTER_BY_QUARTER = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
};
const MONTHS_BY_QUARTER = {
  1: ["1", "2", "3"],
  2: ["4", "5", "6"],
  3: ["7", "8", "9"],
  4: ["10", "11", "12"],
};
const QUARTER_BY_MONTH = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 2,
  7: 3,
  8: 3,
  9: 3,
  10: 4,
  11: 4,
  12: 4,
};

function allQuarterValues() {
  return ["1", "2", "3", "4"];
}

function allSemesterValues() {
  return ["1", "2"];
}

function allMonthValues() {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
}

function isFullPeriodSelection(values, total) {
  return total > 0 && values.length === total;
}

function semestersForQuarters(quarters) {
  const ids = new Set();
  for (const quarter of quarters) {
    const semester = SEMESTER_BY_QUARTER[quarter];
    if (semester) ids.add(String(semester));
  }
  return [...ids].sort();
}

function quartersForSemesters(semesters) {
  const ids = new Set();
  for (const semester of semesters) {
    for (const quarter of QUARTERS_BY_SEMESTER[semester] || []) ids.add(quarter);
  }
  return [...ids].sort();
}

function monthsForQuarters(quarters) {
  const ids = new Set();
  for (const quarter of quarters) {
    for (const month of MONTHS_BY_QUARTER[quarter] || []) ids.add(month);
  }
  return [...ids].sort((a, b) => Number(a) - Number(b));
}

function quartersForMonths(months) {
  const ids = new Set();
  for (const month of months) {
    const quarter = QUARTER_BY_MONTH[Number(month)];
    if (quarter) ids.add(String(quarter));
  }
  return [...ids].sort();
}

/** Keep month, quarter, and semester filters aligned (S1=Q1–Q2, Q1=Jan–Mar). */
function syncPeriodFilters(changed) {
  if (syncingPeriodFilters) return;
  const hasQuarter = Boolean(els.quarter);
  const hasSemester = Boolean(els.semester);
  const hasMonth = Boolean(els.month);
  if (!hasQuarter && !hasSemester && !hasMonth) return;
  syncingPeriodFilters = true;
  try {
    if (changed === "quarter" && hasQuarter) {
      const selected = checkedValues(els.quarter).map(Number);
      const total = checkboxCount(els.quarter);
      let nextSemesters;
      let nextMonths;
      if (isFullPeriodSelection(selected, total)) {
        nextSemesters = allSemesterValues();
        nextMonths = allMonthValues();
      } else if (!selected.length) {
        nextSemesters = [];
        nextMonths = [];
      } else {
        nextSemesters = semestersForQuarters(selected);
        nextMonths = monthsForQuarters(selected);
      }
      if (hasSemester) {
        setCheckedValues(els.semester, nextSemesters);
      syncMultiSelectSummary(els.semester);
      }
      if (hasMonth) {
        setCheckedValues(els.month, nextMonths);
        syncMultiSelectSummary(els.month);
      }
    } else if (changed === "semester" && hasSemester) {
      const selected = checkedValues(els.semester).map(Number);
      const total = checkboxCount(els.semester);
      let nextQuarters;
      if (isFullPeriodSelection(selected, total)) nextQuarters = allQuarterValues();
      else if (!selected.length) nextQuarters = [];
      else nextQuarters = quartersForSemesters(selected);
      if (hasQuarter) {
        setCheckedValues(els.quarter, nextQuarters);
      syncMultiSelectSummary(els.quarter);
      }
      if (hasMonth) {
        const nextMonths = !nextQuarters.length
          ? []
          : isFullPeriodSelection(nextQuarters.map(Number), checkboxCount(els.quarter) || 4)
            ? allMonthValues()
            : monthsForQuarters(nextQuarters.map(Number));
        setCheckedValues(els.month, nextMonths);
        syncMultiSelectSummary(els.month);
      }
    } else if (changed === "month" && hasMonth) {
      const selected = checkedValues(els.month).map(Number);
      const total = checkboxCount(els.month);
      let nextQuarters;
      if (isFullPeriodSelection(selected, total)) nextQuarters = allQuarterValues();
      else if (!selected.length) nextQuarters = [];
      else nextQuarters = quartersForMonths(selected);
      if (hasQuarter) {
        setCheckedValues(els.quarter, nextQuarters);
        syncMultiSelectSummary(els.quarter);
      }
      if (hasSemester) {
        const nextSemesters = !nextQuarters.length
          ? []
          : isFullPeriodSelection(nextQuarters.map(Number), checkboxCount(els.quarter) || 4)
            ? allSemesterValues()
            : semestersForQuarters(nextQuarters.map(Number));
        setCheckedValues(els.semester, nextSemesters);
        syncMultiSelectSummary(els.semester);
      }
    }
  } finally {
    syncingPeriodFilters = false;
  }
}

function geoParams() {
  const regions = checkedValues(els.region);
  const provinces = checkedValues(els.province);
  const params = {};
  if (regions.length && regions.length < checkboxCount(els.region)) params.region = regions;
  if (provinces.length && provinces.length < checkboxCount(els.province)) params.province = provinces;
  return params;
}

function defaultYearTo() {
  if (isPriceMode()) return yearBounds.max;
  const previousYear = new Date().getFullYear() - 1;
  return Math.max(yearBounds.min, Math.min(yearBounds.max, previousYear));
}

function getYearRange() {
  let from = Number(els.yearFrom.value);
  let to = Number(els.yearTo.value);
  if (from > to) [from, to] = [to, from];
  return { year_from: from, year_to: to };
}

function syncYearRangeUI() {
  const { year_from, year_to } = getYearRange();
  const min = Number(els.yearFrom.min);
  const max = Number(els.yearFrom.max);
  const span = Math.max(max - min, 1);
  const startPct = ((year_from - min) / span) * 100;
  const endPct = ((year_to - min) / span) * 100;

  if (els.yearRangeTrack) {
    els.yearRangeTrack.style.setProperty("--range-start", `${startPct}%`);
    els.yearRangeTrack.style.setProperty("--range-span", `${Math.max(endPct - startPct, 0)}%`);
  }

  if (els.yearTooltip) {
    els.yearTooltip.textContent =
      year_from === year_to ? String(year_from) : `${year_from} – ${year_to}`;
    els.yearTooltip.style.left = "";
  }

  els.yearFrom.style.zIndex = year_from >= year_to - 1 ? "5" : "3";
  els.yearTo.style.zIndex = "4";
  els.yearFrom.classList.toggle("is-active", activeYearThumb === "from");
  els.yearTo.classList.toggle("is-active", activeYearThumb === "to");

  const yearCount = year_to - year_from + 1;
  const isDefaultRange = year_from === yearBounds.min && year_to === defaultYearTo();
  if (els.yearRangeCount) {
    els.yearRangeCount.textContent = isDefaultRange
      ? "All years"
      : yearCount === 1
        ? "1 year"
        : `${yearCount} years`;
  }
}

function buildYearScale() {
  const host = els.yearRangeScale;
  if (!host) return;
  const min = yearBounds.min;
  const max = yearBounds.max;
  const span = Math.max(max - min, 1);
  const steps = 4;
  const labels = [];
  for (let i = 0; i <= steps; i += 1) {
    const year = Math.round(min + (span * i) / steps);
    const pct = ((year - min) / span) * 100;
    const edge = i === 0 ? " is-start" : i === steps ? " is-end" : "";
    labels.push(
      `<span class="year-scale-label${edge}" style="left:${pct}%">${year}</span>`
    );
  }
  host.innerHTML = labels.join("");
}

function setYearRange(from, to, { silent = false } = {}) {
  const min = yearBounds.min;
  const max = yearBounds.max;
  let yFrom = Math.min(Math.max(Number(from), min), max);
  let yTo = Math.min(Math.max(Number(to), min), max);
  if (yFrom > yTo) [yFrom, yTo] = [yTo, yFrom];
  els.yearFrom.min = String(min);
  els.yearFrom.max = String(max);
  els.yearTo.min = String(min);
  els.yearTo.max = String(max);
  els.yearFrom.value = String(yFrom);
  els.yearTo.value = String(yTo);
  syncYearRangeUI();
  if (!silent) markActiveFilterIcons();
}

function commonParams(extra = {}) {
  const params = {
    dataset: DATASET,
    ...getYearRange(),
    ...multiFilterParams(),
    ...geoParams(),
    ...cropParams(),
    ...extra,
  };
  if (IS_MULTI_CROP) {
    params.split_by = CONFIG.seriesSplit || "crop_group";
  }
  return params;
}

function selectedRegions() {
  const selected = checkedValues(els.region);
  const total = checkboxCount(els.region);
  if (!selected.length || selected.length === total) return [];
  return selected;
}

function populateRegions(regions) {
  fillMultiSelectOptions(els.region, regions || [], { preserve: false, checkAll: true });
}

function populateProvinces(preserveSelection = true) {
  const regions = selectedRegions();
  const options = provinceMeta
    .filter((p) => !regions.length || regions.includes(p.region))
    .map((p) => p.province)
    .slice()
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  fillMultiSelectOptions(els.province, options, {
    preserve: preserveSelection,
    checkAll: true,
  });
}

function selectedSubsectors() {
  if (!els.subsector) return [];
  const selected = checkedValues(els.subsector);
  const total = checkboxCount(els.subsector);
  if (!selected.length || selected.length === total) return [];
  return selected;
}

function populateSpeciesOptions({ preserve = true } = {}) {
  if (!els.crop || !IS_MULTI_CROP) return;
  const selectedSubs = selectedSubsectors();
  const groups = [];
  const seen = new Set();
  for (const crop of cropMeta) {
    if (selectedSubs.length && !selectedSubs.includes(crop.crop_subtype)) continue;
    const source = farmgateSourceValue();
    if (source && crop.crop_subtype !== source) continue;
    const name = crop.crop_group;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    groups.push(name);
  }
  groups.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  CONFIG.subtypes = groups.map((g, i) => ({
    value: g,
    label: g,
    color: CROP_PALETTE[i % CROP_PALETTE.length],
  }));
  const previous = preserve ? checkedValues(els.crop) : defaultCropSelection(groups);
  fillMultiSelectOptions(els.crop, groups, { preserve: false, checkAll: false });
  const keep = previous.filter((name) => groups.includes(name));
  setCheckedValues(els.crop, keep.length ? keep : defaultCropSelection(groups));
  SUBTYPE_VALUES = chartSeriesValues();
}

function pctChange(from, to) {
  if (from == null || to == null || Number.isNaN(from) || Number.isNaN(to) || from === 0) {
    return null;
  }
  return ((to - from) / Math.abs(from)) * 100;
}

function describeChange(pct) {
  if (pct == null || Number.isNaN(pct)) return null;
  const abs = Math.abs(pct);
  const amount = fmt.score(abs, { compact: false });
  if (abs < 0.05) return "held nearly steady";
  if (pct > 0) return abs >= 20 ? `rose sharply by ${amount}%` : `rose by ${amount}%`;
  return abs >= 20 ? `fell sharply by ${amount}%` : `fell by ${amount}%`;
}

function averageFinite(values, { ignoreZero = true } = {}) {
  const nums = [];
  for (const value of values || []) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    if (ignoreZero && n === 0) continue;
    nums.push(n);
  }
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function sampleStdev(values, { ignoreZero = true } = {}) {
  const nums = [];
  for (const value of values || []) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    if (ignoreZero && n === 0) continue;
    nums.push(n);
  }
  if (nums.length < 2) return null;
  const mean = nums.reduce((sum, n) => sum + n, 0) / nums.length;
  const variance = nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

function formatProductionMt(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${fmt.score(Number(value))} MT`;
}

function formatMonthSpan(months) {
  if (!months?.length) return "";
  const label = farmgateSeasonFullLabel;
  if (months.length === 1) return label(months[0]);
  if (months.length === 2) return `${label(months[0])} and ${label(months[1])}`;
  return `${label(months[0])} through ${label(months[months.length - 1])}`;
}

function consecutiveMonthRuns(months, include) {
  const runs = [];
  let run = [];
  for (const month of months || []) {
    if (include(month)) {
      run.push(month);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}

const VOLUME_GROWTH_FIRST_YEAR = 2011;

function volumeGrowthEndYear() {
  return defaultYearTo();
}

function buildVolumeYoYGrowth(points) {
  const { year_from, year_to } = getYearRange();
  const endYear = Math.min(year_to, volumeGrowthEndYear());
  const byYear = new Map();
  for (const p of points || []) {
    const year = Number(p.year);
    if (!Number.isFinite(year)) continue;
    const volume = p.volume_mt;
    if (volume == null || Number.isNaN(Number(volume))) continue;
    byYear.set(year, Number(volume));
  }

  const labels = [];
  const values = [];
  const currentVolumes = [];
  const previousVolumes = [];
  const variances = [];
  for (let year = VOLUME_GROWTH_FIRST_YEAR; year <= endYear; year += 1) {
    if (year < year_from) continue;
    const current = byYear.get(year);
    const previous = byYear.get(year - 1);
    if (current == null) continue;
    labels.push(year);
    currentVolumes.push(current);
    previousVolumes.push(previous == null ? null : previous);
    variances.push(
      previous == null ? null : current - previous
    );
    if (previous == null || previous === 0) {
      values.push(null);
    } else {
      values.push(((current - previous) / Math.abs(previous)) * 100);
    }
  }
  return { labels, values, currentVolumes, previousVolumes, variances };
}

function buildVolumeGrowthSummary(labels, values) {
  const pairs = (labels || [])
    .map((year, i) => ({ year, growth: values[i] }))
    .filter((row) => row.growth != null && !Number.isNaN(row.growth));
  if (!pairs.length) {
    return "No year-on-year growth data available for the current filters.";
  }

  const latest = pairs[pairs.length - 1];
  const latestText = describeChange(latest.growth);
  const parts = [
    `Through ${latest.year}, production volume ${latestText || "changed"} versus the prior year.`,
  ];

  let peak = pairs[0];
  let trough = pairs[0];
  for (const row of pairs) {
    if (row.growth > peak.growth) peak = row;
    if (row.growth < trough.growth) trough = row;
  }
  if (peak.year !== latest.year) {
    parts.push(
      `Strongest growth was in ${peak.year} (${fmt.score(peak.growth, { compact: false })}%).`
    );
  }
  if (trough.year !== latest.year && trough.growth < 0) {
    parts.push(
      `Sharpest decline was in ${trough.year} (${fmt.score(trough.growth, { compact: false })}%).`
    );
  }
  return parts.slice(0, 3).join(" ");
}

function priceBarColors(values, { hover = false, peakIndex = -1, lowIndex = -1 } = {}) {
  return (values || []).map((value, i) => {
    const n = Number(value);
    if (value == null || !Number.isFinite(n) || n === 0) {
      return hover ? "rgba(95, 115, 95, 0.4)" : "rgba(95, 115, 95, 0.22)";
    }
    if (i === peakIndex) return hover ? "#06402b" : "#09663f";
    if (i === lowIndex) return hover ? "#a51f1f" : "#c62828";
    return hover ? "rgba(9, 102, 63, 0.78)" : "rgba(9, 102, 63, 0.48)";
  });
}

function growthBarColors(values, { hover = false, peakIndex = -1, lowIndex = -1 } = {}) {
  const hasExtremum = peakIndex >= 0 || lowIndex >= 0;
  return (values || []).map((v, i) => {
    const isExtremum = i === peakIndex || i === lowIndex;
    if (v == null || Number.isNaN(v)) {
      return hover ? "rgba(95, 115, 95, 0.45)" : "rgba(95, 115, 95, 0.28)";
    }

    let color;
    if (v > 0.05) color = hover ? "#146334" : "#1b7a3d";
    else if (v < -0.05) color = hover ? "#a51f1f" : "#c62828";
    else color = hover ? "#6f7f6f" : "#8a9a8a";

    if (hasExtremum && !isExtremum) {
      if (v > 0.05) return hover ? "rgba(20, 99, 52, 0.82)" : "rgba(27, 122, 61, 0.72)";
      if (v < -0.05) return hover ? "rgba(165, 31, 31, 0.82)" : "rgba(198, 40, 40, 0.72)";
      return hover ? "rgba(111, 127, 111, 0.82)" : "rgba(138, 154, 138, 0.72)";
    }
    return color;
  });
}

function renderVolumeGrowthChart(points) {
  if (!volumeGrowthChart) return;
  const { labels, values, currentVolumes, previousVolumes, variances } =
    buildVolumeYoYGrowth(points);
  const peakIndex = peakValueIndex(values);
  const lowIndex = lowValueIndex(values);
  volumeGrowthChart.$growthExtrasReady = prefersReducedMotion();
  volumeGrowthChart.data.labels = labels;
  volumeGrowthChart.data.datasets = [
    {
      type: "bar",
      label: "YoY growth rate",
      data: values,
      backgroundColor: growthBarColors(values, { peakIndex, lowIndex }),
      hoverBackgroundColor: growthBarColors(values, { hover: true, peakIndex, lowIndex }),
      borderWidth: 0,
      borderRadius: 0,
      borderSkipped: false,
      maxBarThickness: 34,
      categoryPercentage: 0.76,
      barPercentage: 0.86,
      peakIndex,
      lowIndex,
      currentVolumes,
      previousVolumes,
      variances,
    },
  ];
  // Full entrance animation (not the short "active" transition)
  volumeGrowthChart.update();
  applyEnsoBands(volumeGrowthChart, "year");
  if (els.volumeGrowthChartSub) {
    els.volumeGrowthChartSub.textContent = withEnsoRelativity(
      buildVolumeGrowthSummary(labels, values),
      points,
      {
        metricLabel: "production volume",
        unit: "MT",
        compact: true,
      }
    );
  }
}

function buildTrendSummary(points) {
  if (!points || !points.length) {
    return "No annual data available for the current filters.";
  }
  const volumeOnly = CONFIG.showAreaYield === false;
  if (points.length === 1) {
    const p = points[0];
    if (volumeOnly) {
      return `Showing ${p.year} only: production volume ${fmt.score(p.volume_mt)} MT. Expand the year range to compare trends.`;
    }
    return `Showing ${p.year} only: production volume ${fmt.score(p.volume_mt)} MT on ${fmt.score(p.area_ha)} ha harvested. Expand the year range to compare trends.`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const volPct = pctChange(first.volume_mt, last.volume_mt);
  const areaPct = volumeOnly ? null : pctChange(first.area_ha, last.area_ha);
  const volText = describeChange(volPct);
  const areaText = volumeOnly ? null : describeChange(areaPct);

  let peak = points[0];
  for (const p of points) {
    if ((p.volume_mt ?? -Infinity) > (peak.volume_mt ?? -Infinity)) peak = p;
  }

  const parts = [];
  if (volumeOnly) {
    parts.push(
      `From ${first.year} to ${last.year}, production volume ${volText || "changed"}.`
    );
  } else {
    parts.push(
      `From ${first.year} to ${last.year}, production volume ${volText || "changed"} while area harvested ${areaText || "changed"}.`
    );
  }

  if (peak && peak.year !== last.year) {
    parts.push(`Peak production volume was in ${peak.year} (${fmt.score(peak.volume_mt)} MT).`);
  } else if (peak && peak.year === last.year) {
    parts.push(`The latest year (${last.year}) is also the peak production volume in this range.`);
  }

  if (points.length >= 4) {
    const recent = points.slice(-3);
    const prior = points.slice(-6, -3);
    if (prior.length === 3) {
      const recentAvg =
        recent.reduce((s, p) => s + (p.volume_mt || 0), 0) / recent.length;
      const priorAvg = prior.reduce((s, p) => s + (p.volume_mt || 0), 0) / prior.length;
      const recentPct = pctChange(priorAvg, recentAvg);
      const recentText = describeChange(recentPct);
      if (recentText) {
        parts.push(`In the latest 3 years versus the prior 3, average production volume ${recentText}.`);
      }
    }
  }

  if (!volumeOnly && volPct != null && areaPct != null && Math.abs(volPct - areaPct) >= 5) {
    if (volPct > areaPct) {
      parts.push("Production volume outpaced area, pointing to higher average yields over the period.");
    } else {
      parts.push("Area grew faster than production volume, suggesting softer average yields over the period.");
    }
  }

  return parts.slice(0, 3).join(" ");
}

function yieldForPoint(p) {
  if (p.yield_mt_ha != null && !Number.isNaN(p.yield_mt_ha)) return p.yield_mt_ha;
  if (p.area_ha && p.area_ha > 0) return p.volume_mt / p.area_ha;
  return null;
}

function buildYieldTrendSummary(points) {
  const yieldPoints = (points || [])
    .map((p) => ({ year: p.year, yield_mt_ha: yieldForPoint(p) }))
    .filter((p) => p.yield_mt_ha != null && !Number.isNaN(p.yield_mt_ha));

  if (!yieldPoints.length) {
    return "No yield data available for the current filters.";
  }
  if (yieldPoints.length === 1) {
    const p = yieldPoints[0];
    return `Showing ${p.year} only: yield ${fmt.score(p.yield_mt_ha, { compact: false })} MT/ha. Expand the year range to compare yield trends.`;
  }

  const first = yieldPoints[0];
  const last = yieldPoints[yieldPoints.length - 1];
  const changePct = pctChange(first.yield_mt_ha, last.yield_mt_ha);
  const changeText = describeChange(changePct);

  let peak = yieldPoints[0];
  let low = yieldPoints[0];
  for (const p of yieldPoints) {
    if (p.yield_mt_ha > peak.yield_mt_ha) peak = p;
    if (p.yield_mt_ha < low.yield_mt_ha) low = p;
  }

  const parts = [];
  parts.push(
    `From ${first.year} to ${last.year}, average yield ${changeText || "changed"} (${fmt.score(
      first.yield_mt_ha,
      { compact: false }
    )} to ${fmt.score(last.yield_mt_ha, { compact: false })} MT/ha).`
  );

  if (peak.year !== last.year) {
    parts.push(
      `Highest yield was in ${peak.year} at ${fmt.score(peak.yield_mt_ha, { compact: false })} MT/ha.`
    );
  } else {
    parts.push(
      `The latest year (${last.year}) also marks the highest yield in this range.`
    );
  }

  if (yieldPoints.length >= 4) {
    const recent = yieldPoints.slice(-3);
    const prior = yieldPoints.slice(-6, -3);
    if (prior.length === 3) {
      const recentAvg = recent.reduce((s, p) => s + p.yield_mt_ha, 0) / recent.length;
      const priorAvg = prior.reduce((s, p) => s + p.yield_mt_ha, 0) / prior.length;
      const recentText = describeChange(pctChange(priorAvg, recentAvg));
      if (recentText) {
        parts.push(`In the latest 3 years versus the prior 3, average yield ${recentText}.`);
      }
    }
  } else if (low.year !== peak.year) {
    parts.push(
      `Lowest yield was in ${low.year} at ${fmt.score(low.yield_mt_ha, { compact: false })} MT/ha.`
    );
  }

  return parts.slice(0, 3).join(" ");
}

const ECOSYSTEM_METRICS = {
  yield_mt_ha: {
    get title() {
      return `Annual Yield Trend by ${seriesDimLabel()}`;
    },
    label: "Yield",
    unit: "MT/ha",
    compact: false,
  },
  volume_mt: {
    get title() {
      return `Annual Production Volume by ${seriesDimLabel()}`;
    },
    label: "Production volume",
    unit: "MT",
    compact: true,
  },
  area_ha: {
    get title() {
      return `Annual Area Harvested by ${seriesDimLabel()}`;
    },
    label: "Area harvested",
    unit: "ha",
    compact: true,
  },
};

function getEcosystemMetric() {
  const key = els.ecosystemMetric?.value || "yield_mt_ha";
  return ECOSYSTEM_METRICS[key] ? key : "yield_mt_ha";
}

function ecosystemMetricValue(row, metricKey) {
  if (metricKey === "yield_mt_ha") return yieldForPoint(row);
  const value = row?.[metricKey];
  return value == null || Number.isNaN(value) ? null : value;
}

function buildEcosystemTrendSummary(points, metricKey) {
  const meta = ECOSYSTEM_METRICS[metricKey] || ECOSYSTEM_METRICS.yield_mt_ha;
  const years = [...new Set((points || []).map((p) => p.year))].sort((a, b) => a - b);
  if (!years.length) {
    return `No ${meta.label.toLowerCase()} data by ${seriesDimNoun()} for the current filters.`;
  }

  const seriesNames = IS_MULTI_CROP ? chartSeriesValues() : SUBTYPE_VALUES;
  const bySubtype = Object.fromEntries(seriesNames.map((name) => [name, []]));
  for (const p of points || []) {
    if (!bySubtype[p.crop_subtype]) continue;
    const value = ecosystemMetricValue(p, metricKey);
    if (value == null) continue;
    bySubtype[p.crop_subtype].push({ year: p.year, value });
  }

  const series = Object.entries(bySubtype).filter(([, rows]) => rows.length);
  if (!series.length) {
    return `No ${meta.label.toLowerCase()} data by ${seriesDimNoun()} for the current filters.`;
  }

  const parts = [];
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  const latestValues = {};
  for (const [name, rows] of series) {
    const last = rows[rows.length - 1];
    latestValues[name] = last?.value;
  }

  if (latestValues[SUBTYPE_A.value] != null && latestValues[SUBTYPE_B.value] != null) {
    const a = latestValues[SUBTYPE_A.value];
    const b = latestValues[SUBTYPE_B.value];
    const lead = a >= b ? SUBTYPE_A.value : SUBTYPE_B.value;
    const lag = lead === SUBTYPE_A.value ? SUBTYPE_B.value : SUBTYPE_A.value;
    const leadVal = latestValues[lead];
    const lagVal = latestValues[lag];
    const gapPct = pctChange(lagVal, leadVal);
    parts.push(
      `In ${lastYear}, ${lead.toLowerCase()} ${meta.label.toLowerCase()} led at ${fmt.score(leadVal, {
        compact: meta.compact,
      })} ${meta.unit}` +
        (gapPct == null
          ? `.`
          : `, about ${fmt.score(Math.abs(gapPct), { compact: false })}% above ${lag.toLowerCase()}.`)
    );
  } else {
    const [name, rows] = series[0];
    const last = rows[rows.length - 1];
    parts.push(
      `Showing ${name.toLowerCase()} ${meta.label.toLowerCase()} only: ${fmt.score(last.value, {
        compact: meta.compact,
      })} ${meta.unit} in ${last.year}.`
    );
  }

  for (const [name, rows] of series) {
    if (rows.length < 2) continue;
    const change = describeChange(pctChange(rows[0].value, rows[rows.length - 1].value));
    if (!change) continue;
    parts.push(
      `From ${rows[0].year} to ${rows[rows.length - 1].year}, ${name.toLowerCase()} ${meta.label.toLowerCase()} ${change}.`
    );
    break;
  }

  if (series.length === 2 && years.length >= 2) {
    const aFirst = bySubtype[SUBTYPE_A.value].find((r) => r.year === firstYear)?.value;
    const bFirst = bySubtype[SUBTYPE_B.value].find((r) => r.year === firstYear)?.value;
    const aLast = bySubtype[SUBTYPE_A.value].find((r) => r.year === lastYear)?.value;
    const bLast = bySubtype[SUBTYPE_B.value].find((r) => r.year === lastYear)?.value;
    if (aFirst != null && bFirst != null && aLast != null && bLast != null) {
      const gapFirst = aFirst - bFirst;
      const gapLast = aLast - bLast;
      if (Math.abs(gapLast) > Math.abs(gapFirst) * 1.15) {
        parts.push(
          `The ${SUBTYPE_A.label.toLowerCase()}–${SUBTYPE_B.label.toLowerCase()} gap widened over the selected period.`
        );
      } else if (Math.abs(gapLast) < Math.abs(gapFirst) * 0.85) {
        parts.push(
          `The ${SUBTYPE_A.label.toLowerCase()}–${SUBTYPE_B.label.toLowerCase()} gap narrowed over the selected period.`
        );
      }
    }
  }

  return parts.slice(0, 3).join(" ");
}

function renderEcosystemTrendChart() {
  if (!ecosystemTrendChart) return;
  const metricKey = getEcosystemMetric();
  const meta = ECOSYSTEM_METRICS[metricKey];
  if (els.ecosystemTrendTitle) els.ecosystemTrendTitle.textContent = meta.title;

  const years = [...new Set(ecosystemSeriesPoints.map((p) => p.year))].sort((a, b) => a - b);
  const seriesNames = chartSeriesValues().filter((name) =>
    ecosystemSeriesPoints.some((p) => p.crop_subtype === name)
  );

  const colors = ecosystemChartColors();

  ecosystemTrendChart.data.labels = years;
  ecosystemTrendChart.data.datasets = seriesNames.map((name) => {
    const byYear = new Map(
      ecosystemSeriesPoints
        .filter((p) => p.crop_subtype === name)
        .map((p) => [p.year, ecosystemMetricValue(p, metricKey)])
    );
    return {
      label: name,
      data: years.map((year) => byYear.get(year) ?? null),
      backgroundColor: (colors[name] || { bg: "#09663f" }).bg,
      hoverBackgroundColor: (colors[name] || { hover: "#09663f" }).hover,
      borderColor: (colors[name] || { border: "#09663f" }).border,
      borderWidth: 0,
      borderRadius: 3,
      maxBarThickness: 18,
      categoryPercentage: 0.7,
      barPercentage: 0.85,
    };
  });
  ecosystemTrendChart.options.plugins.tooltip.callbacks = {
    ...ecosystemTooltipCallbacks,
    title(items) {
      const item = items?.[0];
      if (!item) return "";
      return ensoYearTooltipTitle(item.label);
    },
    label(ctx) {
      const v = ctx.parsed.y;
      if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
      return `${ctx.dataset.label}: ${fmt.score(v, { compact: meta.compact })} ${meta.unit}`;
    },
  };
  ecosystemTrendChart.options.scales.y.ticks.callback = (v) =>
    meta.compact ? fmt.compact(v) : fmt.score(v, { compact: false });
  applyEnsoBands(ecosystemTrendChart);
  updateChart(ecosystemTrendChart);

  if (els.ecosystemTrendChartSub) {
    const summary = buildEcosystemTrendSummary(ecosystemSeriesPoints, metricKey);
    els.ecosystemTrendChartSub.textContent = productionChartInsight(summary, ecosystemSeriesPoints, {
      metricLabel: meta.label.toLowerCase(),
      unit: meta.unit,
      compact: meta.compact,
      valueFn: (p) => ecosystemMetricValue(p, metricKey),
    });
  }
}

function growthPillHtml(growth) {
  if (growth == null || Number.isNaN(growth)) {
    return '<span class="growth-pill is-empty">—</span>';
  }
  const tone = growth > 0 ? "up" : growth < 0 ? "down" : "is-flat";
  const arrow = growth > 0 ? "▲" : growth < 0 ? "▼" : "•";
  const sign = growth > 0 ? "+" : "";
  return `<span class="growth-pill ${tone}"><span class="growth-arrow" aria-hidden="true">${arrow}</span>${sign}${fmt.score(growth, { compact: false, fixed: isPriceMode() })}<span class="value-unit">%</span></span>`;
}

function shareCellHtml(share) {
  if (share == null || Number.isNaN(share)) return "—";
  return `${fmt.score(share, { compact: false })}<span class="value-unit">%</span>`;
}


function setCompactScore(el, value, { compact = true, signed = false } = {}) {
  if (!el) return;
  if (value == null || Number.isNaN(Number(value))) {
    el.textContent = "—";
    setRawTip(el, null);
    return;
  }
  const num = Number(value);
  if (isPriceMode()) {
    el.textContent = fmt.price(num, { signed });
    setRawTip(el, null);
    return;
  }
  const sign = signed && num > 0 ? "+" : "";
  const detail = fmt.scoreDetail(num, { compact });
  el.textContent = `${sign}${detail.text}`;
  setRawTip(el, detail.compact ? `${sign}${detail.raw}` : null);
}

function valueWithUnit(value, unit, { compact = true, signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const unitHtml = unit ? `<span class="value-unit">${unit}</span>` : "";
  if (isPriceMode() && (!unit || unit === metricUnit())) {
    return `${fmt.price(value, { signed })}${unitHtml}`;
  }
  const num = Number(value);
  const sign = signed && num > 0 ? "+" : "";
  const detail = fmt.scoreDetail(num, { compact });
  const display = `${sign}${detail.text}`;
  if (!detail.compact) return `${display}${unitHtml}`;
  const tip = `${sign}${detail.raw}${unit ? ` ${unit}` : ""}`;
  return `<span class="has-raw-tip" data-raw-tip="${escapeAttr(tip)}">${display}</span>${unitHtml}`;
}
function varianceMeta(variance) {
  const cls =
    variance == null ? "is-empty" : variance > 0 ? "up" : variance < 0 ? "down" : "is-flat";
  const text =
    variance == null
      ? "—"
      : isPriceMode()
        ? fmt.price(variance, { signed: true })
        : `${variance > 0 ? "+" : ""}${fmt.score(variance)}`;
  return { cls, text };
}

function metricTriplet(latestNum, previousNum, share) {
  const variance =
    latestNum != null && previousNum != null ? latestNum - previousNum : null;
  let growth = null;
  if (latestNum != null && previousNum != null && previousNum !== 0) {
    growth = ((latestNum - previousNum) / previousNum) * 100;
  }
  const { cls } = varianceMeta(variance);
  return {
    varianceClass: cls,
    variance,
    growthHtml: growthPillHtml(growth),
    shareHtml: shareCellHtml(share),
  };
}

function pointMatchesPeriod(point, period, fallbackYear) {
  if (!point) return false;
  if (period?.year != null && period?.month != null) {
    return Number(point.year) === Number(period.year) && Number(point.month) === Number(period.month);
  }
  const year = period?.year ?? fallbackYear;
  return year != null && Number(point.year) === Number(year);
}

function setCompareColumnLabels(tbodyEl, latestLabel, previousLabel) {
  const table = tbodyEl?.closest("table");
  if (!table) return;
  const latestTh = table.querySelector('th[data-sort-key="latest"] .th-label');
  const previousTh = table.querySelector('th[data-sort-key="previous"] .th-label');
  if (latestTh) latestTh.textContent = latestLabel || "Latest";
  if (previousTh) previousTh.textContent = previousLabel || "Previous";
}

function renderVolumeCompareTable({
  latestYear,
  latestPeriod = null,
  previousPeriod = null,
  points,
  nameKey,
  preferredOrder = null,
  sortByLatest = false,
  sortTableKey = null,
  subtitleEl = null,
  tbodyEl = null,
  emptyMessage = "No data for the current filters.",
  rowClassFor = null,
  topN = null,
  topNLabel = null,
  childrenPoints = null,
  childNameKey = "province",
  childParentKey = "region",
  expandedNames = null,
  onAfterRender = null,
}) {
  const previousYear = previousPeriod?.year ?? latestYear - 1;
  const latestLabel = latestPeriod?.label || String(latestYear);
  const previousLabel = previousPeriod?.label || String(previousYear);
  if (subtitleEl) {
    const displayLabel = topNLabel
      ? topNLabel.charAt(0).toUpperCase() + topNLabel.slice(1)
      : "";
    const limitNote =
      topN == null
        ? ""
        : topN > 0
          ? ` · Top ${topN}${displayLabel ? ` ${displayLabel}` : ""}`
          : displayLabel
            ? ` · All ${displayLabel}`
            : " · All";
    const unit = metricUnit();
    const noun = isPriceMode() ? "Price" : "Volume";
    subtitleEl.textContent = `${noun} (${unit}) · ${latestLabel} vs ${previousLabel}${limitNote}`;
  }
  if (!tbodyEl) return;
  setCompareColumnLabels(tbodyEl, latestPeriod?.month ? latestLabel : "Latest", previousPeriod?.month ? previousLabel : "Previous");

  const byName = new Map();
  for (const p of points || []) {
    const name = p[nameKey];
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, { latest: null, previous: null });
    const row = byName.get(name);
    if (pointMatchesPeriod(p, latestPeriod, latestYear)) row.latest = p.volume_mt;
    if (pointMatchesPeriod(p, previousPeriod, previousYear)) row.previous = p.volume_mt;
  }

  const childrenByParent = new Map();
  if (Array.isArray(childrenPoints) && childrenPoints.length) {
    for (const p of childrenPoints) {
      const parent = p[childParentKey];
      const child = p[childNameKey];
      if (!parent || !child || child === parent) continue;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, new Map());
      const childMap = childrenByParent.get(parent);
      if (!childMap.has(child)) childMap.set(child, { latest: null, previous: null });
      const row = childMap.get(child);
      if (pointMatchesPeriod(p, latestPeriod, latestYear)) row.latest = p.volume_mt;
      if (pointMatchesPeriod(p, previousPeriod, previousYear)) row.previous = p.volume_mt;
    }
  }

  let names;
  if (preferredOrder && preferredOrder.length && topN == null) {
    names = [
      ...preferredOrder.filter((name) => byName.has(name)),
      ...[...byName.keys()].filter((name) => !preferredOrder.includes(name)).sort(),
    ];
  } else {
    names = [...byName.keys()];
  }

  if (!names.length) {
    tbodyEl.innerHTML = `<tr class="eco-empty-row"><td colspan="${showShareColumn() ? 6 : 5}">${emptyMessage}</td></tr>`;
    if (sortTableKey) syncTableSortHeaders(sortTableKey);
    onAfterRender?.(topN);
    return;
  }

  const sumKnown = (key) =>
    names.reduce((sum, name) => {
      const value = byName.get(name)?.[key];
      return sum + (value != null && !Number.isNaN(Number(value)) ? Number(value) : 0);
    }, 0);

  const hasAny = (key) =>
    names.some((name) => {
      const value = byName.get(name)?.[key];
      return value != null && !Number.isNaN(Number(value));
    });

  const latestTotal = hasAny("latest") ? sumKnown("latest") : null;
  const previousTotal = hasAny("previous") ? sumKnown("previous") : null;
  const avgKnown = (key) => {
    const vals = names
      .map((name) => byName.get(name)?.[key])
      .filter((value) => value != null && !Number.isNaN(Number(value)))
      .map(Number);
    if (!vals.length) return null;
    return vals.reduce((sum, value) => sum + value, 0) / vals.length;
  };
  const footerLatest = isPriceMode() ? avgKnown("latest") : latestTotal;
  const footerPrevious = isPriceMode() ? avgKnown("previous") : previousTotal;

  let entries = names.map((name) => {
    const { latest, previous } = byName.get(name);
    const latestNum =
      latest != null && !Number.isNaN(Number(latest)) ? Number(latest) : null;
    const previousNum =
      previous != null && !Number.isNaN(Number(previous)) ? Number(previous) : null;
    const variance =
      latestNum != null && previousNum != null ? latestNum - previousNum : null;
    let growth = null;
    if (latestNum != null && previousNum != null && previousNum !== 0) {
      growth = ((latestNum - previousNum) / previousNum) * 100;
    }
    const share =
      showShareColumn() && latestNum != null && latestTotal != null && latestTotal > 0
        ? (latestNum / latestTotal) * 100
        : null;
    return {
      name,
      latest: latestNum,
      previous: previousNum,
      variance,
      growth,
      share,
    };
  });

  if (topN != null) {
    entries = entries
      .filter((entry) => entry.latest != null && !Number.isNaN(entry.latest) && entry.latest !== 0)
      .sort(
        (a, b) =>
          (b.latest ?? -Infinity) - (a.latest ?? -Infinity) ||
          String(a.name).localeCompare(String(b.name))
      );
    if (topN > 0) entries = entries.slice(0, topN);
  }

  const sortState = sortTableKey
    ? tableSortState[sortTableKey]
    : sortByLatest
      ? { key: "latest", dir: "desc" }
      : preferredOrder?.length
        ? { key: "name", dir: "asc" }
        : { key: "name", dir: "asc" };

  entries = sortTableEntries(entries, sortState, {
    preferredOrder: topN != null ? null : preferredOrder,
    nameKey: "name",
  });

  if (sortTableKey) syncTableSortHeaders(sortTableKey);
  if (expandedNames instanceof Set) {
    for (const name of [...expandedNames]) {
      if (!childrenByParent.has(name)) expandedNames.delete(name);
    }
  }

  const childRowsHtml = (parentName) => {
    const childMap = childrenByParent.get(parentName);
    if (!childMap) return "";
    const kids = [...childMap.entries()]
      .map(([name, vals]) => {
        const latestNum =
          vals.latest != null && !Number.isNaN(Number(vals.latest)) ? Number(vals.latest) : null;
        const previousNum =
          vals.previous != null && !Number.isNaN(Number(vals.previous))
            ? Number(vals.previous)
            : null;
        return { name, latest: latestNum, previous: previousNum };
      })
      .filter((row) => row.latest != null || row.previous != null)
      .sort(
        (a, b) =>
          (b.latest ?? -Infinity) - (a.latest ?? -Infinity) ||
          String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" })
      );
    return kids
      .map((entry) => {
        const { varianceClass, variance, growthHtml, shareHtml } = metricTriplet(
          entry.latest,
          entry.previous,
          null
        );
        return `<tr class="eco-child">
        <td><span class="eco-name">${escapeHtml(entry.name)}</span></td>
        <td class="num">${valueWithUnit(entry.latest, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num muted">${valueWithUnit(entry.previous, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num ${varianceClass}">${valueWithUnit(variance, metricUnit(), { signed: true, compact: metricCompact() })}</td>
        <td class="growth-col">${growthHtml}</td>
        ${showShareColumn() ? `<td class="share-col">${shareHtml}</td>` : ""}
      </tr>`;
      })
      .join("");
  };

  const rows = entries.map((entry) => {
    const { varianceClass, variance, growthHtml, shareHtml } = metricTriplet(
      entry.latest,
      entry.previous,
      entry.share
    );
    const rowClass =
      typeof rowClassFor === "function" ? rowClassFor(entry.name) : "eco-other";
    const canExpand = childrenByParent.has(entry.name) && childrenByParent.get(entry.name).size > 0;
    const expanded = Boolean(canExpand && expandedNames?.has(entry.name));
    const nameCell = canExpand
      ? `<button type="button" class="eco-expand" aria-expanded="${expanded ? "true" : "false"}">
           <span class="eco-expand-caret" aria-hidden="true"></span>
           <span class="eco-name">${escapeHtml(entry.name)}</span>
         </button>`
      : `<span class="eco-name">${escapeHtml(entry.name)}</span>`;

    return `<tr class="${rowClass}${canExpand ? " is-expandable" : ""}${expanded ? " is-expanded" : ""}"${
      canExpand ? ` data-expand-name="${escapeAttr(entry.name)}"` : ""
    }>
        <td>${nameCell}</td>
        <td class="num">${valueWithUnit(entry.latest, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num muted">${valueWithUnit(entry.previous, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num ${varianceClass}">${valueWithUnit(variance, metricUnit(), { signed: true, compact: metricCompact() })}</td>
        <td class="growth-col">${growthHtml}</td>
        ${showShareColumn() ? `<td class="share-col">${shareHtml}</td>` : ""}
      </tr>${expanded ? childRowsHtml(entry.name) : ""}`;
  });

  const totalShare = !isPriceMode() && latestTotal != null && latestTotal > 0 ? 100 : null;
  const totalMetrics = metricTriplet(footerLatest, footerPrevious, totalShare);
  const footerLabel = isPriceMode() ? "Average" : "Total";
  rows.push(`<tr class="eco-total">
        <td><span class="eco-name">${footerLabel}</span></td>
        <td class="num">${valueWithUnit(footerLatest, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num muted">${valueWithUnit(footerPrevious, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num ${totalMetrics.varianceClass}">${valueWithUnit(totalMetrics.variance, metricUnit(), { signed: true, compact: metricCompact() })}</td>
        <td class="growth-col">${totalMetrics.growthHtml}</td>
        ${showShareColumn() ? `<td class="share-col">${totalMetrics.shareHtml}</td>` : ""}
      </tr>`);

  tbodyEl.innerHTML = rows.join("");
  onAfterRender?.(topN);
}

function compareSortText(a, b, dir) {
  const cmp = String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    sensitivity: "base",
  });
  return dir === "asc" ? cmp : -cmp;
}

function compareSortNumber(a, b, dir) {
  const aNull = a == null || Number.isNaN(Number(a));
  const bNull = b == null || Number.isNaN(Number(b));
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  const diff = Number(a) - Number(b);
  return dir === "asc" ? diff : -diff;
}

function sortTableEntries(entries, sortState, { preferredOrder = null, nameKey = "name" } = {}) {
  const key = sortState?.key || nameKey;
  const dir = sortState?.dir === "asc" ? "asc" : "desc";
  return [...entries].sort((a, b) => {
    if (key === nameKey && preferredOrder?.length) {
      const rank = (name) => {
        const idx = preferredOrder.indexOf(name);
        return idx === -1 ? preferredOrder.length : idx;
      };
      const byPreferred = dir === "asc" ? rank(a[nameKey]) - rank(b[nameKey]) : rank(b[nameKey]) - rank(a[nameKey]);
      if (byPreferred) return byPreferred;
    }
    if (key === nameKey) {
      return compareSortText(a[nameKey], b[nameKey], dir);
    }
    const byValue = compareSortNumber(a[key], b[key], dir);
    if (byValue) return byValue;
    return compareSortText(a[nameKey], b[nameKey], "asc");
  });
}

function syncTableSortHeaders(tableKey) {
  const table = document.querySelector(`table[data-sort-table="${tableKey}"]`);
  const state = tableSortState[tableKey];
  if (!table || !state) return;
  table.querySelectorAll("th[data-sort-key]").forEach((th) => {
    const active = th.dataset.sortKey === state.key;
    th.classList.toggle("is-sorted", active);
    th.classList.toggle("is-asc", active && state.dir === "asc");
    th.classList.toggle("is-desc", active && state.dir === "desc");
    th.setAttribute(
      "aria-sort",
      active ? (state.dir === "asc" ? "ascending" : "descending") : "none"
    );
  });
}

function cycleTableSort(tableKey, columnKey) {
  const state = tableSortState[tableKey];
  if (!state) return;
  if (state.key === columnKey) {
    state.dir = state.dir === "asc" ? "desc" : "asc";
  } else {
    state.key = columnKey;
    state.dir = columnKey === "name" ? "asc" : "desc";
  }
}

function bindSortableTables() {
  document.querySelectorAll("table[data-sort-table]").forEach((table) => {
    const tableKey = table.dataset.sortTable;
    if (!tableKey || !tableSortState[tableKey]) return;
    table.querySelector("thead")?.addEventListener("click", (event) => {
      const th = event.target.closest("th[data-sort-key]");
      if (!th || !table.contains(th)) return;
      event.preventDefault();
      cycleTableSort(tableKey, th.dataset.sortKey);
      if (tableKey === "ecosystemVolume") {
        renderEcosystemVolumeTable(ecoVolumeLatestYear, ecoVolumePoints);
      } else if (tableKey === "regionVolume") {
        renderRegionVolumeTable(regionVolumeLatestYear, regionVolumePoints, {
          ...regionVolumePeriods,
          provincePoints: regionProvincePoints,
        });
      } else if (tableKey === "regionAnnual") {
        renderRegionAnnualTable();
      } else if (tableKey === "subsectorVolume") {
        renderSubsectorVolumeTable(subsectorVolumeLatestYear, subsectorVolumePoints);
      } else if (tableKey === "regionEcosystem") {
        renderRegionEcosystemTable();
      } else if (tableKey === "provinceVolume") {
        renderProvinceVolumeTableFromCache();
      }
    });
  });
}

function bindRegionVolumeDrilldown() {
  document.querySelectorAll('[data-sort-table="regionVolume"] tbody').forEach((tbody) => {
    if (tbody.dataset.drillBound) return;
    tbody.dataset.drillBound = "1";
    tbody.addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-expand-name]");
      if (!row || !tbody.contains(row)) return;
      event.preventDefault();
      const name = row.dataset.expandName;
      if (!name) return;
      if (expandedRegionNames.has(name)) expandedRegionNames.delete(name);
      else expandedRegionNames.add(name);
      renderRegionVolumeTable(regionVolumeLatestYear, regionVolumePoints, {
        ...regionVolumePeriods,
        provincePoints: regionProvincePoints,
      });
    });
  });
}

function bindRegionAnnualDrilldown() {
  const tbody = els.regionAnnualTableBody;
  if (!tbody || tbody.dataset.drillBound) return;
  tbody.dataset.drillBound = "1";
  tbody.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-expand-name]");
    if (!row || !tbody.contains(row)) return;
    event.preventDefault();
    const name = row.dataset.expandName;
    if (!name) return;
    if (expandedAnnualRegionNames.has(name)) expandedAnnualRegionNames.delete(name);
    else expandedAnnualRegionNames.add(name);
    renderRegionAnnualTable();
  });
}

function ecosystemRowClass(name) {
  const ecoSlug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (ecoSlug === "irrigated" || ecoSlug === "rainfed" || ecoSlug === "yellow" || ecoSlug === "white") {
    return `eco-${ecoSlug}`;
  }
  return "eco-other";
}

function getEcosystemVolumeTopN() {
  if (!els.ecosystemVolumeTopN) return null;
  const raw = els.ecosystemVolumeTopN.value || String(ECOSYSTEM_VOLUME_TOP_N_DEFAULT);
  if (raw === "all") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : ECOSYSTEM_VOLUME_TOP_N_DEFAULT;
}

function syncEcosystemVolumeTableLayout(limit) {
  const wrap = els.ecosystemVolumeTableWrap;
  const table = document.getElementById("ecosystemVolumeTable");
  if (!wrap || !table) return;

  const tbody = table.tBodies[0];
  const dataRow = tbody?.querySelector("tr:not(.eco-empty-row):not(.eco-total)");
  if (!dataRow) {
    wrap.classList.remove("is-scrollable");
    return;
  }

  const headerH = table.tHead?.offsetHeight ?? 0;
  const rowH = dataRow.offsetHeight;
  const maxH = headerH + rowH * ECOSYSTEM_VOLUME_SCROLL_AT;
  wrap.style.setProperty("--ecosystem-table-max-height", `${maxH}px`);

  const needsScroll = limit == null ? false : limit === 0 || limit > ECOSYSTEM_VOLUME_SCROLL_AT;
  wrap.classList.toggle("is-scrollable", needsScroll);
}

function renderEcosystemVolumeTable(latestYear, points) {
  ecoVolumeLatestYear = latestYear;
  ecoVolumePoints = points || [];
  const narrowed = isCropFilterNarrowed();
  const scopedPoints = narrowed ? filterSeriesPointsByCrop(ecoVolumePoints) : ecoVolumePoints;
  const topN = narrowed ? null : IS_MULTI_CROP ? getEcosystemVolumeTopN() : null;
  renderVolumeCompareTable({
    latestYear,
    points: scopedPoints,
    nameKey: "crop_subtype",
    preferredOrder: narrowed || topN == null ? chartSeriesValues() : null,
    sortTableKey: "ecosystemVolume",
    subtitleEl: els.ecosystemVolumeTableSub,
    tbodyEl: els.ecosystemVolumeTableBody,
    emptyMessage: `No ${seriesDimNoun()} data for the current filters.`,
    rowClassFor: ecosystemRowClass,
    topN,
    topNLabel: IS_MULTI_CROP ? CONFIG.groupPlural || "crops" : null,
    onAfterRender: syncEcosystemVolumeTableLayout,
  });
}

function renderRegionVolumeTable(latestYear, points, periods = {}) {
  regionVolumeLatestYear = latestYear;
  regionVolumePoints = points || [];
  regionProvincePoints = periods.provincePoints || regionProvincePoints || [];
  regionVolumePeriods = {
    asOf: periods.asOf || periods.as_of || null,
    previous: periods.previous || null,
  };
  const tables = [...document.querySelectorAll('[data-sort-table="regionVolume"]')];
  const targets = (tables.length ? tables : [])
    .map((table) => ({
      tbodyEl: table.tBodies[0],
      subtitleEl: table.closest(".panel")?.querySelector(".eco-table-sub") || null,
    }))
    .filter((target) => target.tbodyEl);
  if (!targets.length && els.regionVolumeTableBody) {
    targets.push({
      tbodyEl: els.regionVolumeTableBody,
      subtitleEl: els.regionVolumeTableSub,
    });
  }
  for (const target of targets) {
  renderVolumeCompareTable({
    latestYear,
      latestPeriod: regionVolumePeriods.asOf,
      previousPeriod: regionVolumePeriods.previous,
    points: regionVolumePoints,
    nameKey: "region",
    sortByLatest: true,
    sortTableKey: "regionVolume",
      subtitleEl: target.subtitleEl,
      tbodyEl: target.tbodyEl,
    emptyMessage: "No region data for the current filters.",
    rowClassFor: () => "eco-other",
      childrenPoints: regionProvincePoints,
      expandedNames: expandedRegionNames,
    });
  }
  syncPairedRegionTableHeights();
}

function regionAnnualYearKey(years) {
  const state = tableSortState.regionAnnual;
  if (state.key === "name" || state.key === "rowAvg") return state.key;
  if (state.key === "latest") return years.length ? String(years[years.length - 1]) : "name";
  if (years.includes(Number(state.key))) return state.key;
  if (years.length) return String(years[years.length - 1]);
  return state.key || "name";
}

function regionAnnualRowAverage(byYear, years) {
  const vals = years
    .map((year) => byYear.get(year))
    .filter((value) => value != null && !Number.isNaN(Number(value)))
    .map(Number);
  if (!vals.length) return null;
  return vals.reduce((sum, value) => sum + value, 0) / vals.length;
}

function regionAnnualRowExtremes(byYear, years) {
  const pairs = years
    .map((year) => {
      const raw = byYear.get(year);
      const value = raw == null ? null : Number(raw);
      return Number.isFinite(value) && value > 0 ? { year, value } : null;
    })
    .filter(Boolean);
  const highYears = new Set();
  const lowYears = new Set();
  if (pairs.length < 2) return { highYears, lowYears };
  const peak = Math.max(...pairs.map((row) => row.value));
  const low = Math.min(...pairs.map((row) => row.value));
  if (peak === low) return { highYears, lowYears };
  for (const row of pairs) {
    if (row.value === peak) highYears.add(row.year);
    if (row.value === low) lowYears.add(row.year);
  }
  return { highYears, lowYears };
}

function sortRegionAnnualEntries(entries, years) {
  const state = tableSortState.regionAnnual || { key: "latest", dir: "desc" };
  const sortKey = regionAnnualYearKey(years);
  const dir = state.dir === "asc" ? "asc" : "desc";
  return [...entries].sort((a, b) => {
    if (sortKey === "name") {
      return compareSortText(a.name, b.name, dir);
    }
    if (sortKey === "rowAvg") {
      const byValue = compareSortNumber(a.rowAvg, b.rowAvg, dir);
      if (byValue) return byValue;
      return compareSortText(a.name, b.name, "asc");
    }
    const year = Number(sortKey);
    const byValue = compareSortNumber(a.byYear.get(year), b.byYear.get(year), dir);
    if (byValue) return byValue;
    return compareSortText(a.name, b.name, "asc");
  });
}

function renderRegionAnnualTable(payload) {
  const tbody = els.regionAnnualTableBody;
  const thead = els.regionAnnualTableHead;
  if (!tbody || !thead) return;
  if (payload) {
    regionAnnualYears = (payload.years || []).map(Number).filter(Number.isFinite);
    regionAnnualPoints = payload.points || [];
    regionAnnualProvincePoints = payload.province_points || [];
  }
  const years = regionAnnualYears;
  const unit = metricUnit();
  if (els.regionAnnualTableSub) {
    const range = years.length
      ? years.length === 1
        ? String(years[0])
        : `${years[0]}–${years[years.length - 1]}`
      : "selected years";
    els.regionAnnualTableSub.textContent = `Average farmgate price (${unit}) · ${range}`;
  }

  if (!years.length) {
    thead.innerHTML = `<tr>
      <th scope="col" data-sort-key="name" class="is-sortable" title="Sort by Region">Region</th>
    </tr>`;
    tbody.innerHTML = `<tr class="eco-empty-row"><td>No region data for the current filters.</td></tr>`;
    syncTableSortHeaders("regionAnnual");
    return;
  }

  const byRegion = new Map();
  for (const point of regionAnnualPoints) {
    const name = point.region;
    const year = Number(point.year);
    if (!name || !Number.isFinite(year)) continue;
    if (!byRegion.has(name)) byRegion.set(name, new Map());
    const value = Number(point.volume_mt);
    byRegion.get(name).set(year, Number.isFinite(value) ? value : null);
  }

  const childrenByParent = new Map();
  for (const point of regionAnnualProvincePoints) {
    const parent = point.region;
    const child = point.province;
    const year = Number(point.year);
    if (!parent || !child || child === parent || !Number.isFinite(year)) continue;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, new Map());
    const childMap = childrenByParent.get(parent);
    if (!childMap.has(child)) childMap.set(child, new Map());
    const value = Number(point.volume_mt);
    childMap.get(child).set(year, Number.isFinite(value) ? value : null);
  }

  for (const name of [...expandedAnnualRegionNames]) {
    if (!childrenByParent.has(name)) expandedAnnualRegionNames.delete(name);
  }

  let entries = [...byRegion.entries()].map(([name, byYear]) => ({
    name,
    byYear,
    rowAvg: regionAnnualRowAverage(byYear, years),
  }));
  entries = sortRegionAnnualEntries(entries, years);

  const yearHeaders = years
    .map(
      (year) => `<th scope="col" data-sort-key="${year}" class="is-sortable num" title="Sort by ${year}">
        <span class="th-label">${year}</span>
      </th>`
    )
    .join("");
  thead.innerHTML = `<tr>
    <th scope="col" data-sort-key="name" class="is-sortable" title="Sort by Region">Region</th>
    ${yearHeaders}
    <th scope="col" data-sort-key="rowAvg" class="is-sortable num region-annual-avg" title="Sort by Average">
      <span class="th-label">Average</span>
    </th>
  </tr>`;

  const yearCells = (byYear, rowAvg) => {
    const extremes = regionAnnualRowExtremes(byYear, years);
    const yearHtml = years
      .map((year, index) => {
        const isHigh = extremes.highYears.has(year);
        const isLow = extremes.lowYears.has(year);
        const cls = ["num"];
        if (isHigh) cls.push("is-row-high");
        if (isLow) cls.push("is-row-low");
        const current = Number(byYear.get(year));
        const prevYear = index > 0 ? years[index - 1] : null;
        const previous = prevYear != null ? Number(byYear.get(prevYear)) : NaN;
        const up = Number.isFinite(current) && Number.isFinite(previous) && previous !== 0 && current > previous;
        const down = Number.isFinite(current) && Number.isFinite(previous) && previous !== 0 && current < previous;
        const tips = [];
        if (isHigh) tips.push("Highest in range");
        if (isLow) tips.push("Lowest in range");
        if (up) tips.push("Up from previous year");
        if (down) tips.push("Down from previous year");
        const move = up
          ? `<span class="region-annual-move is-up" aria-label="Increased from previous year">↑</span>`
          : down
            ? `<span class="region-annual-move is-down" aria-label="Decreased from previous year">↓</span>`
            : "";
        return `<td class="${cls.join(" ")}"${tips.length ? ` title="${escapeAttr(tips.join(" · "))}"` : ""}>${valueWithUnit(
          byYear.get(year),
          metricUnit(),
          { compact: metricCompact() }
        )}${move}</td>`;
      })
      .join("");
    return `${yearHtml}
        <td class="num region-annual-avg">${valueWithUnit(
          rowAvg ?? regionAnnualRowAverage(byYear, years),
          metricUnit(),
          { compact: metricCompact() }
        )}</td>`;
  };

  const childRowsHtml = (parentName) => {
    const childMap = childrenByParent.get(parentName);
    if (!childMap) return "";
    const kids = [...childMap.entries()]
      .map(([name, byYear]) => ({
        name,
        byYear,
        rowAvg: regionAnnualRowAverage(byYear, years),
      }))
      .filter((row) => years.some((year) => row.byYear.get(year) != null))
      .sort((a, b) => {
        const latest = years[years.length - 1];
        return (
          compareSortNumber(a.byYear.get(latest), b.byYear.get(latest), "desc") ||
          compareSortText(a.name, b.name, "asc")
        );
      });
    return kids
      .map(
        (entry) => `<tr class="eco-child">
        <td><span class="eco-name">${escapeHtml(entry.name)}</span></td>
        ${yearCells(entry.byYear, entry.rowAvg)}
      </tr>`
      )
      .join("");
  };

  const rows = entries.map((entry) => {
    const canExpand = childrenByParent.has(entry.name) && childrenByParent.get(entry.name).size > 0;
    const expanded = Boolean(canExpand && expandedAnnualRegionNames.has(entry.name));
    const nameCell = canExpand
      ? `<button type="button" class="eco-expand" aria-expanded="${expanded ? "true" : "false"}">
           <span class="eco-expand-caret" aria-hidden="true"></span>
           <span class="eco-name">${escapeHtml(entry.name)}</span>
         </button>`
      : `<span class="eco-name">${escapeHtml(entry.name)}</span>`;
    return `<tr class="eco-other${canExpand ? " is-expandable" : ""}${expanded ? " is-expanded" : ""}"${
      canExpand ? ` data-expand-name="${escapeAttr(entry.name)}"` : ""
    }>
        <td>${nameCell}</td>
        ${yearCells(entry.byYear, entry.rowAvg)}
      </tr>${expanded ? childRowsHtml(entry.name) : ""}`;
  });

  const avgByYear = new Map();
  for (const year of years) {
    const vals = entries
      .map((entry) => entry.byYear.get(year))
      .filter((value) => value != null && !Number.isNaN(Number(value)))
      .map(Number);
    avgByYear.set(year, vals.length ? vals.reduce((sum, value) => sum + value, 0) / vals.length : null);
  }
  const footerRowAvg = regionAnnualRowAverage(avgByYear, years);
  rows.push(`<tr class="eco-total">
        <td><span class="eco-name">Average</span></td>
        ${yearCells(avgByYear, footerRowAvg)}
      </tr>`);

  tbody.innerHTML = rows.join("");
  const visualKey = regionAnnualYearKey(years);
  const savedKey = tableSortState.regionAnnual.key;
  tableSortState.regionAnnual.key = visualKey;
  syncTableSortHeaders("regionAnnual");
  tableSortState.regionAnnual.key = savedKey;
  if (payload) scrollRegionAnnualTableToEnd();
  syncPairedRegionTableHeights();
}

function scrollRegionAnnualTableToEnd() {
  const wrap = document.querySelector(".region-annual-table-wrap");
  if (!wrap) return;
  const snap = () => {
    wrap.scrollLeft = wrap.scrollWidth;
  };
  snap();
  requestAnimationFrame(() => {
    snap();
    requestAnimationFrame(snap);
  });
}

function syncPairedRegionTableHeights() {
  const annualWrap = document.querySelector(".region-annual-table-wrap");
  const compareWrap = document.getElementById("regionVolumeTable")?.closest(".table-wrap");
  if (!annualWrap || !compareWrap) return;

  const reset = () => {
    annualWrap.style.height = "";
    annualWrap.style.maxHeight = "";
    compareWrap.style.height = "";
    compareWrap.style.maxHeight = "";
    compareWrap.style.overflowY = "";
  };

  const apply = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      reset();
      return;
    }
    const annualHeight = Math.ceil(annualWrap.getBoundingClientRect().height);
    const compareContent = compareWrap.scrollHeight;
    if (!(annualHeight > 0)) return;
    const target = Math.max(annualHeight, compareContent);
    compareWrap.style.height = `${target}px`;
    compareWrap.style.maxHeight = "none";
    compareWrap.style.overflowY = "hidden";
  };

  reset();
  apply();
  requestAnimationFrame(() => {
    reset();
    apply();
  });
}

const SUBSECTOR_ORDER = ["Aquaculture", "Commercial", "Marine Municipal", "Inland Municipal"];
const SUBSECTOR_COLORS = {
  Aquaculture: { bg: "#0072B2", hover: "#005A8C", border: "#0072B2" },
  Commercial: { bg: "#D55E00", hover: "#B34D00", border: "#D55E00" },
  "Marine Municipal": { bg: "#009E73", hover: "#007A59", border: "#009E73" },
  "Inland Municipal": { bg: "#CC79A7", hover: "#A85A86", border: "#CC79A7" },
};

function hexToRgbChannels(hex) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6 || Number.isNaN(Number.parseInt(raw, 16))) return "74, 85, 120";
  const n = Number.parseInt(raw, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function subsectorColor(name) {
  if (SUBSECTOR_COLORS[name]) return SUBSECTOR_COLORS[name];
  const palette = [
    "#0072B2",
    "#D55E00",
    "#009E73",
    "#CC79A7",
    "#E69F00",
    "#56B4E9",
    "#882255",
    "#44AA99",
    "#0c1a62",
    "#09663f",
  ];
  let hash = 0;
  const text = String(name || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  const hex = palette[hash % palette.length];
  return { bg: hex, hover: hex, border: hex };
}

function subsectorSeriesNames(points) {
  const present = new Set((points || []).map((p) => p.crop_subtype).filter(Boolean));
  const selected = typeof selectedSubsectors === "function" ? selectedSubsectors() : [];
  const preferred = (selected.length ? selected : SUBSECTOR_ORDER).filter((name) => present.has(name));
  const extras = [...present].filter((name) => !preferred.includes(name));
  extras.sort((a, b) => String(a).localeCompare(String(b), "en", { sensitivity: "base" }));
  return [...preferred, ...extras];
}

function buildSubsectorVolumeSummary(points) {
  const years = [...new Set((points || []).map((p) => Number(p.year)))].filter((y) => !Number.isNaN(y)).sort((a, b) => a - b);
  const names = subsectorSeriesNames(points);
  if (!years.length || !names.length) return "No sub-sector volume for the current filters.";
  const latest = years[years.length - 1];
  const byName = {};
  let total = 0;
  for (const name of names) {
    const row = (points || []).find((p) => p.crop_subtype === name && Number(p.year) === latest);
    const vol = row?.volume_mt == null ? 0 : Number(row.volume_mt);
    byName[name] = vol;
    total += vol;
  }
  const ranked = names.slice().sort((a, b) => (byName[b] || 0) - (byName[a] || 0));
  const lead = ranked[0];
  if (!lead) return isPriceMode()
    ? "No family farmgate prices for the current filters."
    : "No sub-sector volume for the current filters.";
  if (isPriceMode()) {
    const parts = [
      `${lead} had the highest average farmgate price in ${latest} at ${formatMt(byName[lead])}.`,
    ];
    if (ranked[1]) {
      parts.push(`${ranked[1]} was next at ${formatMt(byName[ranked[1]])}.`);
    }
    return parts.join(" ");
  }
  if (total <= 0) return "No sub-sector volume for the current filters.";
  const share = (byName[lead] / total) * 100;
  const parts = [
    `${lead} led in ${latest} at ${fmt.score(byName[lead])} MT (${fmt.score(share, { compact: false })}% of the selected view).`,
  ];
  if (ranked[1]) {
    parts.push(`${ranked[1]} was next at ${fmt.score(byName[ranked[1]])} MT.`);
  }
  return parts.join(" ");
}

function renderSubsectorVolumeChart() {
  if (!subsectorVolumeChart) return;
  const points = subsectorSeriesPoints || [];
  const years = [...new Set(points.map((p) => Number(p.year)))]
    .filter((year) => !Number.isNaN(year))
    .sort((a, b) => a - b);
  const names = subsectorSeriesNames(points);
  const datasets = names.map((name) => {
    const color = subsectorColor(name);
    const byYear = new Map(
      points.filter((p) => p.crop_subtype === name).map((p) => [Number(p.year), p.volume_mt])
    );
    const data = years.map((year) => {
      const value = byYear.get(year);
      return value == null || Number.isNaN(Number(value)) ? null : Number(value);
    });
    return {
      label: name,
      data,
      backgroundColor: color.bg,
      hoverBackgroundColor: color.hover,
      borderColor: color.border,
      borderWidth: 0,
      borderRadius: 3,
      borderSkipped: false,
      maxBarThickness: 18,
      categoryPercentage: 0.72,
      barPercentage: 0.9,
    };
  });
  subsectorVolumeChart.$growthExtrasReady = prefersReducedMotion();
  subsectorVolumeChart.data.labels = years;
  subsectorVolumeChart.data.datasets = datasets;
  applyEnsoBands(subsectorVolumeChart);
  subsectorVolumeChart.update();
  if (els.subsectorVolumeChartSub) {
    els.subsectorVolumeChartSub.textContent = buildSubsectorVolumeSummary(points);
  }
}

function renderSubsectorVolumeTable(latestYear, points) {
  if (!els.subsectorVolumeTableBody) return;
  subsectorVolumeLatestYear = latestYear;
  subsectorVolumePoints = points || [];
  renderVolumeCompareTable({
    latestYear,
    points: subsectorVolumePoints,
    nameKey: "crop_subtype",
    preferredOrder: SUBSECTOR_ORDER,
    sortByLatest: true,
    sortTableKey: "subsectorVolume",
    subtitleEl: els.subsectorVolumeTableSub,
    tbodyEl: els.subsectorVolumeTableBody,
    emptyMessage: isPriceMode()
      ? "No family data for the current filters."
      : "No sub-sector data for the current filters.",
    rowClassFor: () => "eco-other",
  });
}

function renderMonthSeasonalityChart(points, yearFrom, yearTo) {
  if (!monthSeasonalityChart) return;
  const months = farmgateSeasonMonths();
  const byYearMonth = new Map();
  for (const point of points || []) {
    const year = Number(point.year);
    const month = Number(point.month);
    const value = Number(point.volume_mt);
    if (!Number.isFinite(year) || !Number.isFinite(month) || Number.isNaN(value)) continue;
    byYearMonth.set(`${year}-${month}`, value);
  }
  const valueFor = (year, month) => {
    const value = byYearMonth.get(`${year}-${month}`);
    return value == null || Number.isNaN(value) ? null : value;
  };
  const periodAvg = months.map((month) => {
    const vals = [];
    for (let year = yearFrom; year <= yearTo; year += 1) {
      const value = valueFor(year, month);
      if (value != null) vals.push(value);
    }
    if (!vals.length) return null;
    return vals.reduce((sum, value) => sum + value, 0) / vals.length;
  });
  const peakIndex = peakValueIndex(periodAvg, { ignoreZero: true });
  const lowIndex = lowValueIndex(periodAvg, { ignoreZero: true });
  monthSeasonalityChart.$growthExtrasReady = prefersReducedMotion();
  monthSeasonalityChart.data.labels = months.map(farmgateSeasonLabel);
  monthSeasonalityChart.data.datasets = [
    {
      type: "bar",
      label: yearFrom === yearTo ? `Average · ${yearTo}` : `Average · ${yearFrom}–${yearTo}`,
      data: periodAvg,
      backgroundColor: priceBarColors(periodAvg, { peakIndex, lowIndex }),
      hoverBackgroundColor: priceBarColors(periodAvg, { hover: true, peakIndex, lowIndex }),
      borderWidth: 0,
      borderRadius: 3,
      borderSkipped: false,
      maxBarThickness: 34,
      categoryPercentage: 0.72,
      barPercentage: 0.86,
      peakIndex,
      lowIndex,
    },
  ];
  monthSeasonalityChart.update();
  if (els.monthSeasonalityChartSub) {
    els.monthSeasonalityChartSub.textContent = buildMonthSeasonalitySummary(
      months,
      periodAvg,
      yearFrom,
      yearTo,
      points
    );
  }
}

function buildMonthSeasonalitySummary(months, periodAvg, yearFrom, yearTo, points) {
  const pairs = (months || [])
    .map((month, i) => ({ month, avg: periodAvg[i] }))
    .filter((row) => row.avg != null && Number.isFinite(row.avg));
  if (!pairs.length) {
    return isQuarterGrain()
      ? "No quarterly farmgate prices for the current filters."
      : "No monthly farmgate prices for the current filters.";
  }
  const priced = pairs.filter((row) => row.avg !== 0);
  const ranked = priced.length ? priced : pairs;
  const peak = ranked.reduce((best, row) => (row.avg > best.avg ? row : best));
  const low = ranked.reduce((best, row) => (row.avg < best.avg ? row : best));
  const mean = averageFinite(ranked.map((row) => row.avg), { ignoreZero: false });
  const range = yearFrom === yearTo ? String(yearTo) : `${yearFrom}–${yearTo}`;
  const singleYear = yearFrom === yearTo;
  const parts = [];

  const periodWord = farmgatePeriodNoun();
  const periodAdjective = isQuarterGrain() ? "quarterly" : "monthly";

  if (mean != null) {
    parts.push(
      singleYear
        ? `In ${yearTo}, the average farmgate price across the selected ${isQuarterGrain() ? "quarters" : "months"} was ${formatMt(mean)}.`
        : `Across ${range}, the typical ${periodAdjective} farmgate price (each year weighted equally) was ${formatMt(mean)}.`
    );
  }

  if (peak.month !== low.month) {
    const peakGap = mean ? pctChange(mean, peak.avg) : null;
    const lowGap = mean ? pctChange(mean, low.avg) : null;
    const spread = peak.avg - low.avg;
    const spreadPct = pctChange(low.avg, peak.avg);
    const peakVsMean =
      peakGap == null || Math.abs(peakGap) < 0.5
        ? `near the ${periodAdjective} average`
        : `${fmt.score(Math.abs(peakGap), { compact: false })}% ${peakGap > 0 ? "above" : "below"} the ${periodAdjective} average`;
    const lowVsMean =
      lowGap == null || Math.abs(lowGap) < 0.5
        ? `near the ${periodAdjective} average`
        : `${fmt.score(Math.abs(lowGap), { compact: false })}% ${lowGap > 0 ? "above" : "below"} the ${periodAdjective} average`;
    parts.push(
      `${farmgateSeasonFullLabel(peak.month)} was the most expensive ${periodWord} at ${formatMt(peak.avg)} (${peakVsMean}), while ${farmgateSeasonFullLabel(low.month)} was the cheapest at ${formatMt(low.avg)} (${lowVsMean}).`
    );
    if (spread > 0) {
      parts.push(
        `The usual peak-to-trough gap was ${formatMt(spread)}${
          spreadPct != null ? ` (${fmt.score(Math.abs(spreadPct), { compact: false })}%)` : ""
        }.`
      );
    }
  } else {
    parts.push(
      `${farmgateSeasonFullLabel(peak.month)} had the highest average farmgate price in ${range} at ${formatMt(peak.avg)}.`
    );
  }

  if (mean != null && ranked.length >= 4 && !isQuarterGrain()) {
    const highMonths = ranked.filter((row) => row.avg > mean).map((row) => row.month);
    const lowMonths = ranked.filter((row) => row.avg < mean).map((row) => row.month);
    const highRuns = consecutiveMonthRuns(months, (month) => highMonths.includes(month))
      .filter((run) => run.length >= 2)
      .sort((a, b) => b.length - a.length);
    const lowRuns = consecutiveMonthRuns(months, (month) => lowMonths.includes(month))
      .filter((run) => run.length >= 2)
      .sort((a, b) => b.length - a.length);
    if (highRuns[0] && lowRuns[0]) {
      parts.push(
        `Prices tended to firm from ${formatMonthSpan(highRuns[0])} and ease from ${formatMonthSpan(lowRuns[0])}.`
      );
    } else if (highRuns[0]) {
      parts.push(`Prices tended to firm from ${formatMonthSpan(highRuns[0])}.`);
    } else if (lowRuns[0]) {
      parts.push(`Prices tended to ease from ${formatMonthSpan(lowRuns[0])}.`);
    }
  }

  if (!isQuarterGrain()) {
    const quarterDefs = [
      { label: "the first quarter", months: [1, 2, 3] },
      { label: "the second quarter", months: [4, 5, 6] },
      { label: "the third quarter", months: [7, 8, 9] },
      { label: "the fourth quarter", months: [10, 11, 12] },
    ];
    const quarterAvgs = quarterDefs
      .map((q) => ({
        label: q.label,
        avg: averageFinite(
          q.months
            .map((month) => ranked.find((row) => row.month === month)?.avg)
            .filter((value) => value != null),
          { ignoreZero: true }
        ),
        count: q.months.filter((month) => ranked.some((row) => row.month === month && row.avg !== 0)).length,
      }))
      .filter((q) => q.avg != null && q.count >= 2);
    if (quarterAvgs.length >= 2) {
      const highQ = quarterAvgs.reduce((best, row) => (row.avg > best.avg ? row : best));
      const lowQ = quarterAvgs.reduce((best, row) => (row.avg < best.avg ? row : best));
      if (highQ.label !== lowQ.label) {
        parts.push(
          `By quarter, ${highQ.label} averaged the highest (${formatMt(highQ.avg)}) and ${lowQ.label} the lowest (${formatMt(lowQ.avg)}).`
        );
      }
    }
  }

  const byYearMonth = new Map();
  const yearsPresent = new Set();
  for (const point of points || []) {
    const year = Number(point.year);
    const month = Number(point.month);
    const value = Number(point.volume_mt);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(value) || value === 0) continue;
    byYearMonth.set(`${year}-${month}`, value);
    yearsPresent.add(year);
  }
  const yearList = [...yearsPresent].sort((a, b) => a - b);
  if (!singleYear && yearList.length >= 3) {
    let mostVariable = null;
    for (const row of ranked) {
      const series = yearList.map((year) => byYearMonth.get(`${year}-${row.month}`)).filter((v) => v != null);
      const sd = sampleStdev(series, { ignoreZero: true });
      if (sd == null) continue;
      if (!mostVariable || sd > mostVariable.sd) mostVariable = { month: row.month, sd };
    }
    if (mostVariable && mostVariable.month !== peak.month && mostVariable.month !== low.month) {
      parts.push(
        `${farmgateSeasonFullLabel(mostVariable.month)} showed the widest year-to-year swing in this range.`
      );
    } else if (mostVariable) {
      parts.push(
        `${farmgateSeasonFullLabel(mostVariable.month)} also had the widest year-to-year price swing.`
      );
    }
  }

  const latestYear = yearList.length ? yearList[yearList.length - 1] : null;
  if (!singleYear && latestYear != null) {
    const latestPeak = byYearMonth.get(`${latestYear}-${peak.month}`);
    if (latestPeak != null) {
      const vsTypical = pctChange(peak.avg, latestPeak);
      const vsText = describeChange(vsTypical);
      if (vsText) {
        parts.push(
          `In ${latestYear}, ${farmgateSeasonFullLabel(peak.month)} averaged ${formatMt(latestPeak)}, which ${vsText} versus its ${range} typical of ${formatMt(peak.avg)}.`
        );
      }
    }
  }

  const zeroMonths = pairs.filter((row) => row.avg === 0).length;
  if (zeroMonths) {
    parts.push(
      `${zeroMonths === 1 ? `One ${periodWord}` : `${zeroMonths} ${periodWord}s`} averaged ₱0.00/kg and ${
        zeroMonths === 1 ? "is" : "are"
      } treated as no recorded trade in this view.`
    );
  }

  return parts.join(" ");
}

function buildFarmgateTrendSummary(points, overlayPoints) {
  const priced = (points || [])
    .map((p) => ({ year: Number(p.year), price: Number(p.volume_mt) }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.price))
    .sort((a, b) => a.year - b.year);
  if (!priced.length) return "No annual farmgate prices for the current filters.";

  const nonzero = priced.filter((p) => p.price !== 0);
  const series = nonzero.length ? nonzero : priced;
  if (series.length === 1) {
    return `Showing ${series[0].year} only: average farmgate price ${formatMt(series[0].price)}. Expand the year range to compare the annual trend.`;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const periodAvg = averageFinite(series.map((p) => p.price), { ignoreZero: true });
  const peak = series.reduce((best, row) => (row.price > best.price ? row : best));
  const low = series.reduce((best, row) => (row.price < best.price ? row : best));
  const spanPct = pctChange(first.price, last.price);
  const spanText = describeChange(spanPct);
  const latestYoY = series.length >= 2 ? pctChange(series[series.length - 2].price, last.price) : null;
  const latestYoYText = describeChange(latestYoY);
  const vsPeriod = periodAvg != null ? pctChange(periodAvg, last.price) : null;
  const vsPeriodText = describeChange(vsPeriod);
  const parts = [];

  if (spanText) {
    parts.push(
      `From ${first.year} to ${last.year}, the annual average farmgate price ${spanText}, from ${formatMt(first.price)} to ${formatMt(last.price)}.`
    );
  } else {
    parts.push(
      `From ${first.year} to ${last.year}, the annual average farmgate price moved from ${formatMt(first.price)} to ${formatMt(last.price)}.`
    );
  }

  if (periodAvg != null) {
    parts.push(`The period average was ${formatMt(periodAvg)}.`);
  }

  if (peak.year !== low.year) {
    const peakNote = peak.year === last.year ? " (the latest year)" : "";
    const lowNote = low.year === last.year ? " (the latest year)" : "";
    parts.push(
      `The highest annual average was in ${peak.year}${peakNote} at ${formatMt(peak.price)}; the lowest was in ${low.year}${lowNote} at ${formatMt(low.price)}.`
    );
  }

  if (latestYoYText && series[series.length - 2].year === last.year - 1) {
    parts.push(
      `Versus ${last.year - 1}, the ${last.year} average ${latestYoYText}.`
    );
  } else if (latestYoYText) {
    parts.push(`Versus the prior year in this range, the ${last.year} average ${latestYoYText}.`);
  }

  if (vsPeriodText && last.year !== peak.year && last.year !== low.year) {
    parts.push(
      `The latest year (${last.year}) ${vsPeriodText} versus the ${first.year}–${last.year} average.`
    );
  }

  if (series.length >= 6) {
    const recent = series.slice(-3);
    const prior = series.slice(-6, -3);
    const recentAvg = averageFinite(recent.map((p) => p.price), { ignoreZero: true });
    const priorAvg = averageFinite(prior.map((p) => p.price), { ignoreZero: true });
    const recentText = describeChange(pctChange(priorAvg, recentAvg));
    if (recentText) {
      parts.push(
        `In the latest 3 years versus the prior 3, the average farmgate price ${recentText}.`
      );
    }
  }

  const overlayByYear = new Map();
  for (const row of overlayPoints || []) {
    const year = Number(row.year);
    const volume = Number(row.volume_mt);
    if (!Number.isFinite(year) || !Number.isFinite(volume)) continue;
    overlayByYear.set(year, volume);
  }
  const overlaySeries = series
    .map((p) => ({ year: p.year, price: p.price, volume: overlayByYear.get(p.year) }))
    .filter((p) => p.volume != null && Number.isFinite(p.volume) && p.volume !== 0);

  if (overlaySeries.length >= 2) {
    const volFirst = overlaySeries[0];
    const volLast = overlaySeries[overlaySeries.length - 1];
    const volPeak = overlaySeries.reduce((best, row) => (row.volume > best.volume ? row : best));
    const volText = describeChange(pctChange(volFirst.volume, volLast.volume));
    if (volText) {
      let volumeLine = `Over the same years, production volume ${volText}, from ${formatProductionMt(volFirst.volume)} to ${formatProductionMt(volLast.volume)}`;
      if (volPeak.year !== volLast.year) {
        volumeLine += `, peaking in ${volPeak.year} at ${formatProductionMt(volPeak.volume)}`;
      }
      parts.push(`${volumeLine}.`);
    }

    if (overlaySeries.length >= 3) {
      let opposite = 0;
      let aligned = 0;
      for (let i = 1; i < overlaySeries.length; i += 1) {
        const dp = overlaySeries[i].price - overlaySeries[i - 1].price;
        const dv = overlaySeries[i].volume - overlaySeries[i - 1].volume;
        if (dp === 0 || dv === 0) continue;
        if (dp * dv < 0) opposite += 1;
        else aligned += 1;
      }
      if (opposite + aligned >= 2) {
        if (opposite > aligned) {
          parts.push(
            "In most year-to-year moves, farmgate prices and production went in opposite directions — a pattern often seen when a larger harvest eases prices, or a tighter harvest supports them."
          );
        } else if (aligned > opposite) {
          parts.push(
            "In most year-to-year moves, farmgate prices and production moved in the same direction, so output alone does not explain the price path in this range."
          );
        }
      }
    }

    const lastPair = overlaySeries[overlaySeries.length - 1];
    const prevPair = overlaySeries[overlaySeries.length - 2];
    if (lastPair && prevPair && lastPair.year === last.year) {
      const priceMove = lastPair.price - prevPair.price;
      const volMove = lastPair.volume - prevPair.volume;
      if (priceMove !== 0 && volMove !== 0 && lastPair.year === prevPair.year + 1) {
        if (priceMove * volMove < 0) {
          parts.push(
            volMove > 0
              ? `In ${lastPair.year}, production rose while the farmgate price declined.`
              : `In ${lastPair.year}, production fell while the farmgate price increased.`
          );
        } else {
          parts.push(
            `In ${lastPair.year}, prices and production both ${priceMove > 0 ? "increased" : "declined"}.`
          );
        }
      }
    }
  } else if (wantsVolumeOverlay()) {
    parts.push("Matching production volume was not available for this commodity in the selected years, so the bars cannot be compared here.");
  }

  const zeroYears = priced.filter((p) => p.price === 0).length;
  if (zeroYears) {
    parts.push(
      `${zeroYears === 1 ? "One year" : `${zeroYears} years`} averaged ₱0.00/kg and ${
        zeroYears === 1 ? "is" : "are"
      } shown as a broken line, excluded from the high/low years.`
    );
  }

  return parts.join(" ");
}

function getProvinceVolumeTopN() {
  const raw = els.provinceVolumeTopN?.value || String(PROVINCE_VOLUME_TOP_N_DEFAULT);
  if (raw === "all") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : PROVINCE_VOLUME_TOP_N_DEFAULT;
}

function hasVolumeValue(value) {
  if (value == null || value === "") return false;
  const n = Number(value);
  return !Number.isNaN(n) && n !== 0;
}

function syncProvinceVolumeTableLayout(limit) {
  const wrap = els.provinceVolumeTableWrap;
  const table = document.getElementById("provinceVolumeTable");
  if (!wrap || !table) return;

  const tbody = table.tBodies[0];
  const dataRow = tbody?.querySelector("tr:not(.eco-empty-row):not(.eco-total)");
  if (!dataRow) {
    wrap.classList.remove("is-scrollable");
    return;
  }

  const headerH = table.tHead?.offsetHeight ?? 0;
  const rowH = dataRow.offsetHeight;
  const maxH = headerH + rowH * PROVINCE_VOLUME_SCROLL_AT;
  wrap.style.setProperty("--province-table-max-height", `${maxH}px`);

  const needsScroll = limit === 0 || limit > PROVINCE_VOLUME_SCROLL_AT;
  wrap.classList.toggle("is-scrollable", needsScroll);
}

function renderProvinceVolumeTable(latestYear, points, { limit = getProvinceVolumeTopN() } = {}) {
  const previousYear = latestYear - 1;
  const limitLabel = limit > 0 ? `Top ${limit}` : "All";
  if (els.provinceVolumeTableSub) {
    els.provinceVolumeTableSub.textContent = `${isPriceMode() ? "Price" : "Volume"} (${metricUnit()}) · ${latestYear} vs ${previousYear} · ${limitLabel} Provinces`;
  }
  const tbody = els.provinceVolumeTableBody;
  if (!tbody) return;

  const byProvince = new Map();
  for (const p of points || []) {
    const province = p.province;
    if (!province) continue;
    const key = `${p.region || ""}\0${province}`;
    if (!byProvince.has(key)) {
      byProvince.set(key, {
        name: province,
        province,
        region: p.region || "—",
        latest: null,
        previous: null,
      });
    }
    const row = byProvince.get(key);
    if (Number(p.year) === latestYear) row.latest = p.volume_mt;
    if (Number(p.year) === previousYear) row.previous = p.volume_mt;
  }

  let entries = [...byProvince.values()]
    .filter((entry) => hasVolumeValue(entry.latest))
    .map((entry) => {
      const latestNum =
        entry.latest != null && !Number.isNaN(Number(entry.latest))
          ? Number(entry.latest)
          : null;
      const previousNum =
        entry.previous != null && !Number.isNaN(Number(entry.previous))
          ? Number(entry.previous)
          : null;
      const variance =
        latestNum != null && previousNum != null ? latestNum - previousNum : null;
      let growth = null;
      if (latestNum != null && previousNum != null && previousNum !== 0) {
        growth = ((latestNum - previousNum) / previousNum) * 100;
      }
      return {
        ...entry,
        latest: latestNum,
        previous: previousNum,
        variance,
        growth,
      };
    })
    .sort(
      (a, b) =>
        (b.latest ?? -Infinity) - (a.latest ?? -Infinity) ||
        String(a.name).localeCompare(String(b.name))
    );

  if (limit > 0) entries = entries.slice(0, limit);

  if (!entries.length) {
    tbody.innerHTML =
      `<tr class="eco-empty-row"><td colspan="${showShareColumn() ? 6 : 5}">No province data for the current filters.</td></tr>`;
    syncTableSortHeaders("provinceVolume");
    syncProvinceVolumeTableLayout(limit);
    return;
  }

  const sumKnown = (key) =>
    entries.reduce((sum, row) => {
      const value = row[key];
      return sum + (value != null && !Number.isNaN(Number(value)) ? Number(value) : 0);
    }, 0);

  const hasAny = (key) =>
    entries.some((row) => row[key] != null && !Number.isNaN(Number(row[key])));

  const latestTotal = hasAny("latest") ? sumKnown("latest") : null;

  entries = entries.map((entry) => ({
    ...entry,
    share:
      showShareColumn() && entry.latest != null && latestTotal != null && latestTotal > 0
        ? (entry.latest / latestTotal) * 100
        : null,
  }));

  entries = sortTableEntries(entries, tableSortState.provinceVolume, {
    nameKey: "name",
  });
  syncTableSortHeaders("provinceVolume");

  const rows = entries.map((entry) => {
    const { varianceClass, variance, growthHtml, shareHtml } = metricTriplet(
      entry.latest,
      entry.previous,
      entry.share
    );

    return `<tr class="eco-other">
        <td><span class="eco-name">${entry.name}</span></td>
        <td class="num">${valueWithUnit(entry.latest, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num muted">${valueWithUnit(entry.previous, metricUnit(), { compact: metricCompact() })}</td>
        <td class="num ${varianceClass}">${valueWithUnit(variance, metricUnit(), { signed: true, compact: metricCompact() })}</td>
        <td class="growth-col">${growthHtml}</td>
        ${showShareColumn() ? `<td class="share-col">${shareHtml}</td>` : ""}
      </tr>`;
  });

  tbody.innerHTML = rows.join("");
  syncProvinceVolumeTableLayout(limit);
}

function renderProvinceVolumeTableFromCache() {
  const { year_to } = getYearRange();
  renderProvinceVolumeTable(year_to, provinceComparePoints);
}

function getRegionEcosystemMetric() {
  const key = els.regionEcosystemMetric?.value || "volume_mt";
  return ECOSYSTEM_METRICS[key] ? key : "volume_mt";
}

function regionEcosystemMetricValue(cell, metricKey) {
  if (!cell) return null;
  if (metricKey === "yield_mt_ha") {
    if (cell.yield_mt_ha != null && !Number.isNaN(Number(cell.yield_mt_ha))) {
      return Number(cell.yield_mt_ha);
    }
    if (cell.area_ha && Number(cell.area_ha) > 0) {
      return Number(cell.volume_mt) / Number(cell.area_ha);
    }
    return null;
  }
  const value = cell[metricKey];
  return value == null || Number.isNaN(Number(value)) ? null : Number(value);
}

function combineRegionEcosystemCells(irrigated, rainfed) {
  const volume =
    (irrigated?.volume_mt != null ? Number(irrigated.volume_mt) : 0) +
    (rainfed?.volume_mt != null ? Number(rainfed.volume_mt) : 0);
  const area =
    (irrigated?.area_ha != null ? Number(irrigated.area_ha) : 0) +
    (rainfed?.area_ha != null ? Number(rainfed.area_ha) : 0);
  const hasVolume =
    (irrigated?.volume_mt != null && !Number.isNaN(Number(irrigated.volume_mt))) ||
    (rainfed?.volume_mt != null && !Number.isNaN(Number(rainfed.volume_mt)));
  const hasArea =
    (irrigated?.area_ha != null && !Number.isNaN(Number(irrigated.area_ha))) ||
    (rainfed?.area_ha != null && !Number.isNaN(Number(rainfed.area_ha)));
  return {
    volume_mt: hasVolume ? volume : null,
    area_ha: hasArea ? area : null,
    yield_mt_ha: hasArea && area > 0 ? volume / area : null,
  };
}

function formatRegionEcosystemMetric(value, metricKey) {
  if (value == null || Number.isNaN(value)) return "—";
  const meta = ECOSYSTEM_METRICS[metricKey] || ECOSYSTEM_METRICS.volume_mt;
  return valueWithUnit(value, meta.unit, { compact: false });
}

function renderRegionEcosystemTable() {
  const metricKey = getRegionEcosystemMetric();
  const meta = ECOSYSTEM_METRICS[metricKey] || ECOSYSTEM_METRICS.volume_mt;
  const { year_from, year_to } = getYearRange();
  if (els.regionEcosystemTableSub) {
    const years =
      year_from === year_to ? String(year_to) : `${year_from}–${year_to}`;
    els.regionEcosystemTableSub.textContent = `${meta.label} (${meta.unit}) · ${years}`;
  }

  const tbody = els.regionEcosystemTableBody;
  if (!tbody) return;

  const byRegion = new Map();
  for (const row of regionEcosystemRows || []) {
    const region = row.region;
    const subtype = row.crop_subtype;
    if (!region || !pairSubtypeValues().includes(subtype)) continue;
    if (!byRegion.has(region)) {
      byRegion.set(region, Object.fromEntries(pairSubtypeValues().map((name) => [name, null])));
    }
    byRegion.get(region)[subtype] = row;
  }

  let entries = [...byRegion.keys()].map((region) => {
    const cells = byRegion.get(region);
    const cellA = cells[SUBTYPE_A.value];
    const cellB = cells[SUBTYPE_B.value];
    const total = combineRegionEcosystemCells(cellA, cellB);
    return {
      name: region,
      irrigatedCell: cellA,
      rainfedCell: cellB,
      subtype_a: regionEcosystemMetricValue(cellA, metricKey),
      subtype_b: regionEcosystemMetricValue(cellB, metricKey),
      total: regionEcosystemMetricValue(total, metricKey),
    };
  });

  if (!entries.length) {
    tbody.innerHTML =
      `<tr class="eco-empty-row"><td colspan="4">No regional ${CONFIG.subtypeNoun} data for the current filters.</td></tr>`;
    syncTableSortHeaders("regionEcosystem");
    return;
  }

  const sortState = tableSortState.regionEcosystem;
  entries = sortTableEntries(entries, sortState, { nameKey: "name" });
  syncTableSortHeaders("regionEcosystem");

  let sumIrrVol = 0;
  let sumIrrArea = 0;
  let sumRainVol = 0;
  let sumRainArea = 0;
  let hasIrr = false;
  let hasRain = false;

  const rows = entries.map((entry) => {
    const irrigated = entry.irrigatedCell;
    const rainfed = entry.rainfedCell;

    if (irrigated?.volume_mt != null) {
      sumIrrVol += Number(irrigated.volume_mt);
      hasIrr = true;
    }
    if (irrigated?.area_ha != null) {
      sumIrrArea += Number(irrigated.area_ha);
      hasIrr = true;
    }
    if (rainfed?.volume_mt != null) {
      sumRainVol += Number(rainfed.volume_mt);
      hasRain = true;
    }
    if (rainfed?.area_ha != null) {
      sumRainArea += Number(rainfed.area_ha);
      hasRain = true;
    }

    return `<tr class="eco-other">
        <td><span class="eco-name">${escapeHtml(entry.name)}</span></td>
        <td class="num">${formatRegionEcosystemMetric(entry.subtype_a, metricKey)}</td>
        <td class="num">${formatRegionEcosystemMetric(entry.subtype_b, metricKey)}</td>
        <td class="num">${formatRegionEcosystemMetric(entry.total, metricKey)}</td>
      </tr>`;
  });

  const irrTotalCell = {
    volume_mt: hasIrr ? sumIrrVol : null,
    area_ha: hasIrr ? sumIrrArea : null,
    yield_mt_ha: hasIrr && sumIrrArea > 0 ? sumIrrVol / sumIrrArea : null,
  };
  const rainTotalCell = {
    volume_mt: hasRain ? sumRainVol : null,
    area_ha: hasRain ? sumRainArea : null,
    yield_mt_ha: hasRain && sumRainArea > 0 ? sumRainVol / sumRainArea : null,
  };
  const grandTotal = combineRegionEcosystemCells(irrTotalCell, rainTotalCell);

  rows.push(`<tr class="eco-total">
        <td><span class="eco-name">Total</span></td>
        <td class="num">${formatRegionEcosystemMetric(
          regionEcosystemMetricValue(irrTotalCell, metricKey),
          metricKey
        )}</td>
        <td class="num">${formatRegionEcosystemMetric(
          regionEcosystemMetricValue(rainTotalCell, metricKey),
          metricKey
        )}</td>
        <td class="num">${formatRegionEcosystemMetric(
          regionEcosystemMetricValue(grandTotal, metricKey),
          metricKey
        )}</td>
      </tr>`);

  tbody.innerHTML = rows.join("");
}

function setSigned(el, value, { asPercent = false, card = null } = {}) {
  if (!el) return;
  if (card) card.classList.remove("up", "down");
  el.classList.remove("up", "down");
  if (value == null || Number.isNaN(value)) {
    el.textContent = "—";
    setRawTip(el, null);
    return;
  }
  const sign = value > 0 ? "+" : "";
  if (isPriceMode() && !asPercent) {
    el.textContent = fmt.price(value, { signed: true });
    setRawTip(el, null);
  } else {
    const detail = fmt.scoreDetail(value, { compact: !asPercent, fixed: isPriceMode() });
  el.textContent = `${sign}${detail.text}`;
  setRawTip(el, !asPercent && detail.compact ? `${sign}${detail.raw}` : null);
  }
  const tone = value > 0 ? "up" : value < 0 ? "down" : null;
  if (tone) {
    el.classList.add(tone);
    if (card) card.classList.add(tone);
  }
}
function setDelta(el, value) {
  el.textContent = fmt.pct(value);
  el.classList.remove("up", "down");
  if (value > 0) el.classList.add("up");
  if (value < 0) el.classList.add("down");
}

function formatUpdatedAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return { day, time, iso: date.toISOString() };
}

function renderStatus(state) {
  const status = state.status || "idle";
  const running = status === "running";
  if (els.refreshBtn) {
    els.refreshBtn.disabled = running;
    els.refreshBtn.classList.toggle("is-spinning", running);
  }

  if (!els.statusMeta) return;

  if (running) {
    els.statusMeta.className = "header-updated is-updating";
    els.statusMeta.innerHTML =
      '<span class="header-updated-label">Updating</span><span class="header-updated-value">Refreshing data…</span>';
  } else if (state.last_success) {
    const formatted = formatUpdatedAt(state.last_success);
    if (formatted) {
      els.statusMeta.className = "header-updated";
      els.statusMeta.innerHTML = `<span class="header-updated-label">Updated</span><time class="header-updated-value" datetime="${escapeAttr(
        formatted.iso
      )}">${escapeHtml(formatted.day)} · ${escapeHtml(formatted.time)}</time>`;
    } else {
      els.statusMeta.className = "header-updated";
      els.statusMeta.textContent = "";
    }
  } else if (status === "error" && state.last_error) {
    els.statusMeta.className = "header-updated is-error";
    els.statusMeta.innerHTML =
      '<span class="header-updated-label">Update failed</span><span class="header-updated-value">Could not refresh</span>';
  } else {
    els.statusMeta.className = "header-updated";
    els.statusMeta.textContent = "";
  }

  if (els.refreshBtn) {
    if (status === "error" && state.last_error) {
      els.refreshBtn.title = `Refresh failed: ${state.last_error}`;
    } else {
      els.refreshBtn.title = "Refresh data from PSA";
    }
  }
}

async function loadMeta() {
  const meta = await api(`/api/meta?${qs({ dataset: DATASET })}`);
  const years = meta.years || [];
  yearBounds = {
    min: years.length ? years[0] : 1990,
    max: years.length ? years[years.length - 1] : 2026,
  };
  buildYearScale();
  setYearRange(yearBounds.min, defaultYearTo(), { silent: true });

  let boardPromise = null;
  if (hasCommodityBoard() && !selectedFarmgateCommodity) {
    dashboardRefreshSeq += 1;
    boardPromise = refreshFarmgateOverview();
  }

  populateRegions(meta.regions || []);
  provinceMeta = meta.provinces || [];
  cropMeta = meta.crops || [];
  populateProvinces(false);

  if (IS_MULTI_CROP) {
    if (els.subsector) {
      const subtypes = [...new Set((meta.crops || []).map((c) => c.crop_subtype).filter(Boolean))];
      const preferred = ["Aquaculture", "Commercial", "Marine Municipal", "Inland Municipal"];
      subtypes.sort((a, b) => {
        const ia = preferred.indexOf(a);
        const ib = preferred.indexOf(b);
        if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        return String(a).localeCompare(String(b));
      });
      fillMultiSelectOptions(els.subsector, subtypes, { preserve: false, checkAll: true });
    }
    populateSpeciesOptions({ preserve: false });
  }

  renderStatus(meta.refresh || {});
  markActiveFilterIcons();
  if (boardPromise) {
    try {
      await boardPromise;
    } catch (err) {
      console.error("Farmgate board failed:", err);
    }
  }
  return meta;
}

function resetFilters() {
  if (hasCommodityBoard()) {
    selectedFarmgateCommodity = null;
    selectedFarmgateItem = null;
    setFarmgateView("overview");
  }
  setYearRange(yearBounds.min, defaultYearTo(), { silent: true });
  setCheckedValues(els.quarter, ["1", "2", "3", "4"]);
  setCheckedValues(els.semester, ["1", "2"]);
  if (els.month) setCheckedValues(els.month, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  if (IS_MULTI_CROP) {
    if (els.subsector) checkAllValues(els.subsector);
    populateSpeciesOptions({ preserve: false });
  } else {
    setCheckedValues(els.crop, SUBTYPE_VALUES);
  }
  checkAllValues(els.region);
  populateProvinces(false);
  markActiveFilterIcons();
  refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
}

const CHART_EASE = "easeOutCubic";

function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

function chartAnimOptions({ stagger = true } = {}) {
  if (PREVIEW_EMBED) {
    return {
      animation: false,
      transitions: {
        active: { animation: { duration: 0 } },
        resize: { animation: { duration: 0 } },
      },
    };
  }
  const yFrom = (ctx) => {
    if (ctx.type !== "data") return undefined;
    const axisId = ctx.dataset?.yAxisID || "y";
    const scale = ctx.chart.scales[axisId];
    if (!scale) return undefined;
    const base = Math.min(0, scale.min);
    return scale.getPixelForValue(base);
  };

  const delay = (ctx) => {
    if (!stagger || ctx.type !== "data" || prefersReducedMotion()) return 0;
    const dsType =
      ctx.chart.data.datasets[ctx.datasetIndex]?.type || ctx.chart.config.type;
    const perPoint = dsType === "line" ? 28 : 38;
    const perSeries = dsType === "line" ? 0 : 55;
    return ctx.dataIndex * perPoint + ctx.datasetIndex * perSeries;
  };

  return {
    animation: {
      duration: 780,
      easing: CHART_EASE,
    },
    animations: {
      x: {
        type: "number",
        easing: CHART_EASE,
        duration: 680,
        from: NaN,
        delay,
      },
      y: {
        type: "number",
        easing: CHART_EASE,
        duration: 780,
        from: yFrom,
        delay,
      },
      colors: {
        type: "color",
        duration: 420,
        easing: "easeOutQuad",
      },
      numbers: {
        type: "number",
        duration: 420,
        easing: CHART_EASE,
      },
    },
    transitions: {
      active: {
        animation: {
          duration: 520,
          easing: CHART_EASE,
        },
      },
      resize: {
        animation: {
          duration: 0,
        },
      },
      show: {
        animations: {
          x: { from: 0 },
          y: { from: 0 },
        },
      },
      hide: {
        animations: {
          x: { to: 0 },
          y: { to: 0 },
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 3,
        borderSkipped: false,
      },
      line: {
        borderJoinStyle: "round",
        borderCapStyle: "round",
        tension: 0.25,
      },
      point: {
        radius: 0,
        hoverRadius: 0,
        hitRadius: 12,
      },
    },
  };
}

function lineTrendAnimOptions() {
  const reduced = prefersReducedMotion();
  const duration = reduced ? 0 : 1080;
  const fromFloor = (ctx) => {
    if (ctx.type !== "data") return undefined;
    return ctx.chart.chartArea?.bottom;
  };
  return {
    animation: {
      duration,
      easing: "easeOutQuart",
      onComplete(animation) {
        const chart = animation?.chart;
        if (!chart || chart.$growthExtrasReady) return;
        chart.$growthExtrasReady = true;
        chart.draw();
      },
    },
    animations: {
      y: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: fromFloor,
      },
      colors: {
        type: "color",
        duration: reduced ? 0 : 640,
        easing: "easeOutQuad",
      },
    },
    transitions: {
      active: {
        animation: {
          duration: reduced ? 0 : 280,
          easing: "easeOutQuad",
        },
      },
      resize: {
        animation: {
          duration: 0,
        },
      },
    },
    elements: {
      line: {
        borderJoinStyle: "round",
        borderCapStyle: "round",
        tension: 0.3,
      },
      point: {
        radius: 0,
        hoverRadius: 0,
        hitRadius: 12,
      },
    },
  };
}

/** Diverging bar entrance: grow from the zero baseline with staggered delay. */
function volumeGrowthAnimOptions() {
  const reduced = prefersReducedMotion();
  const zeroY = (ctx) => {
    if (ctx.type !== "data") return undefined;
    const scale = ctx.chart.scales.y;
    if (!scale) return undefined;
    return scale.getPixelForValue(0);
  };
  const delay = (ctx) => {
    if (reduced || ctx.type !== "data") return 0;
    return ctx.dataIndex * 34;
  };
  const duration = reduced ? 0 : 980;

  return {
    animation: {
      duration,
      easing: "easeOutQuart",
      onComplete(animation) {
        const chart = animation?.chart;
        if (!chart || chart.$growthExtrasReady) return;
        chart.$growthExtrasReady = true;
        chart.draw();
      },
    },
    animations: {
      y: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: zeroY,
        delay,
      },
      base: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: zeroY,
        delay,
      },
      colors: {
        type: "color",
        duration: reduced ? 0 : 560,
        easing: "easeOutQuad",
      },
    },
    transitions: {
      active: {
        animation: {
          duration: reduced ? 0 : 260,
          easing: "easeOutQuad",
        },
      },
      resize: {
        animation: {
          duration: 0,
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 0,
        borderSkipped: false,
      },
    },
  };
}

/** Clustered bar entrance: grow from zero, year-by-year then series-by-series. */
function subsectorVolumeAnimOptions() {
  const reduced = prefersReducedMotion();
  const zeroY = (ctx) => {
    if (ctx.type !== "data") return undefined;
    const scale = ctx.chart.scales.y;
    if (!scale) return undefined;
    return scale.getPixelForValue(0);
  };
  const delay = (ctx) => {
    if (reduced || ctx.type !== "data") return 0;
    const n = ctx.chart.data.labels?.length || 1;
    const yearStep = Math.max(12, Math.min(28, Math.round(720 / n)));
    return ctx.dataIndex * yearStep + ctx.datasetIndex * 70;
  };
  const duration = reduced ? 0 : 920;

  return {
    animation: {
      duration,
      easing: "easeOutQuart",
      onComplete(animation) {
        const chart = animation?.chart;
        if (!chart || chart.$growthExtrasReady) return;
        chart.$growthExtrasReady = true;
        chart.draw();
      },
    },
    animations: {
      y: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: zeroY,
        delay,
      },
      base: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: zeroY,
        delay,
      },
      colors: {
        type: "color",
        duration: reduced ? 0 : 560,
        easing: "easeOutQuad",
      },
    },
    transitions: {
      active: {
        animation: {
          duration: reduced ? 0 : 280,
          easing: "easeOutQuad",
        },
      },
      resize: {
        animation: {
          duration: 0,
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 3,
        borderSkipped: false,
      },
    },
  };
}

function mixedTrendLegendLabels(chart) {
  return chart.data.datasets.map((ds, i) => {
    const hidden = chart.getDatasetMeta(i).hidden;
    const isLine = ds.type === "line";
    return {
      text: ds.label,
      datasetIndex: i,
      hidden: Boolean(hidden),
      pointStyle: isLine ? "line" : "rect",
      fillStyle: isLine ? ds.borderColor || "#09663f" : ds.backgroundColor || "#9ae856",
      strokeStyle: isLine ? ds.borderColor || "#09663f" : ds.borderColor || ds.backgroundColor || "#9ae856",
      lineWidth: isLine ? 2.5 : 0,
      fontColor: "#4a5578",
    };
  });
}

function lineLegendLabels(chart) {
  return chart.data.datasets.map((ds, i) => {
    const hidden = chart.getDatasetMeta(i).hidden;
    const color = ds.borderColor || "#09663f";
    return {
      text: ds.label,
      datasetIndex: i,
      hidden: Boolean(hidden),
      pointStyle: "line",
      fillStyle: color,
      strokeStyle: color,
      lineWidth: 2.5,
      fontColor: "#4a5578",
    };
  });
}

function mixedTrendMarkerStyle(ctx) {
  const isLine = ctx.dataset.type === "line";
  const lineColor = ctx.dataset.borderColor || "#09663f";
  const barColor = ctx.dataset.backgroundColor || "#9ae856";
  return {
    pointStyle: isLine ? "line" : "rect",
    borderColor: isLine ? lineColor : barColor,
    backgroundColor: isLine ? lineColor : barColor,
    borderWidth: isLine ? 2.5 : 0,
  };
}

const mixedTrendTooltipCallbacks = {
  title(items) {
    const item = items?.[0];
    if (!item) return "";
    const year = item.label;
    if (items.some((i) => i.dataset?.peakIndex === i.dataIndex)) return `Year ${year} · Peak`;
    if (items.some((i) => i.dataset?.lowIndex === i.dataIndex)) return `Year ${year} · Lowest`;
    return `Year ${year}`;
  },
  label(ctx) {
    const v = ctx.parsed.y;
    const label = ctx.dataset.label || "";
    if (v == null || Number.isNaN(v)) return `${label}: —`;
    const unit =
      ctx.dataset.unit ||
      (label.toLowerCase().includes("price") || label.toLowerCase().includes("₱")
        ? metricUnit()
        : label.toLowerCase().includes("area")
          ? "ha"
          : "MT");
    const amount =
      isPriceMode() && (unit === metricUnit() || String(unit).includes("₱"))
        ? fmt.price(v)
        : fmt.score(v, { compact: false });
    const base = `${label}: ${amount} ${unit}`;
    if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
    if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
    return base;
  },
  labelPointStyle(ctx) {
    const style = mixedTrendMarkerStyle(ctx);
    return { pointStyle: style.pointStyle, rotation: 0 };
  },
  labelColor(ctx) {
    const style = mixedTrendMarkerStyle(ctx);
    return {
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth,
    };
  },
};

function lineMarkerStyle(ctx) {
  const color = ctx.dataset.borderColor || "#06402b";
  return {
    pointStyle: "line",
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.5,
  };
}

const lineTooltipCallbacks = {
  labelPointStyle(ctx) {
    const style = lineMarkerStyle(ctx);
    return { pointStyle: style.pointStyle, rotation: 0 };
  },
  labelColor(ctx) {
    const style = lineMarkerStyle(ctx);
    return {
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth,
    };
  },
};

const ECOSYSTEM_CHART_COLORS = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return ecosystemChartColors()[prop];
    },
  }
);

function ecosystemMarkerStyle(ctx) {
  const label = ctx.dataset?.label || ctx;
  const colors = ECOSYSTEM_CHART_COLORS[label] || {
    bg: "rgba(90, 143, 106, 0.55)",
    border: "#5a8f6a",
  };
  return {
    pointStyle: "rect",
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderWidth: 0,
  };
}

function ecosystemLegendLabels(chart) {
  return chart.data.datasets.map((ds, i) => {
    const hidden = chart.getDatasetMeta(i).hidden;
    const style = ecosystemMarkerStyle({ dataset: ds });
    return {
      text: ds.label,
      datasetIndex: i,
      hidden: Boolean(hidden),
      pointStyle: style.pointStyle,
      fillStyle: style.backgroundColor,
      strokeStyle: style.borderColor,
      lineWidth: style.borderWidth,
      fontColor: "#4a5578",
    };
  });
}

function subsectorLegendLabels(chart) {
  return chart.data.datasets.map((ds, i) => ({
    text: ds.label,
    datasetIndex: i,
    hidden: Boolean(chart.getDatasetMeta(i).hidden),
    fillStyle: ds.backgroundColor,
    strokeStyle: ds.borderColor || ds.backgroundColor,
    lineWidth: 0,
    pointStyle: "rectRounded",
    fontColor: "#4a5578",
  }));
}

const ecosystemTooltipCallbacks = {
  labelPointStyle(ctx) {
    const style = ecosystemMarkerStyle(ctx);
    return { pointStyle: style.pointStyle, rotation: 0 };
  },
  labelColor(ctx) {
    const style = ecosystemMarkerStyle(ctx);
    return {
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth,
    };
  },
};

function updateChart(chart, mode = "active") {
  if (!chart) return;
  chart.update(mode);
}

function yearMarkerStyle(borderColor, { pointCount = 0, peakIndex = -1 } = {}) {
  // Line-only charts: no visible markers (peak/low emphasis uses the glow plugin)
  void borderColor;
  void pointCount;
  void peakIndex;
  return {
    pointRadius: 0,
    pointHoverRadius: 0,
    pointHitRadius: 12,
    pointBackgroundColor: "transparent",
    pointBorderColor: "transparent",
    pointBorderWidth: 0,
    pointHoverBackgroundColor: "transparent",
    pointHoverBorderColor: "transparent",
    pointHoverBorderWidth: 0,
  };
}

function peakVolumeIndex(points) {
  return peakValueIndex((points || []).map((p) => p?.volume_mt));
}

function peakValueIndex(values, { ignoreZero = false } = {}) {
  let peakIdx = -1;
  let peakVal = -Infinity;
  (values || []).forEach((value, i) => {
    if (value == null || value === "") return;
    const v = Number(value);
    if (!Number.isFinite(v) || (ignoreZero && v === 0) || v <= peakVal) return;
      peakVal = v;
      peakIdx = i;
  });
  return peakIdx;
}

function lowValueIndex(values, { ignoreZero = false } = {}) {
  let lowIdx = -1;
  let lowVal = Infinity;
  (values || []).forEach((value, i) => {
    if (value == null || value === "") return;
    const v = Number(value);
    if (!Number.isFinite(v) || (ignoreZero && v === 0) || v >= lowVal) return;
      lowVal = v;
      lowIdx = i;
  });
  return lowIdx;
}

const volumeTimeSeriesTooltipCallbacks = {
  title(items) {
    const item = items?.[0];
    if (!item) return "";
    const extras = [];
    if (item.dataset?.peakIndex === item.dataIndex) extras.push("Peak");
    if (item.dataset?.lowIndex === item.dataIndex) extras.push("Lowest");
    return ensoYearTooltipTitle(item.label, extras);
  },
  label(ctx) {
    const v = ctx.parsed.y;
    if (v == null || Number.isNaN(v)) return `${metricTitle()}: —`;
    const base = `${metricTitle()}: ${
      isPriceMode() ? fmt.price(v) : fmt.score(v, { compact: metricCompact() })
    } ${metricUnit()}`;
    if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
    if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
    return base;
  },
  labelPointStyle() {
    return { pointStyle: "circle", rotation: 0 };
  },
  labelColor(ctx) {
    let color = "#09663f";
    if (ctx.dataset?.peakIndex === ctx.dataIndex) color = "#06402b";
    else if (ctx.dataset?.lowIndex === ctx.dataIndex) color = "#c62828";
    return {
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
    };
  },
};

function drawExtremumCaption(ctx, chartArea, x, y, caption, color, { prefer = "above" } = {}) {
  if (!caption) return;
  ctx.font = "600 10px Roboto, system-ui, sans-serif";
  ctx.fillStyle = `rgb(${color})`;
  ctx.strokeStyle = "rgba(255,255,255,0.94)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.textAlign = "center";

  const width = ctx.measureText(caption).width;
  const canvasWidth = ctx.canvas?.clientWidth || chartArea.right + 8;
  const canvasHeight = ctx.canvas?.clientHeight || chartArea.bottom + 8;
  const textX = Math.min(Math.max(x, width / 2 + 6), canvasWidth - width / 2 - 6);
  const labelH = 12;
  const gap = 12;
  const minTop = 4;
  const maxBottom = canvasHeight - 4;
  const fitsAbove = y - gap - labelH >= minTop;
  const fitsBelow = y + gap + labelH <= maxBottom;
  const placeBelow = prefer === "below" ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;

  ctx.textBaseline = placeBelow ? "top" : "bottom";
  const textY = placeBelow ? Math.min(y + gap, maxBottom - labelH) : Math.max(y - gap, minTop + labelH);
  ctx.strokeText(caption, textX, textY);
  ctx.fillText(caption, textX, textY);
}

function drawExtremumEffect(ctx, chartArea, point, { guide, glow, caption }) {
  const { x, y } = point.getProps(["x", "y"], true);
  if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) return;

  const pulse =
    0.45 + 0.55 * (0.5 - 0.5 * Math.cos(((performance.now() % 1800) / 1800) * Math.PI * 2));

  ctx.save();

  const clipBottom = chartArea.bottom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    chartArea.left,
    chartArea.top,
    chartArea.right - chartArea.left,
    Math.max(0, clipBottom - chartArea.top)
  );
  ctx.clip();

  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = `rgba(${guide.rgb}, ${guide.baseAlpha + pulse * guide.pulseAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.moveTo(x, chartArea.top);
  ctx.lineTo(x, clipBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  for (const ring of [
    { radius: 10 + pulse * 8, alpha: glow.outerBase + pulse * glow.outerPulse },
    { radius: 7 + pulse * 4, alpha: glow.innerBase + pulse * glow.innerPulse },
  ]) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${glow.rgb}, ${ring.alpha})`;
    ctx.arc(x, y, ring.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawExtremumCaption(ctx, chartArea, x, y, caption, glow.rgb);
  ctx.restore();
}

function drawBarExtremumEmphasis(ctx, chartArea, bar, { rgb, caption, valueIsPositive }) {
  const props = bar.getProps(["x", "y", "base", "width"], true);
  const { x, y, base, width } = props;
  if (
    x == null ||
    y == null ||
    base == null ||
    width == null ||
    Number.isNaN(x) ||
    Number.isNaN(y) ||
    Number.isNaN(base) ||
    Number.isNaN(width)
  ) {
    return;
  }

  const half = Math.max(width / 2, 1);
  const bandPad = 8;
  const top = Math.min(y, base);
  const bottom = Math.max(y, base);
  const barHeight = Math.max(bottom - top, 1);

  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    chartArea.left,
    chartArea.top,
    chartArea.right - chartArea.left,
    Math.max(0, chartArea.bottom - chartArea.top)
  );
  ctx.clip();

  ctx.fillStyle = `rgba(${rgb}, 0.16)`;
  ctx.fillRect(
    x - half - bandPad,
    chartArea.top,
    width + bandPad * 2,
    Math.max(0, chartArea.bottom - chartArea.top)
  );

  ctx.strokeStyle = `rgba(${rgb}, 0.95)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - half, top, width, barHeight);
  ctx.restore();

  // Marker pointing at the bar tip
  const marker = 5;
  ctx.beginPath();
  ctx.fillStyle = `rgb(${rgb})`;
  if (valueIsPositive) {
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x - marker, y - 4);
    ctx.lineTo(x + marker, y - 4);
  } else {
    ctx.moveTo(x, y + 11);
    ctx.lineTo(x - marker, y + 4);
    ctx.lineTo(x + marker, y + 4);
  }
  ctx.closePath();
  ctx.fill();

  drawExtremumCaption(ctx, chartArea, x, y, caption, rgb, {
    prefer: valueIsPositive ? "above" : "below",
  });

  ctx.restore();
}

const ensoBandsPlugin = {
  id: "ensoBands",
  beforeDatasetsDraw(chart, _args, options) {
    const opts = chart.options?.plugins?.ensoBands || options;
    if (!opts?.enabled) return;
    const grain = opts.grain || "year";
    const byYear = opts.byYear || {};
    const byPeriod = opts.byPeriod || {};
    const labels = chart.data.labels || [];
    if (!labels.length) return;
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    if (!chartArea || !xScale) return;

    const BOTH = {
      fill: "rgba(142, 36, 170, 0.22)",
      stripe: "#6a1b9a",
      mark: "E/L",
    };

    const n = labels.length;
    const centers = labels.map((_, i) => xScale.getPixelForValue(i));
    const edges = new Array(n + 1);
    edges[0] = chartArea.left;
    edges[n] = chartArea.right;
    for (let i = 1; i < n; i += 1) {
      edges[i] = (centers[i - 1] + centers[i]) / 2;
    }

    const labelKeys = opts.labelKeys;
    const periodPointAxis = Array.isArray(labelKeys) && labelKeys.length === n;
    const periodCount = periodPointAxis
      ? 1
      : grain === "quarter"
        ? 4
        : grain === "semester"
          ? 2
          : 1;
    const periodPrefix = grain === "quarter" ? "Q" : grain === "semester" ? "S" : "";

    const paintBand = (left, right, info, mark) => {
      if (!info?.phase) return;
      const width = right - left;
      if (width < 1) return;
      const drawWidth = Math.max(0, width - 0.35);
      if (info.phase === "both") {
        const mid = left + drawWidth / 2;
        const elStyle = ensoBandStyle(
          "el_nino",
          info.el_nino_intensity || info.intensity || ensoIntensityFromRoni(info.el_nino_peak_roni)
        );
        const laStyle = ensoBandStyle(
          "la_nina",
          info.la_nina_intensity || info.intensity || ensoIntensityFromRoni(info.la_nina_peak_roni)
        );
        ctx.fillStyle = elStyle.fill;
        ctx.fillRect(left, chartArea.top, mid - left, chartArea.bottom - chartArea.top);
        ctx.fillStyle = laStyle.fill;
        ctx.fillRect(mid, chartArea.top, left + drawWidth - mid, chartArea.bottom - chartArea.top);
        if (drawWidth >= 4) {
          ctx.fillStyle = elStyle.stripe;
          ctx.fillRect(left, chartArea.top, mid - left, 3);
          ctx.fillStyle = laStyle.stripe;
          ctx.fillRect(mid, chartArea.top, left + drawWidth - mid, 3);
        }
      } else {
        const style = ensoBandStyle(
          info.phase,
          info.intensity || ensoIntensityFromRoni(info.peak_roni)
        );
        ctx.fillStyle = style.fill;
        ctx.fillRect(left, chartArea.top, drawWidth, chartArea.bottom - chartArea.top);
        if (drawWidth >= 3) {
          ctx.fillStyle = style.stripe;
          ctx.fillRect(left, chartArea.top, drawWidth, 3);
        }
      }
      if (mark && drawWidth >= 12) {
        const style =
          info.phase === "el_nino"
            ? ensoBandStyle(info.phase, info.intensity || ensoIntensityFromRoni(info.peak_roni))
            : info.phase === "la_nina"
              ? ensoBandStyle(info.phase, info.intensity || ensoIntensityFromRoni(info.peak_roni))
              : BOTH;
        ctx.fillStyle = style.stripe;
        ctx.font = "700 9px Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(style.mark, left + drawWidth / 2, chartArea.top + 5);
      }
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    ctx.clip();

    for (let i = 0; i < n; i += 1) {
      const left = edges[i];
      const right = edges[i + 1];

      if (periodPointAxis) {
        const info = byPeriod[String(labelKeys[i])] || null;
        if (!info) continue;
        paintBand(left, i === n - 1 ? right : right - 0.5, info, true);
        continue;
      }

      const year = String(labels[i]);
      if (periodCount === 1) {
        const info = byYear[year];
        if (!info) continue;
        paintBand(left, i === n - 1 ? right : right - 0.5, info, true);
        continue;
      }

      const slotW = (right - left) / periodCount;
      for (let p = 0; p < periodCount; p += 1) {
        const key = `${year}-${periodPrefix}${p + 1}`;
        const info = byPeriod[key];
        if (!info) continue;
        const slotLeft = left + slotW * p;
        const slotRight = left + slotW * (p + 1);
        paintBand(slotLeft, slotRight, info, slotW >= 16);
      }
    }
    ctx.restore();
  },
};

function wantsEnsoOverlay() {
  const key = (CONFIG.dataset || "palay_corn").trim().toLowerCase();
  return [
    "palay_corn",
    "fruits",
    "vegetables",
    "industrial",
    "livestock",
    "fisheries",
  ].includes(key);
}

const ENSO_INTENSITY_LABELS = {
  weak: "Weak",
  moderate: "Moderate",
  strong: "Strong",
  very_strong: "Very Strong",
};

const ENSO_INTENSITY_KEYS = ["weak", "moderate", "strong", "very_strong"];

const ENSO_BAND_STYLES = {
  el_nino: {
    weak: { fill: "rgba(255, 171, 145, 0.22)", stripe: "#ff8a65", mark: "E" },
    moderate: { fill: "rgba(239, 83, 80, 0.28)", stripe: "#e53935", mark: "E" },
    strong: { fill: "rgba(211, 47, 47, 0.36)", stripe: "#c62828", mark: "E" },
    very_strong: { fill: "rgba(183, 28, 28, 0.46)", stripe: "#b71c1c", mark: "E" },
  },
  la_nina: {
    weak: { fill: "rgba(144, 202, 249, 0.22)", stripe: "#64b5f6", mark: "L" },
    moderate: { fill: "rgba(66, 165, 245, 0.28)", stripe: "#1e88e5", mark: "L" },
    strong: { fill: "rgba(30, 136, 229, 0.36)", stripe: "#1565c0", mark: "L" },
    very_strong: { fill: "rgba(13, 71, 161, 0.46)", stripe: "#0d47a1", mark: "L" },
  },
};

function ensoIntensityFromRoni(peakRoni) {
  if (peakRoni == null || Number.isNaN(Number(peakRoni))) return null;
  const mag = Math.abs(Number(peakRoni));
  if (mag >= 2) return "very_strong";
  if (mag >= 1.5) return "strong";
  if (mag >= 1) return "moderate";
  if (mag >= 0.5) return "weak";
  return null;
}

function ensoIntensityLabel(intensity) {
  return ENSO_INTENSITY_LABELS[intensity] || "";
}

function ensoBandStyle(phase, intensity) {
  const key = intensity && ENSO_BAND_STYLES[phase]?.[intensity] ? intensity : "moderate";
  return (
    ENSO_BAND_STYLES[phase]?.[key] || {
      fill: "rgba(148, 163, 184, 0.2)",
      stripe: "#64748b",
      mark: "",
    }
  );
}

function ensoPhaseLabel(phase) {
  if (phase === "el_nino") return "El Niño";
  if (phase === "la_nina") return "La Niña";
  if (phase === "both") return "El Niño / La Niña";
  return "";
}

function formatEnsoPhaseDetail(enso) {
  if (!enso?.phase) return "";
  const phase = ensoPhaseLabel(enso.phase);
  const intensity =
    enso.intensity ||
    ensoIntensityFromRoni(enso.peak_roni) ||
    null;
  const intensityText = intensity ? ` ${ensoIntensityLabel(intensity)}` : "";
  const peak =
    enso.peak_roni != null
      ? ` · RONI ${enso.peak_roni > 0 ? "+" : ""}${enso.peak_roni}°C`
      : "";
  const outlookTag = enso.outlook
    ? enso.outlook_extrapolated
      ? " · NOAA CPC RONI outlook (extended)"
      : " · NOAA CPC RONI outlook (50%)"
    : "";
  return `${phase}${intensityText}${peak}${outlookTag}`;
}

function ensoYearTooltipTitle(year, extras = []) {
  const bits = [`Year ${year}`, ...extras.filter(Boolean)];
  const detail = formatEnsoPhaseDetail(ensoMetaForYear(year));
  if (detail) bits.push(detail);
  return bits.join(" · ");
}

function ensoMetaForYear(year) {
  if (!ensoByYear) return null;
  return ensoByYear[String(year)] || null;
}

function ensoPeriodMapForGrain(grain) {
  if (grain === "quarter") return ensoByQuarter || {};
  if (grain === "semester") return ensoBySemester || {};
  return {};
}

function buildEnsoOutlookPeriodMap(grain, forecastRows, labelKeys = null) {
  const map = { ...(ensoPeriodMapForGrain(grain) || {}) };
  if (!chartExpandShowForecast || !ensoOutlookByQuarter) return map;
  const keys = new Set();
  for (const row of forecastRows || []) {
    if (!row?.isForecast) continue;
    if (grain === "quarter") {
      const q = row.period ?? row.quarter;
      if (q != null) keys.add(`${row.year}-Q${q}`);
    } else if (grain === "semester") {
      keys.add(`${row.year}-S${row.period}`);
      for (const q of QUARTERS_BY_SEMESTER[row.period] || []) {
        const outlook = ensoOutlookByQuarter[`${row.year}-Q${q}`];
        if (outlook?.phase) {
          map[`${row.year}-S${row.period}`] = { ...outlook, outlook: true };
        }
      }
    }
  }
  if (grain !== "quarter") {
    return map;
  }
  if (Array.isArray(labelKeys)) {
    const start =
      forecastRows?.length && labelKeys.length >= forecastRows.length
        ? labelKeys.length - forecastRows.length
        : -1;
    if (start >= 0) {
      for (let i = start; i < labelKeys.length; i += 1) {
        const key = String(labelKeys[i] || "");
        if (key) keys.add(key);
      }
    }
  }
  for (const key of keys) {
    const outlook = ensoOutlookByQuarter[key];
    if (outlook?.phase) map[key] = { ...outlook, outlook: true };
  }
  return map;
}

function applyEnsoBands(
  chart,
  grain = "year",
  { labelKeys = null, byPeriod = null, byYear = null } = {}
) {
  if (!chart?.options?.plugins) return;
  const baseYears = byYear || ensoByYear || {};
  const enabled = wantsEnsoOverlay() && Object.keys(baseYears).length > 0;
  chart.options.plugins.ensoBands = {
    enabled,
    grain: grain || "year",
    byYear: enabled ? baseYears : {},
    byPeriod: enabled ? byPeriod || ensoPeriodMapForGrain(grain) : {},
    labelKeys: Array.isArray(labelKeys) ? labelKeys : null,
  };
}

function ensoLegendHtml({ compact = false } = {}) {
  const intensitySwatches = ENSO_INTENSITY_KEYS.map((key) => {
    const label = ensoIntensityLabel(key);
    return (
      `<span class="enso-intensity-swatch enso-intensity-${key.replace("_", "-")}" title="${label}">` +
      `<span class="enso-intensity-swatch-bar" aria-hidden="true">` +
      `<span class="enso-intensity-half enso-intensity-nino"></span>` +
      `<span class="enso-intensity-half enso-intensity-nina"></span>` +
      `</span>` +
      `<span class="enso-intensity-caption">${label}</span>` +
      `</span>`
    );
  }).join("");

  const note = compact
    ? '<p class="enso-legend-note">Band color depth follows RONI intensity (Weak → Very Strong). Red = El Niño; Blue = La Niña.</p>'
    : '<p class="enso-legend-note">Shading follows NOAA CPC’s Relative Oceanic Niño Index (RONI). A year is marked when RONI stays at or beyond <strong>±0.5°C</strong> for at least <strong>five consecutive overlapping seasons</strong>. Deeper red/blue means stronger intensity (Weak → Moderate → Strong → Very Strong). A split band means both phases occurred in the same calendar year.</p>';

  return (
    '<div class="enso-legend-row">' +
    '<span class="enso-legend-item enso-el-nino">El Niño (E)</span>' +
    '<span class="enso-legend-item enso-la-nina">La Niña (L)</span>' +
    '<span class="enso-legend-item enso-both">Split = both in same year</span>' +
    '<button type="button" class="enso-guide-btn" data-enso-guide-open="true">RONI intensity guide</button>' +
    '<span class="enso-legend-source">Source: NOAA CPC RONI</span>' +
    "</div>" +
    `<div class="enso-intensity-scale" aria-label="ENSO intensity scale">${intensitySwatches}</div>` +
    note
  );
}

function pruneChartExpandEnsoLegends(modal = document.getElementById("chartExpandModal")) {
  if (!modal) return;
  modal.querySelectorAll(".enso-legend:not(.chart-expand-enso)").forEach((el) => el.remove());
}

function ensureEnsoLegend() {
  if (!wantsEnsoOverlay()) return;
  document.querySelectorAll(".chart-box-trend, .chart-box-growth").forEach((box) => {
    if (box.closest("#chartExpandModal")) return;
    const panel = box.parentElement;
    if (!panel) return;
    let legend = panel.querySelector(".enso-legend:not(.chart-expand-enso)");
    if (!legend) {
      legend = document.createElement("div");
      legend.className = "enso-legend";
      box.insertAdjacentElement("afterend", legend);
    }
    legend.innerHTML = ensoLegendHtml();
  });
  bindEnsoGuideTriggers(document);
}

function ensureRoniGuideModal() {
  let modal = document.getElementById("roniGuideModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "roniGuideModal";
  modal.className = "app-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "roniGuideTitle");
  modal.innerHTML = `
    <div class="app-modal-backdrop" data-roni-guide-dismiss="true"></div>
    <div class="app-modal-panel app-modal-panel-roni-guide">
      <div class="app-modal-analysis-header">
        <div>
          <h2 class="app-modal-title" id="roniGuideTitle">RONI intensity guide</h2>
          <p class="app-modal-analysis-sub">How El Niño and La Niña strength is measured</p>
        </div>
        <button type="button" class="app-modal-close" data-roni-guide-dismiss="true" aria-label="Close guide">×</button>
      </div>
      <div class="app-modal-analysis-body roni-guide-body">
        <p class="roni-guide-lead">
          Chart shading uses NOAA CPC’s <strong>Relative Oceanic Niño Index (RONI)</strong>.
          Positive RONI = El Niño (red); negative RONI = La Niña (blue). Deeper color means stronger intensity.
        </p>
        <div class="roni-guide-grid" role="table" aria-label="RONI intensity thresholds">
          <div class="roni-guide-row roni-guide-head" role="row">
            <span role="columnheader">Intensity</span>
            <span role="columnheader">|RONI| range</span>
            <span role="columnheader">El Niño</span>
            <span role="columnheader">La Niña</span>
          </div>
          <div class="roni-guide-row" role="row">
            <span role="cell"><span class="roni-guide-pill weak">Weak</span></span>
            <span role="cell">0.5°C – 0.9°C</span>
            <span role="cell"><span class="roni-guide-swatch nino weak"></span>+0.5 to +0.9</span>
            <span role="cell"><span class="roni-guide-swatch nina weak"></span>−0.5 to −0.9</span>
          </div>
          <div class="roni-guide-row" role="row">
            <span role="cell"><span class="roni-guide-pill moderate">Moderate</span></span>
            <span role="cell">1.0°C – 1.4°C</span>
            <span role="cell"><span class="roni-guide-swatch nino moderate"></span>+1.0 to +1.4</span>
            <span role="cell"><span class="roni-guide-swatch nina moderate"></span>−1.0 to −1.4</span>
          </div>
          <div class="roni-guide-row" role="row">
            <span role="cell"><span class="roni-guide-pill strong">Strong</span></span>
            <span role="cell">1.5°C – 1.9°C</span>
            <span role="cell"><span class="roni-guide-swatch nino strong"></span>+1.5 to +1.9</span>
            <span role="cell"><span class="roni-guide-swatch nina strong"></span>−1.5 to −1.9</span>
          </div>
          <div class="roni-guide-row" role="row">
            <span role="cell"><span class="roni-guide-pill very-strong">Very Strong</span></span>
            <span role="cell">≥ 2.0°C</span>
            <span role="cell"><span class="roni-guide-swatch nino very-strong"></span>≥ +2.0</span>
            <span role="cell"><span class="roni-guide-swatch nina very-strong"></span>≤ −2.0</span>
          </div>
        </div>
        <ul class="roni-guide-bullets">
          <li>An El Niño or La Niña <strong>episode</strong> is declared when RONI stays at or beyond <strong>±0.5°C</strong> for at least <strong>five consecutive overlapping seasons</strong>.</li>
          <li>Intensity on the charts uses the year’s (or period’s) <strong>peak |RONI|</strong> within that episode window.</li>
          <li>Quarter/semester expand views shade each period from its mean RONI (±0.5°C threshold).</li>
        </ul>
        <p class="roni-guide-source">
          Source:
          <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/" target="_blank" rel="noopener noreferrer">NOAA CPC Relative Oceanic Niño Index (RONI)</a>
        </p>
      </div>
      <div class="app-modal-analysis-footer">
        <button type="button" class="app-modal-btn app-modal-btn-secondary" data-roni-guide-dismiss="true">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openRoniGuideModal() {
  const modal = ensureRoniGuideModal();
  if (!modal.hidden) return;

  const previouslyFocused = document.activeElement;
  const close = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modal.removeEventListener("keydown", onKeyDown);
    modal.querySelectorAll("[data-roni-guide-dismiss]").forEach((el) => {
      el.removeEventListener("click", onDismiss);
    });
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };
  const onDismiss = () => close();
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  modal.querySelectorAll("[data-roni-guide-dismiss]").forEach((el) => {
    el.addEventListener("click", onDismiss);
  });
  modal.addEventListener("keydown", onKeyDown);
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector(".app-modal-close")?.focus();
}

function bindEnsoGuideTriggers(root = document) {
  root.querySelectorAll("[data-enso-guide-open]").forEach((btn) => {
    if (btn.dataset.ensoGuideBound === "1") return;
    btn.dataset.ensoGuideBound = "1";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openRoniGuideModal();
    });
  });
}

let ensoLoadPromise = null;

async function loadEnso({ force = false } = {}) {
  if (!wantsEnsoOverlay()) return;
  const hasCore = ensoByYear && Object.keys(ensoByYear).length > 0;
  const hasOutlook = ensoOutlookByQuarter && Object.keys(ensoOutlookByQuarter).length > 0;
  if (!force && hasCore && hasOutlook) return;
  if (!force && ensoLoadPromise) return ensoLoadPromise;

  ensoLoadPromise = (async () => {
    try {
      const data = await api("/api/enso");
      ensoByYear = data?.years || {};
      ensoByQuarter = data?.quarters || {};
      ensoBySemester = data?.semesters || {};
      ensoOutlookByQuarter = data?.outlook?.quarters || {};
      ensoSourceLabel = data?.source_label || "NOAA CPC RONI";
      ensureEnsoLegend();
      pruneChartExpandEnsoLegends();
    } catch (err) {
      console.warn("ENSO overlay unavailable:", err);
      ensoByYear = {};
      ensoByQuarter = {};
      ensoBySemester = {};
      ensoOutlookByQuarter = {};
    } finally {
      ensoLoadPromise = null;
    }
  })();
  return ensoLoadPromise;
}

const progressiveLineRevealPlugin = {
  id: "progressiveLineReveal",
  beforeDatasetsDraw(chart, _args, options) {
    if (!options?.enabled) return;
    const progress = chart.$lineRevealProgress;
    if (progress == null || progress >= 1) return;
    const area = chart.chartArea;
    if (!area) return;
    const { ctx } = chart;
    ctx.save();
    chart.$lineRevealClipped = true;
    const width = Math.max(0, (area.right - area.left) * progress);
    ctx.beginPath();
    ctx.rect(area.left - 2, area.top - 10, width + 4, area.bottom - area.top + 20);
    ctx.clip();
  },
  afterDatasetsDraw(chart) {
    if (!chart.$lineRevealClipped) return;
    chart.ctx.restore();
    chart.$lineRevealClipped = false;
  },
};

function startLineReveal(chart, duration = 1080) {
  if (!chart) return;
  if (chart.$lineRevealRaf) {
    cancelAnimationFrame(chart.$lineRevealRaf);
    chart.$lineRevealRaf = 0;
  }
  if (prefersReducedMotion()) {
    chart.$lineRevealProgress = 1;
    chart.$growthExtrasReady = true;
    return;
  }
  chart.$lineRevealProgress = 0;
  chart.$growthExtrasReady = false;
  chart.$peakPulseActive = false;
  const start = performance.now();
  const tick = (now) => {
    if (!chart.canvas?.isConnected) {
      chart.$lineRevealRaf = 0;
      return;
    }
    const t = Math.min(1, (now - start) / duration);
    chart.$lineRevealProgress = 1 - (1 - t) ** 4;
    chart.draw();
    if (t < 1) {
      chart.$lineRevealRaf = requestAnimationFrame(tick);
      return;
    }
    chart.$lineRevealProgress = 1;
    chart.$lineRevealRaf = 0;
    chart.$growthExtrasReady = true;
    chart.draw();
  };
  chart.$lineRevealRaf = requestAnimationFrame(tick);
}

const peakYearEffectPlugin = {
  id: "peakYearEffect",
  afterDatasetsDraw(chart, _args, options) {
    if (!options?.enabled) return;

    const targetIndexes = [];
    if (options.allDatasets) {
      chart.data.datasets.forEach((dataset, index) => {
        if (
          dataset &&
          ((dataset.peakIndex != null && dataset.peakIndex >= 0) ||
            (dataset.lowIndex != null && dataset.lowIndex >= 0))
        ) {
          targetIndexes.push(index);
        }
      });
    } else {
    let datasetIndex = options.datasetIndex;
    if (datasetIndex == null) {
      datasetIndex = chart.data.datasets.findIndex(
        (d) =>
          d &&
          ((d.peakIndex != null && d.peakIndex >= 0) ||
            (d.lowIndex != null && d.lowIndex >= 0))
      );
    }
      if (datasetIndex >= 0) targetIndexes.push(datasetIndex);
    }
    if (!targetIndexes.length) return;

    const area = chart.chartArea;
    const ctx = chart.ctx;
    const forcedBar = options.mode === "bar";
    const barMode = (dataset) =>
      forcedBar ||
      dataset?.type === "bar" ||
      ((dataset?.type == null || dataset?.type === "") && chart.config.type === "bar");
    const anyBarTarget = targetIndexes.some((index) => barMode(chart.data.datasets[index]));
    const anyLineTarget = targetIndexes.some((index) => !barMode(chart.data.datasets[index]));

    if (options.waitForReady && !chart.$growthExtrasReady) return;

    const clusterPeakIndex = chart.$clusterPeakIndex;
    if (
      anyBarTarget &&
      options.clusterTotalPeak &&
      clusterPeakIndex != null &&
      clusterPeakIndex >= 0
    ) {
      const bars = targetIndexes
        .map((index) => chart.getDatasetMeta(index)?.data?.[clusterPeakIndex])
        .filter((bar) => bar && !bar.skip);
      if (bars.length) {
        const props = bars.map((bar) => bar.getProps(["x", "width"], true));
        const left = Math.min(...props.map((p) => p.x - p.width / 2));
        const right = Math.max(...props.map((p) => p.x + p.width / 2));
        const pad = 6;
        ctx.save();
        ctx.fillStyle = "rgba(12, 26, 98, 0.06)";
        ctx.fillRect(left - pad, area.top, right - left + pad * 2, area.bottom - area.top);
        ctx.strokeStyle = "rgba(12, 26, 98, 0.28)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo((left + right) / 2, area.top);
        ctx.lineTo((left + right) / 2, area.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "600 9px Roboto, system-ui, sans-serif";
        ctx.fillStyle = "rgba(12, 26, 98, 0.78)";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("Peak year", (left + right) / 2, area.top - 2);
        ctx.restore();
      }
    }

    for (const datasetIndex of targetIndexes) {
      const dataset = chart.data.datasets[datasetIndex];
      const meta = chart.getDatasetMeta(datasetIndex);
      const peakRgb = options.colorFromDataset
        ? hexToRgbChannels(dataset?.backgroundColor)
        : "9, 102, 63";
      const lowRgb = options.colorFromDataset
        ? hexToRgbChannels(dataset?.backgroundColor)
        : "198, 40, 40";
      const peakCaption = options.peakCaption === false ? null : options.peakCaption || "Highest";
      const lowCaption = options.lowCaption === false ? null : options.lowCaption || "Lowest";

    const peakIndex = dataset?.peakIndex;
    if (peakIndex != null && peakIndex >= 0) {
      const peakPoint = meta?.data?.[peakIndex];
      if (peakPoint && !peakPoint.skip) {
          if (barMode(dataset)) {
          const value = Number(dataset.data[peakIndex]);
          drawBarExtremumEmphasis(ctx, area, peakPoint, {
              rgb: peakRgb,
              caption: peakCaption,
            valueIsPositive: !(value < 0),
          });
        } else {
          drawExtremumEffect(ctx, area, peakPoint, {
              caption: peakCaption,
            guide: { rgb: "6, 64, 43", baseAlpha: 0.18, pulseAlpha: 0.12 },
            glow: {
              rgb: "9, 102, 63",
              outerBase: 0.1,
              outerPulse: 0.08,
              innerBase: 0.16,
              innerPulse: 0.1,
            },
          });
        }
      }
    }

      if (options.skipLow) continue;
    const lowIndex = dataset?.lowIndex;
    if (lowIndex != null && lowIndex >= 0 && lowIndex !== peakIndex) {
      const lowPoint = meta?.data?.[lowIndex];
      if (lowPoint && !lowPoint.skip) {
          if (barMode(dataset)) {
          const value = Number(dataset.data[lowIndex]);
          drawBarExtremumEmphasis(ctx, area, lowPoint, {
              rgb: lowRgb,
              caption: lowCaption,
            valueIsPositive: !(value < 0),
          });
        } else {
          drawExtremumEffect(ctx, area, lowPoint, {
              caption: lowCaption,
            guide: { rgb: "198, 40, 40", baseAlpha: 0.14, pulseAlpha: 0.1 },
            glow: {
              rgb: "198, 40, 40",
              outerBase: 0.09,
              outerPulse: 0.07,
              innerBase: 0.14,
              innerPulse: 0.09,
            },
          });
          }
        }
      }
    }

    if (options.animate && anyLineTarget && !chart.$peakPulseActive) {
      chart.$peakPulseActive = true;
      let last = 0;
      const tick = (now) => {
        if (!chart.canvas?.isConnected || !chart.options?.plugins?.peakYearEffect?.enabled) {
          chart.$peakPulseActive = false;
          return;
        }
        if (now - last > 40) {
          last = now;
          // Avoid redraw while hovering — continuous draw was clearing hover markers
          const hovering = (chart.getActiveElements?.() || []).length > 0;
          if (!hovering) chart.draw();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  },
};

const barValueLabelsPlugin = {
  id: "barValueLabels",
  afterDatasetsDraw(chart, _args, options) {
    if (!options?.enabled) return;
    if (options.waitForReady && !chart.$growthExtrasReady) return;
    const { ctx } = chart;
    const dataset = chart.data.datasets?.[0];
    if (!dataset) return;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    const labelColor = options.color || "rgba(0, 0, 0, 0.78)";
    const peakIndex = dataset.peakIndex;
    const lowIndex = dataset.lowIndex;

    const unit = options.unit || "";
    const unitFont = options.unitFont || "500 8px Roboto, system-ui, sans-serif";
    const unitColor = options.unitColor || "rgba(74, 85, 120, 0.92)";

    ctx.save();
    ctx.textAlign = "center";

    meta.data.forEach((bar, index) => {
      if (!bar || bar.skip || !bar.getProps) return;
      const value = dataset.data[index];
      if (value == null || Number.isNaN(Number(value))) return;

      const num = Number(value);
      const props = bar.getProps(["x", "y", "base"], true);
      const label =
        typeof options.formatter === "function"
          ? options.formatter(num, index)
          : String(num);
      if (!label) return;

      // Leave room for Highest/Lowest captions drawn by the emphasis plugin
      const isExtremum = index === peakIndex || index === lowIndex;
      const unitGap = unit ? 10 : 0;
      const offset = (options.offset ?? 4) + unitGap + (isExtremum ? 16 : 0);
      const positive = num >= 0;
      ctx.font = options.font || "600 10px Roboto, system-ui, sans-serif";
      ctx.fillStyle = labelColor;
      if (positive) {
        ctx.textBaseline = "bottom";
        ctx.fillText(label, props.x, props.y - offset);
        if (unit) {
          ctx.font = unitFont;
          ctx.fillStyle = unitColor;
          ctx.fillText(unit, props.x, props.y - offset + unitGap);
        }
      } else {
        ctx.textBaseline = "top";
        ctx.fillText(label, props.x, props.y + offset);
        if (unit) {
          ctx.font = unitFont;
          ctx.fillStyle = unitColor;
          ctx.fillText(unit, props.x, props.y + offset + unitGap);
        }
      }
    });
    ctx.restore();
  },
};

if (typeof Chart !== "undefined") {
  try {
    Chart.register(progressiveLineRevealPlugin);
  } catch (_err) {
    // already registered
  }
  try {
    Chart.register(peakYearEffectPlugin);
  } catch (_err) {
    // already registered
  }
  try {
    Chart.register(ensoBandsPlugin);
  } catch (_err) {
    // already registered
  }
  try {
    Chart.register(barValueLabelsPlugin);
  } catch (_err) {
    // already registered
  }
}

function ensureCharts() {
  const grid = { color: "rgba(26, 46, 26, 0.08)", drawBorder: false };
  const tick = { color: "#4a5578", font: { size: 11, family: "Roboto" } };

  if (!trendChart) {
    const overlayTrend = wantsVolumeOverlay();
    const volumeOnly = CONFIG.showAreaYield === false && !overlayTrend;
    const axisTitle = {
      display: true,
      color: "#5f735f",
      font: { size: 11, family: "Roboto", weight: "500" },
    };
    trendChart = new Chart(document.getElementById("trendChart"), {
      type: volumeOnly ? "line" : "bar",
      data: { labels: [], datasets: [] },
      options: {
        ...chartAnimOptions(),
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 32, right: 12, bottom: 4, left: 4 },
        },
        interaction: { mode: "index", intersect: false },
        plugins: {
          peakYearEffect: {
            enabled: true,
            animate: true,
          },
          ensoBands: {
            enabled: false,
            byYear: {},
          },
          legend: {
            display: !volumeOnly,
            position: "bottom",
            align: "center",
            fullSize: false,
            labels: {
              padding: 8,
              font: { size: 11, family: "Roboto", weight: "500" },
              color: "#4a5578",
              usePointStyle: true,
              pointStyleWidth: 10,
              generateLabels: mixedTrendLegendLabels,
            },
          },
          tooltip: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
            padding: 8,
            titleFont: { size: 12, family: "Roboto" },
            bodyFont: { size: 11, family: "Roboto" },
            callbacks: volumeOnly
              ? volumeTimeSeriesTooltipCallbacks
              : {
                  ...mixedTrendTooltipCallbacks,
                  title(items) {
                    const item = items?.[0];
                    if (!item) return "";
                    const year = item.label;
                    const enso = ensoMetaForYear(year);
                    const phase = enso ? ensoPhaseLabel(enso.phase) : "";
                    const peak =
                      enso?.peak_roni != null
                        ? ` · RONI ${enso.peak_roni > 0 ? "+" : ""}${enso.peak_roni}°C`
                        : "";
                    if (item.dataset?.peakIndex === item.dataIndex) {
                      return phase ? `Year ${year} · Peak · ${phase}${peak}` : `Year ${year} · Peak`;
                    }
                    if (item.dataset?.lowIndex === item.dataIndex) {
                      return phase
                        ? `Year ${year} · Lowest · ${phase}${peak}`
                        : `Year ${year} · Lowest`;
                    }
                    return phase ? `Year ${year} · ${phase}${peak}` : `Year ${year}`;
                  },
                },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grace: volumeOnly ? "8%" : 0,
            border: { display: false },
            grid,
            title: overlayTrend
              ? {
                  ...axisTitle,
                  text: `Farmgate price (${metricUnit()})`,
                  padding: { bottom: 4 },
                }
              : volumeOnly
                ? {
                    ...axisTitle,
                    text: isPriceMode() ? `Farmgate price (${metricUnit()})` : "Production (MT)",
                  padding: { bottom: 4 },
                }
              : undefined,
            ticks: {
              ...tick,
              maxTicksLimit: volumeOnly ? 6 : 5,
              padding: 6,
              callback: (v) => (isPriceMode() || overlayTrend ? fmt.price(v) : fmt.compact(v)),
            },
          },
          y1: {
            display: !volumeOnly,
            position: "right",
            beginAtZero: true,
            border: { display: false },
            grid: { drawOnChartArea: false },
            title: overlayTrend
              ? {
                  ...axisTitle,
                  text: "Production (MT)",
                  padding: { top: 0, bottom: 4 },
                }
              : undefined,
            ticks: {
              ...tick,
              maxTicksLimit: 5,
              padding: 4,
              callback: (v) => fmt.compact(v),
            },
          },
          x: {
            border: { display: false },
            grid: volumeOnly
              ? { color: "rgba(26, 46, 26, 0.04)", drawBorder: false }
              : { display: false },
            title: volumeOnly
              ? {
                  display: true,
                  text: "Year",
                  color: "#5f735f",
                  font: { size: 11, family: "Roboto", weight: "500" },
                  padding: { top: 2 },
                }
              : undefined,
            ticks: {
              ...tick,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: volumeOnly ? 12 : 10,
              padding: volumeOnly ? 4 : 0,
            },
          },
        },
      },
    });
  }

  if (!volumeGrowthChart) {
    const growthCanvas = document.getElementById("volumeGrowthChart");
    if (growthCanvas) {
      volumeGrowthChart = new Chart(growthCanvas, {
        type: "bar",
        data: { labels: [], datasets: [] },
        options: {
          ...volumeGrowthAnimOptions(),
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 30, right: 14, bottom: 22, left: 8 },
          },
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            peakYearEffect: {
              enabled: true,
              mode: "bar",
              animate: false,
              waitForReady: true,
            },
            barValueLabels: {
              enabled: true,
              waitForReady: true,
              offset: 6,
              font: "600 11px Roboto, system-ui, sans-serif",
              color: "rgba(0, 0, 0, 0.78)",
              formatter(value) {
                const sign = value > 0 ? "+" : "";
                return `${sign}${fmt.score(value, { compact: false })}%`;
              },
            },
            tooltip: {
              usePointStyle: false,
              displayColors: false,
              padding: 10,
              backgroundColor: "rgba(26, 46, 26, 0.92)",
              titleColor: "#ffffff",
              bodyColor: "rgba(255, 255, 255, 0.92)",
              titleFont: { size: 12, family: "Roboto", weight: "600" },
              bodyFont: { size: 12, family: "Roboto" },
              cornerRadius: 4,
              caretPadding: 8,
              callbacks: {
                title(items) {
                  const item = items?.[0];
                  if (!item) return "";
                  const year = item.label;
                  const peakIndex = item.dataset?.peakIndex;
                  const lowIndex = item.dataset?.lowIndex;
                  if (peakIndex === item.dataIndex) return `Year ${year} · Peak`;
                  if (lowIndex === item.dataIndex) return `Year ${year} · Lowest`;
                  return `Year ${year}`;
                },
                label(ctx) {
                  const i = ctx.dataIndex;
                  const year = Number(ctx.label);
                  const prevYear = Number.isFinite(year) ? year - 1 : null;
                  const v = ctx.parsed.y;
                  const current = ctx.dataset?.currentVolumes?.[i];
                  const previous = ctx.dataset?.previousVolumes?.[i];
                  const variance = ctx.dataset?.variances?.[i];

                  const formatMt = (value, { signed = false } = {}) => {
                    if (value == null || Number.isNaN(Number(value))) return "—";
                    const num = Number(value);
                    const sign = signed && num > 0 ? "+" : "";
                    const amount = isPriceMode()
                      ? fmt.price(num)
                      : fmt.score(num, { compact: metricCompact() });
                    return `${sign}${amount} ${metricUnit()}`;
                  };

                  const lines = [];
                  if (v == null || Number.isNaN(v)) {
                    lines.push("YoY growth: —");
                  } else {
                    const sign = v > 0 ? "+" : "";
                    let growth = `YoY growth: ${sign}${fmt.score(v, { compact: false })}%`;
                    if (ctx.dataset?.peakIndex === i) growth += " · highest in range";
                    else if (ctx.dataset?.lowIndex === i) growth += " · lowest in range";
                    lines.push(growth);
                  }

                  const seriesNoun = isPriceMode() ? "Price" : "Production";
                  lines.push(
                    `${seriesNoun} (${Number.isFinite(year) ? year : "year"}): ${formatMt(current)}`
                  );
                  lines.push(
                    `${seriesNoun} (${prevYear != null ? prevYear : "prior"}): ${formatMt(previous)}`
                  );
                  lines.push(`Variance: ${formatMt(variance, { signed: true })}`);
                  return lines;
                },
              },
            },
          },
          scales: {
            y: {
              grace: "18%",
              border: { display: false },
              grid: {
                color: (ctx) =>
                  ctx.tick.value === 0
                    ? "rgba(26, 46, 26, 0.36)"
                    : "rgba(26, 46, 26, 0.06)",
                lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.75 : 1),
                drawBorder: false,
              },
              title: {
                display: true,
                text: "Growth rate (%)",
                color: "#5f735f",
                font: { size: 11, family: "Roboto", weight: "500" },
                padding: { bottom: 8 },
              },
              ticks: {
                ...tick,
                maxTicksLimit: 8,
                padding: 8,
                callback: (v) => `${fmt.score(v, { compact: false })}%`,
              },
            },
            x: {
              border: { display: false },
              grid: { display: false },
              title: {
                display: true,
                text: "Year",
                color: "#5f735f",
                font: { size: 11, family: "Roboto", weight: "500" },
                padding: { top: 6 },
              },
              ticks: {
                ...tick,
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 16,
                padding: 6,
              },
            },
          },
        },
      });
      volumeGrowthChart.$growthExtrasReady = true;
    }
  }

  if (!monthSeasonalityChart) {
    const monthCanvas = document.getElementById("monthSeasonalityChart");
    if (monthCanvas) {
      monthSeasonalityChart = new Chart(monthCanvas, {
        type: "bar",
        data: { labels: [], datasets: [] },
        options: {
          ...volumeGrowthAnimOptions(),
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 44, right: 12, bottom: 4, left: 4 },
          },
          interaction: { mode: "index", intersect: false },
          plugins: {
            progressiveLineReveal: { enabled: false },
            peakYearEffect: {
              enabled: true,
              mode: "bar",
              animate: false,
              waitForReady: true,
            },
            barValueLabels: {
              enabled: true,
              waitForReady: true,
              offset: 5,
              font: "600 10px Roboto, system-ui, sans-serif",
              color: "rgba(12, 26, 98, 0.82)",
              unit: metricUnit(),
              unitFont: "500 8px Roboto, system-ui, sans-serif",
              unitColor: "rgba(74, 85, 120, 0.92)",
              formatter(value) {
                if (!Number.isFinite(value) || value === 0) return "";
                return isPriceMode() ? fmt.price(value) : fmt.score(value, { compact: false });
              },
            },
            ensoBands: { enabled: false, byYear: {} },
            legend: { display: false },
            tooltip: {
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10,
              padding: 8,
              titleFont: { size: 12, family: "Roboto" },
              bodyFont: { size: 11, family: "Roboto" },
              callbacks: {
                title(items) {
                  const item = items?.[0];
                  if (!item) return "";
                  const month = item.label;
                  if (item.dataset?.peakIndex === item.dataIndex) return `${month} · Highest`;
                  if (item.dataset?.lowIndex === item.dataIndex) return `${month} · Lowest`;
                  return month;
                },
                label(ctx) {
                  const v = ctx.parsed.y;
                  if (v == null || Number.isNaN(v)) return `Average farmgate price: —`;
                  const exact = isPriceMode()
                    ? fmt.price(v)
                    : new Intl.NumberFormat("en-PH", {
                        useGrouping: true,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(v);
                  let text = `Average farmgate price: ${exact} ${metricUnit()}`;
                  if (ctx.dataset?.peakIndex === ctx.dataIndex) text += " · highest in range";
                  else if (ctx.dataset?.lowIndex === ctx.dataIndex) text += " · lowest in range";
                  return text;
                },
                labelPointStyle() {
                  return { pointStyle: "rect", rotation: 0 };
                },
                labelColor(ctx) {
                  let color = "#09663f";
                  if (ctx.dataset?.peakIndex === ctx.dataIndex) color = "#06402b";
                  else if (ctx.dataset?.lowIndex === ctx.dataIndex) color = "#c62828";
                  return {
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 0,
                  };
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: false,
              grace: "12%",
              border: { display: false },
              grid,
              title: {
                display: true,
                text: `Farmgate price (${metricUnit()})`,
                color: "#5f735f",
                font: { size: 11, family: "Roboto", weight: "500" },
                padding: { bottom: 4 },
              },
              ticks: {
                ...tick,
                maxTicksLimit: 6,
                padding: 6,
                callback: (v) => (isPriceMode() ? fmt.price(v) : fmt.score(v, { compact: false })),
              },
            },
            x: {
              border: { display: false },
              grid: { display: false },
              title: {
                display: true,
                text: isQuarterGrain() ? "Quarter" : "Month",
                color: "#5f735f",
                font: { size: 11, family: "Roboto", weight: "500" },
                padding: { top: 2 },
              },
              ticks: {
                ...tick,
                maxRotation: 0,
                autoSkip: false,
                padding: 4,
              },
            },
          },
        },
      });
    }
  }

  if (!subsectorVolumeChart) {
    const subsectorCanvas = document.getElementById("subsectorVolumeChart");
    if (subsectorCanvas) {
      subsectorVolumeChart = new Chart(subsectorCanvas, {
        type: "bar",
        data: { labels: [], datasets: [] },
        options: {
          ...subsectorVolumeAnimOptions(),
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 8, right: 10, bottom: 2, left: 4 },
          },
          interaction: { mode: "index", intersect: false },
          plugins: {
            peakYearEffect: {
              enabled: false,
            },
            ensoBands: {
              enabled: false,
              byYear: {},
            },
            legend: {
              display: true,
              position: "bottom",
              align: "center",
              fullSize: false,
              labels: {
                padding: 10,
                font: { size: 11, family: "Roboto", weight: "500" },
                color: "#4a5578",
                usePointStyle: true,
                pointStyleWidth: 12,
                generateLabels: subsectorLegendLabels,
              },
            },
            tooltip: {
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10,
              padding: 8,
              titleFont: { size: 12, family: "Roboto" },
              bodyFont: { size: 11, family: "Roboto" },
              callbacks: {
                title(items) {
                  const item = items?.[0];
                  if (!item) return "";
                  const year = item.label;
                  const enso = ensoMetaForYear(year);
                  const phase = enso ? ensoPhaseLabel(enso.phase) : "";
                  const peak =
                    enso?.peak_roni != null
                      ? ` · RONI ${enso.peak_roni > 0 ? "+" : ""}${enso.peak_roni}°C`
                      : "";
                  return phase ? `Year ${year} · ${phase}${peak}` : `Year ${year}`;
                },
                label(ctx) {
                  const v = ctx.parsed.y;
                  if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
                  if (isPriceMode()) {
                    return `${ctx.dataset.label}: ${fmt.price(v)} ${metricUnit()}`;
                  }
                  const exact = new Intl.NumberFormat("en-PH", {
                    useGrouping: true,
                    maximumFractionDigits: 6,
                  }).format(v);
                  return `${ctx.dataset.label}: ${exact} ${metricUnit()}`;
                },
                labelColor(ctx) {
                  const color = ctx.dataset.backgroundColor;
                  return { borderColor: color, backgroundColor: color, borderWidth: 0 };
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              stacked: false,
              border: { display: false },
              grid,
              title: {
                display: true,
                text: isPriceMode() ? `Farmgate price (${metricUnit()})` : "Production (MT)",
                color: "#5f735f",
                font: { size: 11, family: "Roboto", weight: "500" },
                padding: { bottom: 4 },
              },
              ticks: {
                ...tick,
                maxTicksLimit: 6,
                padding: 6,
                callback: (v) => (isPriceMode() ? fmt.price(v) : fmt.compact(v)),
              },
            },
            x: {
              stacked: false,
              border: { display: false },
              grid: { display: false },
              title: {
                display: true,
                text: "Year",
                color: "#5f735f",
                font: { size: 11, family: "Roboto", weight: "500" },
                padding: { top: 2 },
              },
              ticks: {
                ...tick,
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 12,
                padding: 4,
              },
            },
          },
        },
      });
    }
  }

  if (!yieldTrendChart) {
    const yieldCanvas = document.getElementById("yieldTrendChart");
    if (yieldCanvas) {
    yieldTrendChart = new Chart(yieldCanvas, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        ...chartAnimOptions(),
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 2, right: 2, bottom: 0, left: 2 },
        },
        interaction: { mode: "index", intersect: false },
        plugins: {
          peakYearEffect: {
            enabled: true,
            animate: true,
          },
          ensoBands: {
            enabled: false,
            byYear: {},
          },
          legend: {
            position: "bottom",
            align: "center",
            fullSize: false,
            labels: {
              padding: 8,
              font: { size: 11, family: "Roboto", weight: "500" },
              color: "#4a5578",
              usePointStyle: true,
              pointStyleWidth: 10,
              generateLabels: lineLegendLabels,
            },
          },
          tooltip: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
            padding: 8,
            titleFont: { size: 12, family: "Roboto" },
            bodyFont: { size: 11, family: "Roboto" },
            callbacks: {
              ...lineTooltipCallbacks,
              title(items) {
                const item = items?.[0];
                if (!item) return "";
                const year = item.label;
                const enso = ensoMetaForYear(year);
                const phase = enso ? ensoPhaseLabel(enso.phase) : "";
                const peak =
                  enso?.peak_roni != null
                    ? ` · RONI ${enso.peak_roni > 0 ? "+" : ""}${enso.peak_roni}°C`
                    : "";
                if (item.dataset?.peakIndex === item.dataIndex) {
                  return phase ? `Year ${year} · Peak · ${phase}${peak}` : `Year ${year} · Peak`;
                }
                if (item.dataset?.lowIndex === item.dataIndex) {
                  return phase
                    ? `Year ${year} · Lowest · ${phase}${peak}`
                    : `Year ${year} · Lowest`;
                }
                return phase ? `Year ${year} · ${phase}${peak}` : `Year ${year}`;
              },
              label(ctx) {
                const v = ctx.parsed.y;
                if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
                const base = `${ctx.dataset.label}: ${fmt.score(v, { compact: false })} MT/ha`;
                if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
                if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
                return base;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            border: { display: false },
            grid,
            ticks: {
              ...tick,
              maxTicksLimit: 5,
              padding: 4,
              callback: (v) => fmt.score(v, { compact: false }),
            },
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: {
              ...tick,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              padding: 0,
            },
          },
        },
      },
    });
    }
  }

  if (!ecosystemTrendChart) {
    const ecosystemCanvas = document.getElementById("ecosystemTrendChart");
    if (ecosystemCanvas) {
    ecosystemTrendChart = new Chart(ecosystemCanvas, {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: {
        ...chartAnimOptions(),
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 2, right: 2, bottom: 0, left: 2 },
        },
        interaction: { mode: "index", intersect: false },
        plugins: {
          ensoBands: {
            enabled: false,
            byYear: {},
          },
          legend: {
            position: "bottom",
            align: "center",
            fullSize: false,
            labels: {
              padding: 8,
              font: { size: 11, family: "Roboto", weight: "500" },
              color: "#4a5578",
              usePointStyle: true,
              pointStyleWidth: 10,
              generateLabels: ecosystemLegendLabels,
            },
          },
          tooltip: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
            padding: 8,
            titleFont: { size: 12, family: "Roboto" },
            bodyFont: { size: 11, family: "Roboto" },
            callbacks: {
              ...ecosystemTooltipCallbacks,
              title(items) {
                const item = items?.[0];
                if (!item) return "";
                const year = item.label;
                const enso = ensoMetaForYear(year);
                const phase = enso ? ensoPhaseLabel(enso.phase) : "";
                const peak =
                  enso?.peak_roni != null
                    ? ` · RONI ${enso.peak_roni > 0 ? "+" : ""}${enso.peak_roni}°C`
                    : "";
                return phase ? `Year ${year} · ${phase}${peak}` : `Year ${year}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid,
            ticks: {
              ...tick,
              maxTicksLimit: 5,
              padding: 4,
              callback: (v) => fmt.score(v, { compact: false }),
            },
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: {
              ...tick,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              padding: 0,
            },
          },
        },
      },
    });
    }
  }
}

function updateComparisonLabels(cmp) {
  const root = document.getElementById("productionComparison");
  if (!root || !cmp) return;
  const yTo = cmp.year_to;
  const yFrom = cmp.year_from;
  const title = document.getElementById("productionComparisonLabel");
  if (title && yTo != null && yFrom != null) {
    title.textContent = `${isPriceMode() ? metricTitle() : "Production"} · ${yTo} vs ${yFrom}`;
  }
  const toLabel = root.querySelector('[data-cmp-year="to"]');
  const fromLabel = root.querySelector('[data-cmp-year="from"]');
  const varianceMeta = root.querySelector("[data-cmp-variance-meta]");
  if (toLabel && yTo != null) toLabel.textContent = String(yTo);
  if (fromLabel && yFrom != null) fromLabel.textContent = String(yFrom);
  if (varianceMeta && yTo != null && yFrom != null) {
    varianceMeta.textContent = `${yTo} − ${yFrom}`;
  }
}

function renderPriorityCropCards(rows) {
  const priorityRows = rows || [];
  latestPriorityCropGroups = priorityRows.map((r) => r.crop_group);
  const track = document.getElementById("priorityCropsTrack");
  if (track) {
    const topN = CONFIG.priorityCropTopN || 3;
    const items = priorityRows.slice(0, topN);
    if (!items.length) {
      track.innerHTML =
        '<article class="score-card"><span class="score-meta">No commodity data for the current filters.</span></article>';
      return;
    }
    track.innerHTML = items
      .map((row, i) => {
        const shareHtml =
          isPriceMode() || row.share_pct == null
            ? isPriceMode()
              ? "Highest average farmgate price"
              : "No share of total"
            : `<span class="score-meta-emphasis">${escapeHtml(
                fmt.score(row.share_pct, { compact: false })
              )}%</span> of total production`;
        return `<article class="score-card" data-priority-crop="${escapeAttr(row.crop_group)}">
      <span class="score-label"><span class="score-label-rank" aria-hidden="true">#${i + 1}</span> ${escapeHtml(
          row.crop_group
        )}</span>
      <div class="score-body">
        <div class="score-metric">
          <strong class="score-value">${escapeHtml(fmt.score(row.volume_mt_avg, { compact: metricCompact() }))}</strong>
          <span class="score-unit">${escapeHtml(metricUnit())}</span>
        </div>
        <span class="score-meta" data-priority-hint>${shareHtml}</span>
      </div>
    </article>`;
      })
      .join("");
    return;
  }

  for (const row of priorityRows) {
    const card = document.querySelector(
      `[data-priority-crop="${CSS.escape(row.crop_group)}"]`
    );
    const el =
      card?.querySelector(".score-value") ||
      document.getElementById(
        `kpiPriority${String(row.crop_group).replace(/[^A-Za-z0-9]+/g, "")}`
      );
    if (el) setCompactScore(el, row.volume_mt_avg);
    const hintEl = card?.querySelector("[data-priority-hint]");
    if (hintEl) {
      if (row.share_pct == null) {
        hintEl.textContent = "No share of total";
      } else {
        const pct = fmt.score(row.share_pct, { compact: false });
        hintEl.innerHTML = `<span class="score-meta-emphasis">${escapeHtml(
          pct
        )}%</span> of total production`;
      }
    }
  }
}

async function refreshDashboard() {
  const refreshSeq = ++dashboardRefreshSeq;
  if (hasCommodityBoard() && !selectedFarmgateCommodity) {
    await refreshFarmgateOverview();
    return;
  }
  ensureCharts();
  const base = commonParams();
  const { year_from, year_to } = getYearRange();
  const wantsVolumeGrowth = Boolean(document.getElementById("volumeGrowthChart"));
  const wantsRegionEcosystem = Boolean(els.regionEcosystemTableBody);
  const wantsSubsectorVolume = Boolean(
    els.subsectorVolumeTableBody || document.getElementById("subsectorVolumeChart")
  );
  const wantsMonthSeasonality = Boolean(document.getElementById("monthSeasonalityChart"));
  const wantsProvinceVolume = Boolean(els.provinceVolumeTableBody);
  const wantsRegionAnnual = Boolean(els.regionAnnualTableBody);
  const previewLite = PREVIEW_EMBED;
  const seriesParams = wantsVolumeGrowth
    ? { ...base, year_from: Math.max(yearBounds.min, year_from - 1) }
    : base;

  const compareParams = {
    ...base,
    year_from: Math.max(yearBounds.min, year_to - 1),
    year_to,
  };
  const [kpi, series, ecosystemSeries, ecoCompare, regionCompare, regionEcosystem, provinceCompare, subsectorCompare, monthSeries, overlayVolume, regionAnnual] =
    await Promise.all([
      api(`/api/kpis?${qs(base)}`),
      api(`/api/series?${qs(seriesParams)}`),
      api(`/api/series-by-ecosystem?${qs(base)}`),
      api(`/api/series-by-ecosystem?${qs(compareParams)}`),
      api(`/api/series-by-region?${qs(isPriceMode() ? base : compareParams)}`),
      wantsRegionEcosystem && !previewLite
        ? api(`/api/by-region-ecosystem?${qs(base)}`)
        : Promise.resolve({ rows: [] }),
      wantsProvinceVolume && !previewLite
        ? api(`/api/series-by-province?${qs(compareParams)}`)
        : Promise.resolve({ points: [] }),
      wantsSubsectorVolume && !previewLite
        ? api(`/api/series-by-ecosystem?${qs({ ...base, split_by: "crop_subtype" })}`)
        : Promise.resolve({ points: [] }),
      wantsMonthSeasonality && !previewLite
        ? api(`/api/series-by-month?${qs(base)}`)
        : Promise.resolve({ points: [] }),
      wantsVolumeOverlay() && !previewLite
        ? api(`/api/overlay-volume?${qs(base)}`).catch(() => ({ points: [] }))
        : Promise.resolve({ points: [] }),
      wantsRegionAnnual && !previewLite
        ? api(`/api/annual-by-region?${qs(base)}`)
        : Promise.resolve({ years: [], points: [], province_points: [] }),
    ]);

  if (refreshSeq !== dashboardRefreshSeq) return;

  if (hasCommodityBoard() && selectedFarmgateCommodity) {
    await refreshFarmgateAnalysisScores();
  }

  setCompactScore(els.kpiVolume, kpi.volume_mt_avg);
  if (CONFIG.showAreaYield !== false) {
    setCompactScore(els.kpiArea, kpi.area_ha_avg);
    setCompactScore(els.kpiYield, kpi.yield_mt_ha, { compact: false });
  }
  const nYears = kpi.year_count || year_to - year_from + 1;
  const hint =
    nYears === 1
      ? `${year_from} · 1 year`
      : isPriceMode()
        ? `${year_from}–${year_to} · Unweighted average`
      : `${year_from}–${year_to} · Average of ${fmt.number(nYears)} years`;
  if (els.kpiVolumeHint) els.kpiVolumeHint.textContent = hint;
  if (CONFIG.showAreaYield !== false && els.kpiAreaHint) els.kpiAreaHint.textContent = hint;

  renderPriorityCropCards(kpi.by_priority_crop || []);

  const bySubtype = kpi.by_subtype || [];
  if (IS_MULTI_CROP) {
    setSubtypePairFromKpi(bySubtype);
    SUBTYPE_VALUES = chartSeriesValues();
  }
  if (CONFIG.showSubtypeAverages !== false) {
    const subtypeA = bySubtype.find((r) => r.crop_subtype === SUBTYPE_A.value) || bySubtype[0] || {};
    const subtypeB = bySubtype.find((r) => r.crop_subtype === SUBTYPE_B.value) || bySubtype[1] || {};
    if (els.kpiIrrigated) setCompactScore(els.kpiIrrigated, subtypeA.volume_mt_avg);
    if (els.kpiRainfed) setCompactScore(els.kpiRainfed, subtypeB.volume_mt_avg);
    if (els.kpiIrrigatedShare) {
      els.kpiIrrigatedShare.textContent =
        subtypeA.share_pct == null
          ? "No share"
          : `${fmt.score(subtypeA.share_pct, { compact: false })}% of total production`;
    }
    if (els.kpiRainfedShare) {
      els.kpiRainfedShare.textContent =
        subtypeB.share_pct == null
          ? "No share"
          : `${fmt.score(subtypeB.share_pct, { compact: false })}% of total production`;
    }
    const shareA = subtypeA.share_pct ?? 0;
    const shareB = subtypeB.share_pct ?? 0;
    if (els.subtypeBarIrrigated) {
      els.subtypeBarIrrigated.style.width = `${shareA}%`;
      els.subtypeBarIrrigated.style.background = SUBTYPE_A.color;
    }
    if (els.subtypeBarRainfed) {
      els.subtypeBarRainfed.style.width = `${shareB}%`;
      els.subtypeBarRainfed.style.background = SUBTYPE_B.color;
    }
    if (els.subtypeBarHint) {
      els.subtypeBarHint.textContent =
        subtypeA.share_pct == null && subtypeB.share_pct == null
          ? `No ${CONFIG.subtypeNoun} split`
          : `${SUBTYPE_A.label} ${fmt.score(shareA, { compact: false })}% · ${SUBTYPE_B.label} ${fmt.score(shareB, { compact: false })}%`;
    }
  }

  const cmp = kpi.comparison || {};
  updateComparisonLabels(cmp);
  setCompactScore(els.cmpVolume2025, cmp.volume_mt_to);
  setCompactScore(els.cmpVolume2024, cmp.volume_mt_from);
  setSigned(els.cmpVariance, cmp.variance_mt, { card: els.cmpVarianceCard });
  setSigned(els.cmpGrowth, cmp.growth_rate_pct, {
    asPercent: true,
    card: els.cmpGrowthCard,
  });

  const seriesPoints = series.points || [];
  const points = wantsVolumeGrowth
    ? seriesPoints.filter((p) => {
        const year = Number(p.year);
        return year >= year_from && year <= year_to;
      })
    : seriesPoints;
  trendChart.data.labels = points.map((p) => p.year);
  if (wantsVolumeOverlay()) {
    const pointCount = points.length;
    const prices = points.map((p) => numericChartValue(p.volume_mt));
    const peakIndex = peakValueIndex(prices, { ignoreZero: true });
    const lowIndex = lowValueIndex(prices, { ignoreZero: true });
    const overlayByYear = new Map(
      (overlayVolume.points || []).map((row) => [Number(row.year), Number(row.volume_mt)])
    );
    const overlayValues = points.map((p) => {
      const value = overlayByYear.get(Number(p.year));
      return Number.isFinite(value) ? value : null;
    });
    trendChart.data.datasets = [
      {
        type: "bar",
        label: "Production volume (MT)",
        data: overlayValues,
        backgroundColor: "rgba(154, 232, 86, 0.38)",
        hoverBackgroundColor: "rgba(154, 232, 86, 0.55)",
        borderColor: "rgba(154, 232, 86, 0.38)",
        borderWidth: 0,
        borderRadius: 3,
        maxBarThickness: 28,
        categoryPercentage: 0.72,
        barPercentage: 0.88,
        yAxisID: "y1",
        order: 1,
        unit: "MT",
      },
      {
        type: "line",
        label: `Farmgate price (${metricUnit()})`,
        data: prices,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.12)",
        tension: 0.3,
        fill: false,
        ...brokenLineOptions(),
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2.5,
        yAxisID: "y",
        order: 0,
        unit: metricUnit(),
      },
    ];
  } else if (CONFIG.showAreaYield === false) {
    const pointCount = points.length;
    const volumes = points.map((p) => numericChartValue(p.volume_mt));
    const peakIndex = peakValueIndex(volumes, { ignoreZero: isPriceMode() });
    const lowIndex = lowValueIndex(volumes, { ignoreZero: isPriceMode() });
    trendChart.data.datasets = [
      {
        type: "line",
        label: isPriceMode() ? metricTitle() : "Production volume",
        data: volumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.14)",
        tension: 0.3,
        fill: isPriceMode() ? false : true,
        ...(isPriceMode() ? brokenLineOptions() : { spanGaps: true }),
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2.5,
        yAxisID: "y",
      },
    ];
  } else {
    const pointCount = points.length;
    const volumes = points.map((p) => p.volume_mt);
    const peakIndex = peakValueIndex(volumes);
    const lowIndex = lowValueIndex(volumes);
    trendChart.data.datasets = [
      {
        type: "bar",
        label: "Area harvested (ha)",
        data: points.map((p) => p.area_ha),
        backgroundColor: "#9ae856",
        hoverBackgroundColor: "#9ae856",
        borderColor: "#9ae856",
        borderWidth: 0,
        borderRadius: 3,
        maxBarThickness: 22,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
        yAxisID: "y1",
        order: 1,
      },
      {
        type: "line",
        label: "Volume (MT)",
        data: volumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.12)",
        tension: 0.25,
        fill: false,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2,
        yAxisID: "y",
        order: 0,
      },
    ];
  }
  applyEnsoBands(trendChart);
  updateChart(trendChart);
  if (els.trendChartSub) {
    els.trendChartSub.textContent = isPriceMode()
      ? buildFarmgateTrendSummary(points, overlayVolume?.points || [])
      : productionChartInsight(buildTrendSummary(points), points, {
          metricLabel: "production volume",
          unit: "MT",
          compact: true,
        });
  }
  renderVolumeGrowthChart(seriesPoints);

  if (yieldTrendChart) {
    const yields = points.map((p) => yieldForPoint(p));
    const pointCount = points.length;
    const peakIndex = peakValueIndex(yields);
    const lowIndex = lowValueIndex(yields);
    yieldTrendChart.data.labels = points.map((p) => p.year);
    yieldTrendChart.data.datasets = [
      {
        type: "line",
        label: "Yield (MT/ha)",
        data: yields,
        borderColor: "#06402b",
        backgroundColor: "rgba(6, 64, 43, 0.12)",
        tension: 0.25,
        fill: true,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#06402b", { pointCount, peakIndex }),
        borderWidth: 2,
      },
    ];
    applyEnsoBands(yieldTrendChart);
    updateChart(yieldTrendChart);
  }
  if (els.yieldTrendChartSub) {
    els.yieldTrendChartSub.textContent = productionChartInsight(
      buildYieldTrendSummary(points),
      points,
      {
        metricLabel: "yield",
        unit: "MT/ha",
        compact: false,
        valueFn: (p) => yieldForPoint(p),
      }
    );
  }

  ecosystemSeriesPoints = isCropFilterNarrowed()
    ? filterSeriesPointsByCrop(ecosystemSeries.points || [])
    : ecosystemSeries.points || [];
  renderEcosystemTrendChart();

  const ecoComparePoints = isCropFilterNarrowed()
    ? filterSeriesPointsByCrop(ecoCompare.points || [])
    : ecoCompare.points || [];
  renderEcosystemVolumeTable(year_to, ecoComparePoints);
  subsectorSeriesPoints = subsectorCompare.points || [];
  renderSubsectorVolumeChart();
  renderSubsectorVolumeTable(year_to, subsectorSeriesPoints);
  monthSeasonalityPoints = monthSeries.points || [];
  renderMonthSeasonalityChart(monthSeasonalityPoints, year_from, year_to);
  renderRegionVolumeTable(year_to, regionCompare.points || [], {
    asOf: regionCompare.as_of,
    previous: regionCompare.previous,
    provincePoints: regionCompare.province_points || [],
  });
  renderRegionAnnualTable(regionAnnual);
  provinceComparePoints = provinceCompare.points || [];
  renderProvinceVolumeTableFromCache();
  regionEcosystemRows = regionEcosystem.rows || [];
  renderRegionEcosystemTable();

  dashboardSnapshot = {
    generatedAt: Date.now(),
    year_from,
    year_to,
    kpi,
    seriesPoints: points,
    seriesPointsForGrowth: seriesPoints,
    ecoComparePoints,
    regionComparePoints: regionCompare.points || [],
    regionCompareAsOf: regionCompare.as_of || null,
    regionComparePrevious: regionCompare.previous || null,
    regionProvincePoints: regionCompare.province_points || [],
    provinceComparePoints: provinceCompare.points || [],
    regionEcosystemRows: regionEcosystem.rows || [],
    monthSeasonalityPoints: monthSeasonalityPoints,
    overlayVolumePoints: overlayVolume?.points || [],
    regionAnnual,
    farmgateItem: selectedFarmgateItem,
    farmgatePeriod: farmgateBoardPeriod,
    farmgateBoardItems: farmgateBoardItems,
  };
  signalPreviewReady();
}

async function pollRefreshStatus() {
  try {
    const state = await api("/api/refresh/status");
    renderStatus(state);
    if (state.status === "ok") {
      const health = await api("/api/health");
      const datasetHealth = health.datasets?.[DATASET];
      const dbReady = datasetHealth?.ready ?? health.db_exists;
      if (!dbReady) return;
      clearInterval(pollTimer);
      pollTimer = null;
      await loadMeta();
      await refreshDashboard();
    }
    if (state.status === "error") {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  } catch (err) {
    renderStatus({ status: "error", message: err.message });
  }
}

async function triggerRefresh() {
  renderStatus({ status: "running", message: "Refreshing…" });
  await api("/api/refresh", { method: "POST" });
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollRefreshStatus, 2500);
}

function markActiveFilterIcons() {
  document.querySelectorAll(".filter-field").forEach((field) => {
    const key = field.dataset.filter;
    if (key === "year") {
      const { year_from, year_to } = getYearRange();
      const narrowed = year_from !== yearBounds.min || year_to !== defaultYearTo();
      field.classList.toggle("is-active", narrowed);
      return;
    }
    const multi = field.querySelector(".multi-select");
    if (multi) {
      field.classList.toggle("is-active", isPartialMultiSelect(multi));
      return;
    }
    const select = field.querySelector("select");
    if (!select) return;
    field.classList.toggle("is-active", Boolean(select.value));
  });
  renderFilterSummary();
}

function multiSelectDisplay(groupEl, { formatLabel = (v) => v, maxNames = 2 } = {}) {
  if (!groupEl) return { text: "All", narrowed: false };
  const boxes = [...groupEl.querySelectorAll('input[type="checkbox"]')];
  if (!boxes.length) return { text: "All", narrowed: false };
  const selected = boxes.filter((b) => b.checked);
  if (!selected.length || selected.length === boxes.length) {
    return { text: "All", narrowed: false };
  }
  const labels = selected.map((b) => formatLabel(b.value));
  if (labels.length <= maxNames) {
    return { text: labels.join(", "), narrowed: true };
  }
  return { text: `${labels.length} selected`, narrowed: true };
}

function renderFilterSummary() {
  const host = els.filterSummaryChips;
  if (!host) return;

  const { year_from, year_to } = getYearRange();
  const yearNarrowed = year_from !== yearBounds.min || year_to !== defaultYearTo();
  const yearText =
    year_from === year_to ? String(year_from) : `${year_from} – ${year_to}`;

  const quarter = multiSelectDisplay(els.quarter, {
    formatLabel: (v) => `Q${v}`,
    maxNames: 4,
  });
  const semester = multiSelectDisplay(els.semester, {
    formatLabel: (v) => `S${v}`,
    maxNames: 2,
  });
  const ecosystem = multiSelectDisplay(els.crop, { maxNames: 2 });
  const region = multiSelectDisplay(els.region, { maxNames: 2 });
  const province = multiSelectDisplay(els.province, { maxNames: 2 });
  const month = multiSelectDisplay(els.month, {
    formatLabel: (v) => monthShort(v),
    maxNames: 3,
  });

  const chips = [
    { label: "Year", text: yearText, narrowed: yearNarrowed },
    ...(els.month ? [{ label: "Month", ...month }] : []),
    { label: "Quarter", ...quarter },
    { label: "Semester", ...semester },
    { label: filterDimLabel(), ...ecosystem },
    { label: "Region", ...region },
    { label: "Province", ...province },
  ];

  host.innerHTML = chips
    .map(
      (chip) =>
        `<span class="filter-summary-chip${chip.narrowed ? " is-narrowed" : ""}"><span class="filter-summary-chip-label">${escapeHtml(
          chip.label
        )}</span><span class="filter-summary-chip-value">${escapeHtml(chip.text)}</span></span>`
    )
    .join("");
}

function scheduleYearRefresh() {
  syncYearRangeUI();
  markActiveFilterIcons();
  if (yearRefreshTimer) clearTimeout(yearRefreshTimer);
  yearRefreshTimer = setTimeout(() => {
    yearRefreshTimer = null;
    refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
  }, 180);
}

function applyDashboardConfig() {
  if (PREVIEW_EMBED) {
    document.documentElement.classList.add("dashboard-preview-embed");
    const layout = document.getElementById("appLayout");
    layout?.classList.add("sidebar-collapsed");
  }
  document.title = CONFIG.title;
  const titleEl = document.getElementById("dashboardTitle");
  if (titleEl) titleEl.textContent = CONFIG.title;
  const footerProduct = document.getElementById("footerProductName");
  if (footerProduct) footerProduct.textContent = "Data Analytics Platform (PSA OpenSTAT)";
  document.body.classList.toggle("is-price-dashboard", isPriceMode());
  if (!showShareColumn()) {
    document.querySelectorAll('th[data-sort-key="share"]').forEach((th) => {
      th.hidden = true;
    });
  }

  document.querySelectorAll(".score-unit").forEach((el) => {
    if (el.textContent.trim() === "%" || el.closest("#cmpGrowthCard")) return;
    if (isPriceMode()) el.textContent = metricUnit();
  });
  const kpiVolumeLabel = document.querySelector("#kpiVolume")?.closest(".score-card")?.querySelector(".score-label");
  if (kpiVolumeLabel && isPriceMode()) kpiVolumeLabel.textContent = "Avg farmgate price";
  const comparisonLabel = document.getElementById("productionComparisonLabel");
  if (comparisonLabel && isPriceMode()) comparisonLabel.textContent = "Farmgate price · Year-over-year";
  document.querySelectorAll(".score-group-compare .score-meta").forEach((el) => {
    if (isPriceMode() && /Total Production Volume/i.test(el.textContent)) {
      el.textContent = "Average farmgate price";
    }
  });
  const trendTitle = document.getElementById("volumeTrendTitle");
  if (trendTitle && isPriceMode()) {
    trendTitle.innerHTML = `Annual Farmgate Price <span class="trend-panel-title-rest">and Production Trend</span>`;
  }
  const growthTitle = document.getElementById("volumeGrowthTitle");
  if (growthTitle && isPriceMode()) {
    growthTitle.innerHTML = `Year-on-Year Farmgate Price <span class="trend-panel-title-rest">Change</span>`;
  }
  const familyChartTitle = document.getElementById("subsectorVolumeChartTitle");
  if (familyChartTitle && isPriceMode()) {
    familyChartTitle.innerHTML = `Annual Farmgate Price <span class="trend-panel-title-rest">by ${escapeHtml(farmgateSubtypeLabel())}</span>`;
  }
  const ecoTitle = document.getElementById("ecosystemVolumeTitle");
  if (ecoTitle && isPriceMode()) {
    ecoTitle.textContent = `Farmgate Price Comparison by ${farmgateGroupLabel()}`;
  }
  const ecoNameTh = document.getElementById("ecosystemVolumeNameTh");
  if (ecoNameTh && isPriceMode()) {
    ecoNameTh.textContent = farmgateGroupLabel();
    ecoNameTh.title = `Sort by ${farmgateGroupLabel()}`;
  }
  document.querySelectorAll(".panel-volume-compare .trend-panel-title").forEach((el) => {
    if (!isPriceMode()) return;
    el.textContent = el.textContent
      .replace(/Production Volume/g, "Farmgate Price")
      .replace(/by Family/g, `by ${farmgateSubtypeLabel()}`);
  });
  document.querySelectorAll('.panel-volume-compare th[data-sort-key="name"]').forEach((el) => {
    if (!isPriceMode()) return;
    if (/^(Family|Commodity)$/i.test(el.textContent.trim())) {
      const label = /Family/i.test(el.textContent) ? farmgateSubtypeLabel() : farmgateGroupLabel();
      el.textContent = label;
      el.title = `Sort by ${label}`;
    }
  });
  const priorityLabel = document.querySelector("#priorityCrops .score-group-label");
  if (priorityLabel && isPriceMode()) {
    priorityLabel.textContent = `Highest-priced ${farmgateGroupPlural()}`;
  }

  if (CONFIG.hideSubtypeFilter) {
    document.querySelector('[data-filter="subsector"]')?.setAttribute("hidden", "");
  }
  const sourceBar = document.getElementById("farmgateSourceBar");
  if (sourceBar) sourceBar.hidden = !farmgateSourceOptions().length;

  if (CONFIG.showSubtypeAverages === false) {
    document.getElementById("subtypeAverages")?.setAttribute("hidden", "");
  }

  const filterLabel = filterDimLabel();
  const allLabel = filterAllLabel();
  const subtypeLabel = document.getElementById("subtypeFilterLabel");
  if (subtypeLabel) subtypeLabel.textContent = filterLabel;
  const subtypeField = document.getElementById("subtypeFilterField");
  if (subtypeField) subtypeField.title = filterLabel;
  if (els.crop) {
    els.crop.dataset.allLabel = allLabel;
    const panel = document.getElementById("subtypeFilterPanel");
    if (panel && !IS_MULTI_CROP && CONFIG.subtypes?.length) {
      panel.setAttribute("aria-label", filterLabel);
      const optionsHtml = CONFIG.subtypes
        .map(
          (s) =>
            `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(
              s.value
            )}" checked /><span>${escapeHtml(s.label)}</span></label>`
        )
        .join("");
      panel.innerHTML = `${multiSelectActionsHtml({
        searchable: isMultiSelectSearchable(els.crop),
        searchPlaceholder: multiSelectSearchPlaceholder(els.crop),
      })}${optionsHtml}`;
    } else if (panel) {
      panel.setAttribute("aria-label", filterLabel);
    }
    syncMultiSelectSummary(els.crop);
  }

  const subtypeGroupLabel = document.getElementById("subtypeGroupLabel");
  if (subtypeGroupLabel) {
    subtypeGroupLabel.textContent = `Avg production by ${CONFIG.subtypeNoun}`;
  }
  const labelA = document.getElementById("subtypeLabelA");
  const labelB = document.getElementById("subtypeLabelB");
  if (labelA) labelA.textContent = SUBTYPE_A.label;
  if (labelB) labelB.textContent = SUBTYPE_B.label;

  const dimLabel = seriesDimLabel();
  const ecoVolTitle = document.getElementById("ecosystemVolumeTitle");
  if (ecoVolTitle) {
    if (IS_MULTI_CROP) {
      const plural = String(CONFIG.groupPlural || `${dimLabel}s`);
      const pluralTitle = plural.charAt(0).toUpperCase() + plural.slice(1);
      ecoVolTitle.textContent = `${metricTitle()} Comparison by ${pluralTitle}`;
    } else {
      ecoVolTitle.textContent = `${metricTitle()} Comparison by ${dimLabel}`;
    }
  }
  const ecoVolNameTh = document.getElementById("ecosystemVolumeNameTh");
  if (ecoVolNameTh) {
    ecoVolNameTh.textContent = dimLabel;
    ecoVolNameTh.title = `Sort by ${dimLabel}`;
  }
  const regionEcoTitle = document.getElementById("regionEcosystemTitle");
  if (regionEcoTitle) {
    regionEcoTitle.textContent = `Regional Production Volume by ${dimLabel}`;
  }
  const thA = document.getElementById("regionEcoThA");
  const thB = document.getElementById("regionEcoThB");
  if (thA) {
    thA.textContent = SUBTYPE_A.label;
    thA.title = `Sort by ${SUBTYPE_A.label}`;
  }
  if (thB) {
    thB.textContent = SUBTYPE_B.label;
    thB.title = `Sort by ${SUBTYPE_B.label}`;
  }
  if (els.ecosystemTrendTitle) {
    els.ecosystemTrendTitle.textContent = ECOSYSTEM_METRICS.yield_mt_ha.title;
  }
}

function formatMt(value, { signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  const amount = isPriceMode()
    ? fmt.price(Math.abs(num))
    : fmt.score(Math.abs(num), { compact: metricCompact() });
  const body = `${amount} ${metricUnit()}`;
  if (!signed) return body;
  if (num > 0) return `+${body}`;
  if (num < 0) return `−${body}`;
  return body;
}

function formatHa(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${fmt.score(value)} ha`;
}

function formatYield(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${fmt.score(value, { compact: false })} MT/ha`;
}

function formatPctValue(value, { signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  const body = `${fmt.score(Math.abs(num), { compact: false })}%`;
  if (!signed) return body;
  if (num > 0) return `+${body}`;
  if (num < 0) return `−${body}`;
  return body;
}

function sentimentFromPct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return "neutral";
  const abs = Math.abs(Number(pct));
  if (abs < 0.05) return "flat";
  return Number(pct) > 0 ? "up" : "down";
}

function sentimentLabel(sentiment) {
  if (sentiment === "up") return "Rising";
  if (sentiment === "down") return "Declining";
  if (sentiment === "flat") return "Stable";
  return "Mixed";
}

function analysisProductLabel() {
  if (IS_MULTI_CROP) {
    const plural = String(CONFIG.groupPlural || "crops");
    return plural.charAt(0).toUpperCase() + plural.slice(1);
  }
  return CONFIG.cropGroup || "Palay";
}

function analysisProductNoun() {
  if (IS_MULTI_CROP) {
    return CONFIG.groupNoun || CONFIG.groupLabel?.toLowerCase() || "crop";
  }
  return String(CONFIG.cropGroup || "Palay").toLowerCase();
}

function farmgateSentimentLabel(sentiment) {
  if (sentiment === "up") return "Prices rising";
  if (sentiment === "down") return "Prices easing";
  if (sentiment === "flat") return "Prices stable";
  return "Price snapshot";
}

function farmgatePricePoints(points) {
  return (points || [])
    .map((p) => ({
      year: Number(p.year),
      month: Number(p.month),
      price: Number(p.volume_mt),
    }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.price) && p.price !== 0)
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

function getActiveFilterScope() {
  const { year_from, year_to } = getYearRange();
  const yearNarrowed = year_from !== yearBounds.min || year_to !== defaultYearTo();
  const yearText = year_from === year_to ? String(year_from) : `${year_from} – ${year_to}`;
  const quarter = multiSelectDisplay(els.quarter, {
    formatLabel: (v) => `Q${v}`,
    maxNames: 4,
  });
  const semester = multiSelectDisplay(els.semester, {
    formatLabel: (v) => `S${v}`,
    maxNames: 2,
  });
  const ecosystem = multiSelectDisplay(els.crop, { maxNames: 2 });
  const region = multiSelectDisplay(els.region, { maxNames: 2 });
  const province = multiSelectDisplay(els.province, { maxNames: 2 });
  const month = multiSelectDisplay(els.month, {
    formatLabel: (v) => monthShort(v),
    maxNames: 3,
  });

  const chips = [
    { label: "Year", text: yearText, narrowed: yearNarrowed },
    ...(els.month ? [{ label: "Month", ...month }] : []),
    { label: "Quarter", ...quarter },
    { label: "Semester", ...semester },
    { label: filterDimLabel(), ...ecosystem },
    { label: "Region", ...region },
    { label: "Province", ...province },
  ];

  const narrowed = chips.filter((c) => c.narrowed);
  let narrative;
  if (!narrowed.length) {
    if (IS_MULTI_CROP) {
      const label = CONFIG.groupPlural || "crops";
      narrative = `Nationwide ${label} view across ${yearText}, covering all quarters, semesters, regions, and provinces.`;
    } else {
      const dim = CONFIG.subtypePlural || "ecosystems";
      narrative = `Nationwide ${CONFIG.cropGroup || "Palay"} view across ${yearText}, covering all quarters, semesters, ${dim}, regions, and provinces.`;
    }
  } else {
    narrative = `Analysis is filtered to ${narrowed
      .map((c) => `${c.label.toLowerCase()} ${c.text}`)
      .join("; ")}.`;
  }
  return { chips, narrative, year_from, year_to, yearText, narrowedCount: narrowed.length };
}

function buildCompareRankings(points, nameKey, latestYear, periods = null) {
  const previousYear = (periods?.previous?.year ?? latestYear - 1);
  const byName = new Map();
  for (const p of points || []) {
    const name = p[nameKey];
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, { latest: null, previous: null });
    const row = byName.get(name);
    if (pointMatchesPeriod(p, periods?.asOf, latestYear)) row.latest = p.volume_mt;
    if (pointMatchesPeriod(p, periods?.previous, previousYear)) row.previous = p.volume_mt;
  }

  const entries = [...byName.entries()]
    .map(([name, vals]) => {
      const latest =
        vals.latest != null && !Number.isNaN(Number(vals.latest)) ? Number(vals.latest) : null;
      const previous =
        vals.previous != null && !Number.isNaN(Number(vals.previous))
          ? Number(vals.previous)
          : null;
      const variance = latest != null && previous != null ? latest - previous : null;
      const growth =
        latest != null && previous != null && previous !== 0
          ? ((latest - previous) / previous) * 100
          : null;
      return { name, latest, previous, variance, growth };
    })
    .filter((e) => e.latest != null && e.latest !== 0);

  const byVolume = entries
    .slice()
    .sort(
      (a, b) =>
        (b.latest ?? -Infinity) - (a.latest ?? -Infinity) ||
        String(a.name).localeCompare(String(b.name))
    );
  const byGrowth = entries
    .filter((e) => e.growth != null)
    .slice()
    .sort((a, b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity));
  const byDecline = entries
    .filter((e) => e.growth != null)
    .slice()
    .sort((a, b) => (a.growth ?? Infinity) - (b.growth ?? Infinity));

  const latestTotal = entries.reduce((s, e) => s + (e.latest || 0), 0);
  return { entries, byVolume, byGrowth, byDecline, latestTotal };
}

function analysisStat(label, value, meta = "", tone = "") {
  return `<div class="analysis-stat${tone ? ` is-${tone}` : ""}">
    <span class="analysis-stat-label">${escapeHtml(label)}</span>
    <span class="analysis-stat-value">${escapeHtml(value)}</span>
    ${meta ? `<span class="analysis-stat-meta">${escapeHtml(meta)}</span>` : ""}
  </div>`;
}

function analysisSection(title, bodyHtml, { accent = false } = {}) {
  if (!bodyHtml) return "";
  return `<section class="analysis-section${accent ? " is-accent" : ""}">
    <h3 class="analysis-section-title">${escapeHtml(title)}</h3>
    ${bodyHtml}
  </section>`;
}

function analysisList(items, { ordered = false } = {}) {
  if (!items?.length) return "";
  const tag = ordered ? "ol" : "ul";
  return `<${tag} class="analysis-list${ordered ? " is-ordered" : ""}">${items
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("")}</${tag}>`;
}

function buildFarmgateSmartAnalysisModel(snapshot) {
  if (!snapshot) return null;

  const scope = getActiveFilterScope();
  const yearFrom = snapshot.year_from;
  const yearTo = snapshot.year_to;
  const range = yearFrom === yearTo ? String(yearTo) : `${yearFrom}–${yearTo}`;
  const item = snapshot.farmgateItem || selectedFarmgateItem;
  const period = snapshot.farmgatePeriod || farmgateBoardPeriod || {};
  const asOfLabel = period.asOf?.label || `the latest ${farmgatePeriodNoun()}`;
  const previousLabel = period.previous?.label || `the previous ${farmgatePeriodNoun()}`;
  const points = farmgatePricePoints(snapshot.seriesPoints);
  const takeaways = [];
  const generatedAt = new Date();
  const commodity = item?.name || selectedFarmgateCommodity || null;
  const family = item?.family || (commodity ? farmgateFamilyFor(commodity) : null);
  const subject = commodity || farmgateDomainLabel().toLowerCase();
  const groupLabel = farmgateGroupLabel();
  const periodNoun = farmgatePeriodNoun();
  const periodOnPeriod = isQuarterGrain() ? "Quarter-on-quarter" : "Month-on-month";
  const periodOnPeriodLower = isQuarterGrain() ? "quarter-on-quarter" : "month-on-month";

  if (commodity) {
    scope.chips = [
      { label: groupLabel, text: commodity, narrowed: true },
      ...(family ? [{ label: farmgateSubtypeLabel(), text: family, narrowed: true }] : []),
      ...scope.chips,
    ];
    scope.narrative = `${groupLabel}-level farmgate price analysis for ${commodity}${
      family ? ` (${family})` : ""
    }. ${scope.narrowedCount ? scope.narrative : `Unweighted provincial averages, ${range}, nationwide unless a geography filter is applied.`}`;
  } else {
    scope.narrative = `${farmgateDomainLabel()} farmgate prices across ${range}. Values are unweighted averages of reporting regions and provinces.`;
  }

  const momPct =
    item?.current != null && item?.previous != null ? pctChange(item.previous, item.current) : null;
  const spanPct =
    points.length >= 2 ? pctChange(points[0].price, points[points.length - 1].price) : null;
  const headlineSentiment = sentimentFromPct(momPct ?? spanPct);
  let headline;
  if (commodity && momPct != null) {
    headline = `In ${asOfLabel}, the average farmgate price of ${commodity} ${
      describeChange(momPct) || "changed"
    } from ${previousLabel}, to ${formatMt(item.current)}.`;
  } else if (spanPct != null) {
    headline = `From ${points[0].year} to ${points[points.length - 1].year}, the annual average farmgate price of ${subject} ${
      describeChange(spanPct) || "changed"
    }, from ${formatMt(points[0].price)} to ${formatMt(points[points.length - 1].price)}.`;
  } else {
    headline = `Farmgate price snapshot for ${subject} under the current filters.`;
  }

  const periodAvg = item?.period_average != null ? Number(item.period_average) : averageFinite(points.map((p) => p.price));
  const periodYears = item?.period_years || points.length;
  const vsPeriod = periodAvg != null && item?.current != null ? pctChange(periodAvg, item.current) : null;

  const performanceStats = [
    {
      label: "Period average",
      value: formatMt(periodAvg),
      meta: periodYears ? `${range} · ${periodYears} ${periodYears === 1 ? "year" : "years"}` : range,
    },
    {
      label: `Latest ${periodNoun}`,
      value: formatMt(item?.current),
      meta: asOfLabel,
    },
    {
      label: `Previous ${periodNoun}`,
      value: formatMt(item?.previous),
      meta: previousLabel,
    },
    {
      label: periodOnPeriod,
      value: formatPctValue(momPct, { signed: true }),
      meta: item?.current != null && item?.previous != null ? formatMt(item.current - item.previous, { signed: true }) : `No prior ${periodNoun}`,
      tone: sentimentFromPct(momPct),
    },
  ];
  if (item?.low?.price != null) {
    performanceStats.push({
      label: "Lowest latest",
      value: formatMt(item.low.price),
      meta: farmgatePlaceText(item.low),
      tone: "down",
    });
  }
  if (item?.high?.price != null) {
    performanceStats.push({
      label: "Highest latest",
      value: formatMt(item.high.price),
      meta: farmgatePlaceText(item.high),
      tone: "up",
    });
  }

  if (item?.current != null && momPct != null) {
    takeaways.push(
      `${asOfLabel} averaged ${formatMt(item.current)}, ${describeChange(momPct)} from ${previousLabel}.`
    );
  }
  if (vsPeriod != null && describeChange(vsPeriod)) {
    takeaways.push(
      `The latest ${periodNoun} ${describeChange(vsPeriod)} versus the ${range} period average of ${formatMt(periodAvg)}.`
    );
  }

  let trend = null;
  if (points.length) {
    const first = points[0];
    const last = points[points.length - 1];
    let peak = first;
    let low = first;
    for (const p of points) {
      if (p.price > peak.price) peak = p;
      if (p.price < low.price) low = p;
    }
    const bullets = [];
    if (points.length === 1) {
      bullets.push(`Only ${first.year} is in view: annual average ${formatMt(first.price)}. Expand the year range to read a trend.`);
    } else {
      bullets.push(
        `From ${first.year} to ${last.year}, the annual average farmgate price ${describeChange(spanPct) || "moved"} from ${formatMt(first.price)} to ${formatMt(last.price)}.`
      );
      if (periodAvg != null) {
        bullets.push(`The unweighted mean of yearly averages over ${range} was ${formatMt(periodAvg)}.`);
      }
      bullets.push(
        `The highest annual average was ${formatMt(peak.price)} in ${peak.year}; the lowest was ${formatMt(low.price)} in ${low.year}.`
      );
      if (last.year === peak.year) {
        bullets.push(`${last.year} is both the latest year and the high of this range.`);
      } else if (last.year === low.year) {
        bullets.push(`${last.year} is both the latest year and the low of this range.`);
      }
      if (points.length >= 6) {
        const recentAvg = averageFinite(points.slice(-3).map((p) => p.price));
        const priorAvg = averageFinite(points.slice(-6, -3).map((p) => p.price));
        const recentText = describeChange(pctChange(priorAvg, recentAvg));
        if (recentText) {
          bullets.push(`In the latest 3 years versus the prior 3, the average farmgate price ${recentText}.`);
        }
      }
    }
    trend = {
      title: `Annual farmgate price trend · ${range}`,
      bullets,
      stats: [
        { label: "Start", value: formatMt(first.price), meta: String(first.year) },
        { label: "End", value: formatMt(last.price), meta: String(last.year) },
        { label: "Highest year", value: formatMt(peak.price), meta: String(peak.year), tone: "up" },
        { label: "Lowest year", value: formatMt(low.price), meta: String(low.year), tone: "down" },
      ],
    };
    takeaways.push(`Highest annual average in ${range}: ${peak.year} at ${formatMt(peak.price)}.`);
  }

  let growthPattern = null;
  const growth = buildVolumeYoYGrowth(snapshot.seriesPointsForGrowth || snapshot.seriesPoints || []);
  const growthPairs = (growth.labels || [])
    .map((year, i) => ({
      year,
      growth: growth.values[i],
      price: growth.currentVolumes[i],
      previous: growth.previousVolumes[i],
    }))
    .filter((row) => row.growth != null && !Number.isNaN(row.growth));
  if (growthPairs.length) {
    let peak = growthPairs[0];
    let trough = growthPairs[0];
    let upYears = 0;
    let downYears = 0;
    for (const row of growthPairs) {
      if (row.growth > peak.growth) peak = row;
      if (row.growth < trough.growth) trough = row;
      if (row.growth > 0) upYears += 1;
      else if (row.growth < 0) downYears += 1;
    }
    const latest = growthPairs[growthPairs.length - 1];
    growthPattern = {
      title: "Year-on-year price movement",
      bullets: [
        `Latest annual YoY move (${latest.year} vs ${latest.year - 1}): ${formatPctValue(latest.growth, { signed: true })} to ${formatMt(latest.price)}.`,
        `Largest yearly increase: ${peak.year} at ${formatPctValue(peak.growth, { signed: true })}.`,
        `Largest yearly decrease: ${trough.year} at ${formatPctValue(trough.growth, { signed: true })}.`,
        `Across ${growthPairs.length} comparable years, annual farmgate prices rose in ${upYears} and fell in ${downYears}.`,
      ],
      stats: [
        {
          label: "Latest YoY",
          value: formatPctValue(latest.growth, { signed: true }),
          meta: String(latest.year),
          tone: sentimentFromPct(latest.growth),
        },
        {
          label: "Largest rise",
          value: formatPctValue(peak.growth, { signed: true }),
          meta: String(peak.year),
          tone: "up",
        },
        {
          label: "Largest drop",
          value: formatPctValue(trough.growth, { signed: true }),
          meta: String(trough.year),
          tone: "down",
        },
        {
          label: "Up vs down years",
          value: `${upYears} / ${downYears}`,
          meta: `${growthPairs.length} comparable years`,
        },
      ],
    };
  }

  let seasonality = null;
  const monthPoints = snapshot.monthSeasonalityPoints || [];
  const selectedMonths = farmgateSeasonMonths();
  if (monthPoints.length) {
    const byYearMonth = new Map();
    for (const point of monthPoints) {
      const year = Number(point.year);
      const month = Number(point.month);
      const value = Number(point.volume_mt);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(value) || value === 0) continue;
      byYearMonth.set(`${year}-${month}`, value);
    }
    const periodAvgByMonth = selectedMonths.map((month) => {
      const vals = [];
      for (let year = yearFrom; year <= yearTo; year += 1) {
        const value = byYearMonth.get(`${year}-${month}`);
        if (value != null) vals.push(value);
      }
      return vals.length ? vals.reduce((sum, value) => sum + value, 0) / vals.length : null;
    });
    const pairs = selectedMonths
      .map((month, i) => ({ month, avg: periodAvgByMonth[i] }))
      .filter((row) => row.avg != null && Number.isFinite(row.avg));
    if (pairs.length) {
      const peak = pairs.reduce((best, row) => (row.avg > best.avg ? row : best));
      const low = pairs.reduce((best, row) => (row.avg < best.avg ? row : best));
      const mean = averageFinite(pairs.map((row) => row.avg), { ignoreZero: false });
      const spread = peak.avg - low.avg;
      const bullets = [
        `${farmgateSeasonFullLabel(peak.month)} is typically the most expensive ${periodNoun} in ${range} at ${formatMt(peak.avg)}.`,
        `${farmgateSeasonFullLabel(low.month)} is typically the cheapest at ${formatMt(low.avg)}.`,
      ];
      if (mean != null) {
        bullets.push(
          `The typical ${isQuarterGrain() ? "quarterly" : "monthly"} average across the selected ${
            isQuarterGrain() ? "quarters" : "months"
          } is ${formatMt(mean)}.`
        );
      }
      if (spread > 0) {
        bullets.push(`The usual peak-to-trough seasonal gap is ${formatMt(spread)} (${formatPctValue(pctChange(low.avg, peak.avg))}).`);
      }
      if (!isQuarterGrain()) {
        const quarterDefs = [
          { label: "Q1", months: [1, 2, 3] },
          { label: "Q2", months: [4, 5, 6] },
          { label: "Q3", months: [7, 8, 9] },
          { label: "Q4", months: [10, 11, 12] },
        ];
        const quarterAvgs = quarterDefs
          .map((q) => ({
            label: q.label,
            avg: averageFinite(
              q.months.map((month) => pairs.find((row) => row.month === month)?.avg).filter((v) => v != null)
            ),
          }))
          .filter((q) => q.avg != null);
        if (quarterAvgs.length >= 2) {
          const highQ = quarterAvgs.reduce((best, row) => (row.avg > best.avg ? row : best));
          const lowQ = quarterAvgs.reduce((best, row) => (row.avg < best.avg ? row : best));
          if (highQ.label !== lowQ.label) {
            bullets.push(`${highQ.label} averages the highest (${formatMt(highQ.avg)}); ${lowQ.label} averages the lowest (${formatMt(lowQ.avg)}).`);
          }
        }
      }
      seasonality = {
        title: `${isQuarterGrain() ? "Quarterly" : "Monthly"} seasonality · ${range}`,
        bullets,
        stats: [
          { label: `Highest ${periodNoun}`, value: formatMt(peak.avg), meta: farmgateSeasonFullLabel(peak.month), tone: "up" },
          { label: `Lowest ${periodNoun}`, value: formatMt(low.avg), meta: farmgateSeasonFullLabel(low.month), tone: "down" },
          { label: "Seasonal spread", value: formatMt(spread), meta: `${farmgateSeasonFullLabel(low.month)} to ${farmgateSeasonFullLabel(peak.month)}` },
          { label: `${isQuarterGrain() ? "Quarterly" : "Monthly"} typical`, value: formatMt(mean), meta: range },
        ],
      };
      takeaways.push(
        `Seasonally, ${farmgateSeasonFullLabel(peak.month)} tends to be the highest-priced ${periodNoun} and ${farmgateSeasonFullLabel(low.month)} the lowest.`
      );
    }
  }

  let priceVolume = null;
  const overlaySeries = points
    .map((p) => {
      const match = (snapshot.overlayVolumePoints || []).find((row) => Number(row.year) === p.year);
      const volume = match != null ? Number(match.volume_mt) : null;
      return Number.isFinite(volume) && volume !== 0 ? { ...p, volume } : null;
    })
    .filter(Boolean);
  if (overlaySeries.length >= 2) {
    const volFirst = overlaySeries[0];
    const volLast = overlaySeries[overlaySeries.length - 1];
    const volPeak = overlaySeries.reduce((best, row) => (row.volume > best.volume ? row : best));
    const volText = describeChange(pctChange(volFirst.volume, volLast.volume));
    const bullets = [];
    if (volText) {
      bullets.push(
        `Matching production volume ${volText} from ${formatProductionMt(volFirst.volume)} in ${volFirst.year} to ${formatProductionMt(volLast.volume)} in ${volLast.year}, peaking in ${volPeak.year} at ${formatProductionMt(volPeak.volume)}.`
      );
    }
    let opposite = 0;
    let aligned = 0;
    for (let i = 1; i < overlaySeries.length; i += 1) {
      const dp = overlaySeries[i].price - overlaySeries[i - 1].price;
      const dv = overlaySeries[i].volume - overlaySeries[i - 1].volume;
      if (dp === 0 || dv === 0) continue;
      if (dp * dv < 0) opposite += 1;
      else aligned += 1;
    }
    if (opposite + aligned >= 2) {
      bullets.push(
        opposite > aligned
          ? "In most year-to-year moves, farmgate prices and production went in opposite directions — a pattern often seen when a larger harvest eases prices or a tighter harvest supports them."
          : "In most year-to-year moves, prices and production moved in the same direction, so output alone does not explain the price path."
      );
    }
    const lastPair = overlaySeries[overlaySeries.length - 1];
    const prevPair = overlaySeries[overlaySeries.length - 2];
    if (lastPair && prevPair && lastPair.year === prevPair.year + 1) {
      const priceMove = lastPair.price - prevPair.price;
      const volMove = lastPair.volume - prevPair.volume;
      if (priceMove !== 0 && volMove !== 0) {
        bullets.push(
          priceMove * volMove < 0
            ? volMove > 0
              ? `In ${lastPair.year}, production rose while the farmgate price declined.`
              : `In ${lastPair.year}, production fell while the farmgate price increased.`
            : `In ${lastPair.year}, prices and production both ${priceMove > 0 ? "increased" : "declined"}.`
        );
      }
    }
    priceVolume = {
      title: "Farmgate prices and production",
      bullets,
      stats: [
        { label: "Production start", value: formatProductionMt(volFirst.volume), meta: String(volFirst.year) },
        { label: "Production end", value: formatProductionMt(volLast.volume), meta: String(volLast.year) },
        { label: "Peak output", value: formatProductionMt(volPeak.volume), meta: String(volPeak.year) },
        {
          label: "Price vs output",
          value: opposite > aligned ? "Usually inverse" : aligned > opposite ? "Usually aligned" : "Mixed",
          meta: `${opposite} opposite / ${aligned} same-direction years`,
        },
      ],
    };
    if (opposite > aligned) {
      takeaways.push("Farmgate prices and production usually moved in opposite directions over this range.");
    }
  }

  const boardItems = (snapshot.farmgateBoardItems || farmgateBoardItems || []).filter(
    (row) => row?.current != null && Number.isFinite(Number(row.current)) && Number(row.current) !== 0
  );
  let topCrops = null;
  let ecosystem = null;
  if (boardItems.length) {
    const ranked = boardItems
      .slice()
      .sort((a, b) => Number(b.current) - Number(a.current) || String(a.name).localeCompare(String(b.name)));
    const withMove = ranked
      .map((row) => {
        const growth = pctChange(row.previous, row.current);
        return { ...row, growth };
      })
      .filter((row) => row.growth != null);
    const gainers = withMove.filter((row) => row.growth > 0).sort((a, b) => b.growth - a.growth).slice(0, 3);
    const decliners = withMove.filter((row) => row.growth < 0).sort((a, b) => a.growth - b.growth).slice(0, 3);
    const ranks = ranked.slice(0, 5).map((row, i) => ({
      rank: i + 1,
      name: row.name,
      volume: formatMt(row.current),
      share: null,
      growth: pctChange(row.previous, row.current) != null ? formatPctValue(pctChange(row.previous, row.current), { signed: true }) : null,
      tone: sentimentFromPct(pctChange(row.previous, row.current)),
    }));
    const bullets = [];
    if (ranked[0]) {
      bullets.push(`${ranked[0].name} has the highest latest average farmgate price at ${formatMt(ranked[0].current)}.`);
    }
    if (ranked.length > 1) {
      const cheapest = ranked[ranked.length - 1];
      bullets.push(`${cheapest.name} has the lowest at ${formatMt(cheapest.current)}.`);
    }
    if (commodity) {
      const rank = ranked.findIndex((row) => row.name === commodity) + 1;
      if (rank > 0) {
        bullets.push(`Among ${ranked.length} priced commodities, ${commodity} ranks #${rank} by latest average price.`);
        takeaways.push(`${commodity} ranks #${rank} of ${ranked.length} commodities by latest average farmgate price.`);
      }
    }
    if (gainers.length) {
      bullets.push(
        `Largest ${periodOnPeriodLower} increases: ${gainers
          .map((row) => `${row.name} (${formatPctValue(row.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    if (decliners.length) {
      bullets.push(
        `Largest ${periodOnPeriodLower} decreases: ${decliners
          .map((row) => `${row.name} (${formatPctValue(row.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    topCrops = { title: `Commodity prices · ${asOfLabel}`, ranks, bullets };

    const byFamily = new Map();
    for (const row of ranked) {
      const fam = row.family || farmgateFamilyFor(row.name) || "Other crops";
      if (!byFamily.has(fam)) byFamily.set(fam, []);
      byFamily.get(fam).push(Number(row.current));
    }
    const familyRows = [...byFamily.entries()]
      .map(([name, vals]) => ({ name, avg: vals.reduce((s, v) => s + v, 0) / vals.length, count: vals.length }))
      .sort((a, b) => b.avg - a.avg);
    if (familyRows.length) {
      ecosystem = {
        title: `Prices by family · ${asOfLabel}`,
        bullets: familyRows.map(
          (row) => `${row.name}: ${formatMt(row.avg)} average across ${row.count} ${row.count === 1 ? "commodity" : "commodities"}.`
        ),
        stats: familyRows.slice(0, 6).map((row) => ({
          label: row.name,
          value: formatMt(row.avg),
          meta: `${row.count} ${row.count === 1 ? "commodity" : "commodities"}`,
        })),
      };
    }
  }

  const regionRank = buildCompareRankings(snapshot.regionComparePoints, "region", yearTo, {
    asOf: snapshot.regionCompareAsOf,
    previous: snapshot.regionComparePrevious,
  });
  let regions = null;
  if (regionRank.byVolume.length) {
    const highest = regionRank.byVolume.slice(0, 3);
    const lowest = regionRank.byVolume.slice().reverse().slice(0, 3);
    const gainers = regionRank.byGrowth.filter((e) => e.growth > 0).slice(0, 3);
    const decliners = regionRank.byDecline.filter((e) => e.growth < 0).slice(0, 3);
    const ranks = highest.map((e, i) => ({
      rank: i + 1,
      name: e.name,
      volume: formatMt(e.latest),
      share: null,
      growth: e.growth != null ? formatPctValue(e.growth, { signed: true }) : null,
      tone: sentimentFromPct(e.growth),
    }));
    const bullets = [];
    if (highest[0] && lowest[0] && highest[0].name !== lowest[0].name) {
      bullets.push(
        `${highest[0].name} posted the highest regional average in ${asOfLabel} at ${formatMt(highest[0].latest)}; ${lowest[0].name} was the lowest at ${formatMt(lowest[0].latest)}.`
      );
    }
    if (lowest.length) {
      bullets.push(
        `Lowest regional averages: ${lowest.map((e) => `${e.name} (${formatMt(e.latest)})`).join(", ")}.`
      );
    }
    if (gainers.length) {
      bullets.push(
        `Largest ${periodOnPeriodLower} regional increases: ${gainers
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    if (decliners.length) {
      bullets.push(
        `Largest ${periodOnPeriodLower} regional decreases: ${decliners
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    regions = { title: `Regional farmgate prices · ${asOfLabel}`, ranks, bullets };
    if (highest[0]) {
      takeaways.push(`Highest regional average in ${asOfLabel}: ${highest[0].name} at ${formatMt(highest[0].latest)}.`);
    }
  }

  const provinceRank = buildCompareRankings(snapshot.regionProvincePoints || [], "province", yearTo, {
    asOf: snapshot.regionCompareAsOf,
    previous: snapshot.regionComparePrevious,
  });
  let provinces = null;
  if (provinceRank.byVolume.length) {
    const highest = provinceRank.byVolume.slice(0, 5);
    const lowest = provinceRank.byVolume.slice().reverse().slice(0, 3);
    const gainers = provinceRank.byGrowth.filter((e) => e.growth > 0).slice(0, 3);
    const decliners = provinceRank.byDecline.filter((e) => e.growth < 0).slice(0, 3);
    const ranks = highest.map((e, i) => ({
      rank: i + 1,
      name: e.name,
      volume: formatMt(e.latest),
      share: null,
      growth: e.growth != null ? formatPctValue(e.growth, { signed: true }) : null,
      tone: sentimentFromPct(e.growth),
    }));
    const bullets = [];
    if (highest[0] && lowest[0]) {
      bullets.push(
        `${highest[0].name} had the highest provincial average at ${formatMt(highest[0].latest)}; ${lowest[0].name} was among the lowest at ${formatMt(lowest[0].latest)}.`
      );
    }
    if (gainers.length) {
      bullets.push(
        `Largest provincial ${periodOnPeriodLower} increases: ${gainers
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    if (decliners.length) {
      bullets.push(
        `Largest provincial ${periodOnPeriodLower} decreases: ${decliners
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    provinces = { title: `Provincial farmgate prices · ${asOfLabel}`, ranks, bullets };
  }

  return {
    mode: "farmgate",
    title: CONFIG.title || "Crops Farmgate Prices Dashboard",
    slug: CONFIG.slug || "farmgate-crops",
    crop: commodity || farmgateDomainLabel(),
    generatedAt,
    generatedLabel: generatedAt.toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    scope,
    headline,
    headlineSentiment,
    headlineSentimentLabel: farmgateSentimentLabel(headlineSentiment),
    performanceStats,
    yoy: null,
    trend,
    growthPattern,
    seasonality,
    priceVolume,
    ecosystem,
    priorityCrops: null,
    topCrops,
    regions,
    provinces,
    takeaways: takeaways.slice(0, 8),
    growthKind: "MoM",
    sourceNote:
      "Source: Philippine Statistics Authority (PSA) OpenSTAT · Philippine Statistics Explorer. Farmgate prices are unweighted averages of reporting geographies; zeros are treated as no recorded trade.",
    pdfFooter: "Data Analytics Platform (PSA OpenSTAT)",
  };
}

function buildSmartAnalysisModel(snapshot) {
  if (!snapshot) return null;
  if (isPriceMode()) return buildFarmgateSmartAnalysisModel(snapshot);

  const scope = getActiveFilterScope();
  const kpi = snapshot.kpi || {};
  const cmp = kpi.comparison || {};
  const yearFrom = snapshot.year_from;
  const yearTo = snapshot.year_to;
  const points = snapshot.seriesPoints || [];
  const bySubtype = kpi.by_subtype || [];
  const byPriority = kpi.by_priority_crop || [];
  const takeaways = [];
  const generatedAt = new Date();
  const productLabel = analysisProductLabel();
  const productNoun = analysisProductNoun();
  const showAreaYield = CONFIG.showAreaYield !== false;

  const avgYears = kpi.year_count || yearTo - yearFrom + 1;
  const avgMeta =
    avgYears === 1 ? `${yearFrom} · 1 year` : `${yearFrom}–${yearTo} · ${fmt.number(avgYears)}-year average`;

  let headline;
  let headlineSentiment = "neutral";
  if (cmp.growth_rate_pct != null) {
    headlineSentiment = sentimentFromPct(cmp.growth_rate_pct);
    headline = `Under the current filters, ${productLabel} ${metricNoun()} ${
      describeChange(cmp.growth_rate_pct) || "changed"
    } from ${cmp.year_from} to ${cmp.year_to}.`;
  } else if (points.length >= 2) {
    const volPct = pctChange(points[0].volume_mt, points[points.length - 1].volume_mt);
    headlineSentiment = sentimentFromPct(volPct);
    headline = `Under the current filters, ${productNoun} ${metricNoun()} ${
      describeChange(volPct) || "changed"
    } from ${points[0].year} to ${points[points.length - 1].year}.`;
  } else {
    headline = `Snapshot of ${productLabel} ${metricNoun()} for the selected filters.`;
  }

  const performanceStats = [
    { label: isPriceMode() ? "Avg farmgate price" : "Avg production", value: formatMt(kpi.volume_mt_avg), meta: avgMeta },
  ];
  if (showAreaYield) {
    performanceStats.push(
      { label: "Avg area harvested", value: formatHa(kpi.area_ha_avg), meta: avgMeta },
      { label: "Average yield", value: formatYield(kpi.yield_mt_ha), meta: "Volume ÷ area" }
    );
  }

  if (kpi.volume_mt_avg != null) {
    takeaways.push(`Average annual ${metricNoun()} is ${formatMt(kpi.volume_mt_avg)} over ${avgMeta}.`);
  }
  if (showAreaYield && kpi.yield_mt_ha != null) {
    takeaways.push(`Average yield stands at ${formatYield(kpi.yield_mt_ha)}.`);
  }

  let yoy = null;
  if (cmp.year_from != null && cmp.year_to != null) {
    const growthText =
      cmp.growth_rate_pct == null
        ? "Year-on-year growth is unavailable for this selection."
        : `Volume ${describeChange(cmp.growth_rate_pct) || "changed"} (${formatPctValue(
            cmp.growth_rate_pct,
            { signed: true }
          )}).`;
    yoy = {
      title: `Year-over-year · ${cmp.year_to} vs ${cmp.year_from}`,
      text: growthText,
      sentiment: sentimentFromPct(cmp.growth_rate_pct),
      stats: [
        { label: String(cmp.year_to), value: formatMt(cmp.volume_mt_to), meta: "Latest year" },
        { label: String(cmp.year_from), value: formatMt(cmp.volume_mt_from), meta: "Previous year" },
        {
          label: "Variance",
          value: formatMt(cmp.variance_mt, { signed: true }),
          meta: `${cmp.year_to} − ${cmp.year_from}`,
          tone: sentimentFromPct(cmp.variance_mt),
        },
        {
          label: "Growth rate",
          value: formatPctValue(cmp.growth_rate_pct, { signed: true }),
          meta: "Year-over-year",
          tone: sentimentFromPct(cmp.growth_rate_pct),
        },
      ],
    };
    if (cmp.growth_rate_pct != null) {
      takeaways.push(
        `${cmp.year_to} vs ${cmp.year_from}: ${formatPctValue(cmp.growth_rate_pct, {
          signed: true,
        })} (${formatMt(cmp.variance_mt, { signed: true })}).`
      );
    }
  }

  let trend = null;
  if (points.length) {
    const first = points[0];
    const last = points[points.length - 1];
    let peak = first;
    let low = first;
    for (const p of points) {
      if ((p.volume_mt ?? -Infinity) > (peak.volume_mt ?? -Infinity)) peak = p;
      if ((p.volume_mt ?? Infinity) < (low.volume_mt ?? Infinity)) low = p;
    }
    const volPct = pctChange(first.volume_mt, last.volume_mt);
    const areaPct = showAreaYield ? pctChange(first.area_ha, last.area_ha) : null;
    const yieldFirst = showAreaYield ? yieldForPoint(first) : null;
    const yieldLast = showAreaYield ? yieldForPoint(last) : null;
    const yieldPct = showAreaYield ? pctChange(yieldFirst, yieldLast) : null;
    const bullets = [
      `From ${first.year} to ${last.year}, production volume ${describeChange(volPct) || "changed"} (${formatMt(
        first.volume_mt
      )} → ${formatMt(last.volume_mt)}).`,
    ];
    if (showAreaYield) {
      bullets.push(
        `Area harvested ${describeChange(areaPct) || "changed"} (${formatHa(first.area_ha)} → ${formatHa(
          last.area_ha
        )}).`,
        `Yield ${describeChange(yieldPct) || "changed"} (${formatYield(yieldFirst)} → ${formatYield(
          yieldLast
        )}).`
      );
    }
    bullets.push(
      `Highest production volume: ${peak.year} at ${formatMt(peak.volume_mt)}.`,
      `Lowest production volume: ${low.year} at ${formatMt(low.volume_mt)}.`
    );
    if (showAreaYield && volPct != null && areaPct != null && Math.abs(volPct - areaPct) >= 5) {
      bullets.push(
        volPct > areaPct
          ? "Production volume outpaced area harvested, indicating stronger average yields over the period."
          : "Area harvested grew faster than production volume, pointing to softer average yields over the period."
      );
    }
    trend = {
      title: `Trend · ${yearFrom}–${yearTo}`,
      bullets,
      stats: [
        { label: "Start volume", value: formatMt(first.volume_mt), meta: String(first.year) },
        { label: "End volume", value: formatMt(last.volume_mt), meta: String(last.year) },
        { label: "Peak year", value: String(peak.year), meta: formatMt(peak.volume_mt) },
        { label: "Low year", value: String(low.year), meta: formatMt(low.volume_mt) },
      ],
    };
    if (peak.year) {
      takeaways.push(`Peak production year in range: ${peak.year} (${formatMt(peak.volume_mt)}).`);
    }
  }

  let growthPattern = null;
  const growth = buildVolumeYoYGrowth(snapshot.seriesPointsForGrowth || []);
  const growthPairs = (growth.labels || [])
    .map((year, i) => ({
      year,
      growth: growth.values[i],
      volume: growth.currentVolumes[i],
      previous: growth.previousVolumes[i],
    }))
    .filter((row) => row.growth != null && !Number.isNaN(row.growth));
  if (growthPairs.length) {
    let peak = growthPairs[0];
    let trough = growthPairs[0];
    let upYears = 0;
    let downYears = 0;
    for (const row of growthPairs) {
      if (row.growth > peak.growth) peak = row;
      if (row.growth < trough.growth) trough = row;
      if (row.growth > 0) upYears += 1;
      else if (row.growth < 0) downYears += 1;
    }
    const latest = growthPairs[growthPairs.length - 1];
    growthPattern = {
      title: "Year-on-year growth pattern",
      bullets: [
        `Latest measured YoY growth (${latest.year}): ${formatPctValue(latest.growth, {
          signed: true,
        })}.`,
        `Strongest growth year: ${peak.year} at ${formatPctValue(peak.growth, { signed: true })}.`,
        `Weakest growth year: ${trough.year} at ${formatPctValue(trough.growth, { signed: true })}.`,
        `Across ${growthPairs.length} comparable years, production volume rose in ${upYears} and fell in ${downYears}.`,
      ],
      stats: [
        {
          label: "Latest YoY",
          value: formatPctValue(latest.growth, { signed: true }),
          meta: String(latest.year),
          tone: sentimentFromPct(latest.growth),
        },
        {
          label: "Best year",
          value: formatPctValue(peak.growth, { signed: true }),
          meta: String(peak.year),
          tone: "up",
        },
        {
          label: "Weakest year",
          value: formatPctValue(trough.growth, { signed: true }),
          meta: String(trough.year),
          tone: "down",
        },
        {
          label: "Up vs down years",
          value: `${upYears} / ${downYears}`,
          meta: `${growthPairs.length} comparable years`,
        },
      ],
    };
  }

  let enso = null;
  if (points.length && wantsEnsoOverlay()) {
    const ensoText = buildEnsoRelativityInsight(
      buildEnsoPhaseRows(points, "year", (p) => p.volume_mt),
      { metricLabel: "production volume", unit: "MT", compact: true }
    );
    if (ensoText) {
      const bullets = ensoText
        .split(/(?<=\.)\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      enso = {
        title: "El Niño / La Niña relativity",
        text: ensoText,
        bullets,
      };
      if (bullets[0]) takeaways.push(bullets[0]);
    }
  }

  let ecosystem = null;
  let priorityCrops = null;
  let topCrops = null;

  if (IS_MULTI_CROP && byPriority.length) {
    const bullets = byPriority.map(
      (row) =>
        `${row.crop_group}: ${formatMt(row.volume_mt_avg)} average` +
        (row.share_pct != null ? ` (${formatPctValue(row.share_pct)} of total production).` : ".")
    );
    const leader = byPriority.reduce(
      (best, row) =>
        (row.volume_mt_avg || 0) > (best?.volume_mt_avg || 0) ? row : best,
      byPriority[0]
    );
    if (leader?.crop_group) {
      bullets.push(
        `${leader.crop_group} leads the priority set in average volume under the current filters.`
      );
      if (leader.share_pct != null) {
        takeaways.push(
          `${leader.crop_group} accounts for about ${formatPctValue(leader.share_pct)} of production in this view.`
        );
      }
    }
    priorityCrops = {
      title: CONFIG.priorityCropTopN
        ? `Top ${analysisProductLabel()} commodities`
        : "Priority crops",
      bullets,
      stats: byPriority.map((row) => ({
        label: row.crop_group,
        value: formatMt(row.volume_mt_avg),
        meta:
          row.share_pct != null
            ? `${formatPctValue(row.share_pct)} of total`
            : "Average volume",
      })),
    };
  } else if (!IS_MULTI_CROP && CONFIG.showSubtypeAverages !== false && bySubtype.length) {
    const subtypeA =
      bySubtype.find((r) => r.crop_subtype === SUBTYPE_A.value) || bySubtype[0] || {};
    const subtypeB =
      bySubtype.find((r) => r.crop_subtype === SUBTYPE_B.value) || bySubtype[1] || {};
    const lead =
      (subtypeA.volume_mt_avg || 0) >= (subtypeB.volume_mt_avg || 0) ? subtypeA : subtypeB;
    const lag = lead === subtypeA ? subtypeB : subtypeA;
    const bullets = [
      `${SUBTYPE_A.label}: ${formatMt(subtypeA.volume_mt_avg)} average` +
        (subtypeA.share_pct != null
          ? ` (${formatPctValue(subtypeA.share_pct)} of selected production).`
          : "."),
      `${SUBTYPE_B.label}: ${formatMt(subtypeB.volume_mt_avg)} average` +
        (subtypeB.share_pct != null
          ? ` (${formatPctValue(subtypeB.share_pct)} of selected production).`
          : "."),
    ];
    if (lead.crop_subtype && lag.crop_subtype) {
      bullets.push(
        `${lead.crop_subtype} leads ${lag.crop_subtype} in average volume under the current filters.`
      );
    }
    ecosystem = {
      title: `${CONFIG.subtypeLabel || "Ecosystem"} mix`,
      bullets,
      stats: [
        {
          label: SUBTYPE_A.label,
          value: formatMt(subtypeA.volume_mt_avg),
          meta:
            subtypeA.share_pct != null
              ? `${formatPctValue(subtypeA.share_pct)} share`
              : "Average volume",
        },
        {
          label: SUBTYPE_B.label,
          value: formatMt(subtypeB.volume_mt_avg),
          meta:
            subtypeB.share_pct != null
              ? `${formatPctValue(subtypeB.share_pct)} share`
              : "Average volume",
        },
      ],
    };
    if (lead.crop_subtype && lead.share_pct != null) {
      takeaways.push(
        `${lead.crop_subtype} accounts for about ${formatPctValue(lead.share_pct)} of production in this view.`
      );
    }
  }

  if (IS_MULTI_CROP) {
    const cropRank = buildCompareRankings(snapshot.ecoComparePoints, "crop_subtype", yearTo);
    if (cropRank.byVolume.length) {
      const top = cropRank.byVolume.slice(0, 5);
      const gainers = cropRank.byGrowth.filter((e) => e.growth > 0).slice(0, 3);
      const decliners = cropRank.byDecline.filter((e) => e.growth < 0).slice(0, 3);
      const plural = String(CONFIG.groupPlural || "crops");
      const pluralTitle = plural.charAt(0).toUpperCase() + plural.slice(1);
      const ranks = top.map((e, i) => {
        const share =
          cropRank.latestTotal > 0 ? (e.latest / cropRank.latestTotal) * 100 : null;
        return {
          rank: i + 1,
          name: e.name,
          volume: formatMt(e.latest),
          share: share != null ? formatPctValue(share) : null,
          growth: e.growth != null ? formatPctValue(e.growth, { signed: true }) : null,
          tone: sentimentFromPct(e.growth),
        };
      });
      const bullets = [];
      if (gainers.length) {
        bullets.push(
          `Fastest gains among ${plural}: ${gainers
            .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
            .join(", ")}.`
        );
      }
      if (decliners.length) {
        bullets.push(
          `Largest declines among ${plural}: ${decliners
            .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
            .join(", ")}.`
        );
      }
      topCrops = { title: `Top ${pluralTitle} · ${yearTo}`, ranks, bullets };
      if (top[0]) {
        takeaways.push(
          `Top ${productNoun} by volume in ${yearTo}: ${top[0].name} (${formatMt(top[0].latest)}).`
        );
      }
    }
  }

  const regionRank = buildCompareRankings(snapshot.regionComparePoints, "region", yearTo, {
    asOf: snapshot.regionCompareAsOf,
    previous: snapshot.regionComparePrevious,
  });
  let regions = null;
  if (regionRank.byVolume.length) {
    const top = regionRank.byVolume.slice(0, 3);
    const gainers = regionRank.byGrowth.filter((e) => e.growth > 0).slice(0, 3);
    const decliners = regionRank.byDecline.filter((e) => e.growth < 0).slice(0, 3);
    const ranks = top.map((e, i) => {
      const share =
        regionRank.latestTotal > 0 ? (e.latest / regionRank.latestTotal) * 100 : null;
      return {
        rank: i + 1,
        name: e.name,
        volume: formatMt(e.latest),
        share: share != null ? formatPctValue(share) : null,
        growth: e.growth != null ? formatPctValue(e.growth, { signed: true }) : null,
        tone: sentimentFromPct(e.growth),
      };
    });
    const bullets = [];
    if (gainers.length) {
      bullets.push(
        `Fastest regional gains: ${gainers
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    if (decliners.length) {
      bullets.push(
        `Largest regional declines: ${decliners
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    regions = { title: `Regional leaders · ${yearTo}`, ranks, bullets };
    if (top[0]) {
      takeaways.push(
        `Top region by volume in ${yearTo}: ${top[0].name} (${formatMt(top[0].latest)}).`
      );
    }
  }

  const provinceRank = buildCompareRankings(
    snapshot.provinceComparePoints,
    "province",
    yearTo
  );
  let provinces = null;
  if (provinceRank.byVolume.length) {
    const top = provinceRank.byVolume.slice(0, 5);
    const gainers = provinceRank.byGrowth.filter((e) => e.growth > 0).slice(0, 3);
    const decliners = provinceRank.byDecline.filter((e) => e.growth < 0).slice(0, 3);
    const ranks = top.map((e, i) => ({
      rank: i + 1,
      name: e.name,
      volume: formatMt(e.latest),
      share: null,
      growth: e.growth != null ? formatPctValue(e.growth, { signed: true }) : null,
      tone: sentimentFromPct(e.growth),
    }));
    const bullets = [];
    if (gainers.length) {
      bullets.push(
        `Notable provincial gains: ${gainers
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    if (decliners.length) {
      bullets.push(
        `Notable provincial declines: ${decliners
          .map((e) => `${e.name} (${formatPctValue(e.growth, { signed: true })})`)
          .join(", ")}.`
      );
    }
    provinces = { title: `Provincial leaders · ${yearTo}`, ranks, bullets };
  }

  return {
    title: CONFIG.title || "Production Dashboard",
    slug: CONFIG.slug || "dashboard",
    crop: productLabel,
    generatedAt,
    generatedLabel: generatedAt.toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    scope,
    headline,
    headlineSentiment,
    performanceStats,
    yoy,
    trend,
    growthPattern,
    enso,
    ecosystem,
    priorityCrops,
    topCrops,
    regions,
    provinces,
    takeaways: takeaways.slice(0, 7),
    sourceNote:
      "Source: Philippine Statistics Authority (PSA) OpenStat, processed by Data Analytics Platform (PSA OpenSTAT) · Department of Agriculture. ENSO phases follow NOAA CPC RONI.",
  };
}

function renderRankCards(ranks) {
  if (!ranks?.length) return "";
  return `<div class="analysis-ranks">${ranks
    .map(
      (r) => `<article class="analysis-rank-card">
      <span class="analysis-rank-badge">#${r.rank}</span>
      <div class="analysis-rank-body">
        <strong class="analysis-rank-name">${escapeHtml(r.name)}</strong>
        <span class="analysis-rank-meta">${escapeHtml(r.volume)}${
          r.share ? ` · ${escapeHtml(r.share)} share` : ""
        }</span>
      </div>
      ${
        r.growth
          ? `<span class="analysis-rank-growth is-${r.tone || "neutral"}">${escapeHtml(
              r.growth
            )}</span>`
          : ""
      }
    </article>`
    )
    .join("")}</div>`;
}

function renderSmartAnalysisHtml(model) {
  if (!model) {
    return `<p class="analysis-empty">No dashboard data is loaded yet. Adjust filters or wait for data to finish loading, then try again.</p>`;
  }

  const scopeChips = model.scope.chips
    .map(
      (chip) =>
        `<span class="analysis-scope-chip${chip.narrowed ? " is-narrowed" : ""}"><span class="analysis-scope-chip-label">${escapeHtml(
          chip.label
        )}</span><span class="analysis-scope-chip-value">${escapeHtml(chip.text)}</span></span>`
    )
    .join("");

  const statsHtml = (stats) =>
    stats?.length
      ? `<div class="analysis-stats">${stats
          .map((s) => analysisStat(s.label, s.value, s.meta || "", s.tone || ""))
          .join("")}</div>`
      : "";

  const performanceBody = `
    <div class="analysis-hero">
      <span class="analysis-sentiment is-${model.headlineSentiment}">${escapeHtml(
        model.headlineSentimentLabel || sentimentLabel(model.headlineSentiment)
      )}</span>
      <p class="analysis-lead">${escapeHtml(model.headline)}</p>
      <p class="analysis-text">${escapeHtml(model.scope.narrative)}</p>
    </div>
    ${statsHtml(model.performanceStats)}
  `;

  const yoyBody = model.yoy
    ? `<p class="analysis-text">${escapeHtml(model.yoy.text)}</p>${statsHtml(model.yoy.stats)}`
    : `<p class="analysis-text">${
        model.mode === "farmgate"
          ? `Latest-versus-previous ${farmgatePeriodNoun()} comparison is not available for the current filters.`
          : "Year-over-year comparison is not available for the current filters."
      }</p>`;

  const trendBody = model.trend
    ? `${statsHtml(model.trend.stats)}${analysisList(model.trend.bullets)}`
    : `<p class="analysis-text">${
        model.mode === "farmgate"
          ? "No annual farmgate price points are available for the current filters."
          : "No annual trend points are available for the current filters."
      }</p>`;

  const growthBody = model.growthPattern
    ? `${statsHtml(model.growthPattern.stats)}${analysisList(model.growthPattern.bullets)}`
    : `<p class="analysis-text">${
        model.mode === "farmgate"
          ? "Year-on-year price movement needs consecutive years with farmgate prices."
          : "Year-on-year growth series is not available for this selection (needs consecutive years with production volume)."
      }</p>`;

  const ensoBody =
    model.mode === "farmgate"
      ? ""
      : model.enso
        ? analysisList(model.enso.bullets)
        : `<p class="analysis-text">ENSO relativity is unavailable for the current filters (needs overlapping El Niño / La Niña years in the selected range).</p>`;

  const seasonalityBody = model.seasonality
    ? `${statsHtml(model.seasonality.stats)}${analysisList(model.seasonality.bullets)}`
    : "";

  const priceVolumeBody = model.priceVolume
    ? `${statsHtml(model.priceVolume.stats)}${analysisList(model.priceVolume.bullets)}`
    : "";

  const ecosystemBody = model.ecosystem
    ? `${statsHtml(model.ecosystem.stats)}${analysisList(model.ecosystem.bullets)}`
    : "";

  const priorityCropsBody = model.priorityCrops
    ? `${statsHtml(model.priorityCrops.stats)}${analysisList(model.priorityCrops.bullets)}`
    : "";

  const topCropsBody = model.topCrops
    ? `${renderRankCards(model.topCrops.ranks)}${analysisList(model.topCrops.bullets)}`
    : "";

  const regionBody = model.regions
    ? `${renderRankCards(model.regions.ranks)}${analysisList(model.regions.bullets)}`
    : `<p class="analysis-text">${
        model.mode === "farmgate"
          ? "No regional farmgate prices are available for the current filters."
          : "No regional comparison rows are available for the current filters."
      }</p>`;

  const provinceBody = model.provinces
    ? `${renderRankCards(model.provinces.ranks)}${analysisList(model.provinces.bullets)}`
    : `<p class="analysis-text">${
        model.mode === "farmgate"
          ? "No provincial farmgate prices are available for the current filters."
          : "No provincial comparison rows are available for the current filters."
      }</p>`;

  const takeawaysBody = model.takeaways.length
    ? analysisList(model.takeaways, { ordered: true })
    : "";

  return `
    <div class="analysis-report${model.mode === "farmgate" ? " is-farmgate-price-analysis" : ""}">
    <div class="analysis-meta-bar">
      <span>Generated ${escapeHtml(model.generatedLabel)}</span>
      <span>${escapeHtml(model.crop)} · ${
        model.mode === "farmgate" ? "farmgate price report" : "filter-aware report"
      }</span>
    </div>
    <div class="analysis-scope">${scopeChips}</div>
    ${analysisSection("Executive summary", performanceBody, { accent: true })}
    ${model.mode === "farmgate" ? "" : analysisSection(model.yoy?.title || "Year-over-year", yoyBody)}
    ${analysisSection(model.trend?.title || "Trend", trendBody)}
    ${model.mode === "farmgate" ? "" : analysisSection(model.enso?.title || "El Niño / La Niña relativity", ensoBody)}
    ${analysisSection(model.growthPattern?.title || "Year-on-year growth pattern", growthBody)}
    ${model.seasonality ? analysisSection(model.seasonality.title, seasonalityBody) : ""}
    ${model.priceVolume ? analysisSection(model.priceVolume.title, priceVolumeBody) : ""}
    ${analysisSection(model.priorityCrops?.title || "Priority crops", priorityCropsBody)}
    ${analysisSection(model.topCrops?.title || "Top crops", topCropsBody)}
    ${analysisSection(model.ecosystem?.title || "Ecosystem mix", ecosystemBody)}
    ${analysisSection(model.regions?.title || "Regional leaders", regionBody)}
    ${analysisSection(model.provinces?.title || "Provincial leaders", provinceBody)}
    ${analysisSection("Key takeaways", takeawaysBody, { accent: true })}
    <p class="analysis-source">${escapeHtml(model.sourceNote)}</p>
    </div>
  `;
}

function buildSmartAnalysisReport(snapshot) {
  latestAnalysisModel = buildSmartAnalysisModel(snapshot);
  return renderSmartAnalysisHtml(latestAnalysisModel);
}

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-jspdf]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jspdf.jsPDF));
      existing.addEventListener("error", () => reject(new Error("Failed to load PDF library")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
    script.async = true;
    script.dataset.jspdf = "true";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error("Failed to load PDF library"));
    document.head.appendChild(script);
  });
}

function analysisPdfFilename(model) {
  const stamp = (model?.generatedAt || new Date()).toISOString().slice(0, 10);
  const yearFrom = model?.scope?.year_from ?? "";
  const yearTo = model?.scope?.year_to ?? "";
  const slug = model?.slug || CONFIG.slug || "dashboard";
  return `${slug}-smart-analysis_${yearFrom}-${yearTo}_${stamp}.pdf`;
}

/** jsPDF Helvetica is WinAnsi-only; Unicode punctuation breaks glyph layout. */
function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/\u2212/g, "-") // minus sign −
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-") // hyphen/dashes
    .replace(/\u00AD/g, "") // soft hyphen
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u2022|\u00B7|\u2027|\u2219/g, "-") // bullets / middle dots
    .replace(/\u2192|\u2794|\u279C/g, "->")
    .replace(/\u00A0|\u202F|\u2007|\u2009/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

async function downloadSmartAnalysisPdf(model) {
  if (!model) throw new Error("No analysis available to download.");
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const marginTop = 18;
  const marginBottom = 18;
  const maxWidth = pageWidth - marginX * 2;
  let y = marginTop;
  let page = 1;

  const ensureSpace = (needed = 8) => {
    if (y + needed <= pageHeight - marginBottom) return;
    doc.addPage();
    page += 1;
    y = marginTop;
  };

  const writeWrapped = (text, { size = 10, style = "normal", color = [33, 37, 41], gap = 4 } = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(sanitizePdfText(text), maxWidth);
    for (const line of lines) {
      ensureSpace(size * 0.45 + 2);
      doc.text(line, marginX, y);
      y += size * 0.45 + 1.2;
    }
    y += gap;
  };

  const writeSectionTitle = (title) => {
    ensureSpace(14);
    y += 2;
    doc.setDrawColor(12, 26, 98);
    doc.setFillColor(12, 26, 98);
    doc.rect(marginX, y - 3.5, 1.6, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(12, 26, 98);
    doc.text(sanitizePdfText(title).toUpperCase(), marginX + 4, y);
    y += 7;
  };

  const writeBullets = (items) => {
    for (const item of items || []) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(33, 37, 41);
      const lines = doc.splitTextToSize(sanitizePdfText(`-  ${item}`), maxWidth);
      for (const line of lines) {
        ensureSpace(7);
        doc.text(line, marginX, y);
        y += 5.2;
      }
      y += 1;
    }
    y += 2;
  };

  const writeStats = (stats) => {
    for (const stat of stats || []) {
      writeWrapped(`${stat.label}: ${stat.value}${stat.meta ? `  (${stat.meta})` : ""}`, {
        size: 10,
        style: "normal",
        gap: 1.5,
      });
    }
    y += 2;
  };

  // Cover header
  doc.setFillColor(6, 64, 43);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Smart Analysis Report", marginX, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(sanitizePdfText(model.title), marginX, 19);
  doc.text(sanitizePdfText(`Generated ${model.generatedLabel}`), marginX, 25);
  y = 36;

  writeWrapped(`Outlook: ${model.headlineSentimentLabel || sentimentLabel(model.headlineSentiment)}`, {
    size: 11,
    style: "bold",
    color: [12, 26, 98],
    gap: 2,
  });
  writeWrapped(model.headline, { size: 11, style: "bold", gap: 3 });
  writeWrapped(model.scope.narrative, { size: 10, gap: 4 });

  writeSectionTitle("Active filters");
  for (const chip of model.scope.chips) {
    writeWrapped(`${chip.label}: ${chip.text}${chip.narrowed ? "  [filtered]" : ""}`, {
      size: 10,
      gap: 1,
    });
  }
  y += 2;

  writeSectionTitle("Executive summary");
  writeStats(model.performanceStats);

  if (model.yoy) {
    writeSectionTitle(model.yoy.title);
    writeWrapped(model.yoy.text, { size: 10, gap: 2 });
    writeStats(model.yoy.stats);
  }

  if (model.trend) {
    writeSectionTitle(model.trend.title);
    writeStats(model.trend.stats);
    writeBullets(model.trend.bullets);
  }

  if (model.enso) {
    writeSectionTitle(model.enso.title);
    writeBullets(model.enso.bullets);
  }

  if (model.growthPattern) {
    writeSectionTitle(model.growthPattern.title);
    writeStats(model.growthPattern.stats);
    writeBullets(model.growthPattern.bullets);
  }

  if (model.seasonality) {
    writeSectionTitle(model.seasonality.title);
    writeStats(model.seasonality.stats);
    writeBullets(model.seasonality.bullets);
  }

  if (model.priceVolume) {
    writeSectionTitle(model.priceVolume.title);
    writeStats(model.priceVolume.stats);
    writeBullets(model.priceVolume.bullets);
  }

  if (model.priorityCrops) {
    writeSectionTitle(model.priorityCrops.title);
    writeStats(model.priorityCrops.stats);
    writeBullets(model.priorityCrops.bullets);
  }

  const growthKind = model.growthKind || "YoY";
  if (model.topCrops) {
    writeSectionTitle(model.topCrops.title);
    writeBullets(
      model.topCrops.ranks.map(
        (r) =>
          `#${r.rank} ${r.name}: ${r.volume}` +
          (r.share ? ` (${r.share} share)` : "") +
          (r.growth ? `, ${growthKind} ${r.growth}` : "")
      )
    );
    writeBullets(model.topCrops.bullets);
  }

  if (model.ecosystem) {
    writeSectionTitle(model.ecosystem.title);
    writeStats(model.ecosystem.stats);
    writeBullets(model.ecosystem.bullets);
  }

  if (model.regions) {
    writeSectionTitle(model.regions.title);
    writeBullets(
      model.regions.ranks.map(
        (r) =>
          `#${r.rank} ${r.name}: ${r.volume}` +
          (r.share ? ` (${r.share} share)` : "") +
          (r.growth ? `, ${growthKind} ${r.growth}` : "")
      )
    );
    writeBullets(model.regions.bullets);
  }

  if (model.provinces) {
    writeSectionTitle(model.provinces.title);
    writeBullets(
      model.provinces.ranks.map(
        (r) =>
          `#${r.rank} ${r.name}: ${r.volume}` + (r.growth ? ` (${r.growth} ${growthKind})` : "")
      )
    );
    writeBullets(model.provinces.bullets);
  }

  if (model.takeaways.length) {
    writeSectionTitle("Key takeaways");
    writeBullets(model.takeaways.map((t, i) => `${i + 1}. ${t}`));
  }

  writeWrapped(model.sourceNote, { size: 8, color: [100, 116, 110], gap: 0 });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 125);
    doc.text(
      `${model.pdfFooter || "AgriStat · Department of Agriculture"} · Page ${i} of ${totalPages}`,
      marginX,
      pageHeight - 8
    );
  }

  doc.save(analysisPdfFilename(model));
}

const SMART_ANALYSIS_LOAD_MIN_MS = 2600;

function smartAnalysisLoadingSteps() {
  if (isPriceMode()) {
    return [
      "Aligning filters with farmgate price view",
      "Pulling PSA OpenSTAT price series",
      "Computing period-over-period movement",
      "Mapping high and low price bounds",
      "Composing market narrative",
    ];
  }
  return [
    "Applying dashboard filters",
    "Refreshing production aggregates",
    "Analyzing volume, area, and yield trends",
    "Ranking regions and top movers",
    "Generating filter-aware insights",
  ];
}

function renderSmartAnalysisLoadingHtml() {
  const steps = smartAnalysisLoadingSteps();
  const stepItems = steps
    .map(
      (label, index) =>
        `<li class="analysis-pipeline-step" data-step="${index}"><span class="analysis-pipeline-step-icon" aria-hidden="true"></span><span class="analysis-pipeline-step-label">${escapeHtml(label)}</span></li>`
    )
    .join("");
  const firstStep = steps[0] || "Preparing analysis";
  return `
    <div class="analysis-pipeline" aria-live="polite" aria-busy="true">
      <div class="analysis-pipeline-visual" aria-hidden="true">
        <div class="analysis-pipeline-orbit">
          <span class="analysis-pipeline-orbit-ring"></span>
          <span class="analysis-pipeline-orbit-ring analysis-pipeline-orbit-ring--delay"></span>
          <span class="analysis-pipeline-orbit-core"></span>
          <span class="analysis-pipeline-orbit-dot analysis-pipeline-orbit-dot--1"></span>
          <span class="analysis-pipeline-orbit-dot analysis-pipeline-orbit-dot--2"></span>
          <span class="analysis-pipeline-orbit-dot analysis-pipeline-orbit-dot--3"></span>
        </div>
        <div class="analysis-pipeline-scan"></div>
        <div class="analysis-pipeline-grid"></div>
      </div>
      <p class="analysis-pipeline-kicker">Smart Analysis</p>
      <p class="analysis-pipeline-title">Analyzing your data</p>
      <p class="analysis-pipeline-status" id="smartAnalysisLoadStatus">${escapeHtml(firstStep)}…</p>
      <div class="analysis-pipeline-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Analysis progress">
        <div class="analysis-pipeline-progress-bar" id="smartAnalysisLoadProgress"></div>
      </div>
      <ol class="analysis-pipeline-steps" id="smartAnalysisLoadSteps">${stepItems}</ol>
    </div>
  `;
}

function startSmartAnalysisLoadingUI(body) {
  body.innerHTML = renderSmartAnalysisLoadingHtml();
  body.classList.remove("analysis-report-enter", "is-visible");
  const panel = body.closest(".app-modal-panel");
  panel?.classList.add("is-analysis-loading");

  const statusEl = body.querySelector("#smartAnalysisLoadStatus");
  const progressBar = body.querySelector("#smartAnalysisLoadProgress");
  const progressRoot = body.querySelector(".analysis-pipeline-progress");
  const stepEls = [...body.querySelectorAll(".analysis-pipeline-step")];
  const steps = smartAnalysisLoadingSteps();
  let stepIndex = 0;
  let progress = 0;
  stepEls[0]?.classList.add("is-active");

  const timer = window.setInterval(() => {
    progress = Math.min(progress + 2.5 + Math.random() * 5.5, 94);
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressRoot) progressRoot.setAttribute("aria-valuenow", String(Math.round(progress)));

    const nextThreshold = ((stepIndex + 1) / steps.length) * 88;
    if (progress >= nextThreshold && stepIndex < steps.length - 1) {
      stepEls[stepIndex]?.classList.remove("is-active");
      stepEls[stepIndex]?.classList.add("is-done");
      stepIndex += 1;
      stepEls[stepIndex]?.classList.add("is-active");
      if (statusEl) statusEl.textContent = `${steps[stepIndex]}…`;
    }
  }, 150);

  const finish = () => {
    window.clearInterval(timer);
    stepEls.forEach((el) => {
      el.classList.remove("is-active");
      el.classList.add("is-done");
    });
    if (progressBar) progressBar.style.width = "100%";
    if (progressRoot) progressRoot.setAttribute("aria-valuenow", "100");
    if (statusEl) statusEl.textContent = "Analysis ready";
    panel?.classList.remove("is-analysis-loading");
    body.querySelector(".analysis-pipeline")?.setAttribute("aria-busy", "false");
  };

  const destroy = () => {
    window.clearInterval(timer);
    panel?.classList.remove("is-analysis-loading");
  };

  return { finish, destroy };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ensureSmartAnalysisModal() {
  let modal = document.getElementById("smartAnalysisModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "smartAnalysisModal";
  modal.className = "app-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "smartAnalysisTitle");
  modal.innerHTML = `
    <div class="app-modal-backdrop" data-analysis-dismiss="true"></div>
    <div class="app-modal-panel app-modal-panel-analysis">
      <div class="app-modal-analysis-header">
        <div>
          <h2 class="app-modal-title" id="smartAnalysisTitle">Smart Analysis</h2>
          <p class="app-modal-analysis-sub" id="smartAnalysisSub">Filter-aware summary of the current dashboard view</p>
        </div>
        <button type="button" class="app-modal-close" data-analysis-dismiss="true" aria-label="Close analysis">×</button>
      </div>
      <div class="app-modal-analysis-body" id="smartAnalysisBody">
        <p class="analysis-loading">Building analysis…</p>
      </div>
      <div class="app-modal-analysis-footer">
        <button type="button" class="app-modal-btn app-modal-btn-secondary" data-analysis-dismiss="true">Close</button>
        <button type="button" class="app-modal-btn app-modal-btn-primary" id="smartAnalysisDownloadPdf" disabled>
          Download PDF
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

async function openSmartAnalysisModal() {
  const modal = ensureSmartAnalysisModal();
  if (!modal.hidden) return;

  const body = modal.querySelector("#smartAnalysisBody");
  const sub = modal.querySelector("#smartAnalysisSub");
  const downloadBtn = modal.querySelector("#smartAnalysisDownloadPdf");
  const previouslyFocused = document.activeElement;
  const closeBtn = modal.querySelector(".app-modal-close");

  let loadingUi = null;

  const close = () => {
    loadingUi?.destroy();
    loadingUi = null;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modal.removeEventListener("keydown", onKeyDown);
    modal.querySelectorAll("[data-analysis-dismiss]").forEach((el) => {
      el.removeEventListener("click", onDismiss);
    });
    downloadBtn?.removeEventListener("click", onDownload);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };

  const onDismiss = () => close();
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const onDownload = async () => {
    if (!latestAnalysisModel || !downloadBtn) return;
    const original = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing PDF…";
    try {
      await downloadSmartAnalysisPdf(latestAnalysisModel);
    } catch (err) {
      downloadBtn.textContent = "Download failed";
      setTimeout(() => {
        downloadBtn.textContent = original;
        downloadBtn.disabled = false;
      }, 1600);
      return;
    }
    downloadBtn.textContent = "Downloaded";
    setTimeout(() => {
      downloadBtn.textContent = original;
      downloadBtn.disabled = false;
    }, 1200);
  };

  modal.querySelectorAll("[data-analysis-dismiss]").forEach((el) => {
    el.addEventListener("click", onDismiss);
  });
  downloadBtn?.addEventListener("click", onDownload);
  modal.addEventListener("keydown", onKeyDown);

  if (body) loadingUi = startSmartAnalysisLoadingUI(body);
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Download PDF";
  }
  if (sub) {
    const { year_from, year_to } = getYearRange();
    sub.textContent = isPriceMode()
      ? `${CONFIG.title} · farmgate price analysis · ${year_from}–${year_to}`
      : `${CONFIG.title} · ${year_from}–${year_to} · updates with your filters`;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => closeBtn?.focus());

  try {
    await Promise.all([refreshDashboard(), delay(SMART_ANALYSIS_LOAD_MIN_MS)]);
    latestAnalysisModel = buildSmartAnalysisModel(dashboardSnapshot);
    loadingUi?.finish();
    await delay(380);
    if (body) {
      body.innerHTML = renderSmartAnalysisHtml(latestAnalysisModel);
      body.classList.add("analysis-report-enter");
      requestAnimationFrame(() => {
        body.classList.add("is-visible");
      });
    }
    if (downloadBtn) downloadBtn.disabled = !latestAnalysisModel;
  } catch (err) {
    latestAnalysisModel = null;
    loadingUi?.destroy();
    loadingUi = null;
    if (body) {
      body.innerHTML = `<p class="analysis-empty">Could not build analysis: ${escapeHtml(
        err.message || "Unknown error"
      )}</p>`;
    }
    if (downloadBtn) downloadBtn.disabled = true;
  }
}

function bindSmartAnalysis() {
  const btn = document.getElementById("smartAnalysisBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    openSmartAnalysisModal().catch(() => {});
  });
}

function chartExpandSupportsProductionForecast(kind) {
  return (
    (kind === "trend" || kind === "ecosystem" || kind === "yield") &&
    !isPriceMode() &&
    CONFIG.showAreaYield !== false
  );
}

function chartExpandForecastGrainSupported(grain) {
  return grain === "year" || grain === "quarter" || grain === "semester";
}

function chartExpandForecastActive(kind, grain) {
  return (
    chartExpandShowForecast &&
    chartExpandSupportsProductionForecast(kind) &&
    chartExpandForecastGrainSupported(grain)
  );
}

function chartExpandForecastRangeLabel(grain) {
  if (grain === "year") return "2026–2027";
  if (grain === "semester") return "S2 2026–S2 2027";
  return "Q4 2026–Q4 2027";
}

function chartExpandPeriodIsBefore(a, b) {
  if (a.year !== b.year) return a.year < b.year;
  return a.quarter < b.quarter;
}

function chartExpandDatasetIsForecast(dataset) {
  return /forecast/i.test(String(dataset?.label || ""));
}

function ensoMetaForForecastQuarter(year, quarter) {
  const key = `${year}-Q${quarter}`;
  if (ensoOutlookByQuarter?.[key]?.phase) {
    return { ...ensoOutlookByQuarter[key], outlook: true };
  }
  return ensoByQuarter?.[key] || null;
}

function summarizeEnsoMetasForYear(metas) {
  if (!metas?.length) return null;
  let hasEl = false;
  let hasLa = false;
  let elPeak = null;
  let laPeak = null;
  let elIntensity = null;
  let laIntensity = null;
  let anyOutlook = false;
  for (const m of metas) {
    if (!m?.phase || m.phase === "neutral") continue;
    if (m.outlook) anyOutlook = true;
    const peak = m.peak_roni;
    if (m.phase === "el_nino") {
      hasEl = true;
      if (peak != null && (elPeak == null || peak > elPeak)) {
        elPeak = peak;
        elIntensity = m.intensity;
      }
    } else if (m.phase === "la_nina") {
      hasLa = true;
      if (peak != null && (laPeak == null || peak < laPeak)) {
        laPeak = peak;
        laIntensity = m.intensity;
      }
    }
  }
  if (hasEl && hasLa) {
    return {
      phase: "both",
      outlook: anyOutlook,
      el_nino_peak_roni: elPeak,
      la_nina_peak_roni: laPeak,
      el_nino_intensity: elIntensity,
      la_nina_intensity: laIntensity,
      intensity: elIntensity,
      peak_roni: elPeak,
    };
  }
  if (hasEl) {
    return {
      phase: "el_nino",
      peak_roni: elPeak,
      intensity: elIntensity || ensoIntensityFromRoni(elPeak),
      outlook: anyOutlook,
    };
  }
  if (hasLa) {
    return {
      phase: "la_nina",
      peak_roni: laPeak,
      intensity: laIntensity || ensoIntensityFromRoni(laPeak),
      outlook: anyOutlook,
    };
  }
  return null;
}

/** RONI outlook summary for a forecast calendar year (outlook quarters + forecast horizons). */
function ensoMetaForForecastYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  const metas = [];
  const seen = new Set();
  for (const key of Object.keys(ensoOutlookByQuarter || {})) {
    if (!key.startsWith(`${y}-Q`)) continue;
    seen.add(key);
    const meta = ensoOutlookByQuarter[key];
    if (meta?.phase) metas.push({ ...meta, outlook: true });
  }
  for (const h of CHART_EXPAND_FORECAST_HORIZONS) {
    if (h.year !== y) continue;
    const key = `${h.year}-Q${h.quarter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = ensoMetaForForecastQuarter(h.year, h.quarter);
    if (meta?.phase && meta.phase !== "neutral") metas.push(meta);
  }
  return summarizeEnsoMetasForYear(metas);
}

function buildEnsoOutlookYearOverrides(forecastRows) {
  const map = {};
  if (!chartExpandShowForecast) return map;
  for (const row of forecastRows || []) {
    const y = Number(row.year);
    if (!Number.isFinite(y)) continue;
    const meta = ensoMetaForForecastYear(y);
    if (meta?.phase) map[String(y)] = meta;
  }
  return map;
}

const ENSO_FORECAST_INTENSITY_WEIGHT = {
  weak: 0.35,
  moderate: 0.55,
  strong: 0.75,
  very_strong: 0.9,
};

function buildEnsoMetricPhaseRatios(historicalRows, metricKey, quarter = null) {
  const buckets = { el_nino: [], la_nina: [], neutral: [] };
  const scoped =
    quarter != null
      ? historicalRows.filter((r) => r.quarter === quarter)
      : historicalRows;
  for (const row of scoped) {
    const value = row[metricKey];
    if (!Number.isFinite(value)) continue;
    const phase = ensoByQuarter?.[`${row.year}-Q${row.quarter}`]?.phase || "neutral";
    if (phase === "el_nino") buckets.el_nino.push(value);
    else if (phase === "la_nina") buckets.la_nina.push(value);
    else buckets.neutral.push(value);
  }
  const allValues = scoped.map((r) => r[metricKey]).filter((v) => Number.isFinite(v));
  const reference = avgFinite(buckets.neutral) ?? avgFinite(allValues);
  return {
    reference,
    nino: avgFinite(buckets.el_nino),
    nina: avgFinite(buckets.la_nina),
    sampleQuarter: quarter,
  };
}

function ensoForecastMultiplier(phase, intensity, peakRoni, ratios) {
  if (!phase || phase === "neutral" || phase === "both") return 1;
  const ref = ratios?.reference;
  if (!ref || ref <= 0) return 1;
  const phaseAvg = phase === "el_nino" ? ratios.nino : phase === "la_nina" ? ratios.nina : null;
  if (phaseAvg == null || !Number.isFinite(phaseAvg)) return 1;
  const rawRatio = phaseAvg / ref;
  const intensityKey =
    intensity || ensoIntensityFromRoni(peakRoni) || "moderate";
  const weight = ENSO_FORECAST_INTENSITY_WEIGHT[intensityKey] ?? 0.5;
  const adjusted = 1 + weight * (rawRatio - 1);
  return Math.max(0.75, Math.min(1.25, adjusted));
}

function applyEnsoToQuarterlyProjection(projected, horizon, historicalRows, metricKey) {
  if (projected == null || !Number.isFinite(projected)) {
    return { projected, ensoMultiplier: 1, ensoNote: "" };
  }
  const enso = ensoMetaForForecastQuarter(horizon.year, horizon.quarter);
  if (!enso?.phase || enso.phase === "neutral" || enso.phase === "both") {
    return { projected, ensoMultiplier: 1, ensoNote: "" };
  }
  let ratios = buildEnsoMetricPhaseRatios(historicalRows, metricKey, horizon.quarter);
  if (ratios.nino == null && ratios.nina == null) {
    ratios = buildEnsoMetricPhaseRatios(historicalRows, metricKey, null);
  }
  const ensoMultiplier = ensoForecastMultiplier(
    enso.phase,
    enso.intensity,
    enso.peak_roni,
    ratios
  );
  if (Math.abs(ensoMultiplier - 1) < 0.005) {
    return { projected, ensoMultiplier: 1, ensoNote: "" };
  }
  let adjusted = projected * ensoMultiplier;
  if (adjusted < 0) adjusted = 0;
  const phaseLabel = ensoPhaseLabel(enso.phase);
  const ensoNote = ` ENSO factor ×${ensoMultiplier.toFixed(2)} for ${phaseLabel} (same-quarter history vs neutral baseline).`;
  return { projected: adjusted, ensoMultiplier, ensoNote };
}

function ensureChartExpandFooter(modal) {
  const body = modal?.querySelector(".chart-expand-body");
  if (!body) return null;
  modal.querySelector("#chartExpandForecastMethodology")?.remove();
  let footer = body.querySelector(".chart-expand-footer");
  if (!footer) {
    footer = document.createElement("div");
    footer.className = "chart-expand-footer";
    body.appendChild(footer);
  }
  const legend = modal.querySelector("#chartExpandEnsoLegend");
  if (legend && legend.parentElement !== footer) footer.appendChild(legend);
  return footer;
}

function normalizeServerForecastHorizons(horizons) {
  const byKey = new Map();
  for (const h of horizons || []) {
    if (h?.year != null && h?.quarter != null) {
      byKey.set(`${h.year}-Q${h.quarter}`, h);
    }
  }
  return CHART_EXPAND_FORECAST_HORIZONS.map((target) => {
    const hit = byKey.get(`${target.year}-Q${target.quarter}`);
    return (
      hit || {
        year: target.year,
        quarter: target.quarter,
        volume_mt: null,
        area_ha: null,
        skipped: false,
        volume_skipped: false,
        area_skipped: false,
      }
    );
  });
}

function formatForecastWarningText(warning) {
  return String(warning || "")
    .replace(/\bvolume_mt\b/g, "production volume")
    .replace(/\barea_ha\b/g, "area harvested");
}

function setChartExpandForecastLoading(modal, loading) {
  const wrap = modal?.querySelector(".chart-expand-canvas-wrap");
  if (!wrap) return;
  wrap.classList.toggle("is-loading", Boolean(loading));
  wrap.setAttribute("aria-busy", loading ? "true" : "false");
}

function ensureChartExpandForecastWarnings(modal) {
  if (!modal) return null;
  let el = modal.querySelector("#chartExpandForecastWarnings");
  if (!el) {
    const note = modal.querySelector("#chartExpandForecastNote");
    el = document.createElement("p");
    el.id = "chartExpandForecastWarnings";
    el.className = "chart-expand-forecast-warnings";
    el.hidden = true;
    if (note?.parentNode) note.parentNode.insertBefore(el, note.nextSibling);
    else modal.querySelector(".chart-expand-body")?.appendChild(el);
  }
  return el;
}

function refreshChartExpandForecastPresentation(modal, kind, grain) {
  syncChartExpandForecastChrome(modal, kind);
  const sub = modal?.querySelector("#chartExpandSub");
  const legend = modal?.querySelector("#chartExpandEnsoLegend");
  const warningsEl = ensureChartExpandForecastWarnings(modal);

  if (!chartExpandForecastActive(kind, grain)) {
    if (warningsEl) warningsEl.hidden = true;
    return;
  }

  const methodMeta = chartExpandForecastMethodMeta();
  const grainLabel =
    grain === "year" ? "Annual" : grain === "semester" ? "Semester" : "Quarterly";
  if (sub) {
    sub.textContent = `${grainLabel} forecast (${chartExpandForecastRangeLabel(grain)}): ${methodMeta.label} with NOAA RONI El Niño / La Niña adjustment.`;
  }

  if (warningsEl) {
    const lines = (chartExpandLastForecastWarnings || []).map(formatForecastWarningText).filter(Boolean);
    if (lines.length) {
      warningsEl.hidden = false;
      warningsEl.textContent = lines.slice(0, 3).join(" ");
    } else {
      warningsEl.hidden = true;
      warningsEl.textContent = "";
    }
  }

  if (legend) {
    let legendHtml = ensoLegendHtml({ compact: true });
    if (ensoOutlookByQuarter && Object.keys(ensoOutlookByQuarter).length) {
      legendHtml +=
        '<p class="enso-legend-note">Forecast shading uses NOAA CPC ' +
        '<a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/outlook/" target="_blank" rel="noopener noreferrer">RONI outlook</a> ' +
        "for projected 2026–2027 bars (not the observed calendar-year phase). " +
        "Without forecast, each year uses observed RONI episode rules—for example 2026 is La Niña from early-year conditions, " +
        "while the outlook window is El Niño. " +
        `${methodMeta.label}: ${methodMeta.methodBlurb || methodMeta.short}</p>`;
    } else {
      legendHtml +=
        '<p class="enso-legend-note">RONI outlook did not load — ENSO adjustment may be limited until <code>/api/enso</code> includes outlook data.</p>';
    }
    legend.innerHTML = legendHtml;
    bindEnsoGuideTriggers(legend);
  }
}

function serverHorizonToPeriod(h, historicalRows, metricKey, metricLabel) {
  const horizon = { year: h.year, quarter: h.quarter };
  const skipped = Boolean(metricKey === "volume_mt" ? h.volume_skipped : h.area_skipped);
  let projected = skipped ? null : h[metricKey];
  if (projected != null && Number.isFinite(Number(projected)) && wantsEnsoOverlay()) {
    projected = applyEnsoToQuarterlyProjection(
      Number(projected),
      horizon,
      historicalRows,
      metricKey
    ).projected;
  }
  return {
    horizon,
    fullLabel: `Q${h.quarter} ${h.year}`,
    quarterLabel: `Q${h.quarter}`,
    skipped,
    metricLabel,
    metricKey,
    projected,
    methodNote: chartExpandForecastMethodMeta().short,
  };
}

function forecastQuarterlyApiParams(method, cropSubtype = null) {
  const params = { ...commonParams(), method };
  if (cropSubtype) {
    params.crop_subtype = [cropSubtype];
  }
  return params;
}

async function fetchServerForecastPeriods(historicalRows, method, { cropSubtype = null } = {}) {
  const data = await api(
    `/api/forecast/quarterly?${qs(forecastQuarterlyApiParams(method, cropSubtype))}`
  );
  chartExpandLastForecastWarnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const horizons = normalizeServerForecastHorizons(data?.horizons || []);
  const volumePeriods = horizons.map((h) =>
    serverHorizonToPeriod(h, historicalRows, "volume_mt", "Production volume")
  );
  const areaPeriods = horizons.map((h) =>
    serverHorizonToPeriod(h, historicalRows, "area_ha", "Area harvested")
  );
  return { volumePeriods, areaPeriods };
}

async function buildQuarterlyProductionForecast(
  quarterlyPoints,
  { cropSubtype = null, updateGlobalSnapshot = true } = {}
) {
  const scopedPoints = cropSubtype
    ? (quarterlyPoints || []).filter((p) => p.crop_subtype === cropSubtype)
    : quarterlyPoints || [];
  const historicalRows = scopedPoints
    .map((p) => ({
      year: Number(p.year),
      quarter: Number(p.quarter),
      volume_mt: p.volume_mt != null && !Number.isNaN(Number(p.volume_mt)) ? Number(p.volume_mt) : null,
      area_ha: p.area_ha != null && !Number.isNaN(Number(p.area_ha)) ? Number(p.area_ha) : null,
    }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.quarter));

  if (updateGlobalSnapshot) {
    chartExpandLastForecastWarnings = [];
    chartExpandLastForecastSnapshot = null;
  }
  let volumePeriods;
  let areaPeriods;
  const method = normalizeChartExpandForecastMethod(chartExpandForecastMethod);
  chartExpandForecastMethod = method;
  const subtypeNote = cropSubtype ? ` (${cropSubtype})` : "";
  try {
    ({ volumePeriods, areaPeriods } = await fetchServerForecastPeriods(historicalRows, method, {
      cropSubtype,
    }));
  } catch (err) {
    const warnings = [
      `Could not run ${chartExpandForecastMethodMeta(method).label}${subtypeNote} on the server (${err.message || "error"}).`,
    ];
    if (method !== "seasonal_naive") {
      try {
        ({ volumePeriods, areaPeriods } = await fetchServerForecastPeriods(
          historicalRows,
          "seasonal_naive",
          { cropSubtype }
        ));
        warnings.push(`Showing seasonal naive instead${subtypeNote}.`);
      } catch (fallbackErr) {
        warnings.push(fallbackErr.message || "Seasonal naive fallback failed.");
        volumePeriods = [];
        areaPeriods = [];
      }
    } else {
      volumePeriods = [];
      areaPeriods = [];
    }
    chartExpandLastForecastWarnings = warnings;
    if (!volumePeriods?.length && !areaPeriods?.length) {
      return [];
    }
  }

  const forecastRows = CHART_EXPAND_FORECAST_HORIZONS.map((horizon, index) => {
    const vol = volumePeriods[index];
    const area = areaPeriods[index];
    if (vol?.skipped && area?.skipped) return null;
    return {
      year: horizon.year,
      period: horizon.quarter,
      volume_mt: vol?.skipped ? null : vol?.projected ?? null,
      area_ha: area?.skipped ? null : area?.projected ?? null,
      isForecast: true,
      label: `Q${horizon.quarter}`,
      fullLabel: `Q${horizon.quarter} ${horizon.year}`,
      ensoKey: chartExpandPeriodEnsoKey("quarter", horizon.year, horizon.quarter),
    };
  }).filter((row) => {
    if (!row) return false;
    const hasActual = historicalRows.some(
      (r) =>
        r.year === row.year &&
        r.quarter === row.period &&
        (r.volume_mt != null || r.area_ha != null)
    );
    return !hasActual && (row.volume_mt != null || row.area_ha != null);
  }).map((row) => (cropSubtype ? { ...row, crop_subtype: cropSubtype } : row));

  if (updateGlobalSnapshot) {
    chartExpandLastForecastSnapshot = {
      volumePeriods,
      areaPeriods,
      method,
      forecastRows,
      historicalRows,
    };
  }

  return forecastRows;
}

function isChartExpandOutlookQuarter(year, quarter) {
  return CHART_EXPAND_FORECAST_HORIZONS.some(
    (h) => h.year === Number(year) && h.quarter === Number(quarter)
  );
}

function quarterHasPublishedVolume(historicalRows, year, quarter) {
  return (historicalRows || []).some(
    (r) =>
      Number(r.year) === Number(year) &&
      Number(r.quarter) === Number(quarter) &&
      r.volume_mt != null &&
      Number.isFinite(Number(r.volume_mt))
  );
}

function quarterHasPublishedArea(historicalRows, year, quarter) {
  return (historicalRows || []).some(
    (r) =>
      Number(r.year) === Number(year) &&
      Number(r.quarter) === Number(quarter) &&
      r.area_ha != null &&
      Number.isFinite(Number(r.area_ha))
  );
}

function resolveQuarterVolume(historicalRows, quarterlyForecastRows, year, quarter) {
  const hist = (historicalRows || []).find(
    (r) => Number(r.year) === Number(year) && Number(r.quarter) === Number(quarter)
  );
  if (hist?.volume_mt != null && Number.isFinite(Number(hist.volume_mt))) {
    return Number(hist.volume_mt);
  }
  const fc = (quarterlyForecastRows || []).find(
    (r) => Number(r.year) === Number(year) && Number(r.period) === Number(quarter)
  );
  if (fc?.volume_mt != null && Number.isFinite(Number(fc.volume_mt))) {
    return Number(fc.volume_mt);
  }
  return null;
}

function resolveQuarterArea(historicalRows, quarterlyForecastRows, year, quarter) {
  const hist = (historicalRows || []).find(
    (r) => Number(r.year) === Number(year) && Number(r.quarter) === Number(quarter)
  );
  if (hist?.area_ha != null && Number.isFinite(Number(hist.area_ha))) {
    return Number(hist.area_ha);
  }
  const fc = (quarterlyForecastRows || []).find(
    (r) => Number(r.year) === Number(year) && Number(r.period) === Number(quarter)
  );
  if (fc?.area_ha != null && Number.isFinite(Number(fc.area_ha))) {
    return Number(fc.area_ha);
  }
  return null;
}

/** Sum quarters the same way as the quarterly chart: PSA actuals + model for outlook gaps. */
function sumResolvedQuarterMetrics(
  historicalRows,
  quarterlyForecastRows,
  year,
  quarters,
  { allowForecastArea = true } = {}
) {
  let volume_mt = 0;
  let area_ha = 0;
  let hasVol = false;
  let hasArea = false;
  let usesOutlookForecast = false;
  let outlookOnlyVolume = false;

  for (const quarter of quarters) {
    const hadPublishedVol = quarterHasPublishedVolume(historicalRows, year, quarter);
    const vol = resolveQuarterVolume(historicalRows, quarterlyForecastRows, year, quarter);
    if (vol != null) {
      volume_mt += vol;
      hasVol = true;
      if (!hadPublishedVol && isChartExpandOutlookQuarter(year, quarter)) {
        usesOutlookForecast = true;
      }
    }

    if (allowForecastArea || quarterHasPublishedArea(historicalRows, year, quarter)) {
      const area = resolveQuarterArea(historicalRows, quarterlyForecastRows, year, quarter);
      if (area != null) {
        area_ha += area;
        hasArea = true;
      }
    }
  }

  if (Number(year) >= 2027 && hasVol) {
    usesOutlookForecast = true;
  }

  return {
    volume_mt: hasVol ? volume_mt : null,
    area_ha: hasArea ? area_ha : null,
    usesOutlookForecast,
    outlookOnlyVolume: false,
  };
}

function semesterOutlookTargets() {
  const targets = [];
  const seen = new Set();
  for (const { year, quarter } of CHART_EXPAND_FORECAST_HORIZONS) {
    const semester = SEMESTER_BY_QUARTER[quarter];
    if (!semester) continue;
    const key = `${year}-s${semester}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ year, semester });
  }
  return targets.sort((a, b) => a.year - b.year || a.semester - b.semester);
}

function aggregateQuarterlyForecastToSemester(
  quarterlyForecastRows,
  historicalRows,
  semesterDisplayPoints
) {
  const out = [];
  const displayByKey = new Map(
    (semesterDisplayPoints || []).map((p) => [
      `${Number(p.year)}-s${Number(p.semester)}`,
      p,
    ])
  );

  for (const { year, semester } of semesterOutlookTargets()) {
    const quarters = (QUARTERS_BY_SEMESTER[semester] || []).map(Number);
    const totals = sumResolvedQuarterMetrics(
      historicalRows,
      quarterlyForecastRows,
      year,
      quarters,
      { allowForecastArea: true }
    );
    if (!totals.usesOutlookForecast || totals.volume_mt == null) continue;

    const displayKey = `${year}-s${semester}`;
    const displayRow = displayByKey.get(displayKey);
    let periodForecastNote = "Quarterly actuals plus model for missing quarters in this semester";
    if (year === 2026 && semester === 2) {
      periodForecastNote = "Quarterly actuals plus projected Q4 2026 (same method as quarter view)";
    } else if (year >= 2027) {
      periodForecastNote = "Projected area and volume from quarterly model (same method as quarter view)";
    }

    out.push({
      year,
      period: semester,
      volume_mt: totals.volume_mt,
      area_ha: totals.area_ha,
      isForecast: true,
      label: chartExpandPeriodLabel("semester", semester),
      fullLabel: chartExpandPeriodDisplayLabel("semester", year, semester),
      ensoKey: chartExpandPeriodEnsoKey("semester", year, semester),
      periodForecastNote,
      replacesDisplayRow: Boolean(displayRow),
    });
  }

  return out;
}

function buildQuarterlyChartMergedRows(quarterlyPoints, quarterlyForecastRows) {
  const flat = flattenPeriodSeries(quarterlyPoints, "quarter");
  if (!quarterlyForecastRows?.length) return flat.rows;
  return appendForecastToPeriodTrendFlat(flat, quarterlyForecastRows, "quarter").flat.rows;
}

/** Roll up calendar-year totals from the same merged quarter series shown on the quarter chart. */
function sumYearMetricsFromQuarterChartRows(mergedQuarterRows, year) {
  const byQuarter = new Map();
  for (const row of mergedQuarterRows || []) {
    if (Number(row.year) !== Number(year)) continue;
    byQuarter.set(Number(row.period), row);
  }

  let volume_mt = 0;
  let area_ha = 0;
  let hasVol = false;
  let hasArea = false;
  let usesOutlookForecast = false;

  for (const quarter of [1, 2, 3, 4]) {
    const row = byQuarter.get(quarter);
    if (!row) continue;
    if (row.volume_mt != null && Number.isFinite(Number(row.volume_mt))) {
      volume_mt += Number(row.volume_mt);
      hasVol = true;
      if (row.isForecast) usesOutlookForecast = true;
    }
    if (row.area_ha != null && Number.isFinite(Number(row.area_ha)) && !row.omitAreaInTooltip) {
      area_ha += Number(row.area_ha);
      hasArea = true;
    }
  }

  if (Number(year) >= 2027 && hasVol) {
    usesOutlookForecast = true;
  }

  return {
    volume_mt: hasVol ? volume_mt : null,
    area_ha: hasArea ? area_ha : null,
    usesOutlookForecast,
    outlookOnlyVolume: false,
  };
}

function aggregateQuarterlyForecastToYear(
  quarterlyForecastRows,
  quarterlyPoints,
  yearDisplayPoints
) {
  const out = [];
  const displayByYear = new Map(
    (yearDisplayPoints || []).map((p) => [Number(p.year), p])
  );
  const mergedQuarterRows = buildQuarterlyChartMergedRows(quarterlyPoints, quarterlyForecastRows);
  const outlookYears = [...new Set(CHART_EXPAND_FORECAST_HORIZONS.map((h) => h.year))].sort(
    (a, b) => a - b
  );

  for (const year of outlookYears) {
    const totals = sumYearMetricsFromQuarterChartRows(mergedQuarterRows, year);
    if (!totals.usesOutlookForecast || totals.volume_mt == null) continue;

    let periodForecastNote = "Quarterly actuals plus model for missing quarters in this year";
    if (year === 2026) {
      periodForecastNote =
        "Quarterly actuals plus projected Q4 2026 (same method as quarter view)";
    } else if (year >= 2027) {
      periodForecastNote =
        "Projected area and volume from quarterly model (same method as quarter view)";
    }

    out.push({
      year,
      volume_mt: totals.volume_mt,
      area_ha: totals.area_ha,
      isForecast: true,
      fullLabel: String(year),
      periodForecastNote,
      yearForecastNote: periodForecastNote,
      replacesDisplayRow: Boolean(displayByYear.get(year)),
    });
  }

  return out;
}

async function buildChartExpandProductionForecast(displayGrain, displayPoints) {
  let quarterlyPoints = displayPoints;
  if (displayGrain !== "quarter") {
    const payload = await api(`/api/series?${qs(commonParams({ grain: "quarter" }))}`);
    quarterlyPoints = payload?.points || [];
  }
  const quarterlyForecastRows = await buildQuarterlyProductionForecast(quarterlyPoints);
  const historicalRows = chartExpandLastForecastSnapshot?.historicalRows || [];
  let forecastRows = quarterlyForecastRows;
  if (displayGrain === "semester") {
    forecastRows = aggregateQuarterlyForecastToSemester(
      quarterlyForecastRows,
      historicalRows,
      displayPoints
    );
  } else if (displayGrain === "year") {
    forecastRows = aggregateQuarterlyForecastToYear(
      quarterlyForecastRows,
      quarterlyPoints,
      displayPoints
    );
  }
  if (chartExpandLastForecastSnapshot) {
    chartExpandLastForecastSnapshot.displayGrain = displayGrain;
    chartExpandLastForecastSnapshot.displayForecastRows = forecastRows;
  }
  return forecastRows;
}

function ecosystemForecastPointsFromRows(rows, grain, cropSubtype) {
  const periodField = grain === "quarter" ? "quarter" : grain === "semester" ? "semester" : null;
  return (rows || []).map((row) => {
    const point = {
      crop_subtype: cropSubtype,
      year: row.year,
      volume_mt: row.volume_mt,
      area_ha: row.area_ha,
      isForecast: true,
      periodForecastNote: row.periodForecastNote || row.yearForecastNote,
    };
    if (periodField && row.period != null) {
      point[periodField] = row.period;
    }
    if (point.volume_mt != null && point.area_ha > 0) {
      point.yield_mt_ha = point.volume_mt / point.area_ha;
    }
    return point;
  });
}

async function buildChartExpandEcosystemForecast(displayGrain, displayPoints) {
  let quarterlyPoints = displayPoints;
  if (displayGrain !== "quarter") {
    const payload = await api(
      `/api/series-by-ecosystem?${qs(commonParams({ grain: "quarter" }))}`
    );
    quarterlyPoints = payload?.points || [];
  }
  const subtypes = [
    ...new Set(
      (displayPoints || [])
        .map((p) => p.crop_subtype)
        .filter(Boolean)
    ),
  ].sort();
  if (!subtypes.length) return [];

  const combined = [];
  const warnings = [];
  let snapshot = null;

  for (const subtype of subtypes) {
    const qPoints = quarterlyPoints.filter((p) => p.crop_subtype === subtype);
    const displaySubtype = displayPoints.filter((p) => p.crop_subtype === subtype);
    const quarterlyForecastRows = await buildQuarterlyProductionForecast(qPoints, {
      cropSubtype: subtype,
      updateGlobalSnapshot: false,
    });
    if (chartExpandLastForecastWarnings?.length) {
      warnings.push(...chartExpandLastForecastWarnings);
    }
    let rows = quarterlyForecastRows;
    const historicalRows = qPoints
      .map((p) => ({
        year: Number(p.year),
        quarter: Number(p.quarter),
        volume_mt: p.volume_mt,
        area_ha: p.area_ha,
      }))
      .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.quarter));

    if (displayGrain === "semester") {
      rows = aggregateQuarterlyForecastToSemester(
        quarterlyForecastRows,
        historicalRows,
        displaySubtype
      );
    } else if (displayGrain === "year") {
      rows = aggregateQuarterlyForecastToYear(
        quarterlyForecastRows,
        qPoints,
        displaySubtype
      );
    } else {
      rows = quarterlyForecastRows;
    }
    combined.push(...ecosystemForecastPointsFromRows(rows, displayGrain, subtype));
    snapshot = {
      volumePeriods: [],
      areaPeriods: [],
      method: chartExpandForecastMethod,
      forecastRows: quarterlyForecastRows,
      historicalRows,
      displayGrain,
      displayForecastRows: combined,
      ecosystem: true,
    };
  }

  chartExpandLastForecastWarnings = [...new Set(warnings)];
  chartExpandLastForecastSnapshot = snapshot;
  return combined;
}

function ecosystemForecastYearRows(forecastPoints) {
  const byKey = new Map();
  for (const p of forecastPoints || []) {
    if (!p?.isForecast) continue;
    const y = Number(p.year);
    if (!Number.isFinite(y)) continue;
    if (!byKey.has(y)) byKey.set(y, { year: y, isForecast: true });
  }
  return [...byKey.values()];
}

function productionForecastRowsToYieldPoints(forecastRows, grain) {
  const periodField = grain === "quarter" ? "quarter" : grain === "semester" ? "semester" : null;
  return (forecastRows || [])
    .map((row) => {
      const yield_mt_ha =
        row.volume_mt != null &&
        row.area_ha != null &&
        Number(row.area_ha) > 0 &&
        Number.isFinite(Number(row.volume_mt))
          ? Number(row.volume_mt) / Number(row.area_ha)
          : row.yield_mt_ha != null && Number.isFinite(Number(row.yield_mt_ha))
            ? Number(row.yield_mt_ha)
            : null;
      if (yield_mt_ha == null) return null;
      const point = {
        year: row.year,
        yield_mt_ha,
        volume_mt: row.volume_mt,
        area_ha: row.area_ha,
        isForecast: true,
        periodForecastNote: row.periodForecastNote || row.yearForecastNote,
        fullLabel: row.fullLabel,
        ensoKey: row.ensoKey,
      };
      if (periodField != null && row.period != null) point[periodField] = row.period;
      return point;
    })
    .filter(Boolean);
}

function appendForecastToYieldYearTrend(points, forecastPoints) {
  if (!forecastPoints?.length) return { points: points || [], forecastStartIndex: -1 };
  const forecastByYear = new Map(
    forecastPoints.map((f) => [Number(f.year), f])
  );
  const hist = [];
  const forecastRows = [];
  for (const p of points || []) {
    const y = Number(p.year);
    const fc = forecastByYear.get(y);
    if (fc) {
      forecastRows.push({
        year: y,
        yield_mt_ha: fc.yield_mt_ha,
        isForecast: true,
        periodForecastNote: fc.periodForecastNote,
        yearForecastNote: fc.periodForecastNote,
      });
      forecastByYear.delete(y);
    } else {
      hist.push({ ...p, isForecast: false });
    }
  }
  for (const fc of forecastByYear.values()) {
    forecastRows.push({
      year: fc.year,
      yield_mt_ha: fc.yield_mt_ha,
      isForecast: true,
      periodForecastNote: fc.periodForecastNote,
      yearForecastNote: fc.periodForecastNote,
    });
  }
  const combined = [...hist, ...forecastRows].sort((a, b) => Number(a.year) - Number(b.year));
  const forecastStartIndex = combined.findIndex((r) => r.isForecast);
  return {
    points: combined,
    forecastStartIndex: forecastStartIndex >= 0 ? forecastStartIndex : hist.length,
  };
}

function mergeYieldChartPoints(histPoints, forecastPoints, grain) {
  if (!forecastPoints?.length) return histPoints || [];
  if (grain === "year") {
    return appendForecastToYieldYearTrend(histPoints, forecastPoints).points;
  }
  const periodField = grain === "quarter" ? "quarter" : "semester";
  const fcKeys = new Set(
    forecastPoints.map((p) => `${Number(p.year)}-${Number(p[periodField])}`)
  );
  const hist = (histPoints || []).filter((p) => {
    const key = `${Number(p.year)}-${Number(p[periodField])}`;
    return !fcKeys.has(key);
  });
  return [...hist, ...forecastPoints].sort(
    (a, b) => Number(a.year) - Number(b.year) || Number(a[periodField]) - Number(b[periodField])
  );
}

function ensureChartExpandForecastAnalysis(modal) {
  if (!modal) return null;
  const aside = modal.querySelector(".chart-expand-analysis");
  let label = modal.querySelector("#chartExpandForecastAnalysisLabel");
  let el = modal.querySelector("#chartExpandForecastAnalysis");
  if (!label && aside) {
    label = document.createElement("span");
    label.id = "chartExpandForecastAnalysisLabel";
    label.className = "trend-insight-label chart-expand-forecast-analysis-label";
    label.textContent = "Forecast analysis";
    label.hidden = true;
    aside.appendChild(label);
  }
  if (!el && aside) {
    el = document.createElement("p");
    el.id = "chartExpandForecastAnalysis";
    el.className = "trend-insight-text chart-expand-forecast-analysis";
    el.hidden = true;
    aside.appendChild(el);
  }
  return { label, text: el };
}

function syncChartExpandForecastAnalysis(modal, kind, grain) {
  const parts = ensureChartExpandForecastAnalysis(modal);
  const label = parts?.label;
  const el = parts?.text;
  if (!el) return;
  const show = false;
  if (!show) {
    if (label) label.hidden = true;
    el.hidden = true;
    el.textContent = "";
    return;
  }
  if (label) label.hidden = false;
  el.hidden = false;
  el.textContent = buildChartExpandForecastAnalysis(chartExpandLastForecastSnapshot);
}

function forecastProjectedPoints(periods) {
  return (periods || []).filter(
    (p) => !p.skipped && p.projected != null && Number.isFinite(Number(p.projected))
  );
}

function forecastMetricTrendSummary(points, periodUnit = "quarter") {
  if (!points?.length) return null;
  const unit = periodUnit === "year" ? "year" : periodUnit === "semester" ? "semester" : "quarter";
  if (points.length === 1) {
    return {
      first: points[0],
      last: points[0],
      peak: points[0],
      trough: points[0],
      overallPct: null,
      pathLabel: `single projected ${unit}`,
      largestStep: null,
      steps: [],
      periodUnit: unit,
    };
  }
  const steps = [];
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const pct = pctChange(from.projected, to.projected);
    steps.push({
      from,
      to,
      pct,
      absPct: pct != null ? Math.abs(pct) : 0,
    });
  }
  const ups = steps.filter((s) => s.pct != null && s.pct > 0.5).length;
  const downs = steps.filter((s) => s.pct != null && s.pct < -0.5).length;
  let pathLabel = `moves unevenly from ${unit} to ${unit}`;
  if (ups === steps.length) pathLabel = `increases each ${unit}`;
  else if (downs === steps.length) pathLabel = `decreases each ${unit}`;
  else if (ups === 0 && downs === 0) pathLabel = `is nearly flat ${unit} to ${unit}`;

  let peak = points[0];
  let trough = points[0];
  for (const p of points) {
    if (Number(p.projected) > Number(peak.projected)) peak = p;
    if (Number(p.projected) < Number(trough.projected)) trough = p;
  }
  const largestStep =
    steps.length > 0
      ? steps.reduce((best, step) => (step.absPct > best.absPct ? step : best), steps[0])
      : null;

  return {
    first: points[0],
    last: points[points.length - 1],
    peak,
    trough,
    overallPct: pctChange(points[0].projected, points[points.length - 1].projected),
    pathLabel,
    largestStep,
    steps,
    periodUnit: unit,
  };
}

function forecastTrendPhrase(pathLabel) {
  if (pathLabel.includes("increases each")) return pathLabel.replace("increases each", "trends upward each");
  if (pathLabel.includes("decreases each")) return pathLabel.replace("decreases each", "trends downward each");
  if (pathLabel.includes("nearly flat")) return pathLabel.replace("is nearly flat", "stays relatively flat");
  if (pathLabel.includes("unevenly")) return pathLabel.replace("moves unevenly", "varies");
  return pathLabel;
}

function forecastRowsToMetricPoints(rows, grain) {
  return (rows || [])
    .filter((r) => r.volume_mt != null && Number.isFinite(Number(r.volume_mt)))
    .map((r) => ({
      projected: Number(r.volume_mt),
      fullLabel:
        r.fullLabel ||
        (grain === "year"
          ? String(r.year)
          : chartExpandPeriodDisplayLabel(grain, r.year, r.period)),
    }));
}

function buildChartExpandForecastAnalysis(snapshot) {
  if (!snapshot) return "";
  const meta = chartExpandForecastMethodMeta(snapshot.method);
  const grain = snapshot.displayGrain || "quarter";
  const periodUnit = grain === "year" ? "year" : grain === "semester" ? "semester" : "quarter";
  const displayRows = snapshot.displayForecastRows || snapshot.forecastRows || [];
  const volPoints = forecastRowsToMetricPoints(displayRows, grain);
  if (!volPoints.length) {
    return "Forecast periods could not be summarized for the current filters.";
  }

  const volTrend = forecastMetricTrendSummary(volPoints, periodUnit);
  if (!volTrend?.first || !volTrend?.last) return "";

  const rangeLabel = chartExpandForecastRangeLabel(grain);
  const windowChange = describeChange(volTrend.overallPct);
  let text =
    `${meta.label} projects production volume to ${forecastTrendPhrase(volTrend.pathLabel)} ` +
    `from ${volTrend.first.fullLabel} (${fmt.score(volTrend.first.projected)} MT) to ${volTrend.last.fullLabel} (${fmt.score(volTrend.last.projected)} MT)` +
    (windowChange ? `, ${windowChange} over ${rangeLabel}` : "") +
    `. The outlook peak is ${volTrend.peak.fullLabel} (${fmt.score(volTrend.peak.projected)} MT)` +
    (volTrend.peak !== volTrend.trough
      ? ` and the low is ${volTrend.trough.fullLabel} (${fmt.score(volTrend.trough.projected)} MT)`
      : "") +
    ".";

  if (volTrend.largestStep && volTrend.steps.length > 1 && volTrend.pathLabel.includes("unevenly")) {
    const stepText = describeChange(volTrend.largestStep.pct);
    if (stepText) {
      text +=
        ` The largest move is ${stepText} from ${volTrend.largestStep.from.fullLabel} to ${volTrend.largestStep.to.fullLabel}.`;
    }
  }

  if (CONFIG.showAreaYield !== false) {
    const areaPoints = (displayRows || [])
      .filter((r) => r.area_ha != null && Number.isFinite(Number(r.area_ha)))
      .map((r) => ({
        projected: Number(r.area_ha),
        fullLabel:
          r.fullLabel ||
          (grain === "year"
            ? String(r.year)
            : chartExpandPeriodDisplayLabel(grain, r.year, r.period)),
      }));
    const areaTrend = forecastMetricTrendSummary(areaPoints, periodUnit);
    if (areaTrend?.first && areaTrend?.last) {
      const areaChange = describeChange(areaTrend.overallPct);
      text +=
        ` Area harvested ${forecastTrendPhrase(areaTrend.pathLabel)}` +
        (areaChange ? ` (${areaChange} overall)` : "") +
        ` over the same window.`;
    }
  }

  return text;
}

function ensureChartExpandToolbarRow(modal) {
  if (!modal) return null;
  const toolbar = modal.querySelector(".chart-expand-toolbar");
  if (!toolbar) return null;
  let row = modal.querySelector(".chart-expand-toolbar-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "chart-expand-toolbar-row";
    toolbar.parentNode.insertBefore(row, toolbar);
    row.appendChild(toolbar);
  } else if (toolbar.parentNode !== row) {
    row.appendChild(toolbar);
  }
  return row;
}

function ensureChartExpandForecastMethodSelect(modal) {
  if (!modal) return null;
  const row = ensureChartExpandToolbarRow(modal);
  let wrap = modal.querySelector("#chartExpandForecastOptions");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "chart-expand-forecast-options";
    wrap.id = "chartExpandForecastOptions";
    wrap.hidden = true;
    wrap.innerHTML =
      '<label class="chart-expand-forecast-method-label" for="chartExpandForecastMethod">Forecast method</label>' +
      `<select id="chartExpandForecastMethod" class="chart-expand-forecast-method" aria-label="Forecast method">
        ${CHART_EXPAND_FORECAST_METHODS.map(
          (m) =>
            `<option value="${m.value}" title="${escapeHtml(m.methodBlurb || m.short)}">${m.label}</option>`
        ).join("")}
      </select>`;
    if (row) row.appendChild(wrap);
    else modal.querySelector(".chart-expand-body")?.prepend(wrap);
  } else if (row && wrap.parentNode !== row) {
    row.appendChild(wrap);
  }
  const select = wrap.querySelector("#chartExpandForecastMethod");
  if (select) select.value = normalizeChartExpandForecastMethod(chartExpandForecastMethod);
  return select;
}

function syncChartExpandForecastChrome(modal, kind) {
  const supported = chartExpandSupportsProductionForecast(kind);
  const showForecast = supported && chartExpandShowForecast;
  const btn = modal?.querySelector("#chartExpandForecastBtn");
  const sep = modal?.querySelector("#chartExpandForecastSep");
  const note = modal?.querySelector("#chartExpandForecastNote");
  const options = modal?.querySelector("#chartExpandForecastOptions");
  const warningsEl = modal?.querySelector("#chartExpandForecastWarnings");
  const methodSelect = ensureChartExpandForecastMethodSelect(modal);
  const meta = chartExpandForecastMethodMeta();
  modal.querySelector("#chartExpandForecastMethodHelp")?.remove();
  if (btn) {
    btn.hidden = !supported;
    btn.classList.toggle("is-active", showForecast);
    btn.setAttribute("aria-pressed", showForecast ? "true" : "false");
    btn.textContent = chartExpandShowForecast ? "Hide production forecast" : "Show production forecast";
  }
  if (sep) sep.hidden = !supported;
  if (options) options.hidden = !showForecast;
  if (methodSelect) methodSelect.value = normalizeChartExpandForecastMethod(chartExpandForecastMethod);
  if (note) {
    note.hidden = !showForecast;
    if (showForecast) {
      renderChartExpandForecastNote(note, meta);
    } else {
      note.innerHTML = "";
    }
  }
  if (warningsEl && !showForecast) {
    warningsEl.hidden = true;
    warningsEl.textContent = "";
  }
}

const CHART_EXPAND_META = {
  trendChart: {
    title: "Production volume and area harvested",
    kind: "trend",
  },
  yieldTrendChart: {
    title: "Annual yield trend",
    kind: "yield",
  },
  ecosystemTrendChart: {
    title: "Trend by ecosystem / crop group",
    kind: "ecosystem",
  },
  volumeGrowthChart: {
    title: "Year-over-year production volume growth",
    kind: "growth",
  },
};

const PERIOD_BAR_COLORS = {
  quarter: ["#0b6b45", "#2f6fed", "#c98512", "#8e24aa"],
  semester: ["#0b6b45", "#2f6fed"],
};

const AREA_PERIOD_COLORS = {
  quarter: ["#9ae856", "#84d644", "#6fc434", "#5aaf28"],
  semester: ["#9ae856", "#5aaf28"],
};

const VOLUME_PERIOD_LINE_COLORS = {
  quarter: ["#06402b", "#09663f", "#0b8a52", "#1a9d68"],
  semester: ["#06402b", "#0b8a52"],
};

function chartExpandPeriodKeys(grain) {
  if (grain === "quarter") return [1, 2, 3, 4];
  if (grain === "semester") return [1, 2];
  return [];
}

function chartExpandPeriodLabel(grain, period) {
  return grain === "quarter" ? `Q${period}` : `S${period}`;
}

function chartExpandEnsoTitle(year, extras = [], { isForecast = false } = {}) {
  const bits = [`Year ${year}`, ...extras.filter(Boolean)];
  const observed = ensoMetaForYear(year);
  const enso =
    isForecast && chartExpandShowForecast
      ? ensoMetaForForecastYear(year) || observed
      : observed;
  const detail = formatEnsoPhaseDetail(enso);
  if (detail) bits.push(detail);
  if (
    isForecast &&
    chartExpandShowForecast &&
    observed?.phase &&
    enso?.phase &&
    observed.phase !== enso.phase
  ) {
    const observedDetail = formatEnsoPhaseDetail({ ...observed, outlook: false });
    if (observedDetail) {
      bits.push(`Observed calendar ${year}: ${observedDetail}`);
    }
  }
  return bits.join(" · ");
}

function chartExpandMixedLegendLabels(chart) {
  return chart.data.datasets.map((ds, i) => {
    const hidden = chart.getDatasetMeta(i).hidden;
    const isLine = ds.type === "line";
    const raw = isLine ? ds.borderColor : ds.backgroundColor;
    const color = Array.isArray(raw) ? raw[0] : raw;
    const fallback = isLine ? "#09663f" : "#9ae856";
    return {
      text: ds.label,
      datasetIndex: i,
      hidden: Boolean(hidden),
      pointStyle: isLine ? "line" : "rect",
      fillStyle: color || fallback,
      strokeStyle: color || fallback,
      lineWidth: isLine ? 2.5 : 0,
      fontColor: "#3f5340",
    };
  });
}

function chartExpandSharedLegend() {
  return {
    display: true,
    position: "bottom",
    align: "center",
    fullSize: false,
    labels: {
      padding: 8,
      font: { size: 11, family: "Roboto", weight: "500" },
      color: "#3f5340",
      usePointStyle: true,
      pointStyleWidth: 10,
    },
  };
}

function chartExpandSharedTooltip(extra = {}) {
  return {
    usePointStyle: true,
    boxWidth: 10,
    boxHeight: 10,
    padding: 8,
    titleFont: { size: 12, family: "Roboto" },
    bodyFont: { size: 11, family: "Roboto" },
    ...extra,
  };
}

function ensureChartExpandModal() {
  let modal = document.getElementById("chartExpandModal");
  if (modal) {
    if (!modal.querySelector("#chartExpandAnalysis")) {
      const legend = modal.querySelector("#chartExpandEnsoLegend");
      const analysis = document.createElement("aside");
      analysis.className = "trend-insight chart-expand-analysis";
      analysis.setAttribute("aria-live", "polite");
      analysis.innerHTML =
        '<span class="trend-insight-label">Analysis</span>' +
        '<p id="chartExpandAnalysis" class="trend-insight-text">Analyzing selected range…</p>';
      if (legend?.parentNode) legend.parentNode.insertBefore(analysis, legend);
      else modal.querySelector(".chart-expand-body")?.appendChild(analysis);
    }
    const toolbar = modal.querySelector(".chart-expand-toolbar");
    if (toolbar && !modal.querySelector("#chartExpandForecastBtn")) {
      toolbar.insertAdjacentHTML(
        "beforeend",
        '<span class="chart-expand-toolbar-sep" id="chartExpandForecastSep" hidden aria-hidden="true"></span>' +
          '<button type="button" class="chart-expand-grain-btn chart-expand-forecast-btn" id="chartExpandForecastBtn" hidden aria-pressed="false">Show production forecast</button>'
      );
    }
    if (!modal.querySelector("#chartExpandForecastNote")) {
      const body = modal.querySelector(".chart-expand-body");
      const canvasWrap = modal.querySelector(".chart-expand-canvas-wrap");
      const note = document.createElement("p");
      note.className = "chart-expand-forecast-note";
      note.id = "chartExpandForecastNote";
      note.hidden = true;
      renderChartExpandForecastNote(note);
      if (canvasWrap?.parentNode) canvasWrap.parentNode.insertBefore(note, canvasWrap);
      else body?.prepend(note);
    }
    ensureChartExpandToolbarRow(modal);
    ensureChartExpandForecastMethodSelect(modal);
    ensureChartExpandForecastAnalysis(modal);
    ensureChartExpandFooter(modal);
    pruneChartExpandEnsoLegends(modal);
    return modal;
  }
  modal = document.createElement("div");
  modal.id = "chartExpandModal";
  modal.className = "app-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "chartExpandTitle");
  modal.innerHTML = `
    <div class="app-modal-backdrop" data-chart-expand-dismiss="true"></div>
    <div class="app-modal-panel app-modal-panel-analysis app-modal-panel-chart-expand">
      <div class="app-modal-analysis-header">
        <div>
          <h2 class="app-modal-title" id="chartExpandTitle">Chart</h2>
          <p class="app-modal-analysis-sub" id="chartExpandSub">Explore annual or period trends</p>
        </div>
        <button type="button" class="app-modal-close" data-chart-expand-dismiss="true" aria-label="Close chart">×</button>
      </div>
      <div class="app-modal-analysis-body chart-expand-body">
        <div class="chart-expand-toolbar-row">
          <div class="chart-expand-toolbar" role="group" aria-label="Trend grain">
            <button type="button" class="chart-expand-grain-btn is-active" data-chart-grain="year">Year</button>
            <button type="button" class="chart-expand-grain-btn" data-chart-grain="quarter">Quarter</button>
            <button type="button" class="chart-expand-grain-btn" data-chart-grain="semester">Semester</button>
            <span class="chart-expand-toolbar-sep" id="chartExpandForecastSep" hidden aria-hidden="true"></span>
            <button type="button" class="chart-expand-grain-btn chart-expand-forecast-btn" id="chartExpandForecastBtn" hidden aria-pressed="false">Show production forecast</button>
          </div>
          <div class="chart-expand-forecast-options" id="chartExpandForecastOptions" hidden>
            <label class="chart-expand-forecast-method-label" for="chartExpandForecastMethod">Forecast method</label>
            <select id="chartExpandForecastMethod" class="chart-expand-forecast-method" aria-label="Forecast method">
              <option value="seasonal_naive">Seasonal naive</option>
              <option value="ets">Exponential smoothing</option>
              <option value="arima">ARIMA</option>
            </select>
          </div>
        </div>
        <p class="chart-expand-forecast-note" id="chartExpandForecastNote" hidden></p>
        <div class="chart-box chart-box-trend chart-expand-canvas-wrap">
          <canvas id="chartExpandCanvas"></canvas>
        </div>
        <aside class="trend-insight chart-expand-analysis" aria-live="polite">
          <span class="trend-insight-label">Analysis</span>
          <p id="chartExpandAnalysis" class="trend-insight-text">Analyzing selected range…</p>
          <span class="trend-insight-label chart-expand-forecast-analysis-label" id="chartExpandForecastAnalysisLabel" hidden>Forecast analysis</span>
          <p id="chartExpandForecastAnalysis" class="trend-insight-text chart-expand-forecast-analysis" hidden></p>
        </aside>
        <div class="chart-expand-footer">
          <div class="enso-legend chart-expand-enso" id="chartExpandEnsoLegend"></div>
        </div>
      </div>
      <div class="app-modal-analysis-footer">
        <button type="button" class="app-modal-btn app-modal-btn-secondary" data-chart-expand-dismiss="true">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function destroyChartExpandModalChart() {
  if (chartExpandModalChart) {
    try {
      chartExpandModalChart.destroy();
    } catch {
      /* ignore */
    }
    chartExpandModalChart = null;
  }
}

function resetChartExpandCanvas(modal) {
  const wrap = modal?.querySelector(".chart-expand-canvas-wrap");
  if (!wrap) return null;
  wrap.innerHTML = '<canvas id="chartExpandCanvas"></canvas>';
  return wrap.querySelector("#chartExpandCanvas");
}

function chartExpandPeriodDisplayLabel(grain, year, period) {
  return grain === "quarter" ? `Q${period} ${year}` : `S${period} ${year}`;
}

function chartExpandPeriodEnsoKey(grain, year, period) {
  return `${year}-${chartExpandPeriodLabel(grain, period)}`;
}

function ensoMetaForPeriodKey(ensoKey, { isForecast = false } = {}) {
  if (!ensoKey) return null;
  if (isForecast && chartExpandShowForecast && ensoOutlookByQuarter?.[ensoKey]) {
    return ensoOutlookByQuarter[ensoKey];
  }
  return ensoByQuarter?.[ensoKey] || ensoBySemester?.[ensoKey] || null;
}

function chartExpandPeriodEnsoTitle(displayLabel, ensoKey, extras = [], { isForecast = false } = {}) {
  const bits = [displayLabel, ...extras.filter(Boolean)];
  const detail = formatEnsoPhaseDetail(ensoMetaForPeriodKey(ensoKey, { isForecast }));
  if (detail) bits.push(detail);
  return bits.join(" · ");
}

function flattenPeriodSeries(points, grain) {
  const periodField = grain === "quarter" ? "quarter" : "semester";
  const rows = (points || [])
    .map((p) => {
      const year = Number(p.year);
      const period = Number(p[periodField]);
      if (!Number.isFinite(year) || !Number.isFinite(period)) return null;
      return {
        year,
        period,
        volume_mt: p.volume_mt,
        area_ha: p.area_ha,
        yield_mt_ha: yieldForPoint(p),
        crop_subtype: p.crop_subtype,
        isForecast: Boolean(p.isForecast),
        periodForecastNote: p.periodForecastNote,
        label: chartExpandPeriodLabel(grain, period),
        fullLabel: chartExpandPeriodDisplayLabel(grain, year, period),
        ensoKey: chartExpandPeriodEnsoKey(grain, year, period),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year || a.period - b.period);

  return {
    rows,
    labels: rows.map((r) => r.label),
    fullLabels: rows.map((r) => r.fullLabel),
    years: rows.map((r) => r.year),
    ensoKeys: rows.map((r) => r.ensoKey),
  };
}

function attachExpandPeriodMeta(chart, { ensoKeys, years, fullLabels, grain }) {
  if (!chart) return chart;
  chart.$ensoLabelKeys = Array.isArray(ensoKeys) ? ensoKeys : null;
  chart.$periodAxisMeta = {
    grain: grain || null,
    years: Array.isArray(years) ? years : [],
    fullLabels: Array.isArray(fullLabels) ? fullLabels : [],
  };
  return chart;
}

function attachExpandEnsoKeys(chart, ensoKeys) {
  return attachExpandPeriodMeta(chart, { ensoKeys });
}

const periodYearAxisPlugin = {
  id: "periodYearAxis",
  afterDraw(chart) {
    const meta = chart.$periodAxisMeta;
    const years = meta?.years;
    if (!Array.isArray(years) || !years.length) return;
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    if (!chartArea || !xScale) return;

    const n = years.length;
    ctx.save();

    // Dashed vertical separators between year groups
    ctx.strokeStyle = "rgba(26, 46, 26, 0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 1; i < n; i += 1) {
      if (years[i] === years[i - 1]) continue;
      const x = (xScale.getPixelForValue(i - 1) + xScale.getPixelForValue(i)) / 2;
      if (!Number.isFinite(x)) continue;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Year labels centered under each year group (below Q/S ticks, above canvas edge)
    ctx.fillStyle = "#5f735f";
    ctx.font = "600 11px Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const tickBottom = xScale.bottom || chartArea.bottom;
    const yText = Math.min(chart.height - 8, tickBottom + 4);

    let start = 0;
    while (start < n) {
      let end = start;
      while (end + 1 < n && years[end + 1] === years[start]) end += 1;
      const x0 = xScale.getPixelForValue(start);
      const x1 = xScale.getPixelForValue(end);
      if (Number.isFinite(x0) && Number.isFinite(x1)) {
        ctx.fillText(String(years[start]), (x0 + x1) / 2, yText);
      }
      start = end + 1;
    }

    ctx.restore();
  },
};

if (typeof Chart !== "undefined") {
  try {
    Chart.register(periodYearAxisPlugin);
  } catch (_err) {
    // already registered
  }
}

function periodAxisTitle(grain) {
  return grain === "quarter" ? "Quarter" : "Semester";
}

function periodAxisTicks(tick, labelCount) {
  void labelCount;
  return {
    ...tick,
    autoSkip: false,
    maxRotation: 0,
    minRotation: 0,
    padding: 4,
    font: { size: 10, family: "Roboto", weight: "500" },
  };
}

function periodChartBottomPad() {
  // Room for Q/S tick labels + year group labels (legend sits on top for period charts)
  return 40;
}

function periodExpandLegend(generateLabels, { display = true } = {}) {
  return {
    ...chartExpandSharedLegend(),
    display,
    position: "top",
    align: "center",
    labels: {
      ...chartExpandSharedLegend().labels,
      padding: 10,
      generateLabels,
    },
  };
}

function groupSeriesPointsByYearPeriod(points, grain) {
  const periodKeys = chartExpandPeriodKeys(grain);
  const periodField = grain === "quarter" ? "quarter" : "semester";
  const years = [
    ...new Set(
      (points || [])
        .map((p) => Number(p.year))
        .filter((y) => Number.isFinite(y))
    ),
  ].sort((a, b) => a - b);
  const byKey = new Map();
  for (const p of points || []) {
    const year = Number(p.year);
    const period = Number(p[periodField]);
    if (!Number.isFinite(year) || !Number.isFinite(period)) continue;
    byKey.set(`${year}-${period}`, p);
  }
  return { years, periodKeys, byKey, periodField };
}

function buildFlatPeriodMetricSeries(points, grain, metricKey) {
  const flat = flattenPeriodSeries(points, grain);
  const data = flat.rows.map((row) => {
    if (metricKey === "yield_mt_ha") return row.yield_mt_ha;
    return row[metricKey] ?? null;
  });
  return { ...flat, data };
}

function buildFlatPeriodYoYGrowth(points, grain) {
  const flat = flattenPeriodSeries(points, grain);
  const byKey = new Map(flat.rows.map((row) => [`${row.year}-${row.period}`, row]));
  const labels = [];
  const fullLabels = [];
  const years = [];
  const ensoKeys = [];
  const values = [];
  const currentVolumes = [];
  const previousVolumes = [];
  const variances = [];
  for (const row of flat.rows) {
    const prev = byKey.get(`${row.year - 1}-${row.period}`);
    labels.push(row.label);
    fullLabels.push(row.fullLabel);
    years.push(row.year);
    ensoKeys.push(row.ensoKey);
    currentVolumes.push(row.volume_mt ?? null);
    previousVolumes.push(prev?.volume_mt ?? null);
    const curVol = row.volume_mt;
    const prevVol = prev?.volume_mt;
    variances.push(
      curVol != null &&
        prevVol != null &&
        !Number.isNaN(Number(curVol)) &&
        !Number.isNaN(Number(prevVol))
        ? Number(curVol) - Number(prevVol)
        : null
    );
    values.push(prev ? pctChange(prev.volume_mt, row.volume_mt) : null);
  }
  return {
    labels,
    fullLabels,
    years,
    ensoKeys,
    values,
    currentVolumes,
    previousVolumes,
    variances,
  };
}

function buildGroupedMetricDatasets(points, grain, metricKey, labelPrefix = "") {
  const { years, periodKeys, byKey } = groupSeriesPointsByYearPeriod(points, grain);
  const colors = PERIOD_BAR_COLORS[grain] || PERIOD_BAR_COLORS.quarter;
  const datasets = periodKeys.map((period, idx) => ({
    type: "bar",
    label: `${labelPrefix}${chartExpandPeriodLabel(grain, period)}`,
    data: years.map((year) => {
      const row = byKey.get(`${year}-${period}`);
      if (!row) return null;
      if (metricKey === "yield_mt_ha") return yieldForPoint(row);
      return row[metricKey] ?? null;
    }),
    backgroundColor: colors[idx % colors.length],
    hoverBackgroundColor: colors[idx % colors.length],
    borderWidth: 0,
    borderRadius: 3,
    maxBarThickness: 28,
    categoryPercentage: 0.78,
    barPercentage: 0.9,
  }));
  return { years, datasets };
}

function buildGroupedYoYGrowthDatasets(points, grain) {
  const { years, periodKeys, byKey } = groupSeriesPointsByYearPeriod(points, grain);
  const colors = PERIOD_BAR_COLORS[grain] || PERIOD_BAR_COLORS.quarter;
  const datasets = periodKeys.map((period, idx) => {
    const values = [];
    const currentVolumes = [];
    const previousVolumes = [];
    const variances = [];
    years.forEach((year) => {
      const cur = byKey.get(`${year}-${period}`);
      const prev = byKey.get(`${year - 1}-${period}`);
      const curVol = cur?.volume_mt ?? null;
      const prevVol = prev?.volume_mt ?? null;
      currentVolumes.push(curVol);
      previousVolumes.push(prevVol);
      variances.push(
        curVol != null && prevVol != null && !Number.isNaN(curVol) && !Number.isNaN(prevVol)
          ? curVol - prevVol
          : null
      );
      values.push(cur && prev ? pctChange(prev.volume_mt, cur.volume_mt) : null);
    });
    const color = colors[idx % colors.length];
    return {
      type: "bar",
      label: `${chartExpandPeriodLabel(grain, period)} YoY %`,
      data: values,
      backgroundColor: growthBarColors(values, {}),
      hoverBackgroundColor: growthBarColors(values, { hover: true }),
      borderWidth: 0,
      borderRadius: 0,
      borderSkipped: false,
      maxBarThickness: 28,
      categoryPercentage: 0.78,
      barPercentage: 0.9,
      currentVolumes,
      previousVolumes,
      variances,
      periodLabel: chartExpandPeriodLabel(grain, period),
      // Keep a solid legend swatch even when bar colors vary by sign
      legendColor: color,
    };
  });
  return { years, datasets };
}

function chartExpandGridTick() {
  return {
    grid: { color: "rgba(26, 46, 26, 0.08)", drawBorder: false },
    tick: { color: "#3f5340", font: { size: 11, family: "Roboto" } },
  };
}

function chartExpandBaseOptions(grain, overrides = {}) {
  const { grid, tick } = chartExpandGridTick();
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 2, right: 2, bottom: 0, left: 2 } },
    plugins: {
      ensoBands: {
        enabled: false,
        grain,
        byYear: {},
        byPeriod: {},
      },
      legend: chartExpandSharedLegend(),
      tooltip: chartExpandSharedTooltip({
        callbacks: {
          title(items) {
            const year = items?.[0]?.label;
            if (!year) return "";
            return chartExpandEnsoTitle(year);
          },
        },
      }),
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: {
          ...tick,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 16,
        },
        title: {
          display: true,
          text: "Year",
          color: "#5f735f",
          font: { size: 11, family: "Roboto", weight: "500" },
          padding: { top: 6 },
        },
      },
      y: {
        beginAtZero: false,
        border: { display: false },
        grid,
        ticks: {
          ...tick,
          maxTicksLimit: 6,
          callback: (v) => fmt.compact(v),
        },
      },
    },
  };
  return {
    ...base,
    ...overrides,
    plugins: {
      ...base.plugins,
      ...(overrides.plugins || {}),
    },
    scales: {
      ...base.scales,
      ...(overrides.scales || {}),
    },
  };
}

async function fetchChartExpandSeries(kind, grain) {
  const params = commonParams({ grain });
  if (kind === "ecosystem") {
    return api(`/api/series-by-ecosystem?${qs(params)}`);
  }
  return api(`/api/series?${qs(params)}`);
}

const CHART_EXPAND_YEAR_AREA_BAR = {
  maxBarThickness: 24,
  categoryPercentage: 0.68,
  barPercentage: 0.88,
};

function chartExpandYearOmitsArea(row) {
  if (!row) return false;
  return Boolean(row.omitAreaBar || row.omitAreaInTooltip);
}

/** One bar per year (centered); forecast years use forecast styling. */
function buildChartExpandYearUnifiedAreaBars(rows) {
  const data = [];
  const backgroundColor = [];
  const hoverBackgroundColor = [];
  const borderColor = [];
  const borderWidth = [];
  let hasHistArea = false;
  let hasForecastArea = false;

  for (const r of rows || []) {
    if (chartExpandYearOmitsArea(r) || r.area_ha == null || !Number.isFinite(Number(r.area_ha))) {
      data.push(null);
      backgroundColor.push("rgba(0,0,0,0)");
      hoverBackgroundColor.push("rgba(0,0,0,0)");
      borderColor.push("rgba(0,0,0,0)");
      borderWidth.push(0);
      continue;
    }
    data.push(Number(r.area_ha));
    if (r.isForecast) {
      hasForecastArea = true;
      backgroundColor.push("rgba(154, 232, 86, 0.42)");
      hoverBackgroundColor.push("rgba(154, 232, 86, 0.58)");
      borderColor.push("#5aaf28");
      borderWidth.push(1);
    } else {
      hasHistArea = true;
      backgroundColor.push("#9ae856");
      hoverBackgroundColor.push("#9ae856");
      borderColor.push("#9ae856");
      borderWidth.push(0);
    }
  }

  return {
    data,
    backgroundColor,
    hoverBackgroundColor,
    borderColor,
    borderWidth,
    hasHistArea,
    hasForecastArea,
  };
}

function chartExpandYearTrendLegendLabels(chart) {
  const items = [];
  chart.data.datasets.forEach((ds, i) => {
    const hidden = chart.getDatasetMeta(i).hidden;
    if (ds.areaUnified) {
      if (ds.areaLegendFlags?.hasHist) {
        items.push({
          text: "Area harvested (ha)",
          datasetIndex: i,
          hidden: Boolean(hidden),
          pointStyle: "rect",
          fillStyle: "#9ae856",
          strokeStyle: "#9ae856",
          lineWidth: 0,
          fontColor: "#4a5578",
        });
      }
      if (ds.areaLegendFlags?.hasForecast) {
        items.push({
          text: "Area harvested forecast (ha)",
          datasetIndex: i,
          hidden: Boolean(hidden),
          pointStyle: "rect",
          fillStyle: "rgba(154, 232, 86, 0.42)",
          strokeStyle: "#5aaf28",
          lineWidth: 0,
          fontColor: "#4a5578",
        });
      }
      return;
    }
    const isLine = ds.type === "line";
    items.push({
      text: ds.label,
      datasetIndex: i,
      hidden: Boolean(hidden),
      pointStyle: isLine ? "line" : "rect",
      fillStyle: isLine ? ds.borderColor || "#09663f" : ds.backgroundColor || "#9ae856",
      strokeStyle: isLine
        ? ds.borderColor || "#09663f"
        : ds.borderColor || ds.backgroundColor || "#9ae856",
      lineWidth: isLine ? 2.5 : 0,
      fontColor: "#4a5578",
    });
  });
  return items;
}

function appendForecastToYearTrend(points, forecastRows) {
  if (!forecastRows?.length) return { points: points || [], forecastStartIndex: -1 };
  const forecastByYear = new Map(
    forecastRows.map((f) => [Number(f.year), f])
  );
  const hist = [];
  const forecastPoints = [];
  for (const p of points || []) {
    const y = Number(p.year);
    const fc = forecastByYear.get(y);
    if (fc) {
      forecastPoints.push({
        year: y,
        volume_mt: fc.volume_mt,
        area_ha: chartExpandYearOmitsArea(fc) ? null : fc.area_ha,
        isForecast: true,
        omitAreaInTooltip: fc.omitAreaInTooltip,
        omitAreaBar: fc.omitAreaBar,
        yearForecastNote: fc.yearForecastNote || fc.periodForecastNote,
        periodForecastNote: fc.periodForecastNote || fc.yearForecastNote,
        fullLabel: fc.fullLabel || String(y),
      });
      forecastByYear.delete(y);
    } else {
      hist.push({ ...p, isForecast: false });
    }
  }
  for (const fc of forecastByYear.values()) {
    forecastPoints.push({
      year: fc.year,
      volume_mt: fc.volume_mt,
      area_ha: chartExpandYearOmitsArea(fc) ? null : fc.area_ha,
      isForecast: true,
      omitAreaInTooltip: fc.omitAreaInTooltip,
      omitAreaBar: fc.omitAreaBar,
      yearForecastNote: fc.yearForecastNote || fc.periodForecastNote,
      periodForecastNote: fc.periodForecastNote || fc.yearForecastNote,
      fullLabel: fc.fullLabel || String(fc.year),
    });
  }
  const combined = [...hist, ...forecastPoints].sort(
    (a, b) => Number(a.year) - Number(b.year)
  );
  const forecastStartIndex = combined.findIndex((r) => r.isForecast);
  return {
    points: combined,
    forecastStartIndex: forecastStartIndex >= 0 ? forecastStartIndex : hist.length,
  };
}

function renderChartExpandYearTrend(canvas, points, forecastRows = null) {
  const volumeOnly = CONFIG.showAreaYield === false;
  let series = (points || []).map((p) => ({ ...p, isForecast: false }));
  let forecastStartIndex = -1;
  if (forecastRows?.length) {
    const merged = appendForecastToYearTrend(series, forecastRows);
    series = merged.points;
    forecastStartIndex = merged.forecastStartIndex;
  }
  const years = series.map((p) => String(p.year));
  const rows = series;
  const volumes = rows.map((p) => p.volume_mt);
  const histVolumeSlice =
    forecastStartIndex >= 0 ? volumes.slice(0, forecastStartIndex) : volumes;
  const peakIndex = peakValueIndex(histVolumeSlice);
  const lowIndex = lowValueIndex(histVolumeSlice);
  const pointCount = rows.length;
  let datasets;
  if (volumeOnly) {
    datasets = [
      {
        type: "line",
        label: "Production volume",
        data: volumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.14)",
        tension: 0.3,
        fill: true,
        spanGaps: true,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2.5,
        yAxisID: "y",
      },
    ];
  } else if (forecastStartIndex >= 0) {
    const histEnd = Math.max(forecastStartIndex, 0);
    const areaBars = buildChartExpandYearUnifiedAreaBars(rows);
    const histVolumes = rows.map((r, i) => (i < histEnd ? r.volume_mt : null));
    const forecastVolumes = rows.map((r, i) => {
      if (histEnd <= 0) return i >= histEnd ? r.volume_mt : null;
      if (i < histEnd - 1) return null;
      if (i === histEnd - 1) return rows[histEnd - 1].volume_mt;
      return r.volume_mt;
    });
    const histPointCount = Math.max(histEnd, 0);
    datasets = [
      {
        type: "bar",
        label: "Area harvested (ha)",
        data: areaBars.data,
        backgroundColor: areaBars.backgroundColor,
        hoverBackgroundColor: areaBars.hoverBackgroundColor,
        borderColor: areaBars.borderColor,
        borderWidth: areaBars.borderWidth,
        borderRadius: 3,
        ...CHART_EXPAND_YEAR_AREA_BAR,
        areaUnified: true,
        areaLegendFlags: {
          hasHist: areaBars.hasHistArea,
          hasForecast: areaBars.hasForecastArea,
        },
        yAxisID: "y1",
        order: 2,
      },
      {
        type: "line",
        label: "Volume (MT)",
        data: histVolumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.12)",
        tension: 0.25,
        fill: false,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount: histPointCount, peakIndex }),
        borderWidth: 2,
        yAxisID: "y",
        order: 0,
      },
      {
        type: "line",
        label: "Volume forecast (MT)",
        data: forecastVolumes,
        borderColor: "#c98512",
        backgroundColor: "rgba(201, 133, 18, 0.08)",
        borderDash: [7, 5],
        tension: 0.2,
        fill: false,
        spanGaps: true,
        pointRadius: rows.map((r, i) => (i >= histEnd ? 4 : i === histEnd - 1 ? 3 : 0)),
        pointHoverRadius: rows.map((r, i) => (i >= histEnd - 1 ? 5 : 0)),
        borderWidth: 2,
        yAxisID: "y",
        order: 1,
      },
    ];
  } else {
    datasets = [
      {
        type: "bar",
        label: "Area harvested (ha)",
        data: rows.map((p) => p.area_ha),
        backgroundColor: "#9ae856",
        hoverBackgroundColor: "#9ae856",
        borderColor: "#9ae856",
        borderWidth: 0,
        borderRadius: 3,
        ...CHART_EXPAND_YEAR_AREA_BAR,
        yAxisID: "y1",
        order: 1,
      },
      {
        type: "line",
        label: "Volume (MT)",
        data: volumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.12)",
        tension: 0.25,
        fill: false,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2,
        yAxisID: "y",
        order: 0,
      },
    ];
  }

  const { grid, tick } = chartExpandGridTick();
  const options = chartExpandBaseOptions("year", {
    layout: {
      padding: volumeOnly
        ? { top: 10, right: 10, bottom: 2, left: 4 }
        : { top: 2, right: 2, bottom: 0, left: 2 },
    },
    plugins: {
      peakYearEffect: { enabled: true, animate: false },
      legend: {
        ...chartExpandSharedLegend(),
        display: !volumeOnly,
        labels: {
          ...chartExpandSharedLegend().labels,
          generateLabels:
            !volumeOnly && forecastStartIndex >= 0
              ? chartExpandYearTrendLegendLabels
              : mixedTrendLegendLabels,
        },
      },
      tooltip: chartExpandSharedTooltip({
        filter:
          !volumeOnly && forecastStartIndex >= 0
            ? (item) => {
                const row = rows[item.dataIndex];
                const value = item.parsed?.y;
                if (item.dataset?.areaUnified) {
                  if (chartExpandYearOmitsArea(row)) return false;
                  return value != null && !Number.isNaN(value);
                }
                const isForecastPeriod = Boolean(row?.isForecast);
                const isForecastDataset = chartExpandDatasetIsForecast(item.dataset);
                if (isForecastPeriod) return isForecastDataset;
                return !isForecastDataset;
              }
            : undefined,
        callbacks: volumeOnly
          ? {
              ...volumeTimeSeriesTooltipCallbacks,
              title(items) {
                const item = items?.[0];
                if (!item) return "";
                const extras = [];
                if (item.dataset?.peakIndex === item.dataIndex) extras.push("Peak");
                if (item.dataset?.lowIndex === item.dataIndex) extras.push("Lowest");
                return chartExpandEnsoTitle(item.label, extras, {
                  isForecast: Boolean(rows[item.dataIndex]?.isForecast),
                });
              },
            }
          : forecastStartIndex >= 0
            ? {
                ...mixedTrendTooltipCallbacks,
                title(items) {
                  const item = items?.[0];
                  if (!item) return "";
                  const extras = [];
                  if (items.some((i) => i.dataset?.peakIndex === i.dataIndex)) extras.push("Peak");
                  if (items.some((i) => i.dataset?.lowIndex === i.dataIndex)) extras.push("Lowest");
                  const row = rows[item.dataIndex];
                  const note = row?.periodForecastNote || row?.yearForecastNote;
                  if (note) extras.push(note);
                  return chartExpandEnsoTitle(item.label, extras, {
                    isForecast: Boolean(row?.isForecast),
                  });
                },
                label(ctx) {
                  const row = rows[ctx.dataIndex];
                  if (ctx.dataset?.areaUnified) {
                    if (chartExpandYearOmitsArea(row)) return null;
                    const v = ctx.parsed?.y;
                    if (v == null || Number.isNaN(v)) return null;
                    const areaLabel = row?.isForecast
                      ? "Area harvested forecast (ha)"
                      : "Area harvested (ha)";
                    return `${areaLabel}: ${fmt.score(v, { compact: false })} ha`;
                  }
                  return mixedTrendTooltipCallbacks.label(ctx);
                },
                labelPointStyle(ctx) {
                  if (ctx.dataset?.areaUnified) {
                    const row = rows[ctx.dataIndex];
                    const isFc = Boolean(row?.isForecast);
                    const color = isFc ? "rgba(154, 232, 86, 0.55)" : "#9ae856";
                    return { pointStyle: "rect", rotation: 0, borderColor: color, backgroundColor: color };
                  }
                  return mixedTrendTooltipCallbacks.labelPointStyle(ctx);
                },
                labelColor(ctx) {
                  if (ctx.dataset?.areaUnified) {
                    const row = rows[ctx.dataIndex];
                    const isFc = Boolean(row?.isForecast);
                    const color = isFc ? "#5aaf28" : "#9ae856";
                    return { borderColor: color, backgroundColor: color, borderWidth: isFc ? 1 : 0 };
                  }
                  return mixedTrendTooltipCallbacks.labelColor(ctx);
                },
              }
            : {
                ...mixedTrendTooltipCallbacks,
                title(items) {
                  const item = items?.[0];
                  if (!item) return "";
                  const extras = [];
                  if (items.some((i) => i.dataset?.peakIndex === i.dataIndex)) extras.push("Peak");
                  if (items.some((i) => i.dataset?.lowIndex === i.dataIndex)) extras.push("Lowest");
                  const row = rows[item.dataIndex];
                const note = row?.periodForecastNote || row?.yearForecastNote;
                if (note) extras.push(note);
                return chartExpandEnsoTitle(item.label, extras, {
                  isForecast: Boolean(row?.isForecast),
                });
              },
            },
      }),
    },
    datasets: {
      bar: {
        ...CHART_EXPAND_YEAR_AREA_BAR,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grace: volumeOnly ? "8%" : 0,
        border: { display: false },
        grid,
        title: volumeOnly
          ? {
              display: true,
              text: "Production (MT)",
              color: "#5f735f",
              font: { size: 11, family: "Roboto", weight: "500" },
              padding: { bottom: 4 },
            }
          : undefined,
        ticks: {
          ...tick,
          maxTicksLimit: volumeOnly ? 6 : 5,
          padding: 6,
          callback: (v) => fmt.compact(v),
        },
      },
      y1: {
        display: !volumeOnly,
        position: "right",
        beginAtZero: true,
        border: { display: false },
        grid: { drawOnChartArea: false },
        ticks: {
          ...tick,
          maxTicksLimit: 5,
          padding: 4,
          callback: (v) => fmt.compact(v),
        },
      },
      x: {
        border: { display: false },
        offset: !volumeOnly,
        grid: volumeOnly
          ? { color: "rgba(26, 46, 26, 0.04)", drawBorder: false }
          : { display: false },
        title: volumeOnly
          ? {
              display: true,
              text: "Year",
              color: "#5f735f",
              font: { size: 11, family: "Roboto", weight: "500" },
              padding: { top: 2 },
            }
          : undefined,
        ticks: {
          ...tick,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: volumeOnly ? 12 : 10,
          padding: volumeOnly ? 4 : 0,
        },
      },
    },
  });

  return new Chart(canvas, {
    type: volumeOnly ? "line" : "bar",
    data: { labels: years, datasets },
    options,
  });
}

function appendForecastToPeriodTrendFlat(flat, forecastRows, grain) {
  if (!forecastRows?.length) return { flat, forecastStartIndex: -1 };
  const periodField = grain === "quarter" ? "quarter" : "semester";
  const histRows = flat.rows.filter(
    (row) =>
      !forecastRows.some((f) => f.year === row.year && f.period === row.period)
  );
  const mergedRows = [
    ...histRows,
    ...forecastRows.map((f) => ({
      year: f.year,
      period: f.period,
      volume_mt: f.volume_mt,
      area_ha: f.area_ha,
      yield_mt_ha: null,
      crop_subtype: null,
      label: f.label || chartExpandPeriodLabel(grain, f.period),
      fullLabel: f.fullLabel || chartExpandPeriodDisplayLabel(grain, f.year, f.period),
      ensoKey: f.ensoKey || chartExpandPeriodEnsoKey(grain, f.year, f.period),
      isForecast: true,
      omitAreaInTooltip: f.omitAreaInTooltip,
      periodForecastNote: f.periodForecastNote || f.yearForecastNote,
    })),
  ].sort((a, b) => a.year - b.year || a.period - b.period);
  const forecastStartIndex = mergedRows.findIndex((r) => r.isForecast);
  return {
    forecastStartIndex: forecastStartIndex >= 0 ? forecastStartIndex : histRows.length,
    flat: {
      rows: mergedRows,
      labels: mergedRows.map((r) => r.label),
      fullLabels: mergedRows.map((r) => r.fullLabel),
      years: mergedRows.map((r) => r.year),
      ensoKeys: mergedRows.map((r) => r.ensoKey),
    },
  };
}

function renderChartExpandPeriodTrend(canvas, points, grain, forecastRows = null) {
  const volumeOnly = CONFIG.showAreaYield === false;
  let flat = flattenPeriodSeries(points, grain);
  let forecastStartIndex = -1;
  if (forecastRows?.length) {
    const merged = appendForecastToPeriodTrendFlat(flat, forecastRows, grain);
    flat = merged.flat;
    forecastStartIndex = merged.forecastStartIndex;
  }
  const { labels, fullLabels, years: periodYears, ensoKeys, rows } = flat;
  const { grid, tick } = chartExpandGridTick();
  const volumes = rows.map((r) => r.volume_mt);
  const histVolumeSlice =
    forecastStartIndex >= 0 ? volumes.slice(0, forecastStartIndex) : volumes;
  const peakIndex = peakValueIndex(histVolumeSlice);
  const lowIndex = lowValueIndex(histVolumeSlice);
  const pointCount = rows.length;
  const bottomPad = periodChartBottomPad();

  const periodTitleCallbacks = (extrasFromItem) => ({
    title(items) {
      const item = items?.[0];
      if (!item) return "";
      const idx = item.dataIndex;
      const extras = extrasFromItem ? extrasFromItem(items) : [];
      return chartExpandPeriodEnsoTitle(
        fullLabels[idx] || labels[idx] || item.label,
        ensoKeys[idx],
        extras,
        { isForecast: Boolean(rows[idx]?.isForecast) }
      );
    },
  });

  let datasets;
  if (volumeOnly) {
    datasets = [
      {
        type: "line",
        label: "Production volume",
        data: volumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.14)",
        tension: 0.3,
        fill: true,
        spanGaps: true,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2.5,
        yAxisID: "y",
      },
    ];
  } else if (forecastStartIndex >= 0) {
    const histEnd = forecastStartIndex;
    const histAreas = rows.map((r, i) => (i < histEnd ? r.area_ha : null));
    const forecastAreas = rows.map((r, i) => {
      if (i < histEnd) return null;
      if (r.omitAreaInTooltip || r.area_ha == null) return null;
      return r.area_ha;
    });
    const histVolumes = rows.map((r, i) => (i < histEnd ? r.volume_mt : null));
    const forecastVolumes = rows.map((r, i) => {
      if (histEnd <= 0) return i >= histEnd ? r.volume_mt : null;
      if (i < histEnd - 1) return null;
      if (i === histEnd - 1) return rows[histEnd - 1].volume_mt;
      return r.volume_mt;
    });
    const histPointCount = Math.max(histEnd, 0);
    datasets = [
      {
        type: "bar",
        label: "Area harvested (ha)",
        data: histAreas,
        backgroundColor: "#9ae856",
        hoverBackgroundColor: "#9ae856",
        borderColor: "#9ae856",
        borderWidth: 0,
        borderRadius: 3,
        maxBarThickness: 22,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
        yAxisID: "y1",
        order: 2,
      },
      {
        type: "bar",
        label: "Area harvested forecast (ha)",
        data: forecastAreas,
        backgroundColor: "rgba(154, 232, 86, 0.42)",
        hoverBackgroundColor: "rgba(154, 232, 86, 0.58)",
        borderColor: "#5aaf28",
        borderWidth: 1,
        borderRadius: 3,
        maxBarThickness: 22,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
        yAxisID: "y1",
        order: 3,
      },
      {
        type: "line",
        label: "Volume (MT)",
        data: histVolumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.12)",
        tension: 0.25,
        fill: false,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount: histPointCount, peakIndex }),
        borderWidth: 2,
        yAxisID: "y",
        order: 0,
      },
      {
        type: "line",
        label: "Volume forecast (MT)",
        data: forecastVolumes,
        borderColor: "#c98512",
        backgroundColor: "rgba(201, 133, 18, 0.08)",
        borderDash: [7, 5],
        tension: 0.2,
        fill: false,
        spanGaps: true,
        pointRadius: rows.map((r, i) => (i >= histEnd ? 4 : i === histEnd - 1 ? 3 : 0)),
        pointHoverRadius: rows.map((r, i) => (i >= histEnd - 1 ? 5 : 0)),
        borderWidth: 2,
        yAxisID: "y",
        order: 1,
      },
    ];
  } else {
    datasets = [
      {
        type: "bar",
        label: "Area harvested (ha)",
        data: rows.map((r) => r.area_ha),
        backgroundColor: "#9ae856",
        hoverBackgroundColor: "#9ae856",
        borderColor: "#9ae856",
        borderWidth: 0,
        borderRadius: 3,
        maxBarThickness: 22,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
        yAxisID: "y1",
        order: 1,
      },
      {
        type: "line",
        label: "Volume (MT)",
        data: volumes,
        borderColor: "#09663f",
        backgroundColor: "rgba(9, 102, 63, 0.12)",
        tension: 0.25,
        fill: false,
        peakIndex,
        lowIndex,
        ...yearMarkerStyle("#09663f", { pointCount, peakIndex }),
        borderWidth: 2,
        yAxisID: "y",
        order: 0,
      },
    ];
  }

  const options = chartExpandBaseOptions(grain, {
    layout: {
      padding: volumeOnly
        ? { top: 10, right: 10, bottom: bottomPad, left: 4 }
        : { top: 2, right: 2, bottom: bottomPad, left: 2 },
    },
    plugins: {
      peakYearEffect: { enabled: true, animate: false },
      legend: periodExpandLegend(volumeOnly ? lineLegendLabels : mixedTrendLegendLabels, {
        display: !volumeOnly,
      }),
      tooltip: chartExpandSharedTooltip({
        filter:
          forecastStartIndex >= 0 && !volumeOnly
            ? (item) => {
                const row = rows[item.dataIndex];
                const label = String(item.dataset?.label || "").toLowerCase();
                if (row?.omitAreaInTooltip && label.includes("area")) return false;
                const isForecastPeriod = Boolean(row?.isForecast);
                const isForecastDataset = chartExpandDatasetIsForecast(item.dataset);
                if (isForecastPeriod) return isForecastDataset;
                return !isForecastDataset;
              }
            : undefined,
        callbacks: volumeOnly
          ? {
              ...volumeTimeSeriesTooltipCallbacks,
              ...periodTitleCallbacks((items) => {
                const item = items?.[0];
                const extras = [];
                if (item?.dataset?.peakIndex === item.dataIndex) extras.push("Peak");
                if (item?.dataset?.lowIndex === item.dataIndex) extras.push("Lowest");
                return extras;
              }),
              label(ctx) {
                const v = ctx.parsed.y;
                if (v == null || Number.isNaN(v)) return "Production: —";
                const base = `Production: ${fmt.score(v, { compact: false })} MT`;
                if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
                if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
                return base;
              },
            }
          : forecastStartIndex >= 0
            ? {
                ...periodTitleCallbacks((items) => {
                  const idx = items?.[0]?.dataIndex;
                  const row = rows[idx];
                  if (row?.isForecast) {
                    const extras = [];
                    if (row.periodForecastNote) extras.push(row.periodForecastNote);
                    return extras;
                  }
                  const extras = [];
                  if (items.some((i) => i.dataset?.peakIndex === i.dataIndex)) extras.push("Peak");
                  if (items.some((i) => i.dataset?.lowIndex === i.dataIndex)) extras.push("Lowest");
                  return extras;
                }),
                label(ctx) {
                  const v = ctx.parsed.y;
                  if (v == null || Number.isNaN(v)) return undefined;
                  const label = ctx.dataset.label || "";
                  const unit = /area/i.test(label) ? "ha" : "MT";
                  const amount = fmt.score(v, { compact: false });
                  const base = `${label}: ${amount} ${unit}`;
                  if (rows[ctx.dataIndex]?.isForecast) return base;
                  if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
                  if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
                  return base;
                },
                labelPointStyle(ctx) {
                  const style = mixedTrendMarkerStyle(ctx);
                  return { pointStyle: style.pointStyle, rotation: 0 };
                },
                labelColor(ctx) {
                  const style = mixedTrendMarkerStyle(ctx);
                  return {
                    borderColor: style.borderColor,
                    backgroundColor: style.backgroundColor,
                    borderWidth: style.borderWidth,
                  };
                },
              }
            : {
                ...mixedTrendTooltipCallbacks,
                ...periodTitleCallbacks((items) => {
                  const extras = [];
                  if (items.some((i) => i.dataset?.peakIndex === i.dataIndex)) extras.push("Peak");
                  if (items.some((i) => i.dataset?.lowIndex === i.dataIndex)) extras.push("Lowest");
                  return extras;
                }),
              },
      }),
    },
    scales: {
      y: {
        beginAtZero: false,
        grace: volumeOnly ? "8%" : 0,
        border: { display: false },
        grid,
        title: volumeOnly
          ? {
              display: true,
              text: "Production (MT)",
              color: "#5f735f",
              font: { size: 11, family: "Roboto", weight: "500" },
              padding: { bottom: 4 },
            }
          : undefined,
        ticks: {
          ...tick,
          maxTicksLimit: volumeOnly ? 6 : 5,
          padding: 6,
          callback: (v) => fmt.compact(v),
        },
      },
      y1: {
        display: !volumeOnly,
        position: "right",
        beginAtZero: true,
        border: { display: false },
        grid: { drawOnChartArea: false },
        ticks: {
          ...tick,
          maxTicksLimit: 5,
          padding: 4,
          callback: (v) => fmt.compact(v),
        },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        title: { display: false },
        ticks: periodAxisTicks(tick, labels.length),
      },
    },
  });

  return attachExpandPeriodMeta(
    new Chart(canvas, {
      type: volumeOnly ? "line" : "bar",
      data: { labels, datasets },
      options,
    }),
    { ensoKeys, years: periodYears, fullLabels, grain }
  );
}

function renderChartExpandYield(canvas, points, grain, forecastPoints = null) {
  const { grid, tick } = chartExpandGridTick();
  const rows = mergeYieldChartPoints(points, forecastPoints, grain);
  let forecastStartIndex = -1;
  if (grain === "year" && forecastPoints?.length) {
    forecastStartIndex = appendForecastToYieldYearTrend(points, forecastPoints).forecastStartIndex;
  } else if (forecastPoints?.length) {
    forecastStartIndex = rows.findIndex((r) => r.isForecast);
    if (forecastStartIndex < 0) forecastStartIndex = rows.length;
  }

  if (grain === "year") {
    const labels = rows.map((p) => String(p.year));
    const yields = rows.map((p) => yieldForPoint(p));
    const histEnd = forecastStartIndex >= 0 ? forecastStartIndex : rows.length;
    const histYields = rows.map((r, i) => (i < histEnd ? yieldForPoint(r) : null));
    const forecastYields = rows.map((r, i) => {
      if (forecastStartIndex < 0) return null;
      if (histEnd <= 0) return i >= histEnd ? yieldForPoint(r) : null;
      if (i < histEnd - 1) return null;
      if (i === histEnd - 1) return yieldForPoint(rows[histEnd - 1]);
      return yieldForPoint(r);
    });
    const histVolumeSlice =
      forecastStartIndex >= 0 ? yields.slice(0, forecastStartIndex) : yields;
    const peakIndex = peakValueIndex(histVolumeSlice);
    const lowIndex = lowValueIndex(histVolumeSlice);
    const histPointCount = Math.max(histEnd, 0);
    const hasForecastLine = forecastStartIndex >= 0 && forecastStartIndex < rows.length;

    const datasets = hasForecastLine
      ? [
          {
            type: "line",
            label: "Yield (MT/ha)",
            data: histYields,
            borderColor: "#06402b",
            backgroundColor: "rgba(6, 64, 43, 0.12)",
            tension: 0.25,
            fill: true,
            peakIndex,
            lowIndex,
            ...yearMarkerStyle("#06402b", { pointCount: histPointCount, peakIndex }),
            borderWidth: 2,
          },
          {
            type: "line",
            label: "Yield forecast (MT/ha)",
            data: forecastYields,
            borderColor: "#c98512",
            backgroundColor: "rgba(201, 133, 18, 0.08)",
            borderDash: [7, 5],
            tension: 0.2,
            fill: false,
            spanGaps: true,
            pointRadius: rows.map((r, i) => (i >= histEnd ? 4 : i === histEnd - 1 ? 3 : 0)),
            pointHoverRadius: rows.map((r, i) => (i >= histEnd - 1 ? 5 : 0)),
            borderWidth: 2,
          },
        ]
      : [
          {
            type: "line",
            label: "Yield (MT/ha)",
            data: yields,
            borderColor: "#06402b",
            backgroundColor: "rgba(6, 64, 43, 0.12)",
            tension: 0.25,
            fill: true,
            peakIndex,
            lowIndex,
            ...yearMarkerStyle("#06402b", { pointCount: rows.length, peakIndex }),
            borderWidth: 2,
          },
        ];

    const options = chartExpandBaseOptions("year", {
      plugins: {
        peakYearEffect: { enabled: true, animate: false },
        legend: {
          ...chartExpandSharedLegend(),
          labels: {
            ...chartExpandSharedLegend().labels,
            generateLabels: hasForecastLine ? mixedTrendLegendLabels : lineLegendLabels,
          },
        },
        tooltip: chartExpandSharedTooltip({
          filter: hasForecastLine
            ? (item) => {
                const row = rows[item.dataIndex];
                const isForecastPeriod = Boolean(row?.isForecast);
                const isForecastDataset = chartExpandDatasetIsForecast(item.dataset);
                if (isForecastPeriod) return isForecastDataset;
                return !isForecastDataset;
              }
            : undefined,
          callbacks: {
            ...lineTooltipCallbacks,
            title(items) {
              const item = items?.[0];
              if (!item) return "";
              const extras = [];
              if (items.some((i) => i.dataset?.peakIndex === i.dataIndex)) extras.push("Peak");
              if (items.some((i) => i.dataset?.lowIndex === i.dataIndex)) extras.push("Lowest");
              const row = rows[item.dataIndex];
              const note = row?.periodForecastNote || row?.yearForecastNote;
              if (note) extras.push(note);
              return chartExpandEnsoTitle(item.label, extras, {
                isForecast: Boolean(row?.isForecast),
              });
            },
            label(ctx) {
              const v = ctx.parsed.y;
              if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
              const base = `${ctx.dataset.label}: ${fmt.score(v, { compact: false })} MT/ha`;
              if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
              if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
              return base;
            },
          },
        }),
      },
      scales: {
        y: {
          beginAtZero: false,
          border: { display: false },
          grid,
          ticks: {
            ...tick,
            maxTicksLimit: 5,
            callback: (v) => fmt.score(v, { compact: false }),
          },
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { ...tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        },
      },
    });
    return new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options,
    });
  }

  const flat = buildFlatPeriodMetricSeries(rows, grain, "yield_mt_ha");
  const flatRows = flat.rows || [];
  const periodForecastStart =
    forecastStartIndex >= 0 ? forecastStartIndex : flatRows.findIndex((r) => r.isForecast);
  const histEnd = periodForecastStart >= 0 ? periodForecastStart : flatRows.length;
  const hasPeriodForecast = periodForecastStart >= 0 && periodForecastStart < flatRows.length;
  const histData = flat.data.map((v, i) => (i < histEnd ? v : null));
  const forecastData = flat.data.map((v, i) => {
    if (!hasPeriodForecast) return null;
    if (histEnd <= 0) return i >= histEnd ? v : null;
    if (i < histEnd - 1) return null;
    if (i === histEnd - 1) return flat.data[histEnd - 1];
    return v;
  });
  const histVolumeSlice =
    hasPeriodForecast ? flat.data.slice(0, periodForecastStart) : flat.data;
  const peakIndex = peakValueIndex(histVolumeSlice);
  const lowIndex = lowValueIndex(histVolumeSlice);
  const histPointCount = Math.max(histEnd, 0);

  const periodDatasets = hasPeriodForecast
    ? [
        {
          type: "line",
          label: "Yield (MT/ha)",
          data: histData,
          borderColor: "#06402b",
          backgroundColor: "rgba(6, 64, 43, 0.12)",
          tension: 0.25,
          fill: true,
          peakIndex,
          lowIndex,
          ...yearMarkerStyle("#06402b", { pointCount: histPointCount, peakIndex }),
          borderWidth: 2,
        },
        {
          type: "line",
          label: "Yield forecast (MT/ha)",
          data: forecastData,
          borderColor: "#c98512",
          backgroundColor: "rgba(201, 133, 18, 0.08)",
          borderDash: [7, 5],
          tension: 0.2,
          fill: false,
          spanGaps: true,
          pointRadius: flatRows.map((r, i) => (i >= histEnd ? 4 : i === histEnd - 1 ? 3 : 0)),
          pointHoverRadius: flatRows.map((r, i) => (i >= histEnd - 1 ? 5 : 0)),
          borderWidth: 2,
        },
      ]
    : [
        {
          type: "line",
          label: "Yield (MT/ha)",
          data: flat.data,
          borderColor: "#06402b",
          backgroundColor: "rgba(6, 64, 43, 0.12)",
          tension: 0.25,
          fill: true,
          peakIndex,
          lowIndex,
          ...yearMarkerStyle("#06402b", { pointCount: flat.labels.length, peakIndex }),
          borderWidth: 2,
        },
      ];

  const options = chartExpandBaseOptions(grain, {
    layout: { padding: { top: 8, right: 2, bottom: periodChartBottomPad(), left: 2 } },
    plugins: {
      peakYearEffect: { enabled: true, animate: false },
      legend: periodExpandLegend(hasPeriodForecast ? mixedTrendLegendLabels : lineLegendLabels),
      tooltip: chartExpandSharedTooltip({
        filter: hasPeriodForecast
          ? (item) => {
              const row = flatRows[item.dataIndex];
              const isForecastPeriod = Boolean(row?.isForecast);
              const isForecastDataset = chartExpandDatasetIsForecast(item.dataset);
              if (isForecastPeriod) return isForecastDataset;
              return !isForecastDataset;
            }
          : undefined,
        callbacks: {
          ...lineTooltipCallbacks,
          title(items) {
            const item = items?.[0];
            if (!item) return "";
            const idx = item.dataIndex;
            const extras = [];
            if (item.dataset?.peakIndex === idx) extras.push("Peak");
            if (item.dataset?.lowIndex === idx) extras.push("Lowest");
            const row = flatRows[idx];
            if (row?.periodForecastNote) extras.push(row.periodForecastNote);
            return chartExpandPeriodEnsoTitle(
              flat.fullLabels[idx] || flat.labels[idx] || item.label,
              flat.ensoKeys[idx],
              extras,
              { isForecast: Boolean(row?.isForecast) }
            );
          },
          label(ctx) {
            const v = ctx.parsed.y;
            if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
            const base = `${ctx.dataset.label}: ${fmt.score(v, { compact: false })} MT/ha`;
            if (ctx.dataset?.peakIndex === ctx.dataIndex) return `${base} · highest in range`;
            if (ctx.dataset?.lowIndex === ctx.dataIndex) return `${base} · lowest in range`;
            return base;
          },
        },
      }),
    },
    scales: {
      y: {
        beginAtZero: false,
        border: { display: false },
        grid,
        ticks: {
          ...tick,
          maxTicksLimit: 5,
          callback: (v) => fmt.score(v, { compact: false }),
        },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        title: { display: false },
        ticks: periodAxisTicks(tick, flat.labels.length),
      },
    },
  });
  return attachExpandPeriodMeta(
    new Chart(canvas, {
      type: "line",
      data: {
        labels: flat.labels,
        datasets: periodDatasets,
      },
      options,
    }),
    {
      ensoKeys: flat.ensoKeys,
      years: flat.years,
      fullLabels: flat.fullLabels,
      grain,
    }
  );
}

function growthTooltipCallbacks(grain = "year", ensoKeys = null, fullLabels = null) {
  return {
    title(items) {
      const item = items?.[0];
      if (!item) return "";
      const extras = [];
      if (item.dataset?.peakIndex === item.dataIndex) extras.push("Peak");
      if (item.dataset?.lowIndex === item.dataIndex) extras.push("Lowest");
      if (grain !== "year" && Array.isArray(ensoKeys)) {
        const full =
          Array.isArray(fullLabels) && fullLabels[item.dataIndex]
            ? fullLabels[item.dataIndex]
            : item.label;
        return chartExpandPeriodEnsoTitle(full, ensoKeys[item.dataIndex], extras);
      }
      return chartExpandEnsoTitle(item.label, extras);
    },
    label(ctx) {
      const i = ctx.dataIndex;
      const fullLabel =
        Array.isArray(fullLabels) && fullLabels[i] ? fullLabels[i] : String(ctx.label || "");
      const yearMatch = fullLabel.match(/(\d{4})\s*$/) || fullLabel.match(/^(\d{4})/);
      const year = yearMatch ? Number(yearMatch[1]) : Number(ctx.label);
      const prevYear = Number.isFinite(year) ? year - 1 : null;
      const v = ctx.parsed.y;
      const current = ctx.dataset?.currentVolumes?.[i];
      const previous = ctx.dataset?.previousVolumes?.[i];
      const variance = ctx.dataset?.variances?.[i];
      const formatMt = (value, { signed = false } = {}) => {
        if (value == null || Number.isNaN(Number(value))) return "—";
        const num = Number(value);
        const sign = signed && num > 0 ? "+" : "";
        return `${sign}${fmt.score(num, { compact: false })} MT`;
      };
      const lines = [];
      if (v == null || Number.isNaN(v)) {
        lines.push("YoY growth: —");
      } else {
        const sign = v > 0 ? "+" : "";
        let growth = `YoY growth: ${sign}${fmt.score(v, { compact: false })}%`;
        if (ctx.dataset?.peakIndex === i) growth += " · highest in range";
        else if (ctx.dataset?.lowIndex === i) growth += " · lowest in range";
        lines.push(growth);
      }
      const curLabel =
        grain === "year" ? (Number.isFinite(year) ? String(year) : "year") : fullLabel;
      const prevLabel =
        grain === "year"
          ? prevYear != null
            ? String(prevYear)
            : "prior"
          : prevYear != null
            ? fullLabel.replace(String(year), String(prevYear))
            : "prior period";
      lines.push(`Production (${curLabel}): ${formatMt(current)}`);
      lines.push(`Production (${prevLabel}): ${formatMt(previous)}`);
      lines.push(`Variance: ${formatMt(variance, { signed: true })}`);
      return lines;
    },
  };
}

function renderChartExpandGrowth(canvas, points, grain) {
  const { tick } = chartExpandGridTick();
  if (grain === "year") {
    const built = buildVolumeYoYGrowth(points);
    const peakIndex = peakValueIndex(built.values);
    const lowIndex = lowValueIndex(built.values);
    const options = chartExpandBaseOptions("year", {
      layout: { padding: { top: 30, right: 14, bottom: 22, left: 8 } },
      plugins: {
        legend: { display: false },
        peakYearEffect: { enabled: true, mode: "bar", animate: false },
        barValueLabels: {
          enabled: true,
          offset: 6,
          font: "600 11px Roboto, system-ui, sans-serif",
          color: "rgba(0, 0, 0, 0.78)",
          formatter(value) {
            const sign = value > 0 ? "+" : "";
            return `${sign}${fmt.score(value, { compact: false })}%`;
          },
        },
        tooltip: {
          usePointStyle: false,
          displayColors: false,
          padding: 10,
          backgroundColor: "rgba(26, 46, 26, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "rgba(255, 255, 255, 0.92)",
          titleFont: { size: 12, family: "Roboto", weight: "600" },
          bodyFont: { size: 12, family: "Roboto" },
          cornerRadius: 4,
          caretPadding: 8,
          callbacks: growthTooltipCallbacks("year"),
        },
      },
      scales: {
        y: {
          grace: "18%",
          border: { display: false },
          grid: {
            color: (ctx) =>
              ctx.tick.value === 0 ? "rgba(26, 46, 26, 0.36)" : "rgba(26, 46, 26, 0.06)",
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.75 : 1),
            drawBorder: false,
          },
          title: {
            display: true,
            text: "Growth rate (%)",
            color: "#5f735f",
            font: { size: 11, family: "Roboto", weight: "500" },
            padding: { bottom: 8 },
          },
          ticks: {
            ...tick,
            maxTicksLimit: 8,
            callback: (v) => `${fmt.score(v, { compact: false })}%`,
          },
        },
        x: {
          border: { display: false },
          grid: { display: false },
          title: {
            display: true,
            text: "Year",
            color: "#5f735f",
            font: { size: 11, family: "Roboto", weight: "500" },
            padding: { top: 6 },
          },
          ticks: { ...tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 16 },
        },
      },
    });
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: built.labels,
        datasets: [
          {
            type: "bar",
            label: "YoY growth rate",
            data: built.values,
            backgroundColor: growthBarColors(built.values, { peakIndex, lowIndex }),
            hoverBackgroundColor: growthBarColors(built.values, {
              hover: true,
              peakIndex,
              lowIndex,
            }),
            borderWidth: 0,
            borderRadius: 0,
            borderSkipped: false,
            maxBarThickness: 34,
            categoryPercentage: 0.76,
            barPercentage: 0.86,
            peakIndex,
            lowIndex,
            currentVolumes: built.currentVolumes,
            previousVolumes: built.previousVolumes,
            variances: built.variances,
          },
        ],
      },
      options,
    });
  }

  const built = buildFlatPeriodYoYGrowth(points, grain);
  const peakIndex = peakValueIndex(built.values);
  const lowIndex = lowValueIndex(built.values);
  const options = chartExpandBaseOptions(grain, {
    layout: { padding: { top: 30, right: 14, bottom: periodChartBottomPad() + 8, left: 8 } },
    plugins: {
      legend: { display: false },
      peakYearEffect: { enabled: true, mode: "bar", animate: false },
      barValueLabels: {
        enabled: true,
        offset: 6,
        font: "600 11px Roboto, system-ui, sans-serif",
        color: "rgba(0, 0, 0, 0.78)",
        formatter(value) {
          const sign = value > 0 ? "+" : "";
          return `${sign}${fmt.score(value, { compact: false })}%`;
        },
      },
      tooltip: {
        usePointStyle: false,
        displayColors: false,
        padding: 10,
        backgroundColor: "rgba(26, 46, 26, 0.92)",
        titleColor: "#ffffff",
        bodyColor: "rgba(255, 255, 255, 0.92)",
        titleFont: { size: 12, family: "Roboto", weight: "600" },
        bodyFont: { size: 12, family: "Roboto" },
        cornerRadius: 4,
        caretPadding: 8,
        callbacks: growthTooltipCallbacks(grain, built.ensoKeys, built.fullLabels),
      },
    },
    scales: {
      y: {
        grace: "18%",
        border: { display: false },
        grid: {
          color: (ctx) =>
            ctx.tick.value === 0 ? "rgba(26, 46, 26, 0.36)" : "rgba(26, 46, 26, 0.06)",
          lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.75 : 1),
          drawBorder: false,
        },
        title: {
          display: true,
          text: "Growth rate (%)",
          color: "#5f735f",
          font: { size: 11, family: "Roboto", weight: "500" },
          padding: { bottom: 8 },
        },
        ticks: {
          ...tick,
          callback: (v) => `${fmt.score(v, { compact: false })}%`,
        },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        title: { display: false },
        ticks: periodAxisTicks(tick, built.labels.length),
      },
    },
  });
  return attachExpandPeriodMeta(
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: built.labels,
        datasets: [
          {
            type: "bar",
            label: "YoY growth rate",
            data: built.values,
            backgroundColor: growthBarColors(built.values, { peakIndex, lowIndex }),
            hoverBackgroundColor: growthBarColors(built.values, {
              hover: true,
              peakIndex,
              lowIndex,
            }),
            borderWidth: 0,
            borderRadius: 0,
            borderSkipped: false,
            maxBarThickness: 34,
            categoryPercentage: 0.76,
            barPercentage: 0.86,
            peakIndex,
            lowIndex,
            currentVolumes: built.currentVolumes,
            previousVolumes: built.previousVolumes,
            variances: built.variances,
          },
        ],
      },
      options,
    }),
    {
      ensoKeys: built.ensoKeys,
      years: built.years,
      fullLabels: built.fullLabels,
      grain,
    }
  );
}

function ecosystemForecastLookup(forecastPoints, grain) {
  const bySubtypeYear = new Map();
  const bySubtypePeriod = new Map();
  for (const p of forecastPoints || []) {
    if (!p?.isForecast || !p.crop_subtype) continue;
    const y = Number(p.year);
    if (!Number.isFinite(y)) continue;
    bySubtypeYear.set(`${p.crop_subtype}|${y}`, p);
    if (grain === "quarter" && p.quarter != null) {
      bySubtypePeriod.set(`${p.crop_subtype}|${y}|${p.quarter}`, p);
    } else if (grain === "semester" && p.semester != null) {
      bySubtypePeriod.set(`${p.crop_subtype}|${y}|${p.semester}`, p);
    }
  }
  return { bySubtypeYear, bySubtypePeriod };
}

function renderChartExpandEcosystem(canvas, points, grain, metricKey, forecastPoints = null) {
  const metric = metricKey || els.ecosystemMetric?.value || "yield_mt_ha";
  const meta = ECOSYSTEM_METRICS[metric] || ECOSYSTEM_METRICS.yield_mt_ha;
  const { grid, tick } = chartExpandGridTick();
  const colors = ecosystemChartColors();
  const forecastLookup = ecosystemForecastLookup(forecastPoints, grain);
  const hasForecast = Boolean(forecastPoints?.length);

  if (grain === "year") {
    const histYears = [...new Set(points.map((p) => Number(p.year)))].sort((a, b) => a - b);
    const fcYears = [
      ...new Set((forecastPoints || []).map((p) => Number(p.year)).filter(Number.isFinite)),
    ].sort((a, b) => a - b);
    const years = [...new Set([...histYears, ...fcYears])].sort((a, b) => a - b);
    const names = chartSeriesValues().filter((name) =>
      points.some((p) => p.crop_subtype === name)
    );
    const fallbackNames = names.length
      ? names
      : [...new Set(points.map((p) => p.crop_subtype).filter(Boolean))];
    const datasets = fallbackNames.map((name) => {
      const byYear = new Map(
        points
          .filter((p) => p.crop_subtype === name && !p.isForecast)
          .map((p) => [Number(p.year), ecosystemMetricValue(p, metric)])
      );
      const swatch = colors[name] || { bg: "#09663f", hover: "#09663f", border: "#09663f" };
      const data = years.map((y) => {
        const fc = forecastLookup.bySubtypeYear.get(`${name}|${y}`);
        if (fc) return ecosystemMetricValue(fc, metric);
        return byYear.get(y) ?? null;
      });
      const isForecastYear = years.map((y) =>
        Boolean(forecastLookup.bySubtypeYear.get(`${name}|${y}`))
      );
      return {
        type: "bar",
        label: name,
        data,
        backgroundColor: years.map((y, i) =>
          isForecastYear[i] ? withAlpha(swatch.bg, 0.42) : swatch.bg
        ),
        hoverBackgroundColor: years.map((y, i) =>
          isForecastYear[i] ? withAlpha(swatch.hover, 0.58) : swatch.hover
        ),
        borderColor: years.map((y, i) => (isForecastYear[i] ? swatch.border : swatch.bg)),
        borderWidth: years.map((y, i) => (isForecastYear[i] ? 2 : 0)),
        borderRadius: 3,
        maxBarThickness: 18,
        categoryPercentage: 0.7,
        barPercentage: hasForecast ? 0.88 : 0.85,
      };
    });
    const options = chartExpandBaseOptions("year", {
      plugins: {
        legend: {
          ...chartExpandSharedLegend(),
          labels: {
            ...chartExpandSharedLegend().labels,
            generateLabels: ecosystemLegendLabels,
          },
        },
        tooltip: chartExpandSharedTooltip({
          callbacks: {
            ...ecosystemTooltipCallbacks,
            title(items) {
              const item = items?.[0];
              const year = item?.label;
              if (!year) return "";
              const extras = [];
              const idx = item.dataIndex;
              const name = item.dataset?.label;
              const fc = name ? forecastLookup.bySubtypeYear.get(`${name}|${Number(year)}`) : null;
              if (fc?.periodForecastNote) extras.push(fc.periodForecastNote);
              return chartExpandEnsoTitle(year, extras, { isForecast: Boolean(fc) });
            },
            label(ctx) {
              const v = ctx.parsed.y;
              const name = ctx.dataset.label;
              const y = Number(ctx.label);
              const fc = forecastLookup.bySubtypeYear.get(`${name}|${y}`);
              const suffix = fc ? " (forecast)" : "";
              if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
              return `${ctx.dataset.label}: ${fmt.score(v, { compact: meta.compact })} ${meta.unit}${suffix}`;
            },
          },
        }),
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          grid,
          ticks: {
            ...tick,
            maxTicksLimit: 5,
            callback: (v) =>
              meta.compact ? fmt.compact(v) : fmt.score(v, { compact: false }),
          },
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { ...tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        },
      },
    });
    return new Chart(canvas, {
      type: "bar",
      data: { labels: years, datasets },
      options,
    });
  }

  const periodField = grain === "quarter" ? "quarter" : "semester";
  const periodSlots = [
    ...new Map(
      (points || [])
        .map((p) => {
          const year = Number(p.year);
          const period = Number(p[periodField]);
          if (!Number.isFinite(year) || !Number.isFinite(period)) return null;
          const key = `${year}-${period}`;
          return [
            key,
            {
              year,
              period,
              label: chartExpandPeriodLabel(grain, period),
              fullLabel: chartExpandPeriodDisplayLabel(grain, year, period),
              ensoKey: chartExpandPeriodEnsoKey(grain, year, period),
            },
          ];
        })
        .filter(Boolean)
    ).values(),
  ].sort((a, b) => a.year - b.year || a.period - b.period);

  for (const fp of forecastPoints || []) {
    const year = Number(fp.year);
    const period = Number(fp[periodField]);
    if (!Number.isFinite(year) || !Number.isFinite(period)) continue;
    if (periodSlots.some((s) => s.year === year && s.period === period)) continue;
    periodSlots.push({
      year,
      period,
      label: chartExpandPeriodLabel(grain, period),
      fullLabel: chartExpandPeriodDisplayLabel(grain, year, period),
      ensoKey: chartExpandPeriodEnsoKey(grain, year, period),
    });
  }
  periodSlots.sort((a, b) => a.year - b.year || a.period - b.period);

  const labels = periodSlots.map((s) => s.label);
  const fullLabels = periodSlots.map((s) => s.fullLabel);
  const periodYears = periodSlots.map((s) => s.year);
  const ensoKeys = periodSlots.map((s) => s.ensoKey);
  const names = chartSeriesValues().filter((name) =>
    points.some((p) => p.crop_subtype === name)
  );
  const fallbackNames = names.length
    ? names
    : [...new Set(points.map((p) => p.crop_subtype).filter(Boolean))];

  // Avoid subtype × period overload: if many series, show period totals instead.
  const useTotals = fallbackNames.length > 4 && !hasForecast;
  let datasets;
  if (useTotals) {
    const totalsByKey = new Map();
    for (const p of points || []) {
      const year = Number(p.year);
      const period = Number(p[periodField]);
      if (!Number.isFinite(year) || !Number.isFinite(period)) continue;
      const key = `${year}-${period}`;
      const slot = totalsByKey.get(key) || { volume_mt: 0, area_ha: 0 };
      slot.volume_mt += Number(p.volume_mt) || 0;
      slot.area_ha += Number(p.area_ha) || 0;
      totalsByKey.set(key, slot);
    }
    datasets = [
      {
        type: "bar",
        label: meta.label,
        data: periodSlots.map((s) => {
          const row = totalsByKey.get(`${s.year}-${s.period}`);
          if (!row) return null;
          if (metric === "yield_mt_ha") {
            return row.area_ha > 0 ? row.volume_mt / row.area_ha : null;
          }
          return row[metric] ?? null;
        }),
        backgroundColor: "#09663f",
        hoverBackgroundColor: "#0b8a52",
        borderColor: "#09663f",
        borderWidth: 0,
        borderRadius: 3,
        maxBarThickness: 22,
        categoryPercentage: 0.7,
        barPercentage: 0.85,
      },
    ];
  } else {
    datasets = fallbackNames.map((name) => {
      const byKey = new Map(
        points
          .filter((p) => p.crop_subtype === name && !p.isForecast)
          .map((p) => {
            const year = Number(p.year);
            const period = Number(p[periodField]);
            return [`${year}-${period}`, ecosystemMetricValue(p, metric)];
          })
      );
      const swatch = colors[name] || { bg: "#09663f", hover: "#09663f", border: "#09663f" };
      const data = periodSlots.map((s) => {
        const fc = forecastLookup.bySubtypePeriod.get(`${name}|${s.year}|${s.period}`);
        if (fc) return ecosystemMetricValue(fc, metric);
        return byKey.get(`${s.year}-${s.period}`) ?? null;
      });
      const isForecastPeriod = periodSlots.map((s) =>
        Boolean(forecastLookup.bySubtypePeriod.get(`${name}|${s.year}|${s.period}`))
      );
      return {
        type: "bar",
        label: name,
        data,
        backgroundColor: periodSlots.map((s, i) =>
          isForecastPeriod[i] ? withAlpha(swatch.bg, 0.42) : swatch.bg
        ),
        hoverBackgroundColor: periodSlots.map((s, i) =>
          isForecastPeriod[i] ? withAlpha(swatch.hover, 0.58) : swatch.hover
        ),
        borderColor: periodSlots.map((s, i) =>
          isForecastPeriod[i] ? swatch.border : swatch.bg
        ),
        borderWidth: periodSlots.map((s, i) => (isForecastPeriod[i] ? 2 : 0)),
        borderRadius: 3,
        maxBarThickness: 18,
        categoryPercentage: 0.7,
        barPercentage: hasForecast ? 0.88 : 0.85,
      };
    });
  }

  const options = chartExpandBaseOptions(grain, {
    layout: { padding: { top: 8, right: 2, bottom: periodChartBottomPad(), left: 2 } },
    plugins: {
      legend: periodExpandLegend(ecosystemLegendLabels, { display: !useTotals }),
      tooltip: chartExpandSharedTooltip({
        callbacks: {
          ...ecosystemTooltipCallbacks,
          title(items) {
            const item = items?.[0];
            if (!item) return "";
            const idx = item.dataIndex;
            const slot = periodSlots[idx];
            const name = item.dataset?.label;
            const fc =
              name && slot
                ? forecastLookup.bySubtypePeriod.get(`${name}|${slot.year}|${slot.period}`)
                : null;
            const extras = fc?.periodForecastNote ? [fc.periodForecastNote] : [];
            return chartExpandPeriodEnsoTitle(
              fullLabels[idx] || labels[idx] || item.label,
              ensoKeys[idx],
              extras,
              { isForecast: Boolean(fc) }
            );
          },
          label(ctx) {
            const v = ctx.parsed.y;
            const idx = ctx.dataIndex;
            const slot = periodSlots[idx];
            const fc = forecastLookup.bySubtypePeriod.get(
              `${ctx.dataset.label}|${slot?.year}|${slot?.period}`
            );
            const suffix = fc ? " (forecast)" : "";
            if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
            return `${ctx.dataset.label}: ${fmt.score(v, { compact: meta.compact })} ${meta.unit}${suffix}`;
          },
        },
      }),
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false },
        grid,
        ticks: {
          ...tick,
          callback: (v) =>
            meta.compact ? fmt.compact(v) : fmt.score(v, { compact: false }),
        },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        title: { display: false },
        ticks: periodAxisTicks(tick, labels.length),
      },
    },
  });
  return attachExpandPeriodMeta(
    new Chart(canvas, {
      type: "bar",
      data: { labels, datasets },
      options,
    }),
    { ensoKeys, years: periodYears, fullLabels, grain }
  );
}

function avgFinite(values) {
  const nums = (values || []).map(Number).filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function buildEnsoPhaseRows(points, grain, valueFn) {
  const rows = [];
  if (grain === "year") {
    for (const p of points || []) {
      const year = Number(p.year);
      if (!Number.isFinite(year)) continue;
      const value = valueFn(p);
      if (value == null || Number.isNaN(Number(value))) continue;
      const enso = ensoMetaForYear(year);
      rows.push({
        label: String(year),
        year,
        value: Number(value),
        phase: enso?.phase || "neutral",
        peakRoni: enso?.peak_roni ?? null,
      });
    }
    return rows;
  }

  const flat = flattenPeriodSeries(points, grain);
  for (const row of flat.rows) {
    const value = valueFn(row);
    if (value == null || Number.isNaN(Number(value))) continue;
    const enso = ensoMetaForPeriodKey(row.ensoKey);
    rows.push({
      label: row.fullLabel,
      year: row.year,
      period: row.period,
      value: Number(value),
      phase: enso?.phase || "neutral",
      peakRoni: enso?.peak_roni ?? null,
    });
  }
  return rows;
}

function ensoMetricPhrase(metricLabel) {
  const raw = String(metricLabel || "production volume").trim();
  if (/^(production\s+)?volume$/i.test(raw)) return "Production volume";
  if (/^yield$/i.test(raw)) return "Yield";
  if (!raw) return "Production volume";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function phaseChronologicalTrend(rows) {
  if (!rows || rows.length < 2) return null;
  const sorted = [...rows].sort((a, b) => {
    const yearDiff = (a.year || 0) - (b.year || 0);
    if (yearDiff) return yearDiff;
    return (a.period || 0) - (b.period || 0);
  });
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const pct = pctChange(first.value, last.value);
  if (pct == null || Number.isNaN(pct)) return null;
  return {
    first,
    last,
    pct,
    changeText: describeChange(pct),
    direction: pct > 0.05 ? "growth" : pct < -0.05 ? "decline" : "steady",
  };
}

function buildEnsoRelativityInsight(phaseRows, { metricLabel = "production volume", unit = "MT", compact = true } = {}) {
  if (!phaseRows?.length) return "";

  const byPhase = {
    el_nino: [],
    la_nina: [],
    both: [],
    neutral: [],
  };
  for (const row of phaseRows) {
    const key = byPhase[row.phase] ? row.phase : "neutral";
    byPhase[key].push(row);
  }

  const ninoAvg = avgFinite(byPhase.el_nino.map((r) => r.value));
  const ninaAvg = avgFinite(byPhase.la_nina.map((r) => r.value));
  const neutralAvg = avgFinite(byPhase.neutral.map((r) => r.value));
  const peak = phaseRows.reduce(
    (best, row) => (row.value > (best?.value ?? -Infinity) ? row : best),
    null
  );

  const fmtValue = (v) => fmt.score(v, { compact });
  const parts = [];
  const unitText = unit ? ` ${unit}` : "";
  const metricPhrase = ensoMetricPhrase(metricLabel);
  const metricLower = metricPhrase.charAt(0).toLowerCase() + metricPhrase.slice(1);

  if (ninoAvg != null && ninaAvg != null) {
    const gapPct = pctChange(ninaAvg, ninoAvg);
    const gapText = describeChange(gapPct);
    parts.push(
      `Average ${metricLower} during El Niño periods was ${fmtValue(ninoAvg)}${unitText}` +
        ` versus ${fmtValue(ninaAvg)}${unitText} in La Niña` +
        (gapText
          ? ` — ${metricPhrase} during El Niño ${gapText} relative to La Niña`
          : "") +
        "."
    );
  } else if (ninoAvg != null && neutralAvg != null) {
    const gapPct = pctChange(neutralAvg, ninoAvg);
    const gapText = describeChange(gapPct);
    parts.push(
      `Average ${metricLower} in El Niño periods was ${fmtValue(ninoAvg)}${unitText}` +
        ` versus ${fmtValue(neutralAvg)}${unitText} in neutral periods` +
        (gapText
          ? ` — ${metricPhrase} during El Niño ${gapText} relative to neutral periods`
          : "") +
        "."
    );
  } else if (ninaAvg != null && neutralAvg != null) {
    const gapPct = pctChange(neutralAvg, ninaAvg);
    const gapText = describeChange(gapPct);
    parts.push(
      `Average ${metricLower} in La Niña periods was ${fmtValue(ninaAvg)}${unitText}` +
        ` versus ${fmtValue(neutralAvg)}${unitText} in neutral periods` +
        (gapText
          ? ` — ${metricPhrase} during La Niña ${gapText} relative to neutral periods`
          : "") +
        "."
    );
  } else if (ninoAvg != null || ninaAvg != null) {
    const phase = ninoAvg != null ? "El Niño" : "La Niña";
    const avg = ninoAvg != null ? ninoAvg : ninaAvg;
    const count = ninoAvg != null ? byPhase.el_nino.length : byPhase.la_nina.length;
    parts.push(
      `${phase} covered ${count} point${count === 1 ? "" : "s"} in this range, averaging ${fmtValue(avg)}${unitText}.`
    );
  } else {
    parts.push(
      "No El Niño or La Niña episodes overlap this filtered range, so ENSO contrast is not available."
    );
  }

  const ninoTrend = phaseChronologicalTrend(byPhase.el_nino);
  const ninaTrend = phaseChronologicalTrend(byPhase.la_nina);
  if (ninoTrend?.changeText) {
    parts.push(
      `During El Niño from ${ninoTrend.first.label} to ${ninoTrend.last.label}, ${metricLower} ${ninoTrend.changeText}.`
    );
  }
  if (ninaTrend?.changeText) {
    parts.push(
      `During La Niña from ${ninaTrend.first.label} to ${ninaTrend.last.label}, ${metricLower} ${ninaTrend.changeText}.`
    );
  }
  if (ninoTrend && ninaTrend) {
    if (ninoTrend.direction === "growth" && ninaTrend.direction === "growth") {
      parts.push(`${metricPhrase} showed growth during both El Niño and La Niña in this range.`);
    } else if (ninoTrend.direction === "decline" && ninaTrend.direction === "decline") {
      parts.push(`${metricPhrase} declined during both El Niño and La Niña in this range.`);
    } else if (
      ninoTrend.direction !== "steady" &&
      ninaTrend.direction !== "steady" &&
      ninoTrend.direction !== ninaTrend.direction
    ) {
      parts.push(
        `${metricPhrase} moved in opposite directions: ${ninoTrend.direction} during El Niño and ${ninaTrend.direction} during La Niña.`
      );
    }
  }

  if (peak && (peak.phase === "el_nino" || peak.phase === "la_nina" || peak.phase === "both")) {
    parts.push(
      `Peak ${metricLower} (${fmtValue(peak.value)}${unitText} in ${peak.label}) occurred during ${ensoPhaseLabel(peak.phase)}.`
    );
  } else if (peak && peak.phase === "neutral" && parts.length < 3) {
    parts.push(
      `Peak ${metricLower} (${fmtValue(peak.value)}${unitText} in ${peak.label}) occurred in a neutral ENSO period.`
    );
  }

  return parts.slice(0, 4).join(" ");
}

function buildChartExpandBaseAnalysis(kind, grain, points) {
  if (!points?.length) return "No production data for the current filters.";

  if (kind === "trend") {
    if (grain === "year") return buildTrendSummary(points);
    const flat = flattenPeriodSeries(points, grain);
    if (flat.rows.length < 2) {
      const row = flat.rows[0];
      return row
        ? `Showing ${row.fullLabel} only: production volume ${fmt.score(row.volume_mt)} MT.`
        : "No period data available for the current filters.";
    }
    const first = flat.rows[0];
    const last = flat.rows[flat.rows.length - 1];
    const volText = describeChange(pctChange(first.volume_mt, last.volume_mt));
    let peak = flat.rows[0];
    for (const row of flat.rows) {
      if ((row.volume_mt ?? -Infinity) > (peak.volume_mt ?? -Infinity)) peak = row;
    }
    return (
      `From ${first.fullLabel} to ${last.fullLabel}, production volume ${volText || "changed"}.` +
      (peak ? ` Peak production volume was in ${peak.fullLabel} (${fmt.score(peak.volume_mt)} MT).` : "")
    );
  }

  if (kind === "yield") {
    if (grain === "year") return buildYieldTrendSummary(points);
    const flat = buildFlatPeriodMetricSeries(points, grain, "yield_mt_ha");
    const yieldRows = flat.rows
      .map((r, i) => ({ ...r, yield_mt_ha: flat.data[i] }))
      .filter((r) => r.yield_mt_ha != null && !Number.isNaN(r.yield_mt_ha));
    if (!yieldRows.length) return "No yield data available for the current filters.";
    if (yieldRows.length === 1) {
      return `Showing ${yieldRows[0].fullLabel} only: yield ${fmt.score(yieldRows[0].yield_mt_ha, { compact: false })} MT/ha.`;
    }
    const first = yieldRows[0];
    const last = yieldRows[yieldRows.length - 1];
    const changeText = describeChange(pctChange(first.yield_mt_ha, last.yield_mt_ha));
    return `From ${first.fullLabel} to ${last.fullLabel}, yield ${changeText || "changed"}.`;
  }

  if (kind === "growth") {
    if (grain === "year") {
      const built = buildVolumeYoYGrowth(points);
      return buildVolumeGrowthSummary(built.labels, built.values);
    }
    const built = buildFlatPeriodYoYGrowth(points, grain);
    const pairs = built.fullLabels
      .map((label, i) => ({ label, growth: built.values[i] }))
      .filter((row) => row.growth != null && !Number.isNaN(row.growth));
    if (!pairs.length) return "No year-on-year growth data available for the current filters.";
    const latest = pairs[pairs.length - 1];
    const latestText = describeChange(latest.growth);
    return `Through ${latest.label}, production volume ${latestText || "changed"} versus the same period a year earlier.`;
  }

  if (kind === "ecosystem") {
    const metric = els.ecosystemMetric?.value || "yield_mt_ha";
    if (grain === "year") return buildEcosystemTrendSummary(points, metric);
    const meta = ECOSYSTEM_METRICS[metric] || ECOSYSTEM_METRICS.yield_mt_ha;
    return `Period view shows ${meta.label.toLowerCase()} by ${periodAxisTitle(grain).toLowerCase()} under the current subtype filters.`;
  }

  return buildTrendSummary(points);
}

function withEnsoRelativity(text, points, options = {}) {
  const {
    grain = "year",
    metricLabel = "production volume",
    unit = "MT",
    compact = true,
    valueFn = (p) => p.volume_mt,
  } = options;
  if (!points?.length) return text || "";
  const insight = buildEnsoRelativityInsight(buildEnsoPhaseRows(points, grain, valueFn), {
    metricLabel,
    unit,
    compact,
  });
  return [text, insight].filter(Boolean).join(" ");
}

/** Chart panel analysis: base summary plus ENSO relativity on production dashboards. */
function productionChartInsight(baseText, points, options = {}) {
  if (!baseText) return "";
  if (!points?.length || !wantsEnsoOverlay()) return baseText;
  return withEnsoRelativity(baseText, points, { grain: "year", ...options });
}

function buildChartExpandAnalysis(kind, grain, points) {
  const base = buildChartExpandBaseAnalysis(kind, grain, points);
  let valueFn = (p) => p.volume_mt;
  let metricLabel = "production volume";
  let unit = "MT";
  let compact = true;

  if (kind === "yield") {
    valueFn = (p) => (p.yield_mt_ha != null ? p.yield_mt_ha : yieldForPoint(p));
    metricLabel = "yield";
    unit = "MT/ha";
    compact = false;
  } else if (kind === "growth") {
    valueFn = (p) => p.volume_mt;
    metricLabel = "production volume";
    unit = "MT";
  } else if (kind === "ecosystem") {
    const metric = els.ecosystemMetric?.value || "yield_mt_ha";
    const meta = ECOSYSTEM_METRICS[metric] || ECOSYSTEM_METRICS.yield_mt_ha;
    valueFn = (p) => ecosystemMetricValue(p, metric);
    metricLabel = meta.label.toLowerCase();
    unit = meta.unit;
    compact = meta.compact;
  }

  return withEnsoRelativity(base, points, {
    grain,
    metricLabel,
    unit,
    compact,
    valueFn,
  });
}

async function paintChartExpandModal(kind, grain) {
  const paintSeq = ++chartExpandPaintSeq;
  const modal = ensureChartExpandModal();
  pruneChartExpandEnsoLegends(modal);
  ensureChartExpandFooter(modal);
  const sub = modal.querySelector("#chartExpandSub");
  const legend = modal.querySelector("#chartExpandEnsoLegend");

  destroyChartExpandModalChart();
  const canvas = resetChartExpandCanvas(modal);
  if (!canvas) return;

  modal.querySelectorAll("[data-chart-grain]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-chart-grain") === grain);
  });
  if (sub && !chartExpandForecastActive(kind, grain)) {
    sub.textContent =
      grain === "year"
        ? "Annual trend with El Niño / La Niña year shading"
        : grain === "quarter"
          ? "One point per quarter · ENSO shaded by quarter"
          : "One point per semester · ENSO shaded by semester";
  }
  syncChartExpandForecastChrome(modal, kind);
  if (legend && !chartExpandForecastActive(kind, grain)) {
    legend.innerHTML = ensoLegendHtml({ compact: true });
    bindEnsoGuideTriggers(legend);
  }

  let payload;
  try {
    payload = await fetchChartExpandSeries(kind, grain);
  } catch (err) {
    if (paintSeq !== chartExpandPaintSeq) return;
    if (sub) {
      sub.textContent = `Could not load chart: ${err.message || "Unknown error"}`;
    }
    return;
  }
  if (paintSeq !== chartExpandPaintSeq) return;

  const points = payload?.points || [];
  if (grain !== "year") {
    const periodField = grain === "quarter" ? "quarter" : "semester";
    const hasPeriod = points.some((p) => Number.isFinite(Number(p[periodField])));
    if (!hasPeriod) {
      if (sub) {
        sub.textContent =
          "No quarter/semester breakdown is available for the current filters.";
      }
      chartExpandModalChart = new Chart(canvas, {
        type: "bar",
        data: { labels: [], datasets: [] },
        options: chartExpandBaseOptions(grain),
      });
      const analysisMissing = modal.querySelector("#chartExpandAnalysis");
      if (analysisMissing) {
        analysisMissing.textContent =
          "No quarter/semester breakdown is available for the current filters.";
      }
      return;
    }
  }

  if (!points.length) {
    if (sub) {
      sub.textContent = "No production data for the current filters.";
    }
    chartExpandModalChart = new Chart(canvas, {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: chartExpandBaseOptions(grain),
    });
    const analysisEmpty = modal.querySelector("#chartExpandAnalysis");
    if (analysisEmpty) {
      analysisEmpty.textContent = "No production data for the current filters.";
    }
    return;
  }

  let forecastRows = null;
  let ecosystemForecastPoints = null;
  let yieldForecastPoints = null;
  if (chartExpandForecastActive(kind, grain)) {
    setChartExpandForecastLoading(modal, true);
    const cropLabel = CONFIG.cropGroup || "production";
    if (sub) sub.textContent = `Computing ${cropLabel} production forecast…`;
    try {
      if (kind === "ecosystem") {
        ecosystemForecastPoints = await buildChartExpandEcosystemForecast(grain, points);
        forecastRows = ecosystemForecastYearRows(ecosystemForecastPoints);
      } else {
        forecastRows = await buildChartExpandProductionForecast(grain, points);
        if (kind === "yield") {
          yieldForecastPoints = productionForecastRowsToYieldPoints(forecastRows, grain);
        }
      }
    } catch (err) {
      chartExpandLastForecastWarnings = [err.message || "Forecast failed."];
      forecastRows = [];
      ecosystemForecastPoints = [];
      yieldForecastPoints = [];
    } finally {
      setChartExpandForecastLoading(modal, false);
    }
    refreshChartExpandForecastPresentation(modal, kind, grain);
    const forecastEmpty =
      kind === "ecosystem"
        ? !ecosystemForecastPoints?.length
        : kind === "yield"
          ? !yieldForecastPoints?.length
          : !forecastRows?.length;
    if (forecastEmpty && sub) {
      sub.textContent =
        "Not enough history under the current filters to project the Q4 2026 – Q4 2027 outlook window.";
    }
  } else {
    const warningsEl = ensureChartExpandForecastWarnings(modal);
    if (warningsEl) warningsEl.hidden = true;
  }

  if (kind === "trend") {
    chartExpandModalChart =
      grain === "year"
        ? renderChartExpandYearTrend(canvas, points, forecastRows)
        : renderChartExpandPeriodTrend(canvas, points, grain, forecastRows);
  } else if (kind === "yield") {
    chartExpandModalChart = renderChartExpandYield(canvas, points, grain, yieldForecastPoints);
  } else if (kind === "growth") {
    chartExpandModalChart = renderChartExpandGrowth(canvas, points, grain);
  } else if (kind === "ecosystem") {
    chartExpandModalChart = renderChartExpandEcosystem(
      canvas,
      points,
      grain,
      els.ecosystemMetric?.value || "yield_mt_ha",
      ecosystemForecastPoints
    );
  } else {
    chartExpandModalChart = renderChartExpandYearTrend(canvas, points);
  }
  if (paintSeq !== chartExpandPaintSeq) {
    destroyChartExpandModalChart();
    return;
  }
  const expandLabelKeys = chartExpandModalChart?.$ensoLabelKeys || null;
  let byYearForBands = ensoByYear || {};
  const ensoForecastRows =
    kind === "ecosystem" && ecosystemForecastPoints?.length
      ? ecosystemForecastPoints.map((p) => ({
          ...p,
          period: p.quarter ?? p.semester ?? p.period,
          isForecast: true,
        }))
      : kind === "yield" && yieldForecastPoints?.length
        ? yieldForecastPoints.map((p) => ({
            ...p,
            period: p.quarter ?? p.semester ?? p.period,
            isForecast: true,
          }))
        : forecastRows;
  if (
    grain === "year" &&
    chartExpandForecastActive(kind, grain) &&
    (forecastRows?.length || ecosystemForecastPoints?.length)
  ) {
    byYearForBands = {
      ...byYearForBands,
      ...buildEnsoOutlookYearOverrides(forecastRows),
    };
  }
  applyEnsoBands(chartExpandModalChart, grain, {
    labelKeys: expandLabelKeys,
    byPeriod: buildEnsoOutlookPeriodMap(grain, ensoForecastRows, expandLabelKeys),
    byYear: byYearForBands,
  });
  chartExpandModalChart.update();

  const analysisEl = modal.querySelector("#chartExpandAnalysis");
  if (analysisEl) {
    analysisEl.textContent = buildChartExpandAnalysis(kind, grain, points);
  }
  syncChartExpandForecastAnalysis(modal, kind, grain);
}

async function openChartExpandModal(chartId) {
  const meta = CHART_EXPAND_META[chartId];
  if (!meta) return;
  if (!ensoByYear) {
    await loadEnso();
  }
  const modal = ensureChartExpandModal();
  if (!modal.hidden) return;

  chartExpandShowForecast = false;
  chartExpandLastForecastSnapshot = null;
  const title = modal.querySelector("#chartExpandTitle");
  const expandBtn = document.querySelector(`[data-chart-expand="${chartId}"]`);
  const sourceTitle =
    expandBtn?.closest(".panel")?.querySelector(".trend-panel-title")?.textContent?.replace(/\s+/g, " ").trim() ||
    meta.title;
  const previouslyFocused = document.activeElement;
  const closeBtn = modal.querySelector(".app-modal-close");
  const forecastBtn = modal.querySelector("#chartExpandForecastBtn");
  const forecastMethodSelect = ensureChartExpandForecastMethodSelect(modal);
  let grain = "year";
  syncChartExpandForecastChrome(modal, meta.kind);

  if (title) {
    title.textContent = sourceTitle;
  }

  const close = () => {
    destroyChartExpandModalChart();
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modal.removeEventListener("keydown", onKeyDown);
    modal.querySelectorAll("[data-chart-expand-dismiss]").forEach((el) => {
      el.removeEventListener("click", onDismiss);
    });
    modal.querySelectorAll("[data-chart-grain]").forEach((el) => {
      el.removeEventListener("click", onGrainClick);
    });
    forecastBtn?.removeEventListener("click", onForecastClick);
    forecastMethodSelect?.removeEventListener("change", onForecastMethodChange);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };

  const onDismiss = () => close();
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const onGrainClick = (event) => {
    const btn = event.currentTarget;
    const next = btn.getAttribute("data-chart-grain") || "year";
    if (next === grain) return;
    grain = next;
    syncChartExpandForecastChrome(modal, meta.kind);
    paintChartExpandModal(meta.kind, grain).catch((err) => {
      console.warn("Chart expand failed:", err);
    });
  };
  const onForecastClick = () => {
    if (!chartExpandSupportsProductionForecast(meta.kind)) return;
    chartExpandShowForecast = !chartExpandShowForecast;
    syncChartExpandForecastChrome(modal, meta.kind);
    const needOutlook =
      chartExpandShowForecast &&
      (!ensoOutlookByQuarter || !Object.keys(ensoOutlookByQuarter).length);
    const paint = () =>
      paintChartExpandModal(meta.kind, grain).catch((err) => {
        console.warn("Chart expand failed:", err);
      });
    if (needOutlook) {
      loadEnso({ force: true }).then(paint);
    } else {
      paint();
    }
  };
  const onForecastMethodChange = () => {
    chartExpandForecastMethod = normalizeChartExpandForecastMethod(forecastMethodSelect?.value);
    syncChartExpandForecastChrome(modal, meta.kind);
    if (!chartExpandShowForecast) return;
    paintChartExpandModal(meta.kind, grain).catch((err) => {
      console.warn("Chart expand failed:", err);
    });
  };

  modal.querySelectorAll("[data-chart-expand-dismiss]").forEach((el) => {
    el.addEventListener("click", onDismiss);
  });
  modal.querySelectorAll("[data-chart-grain]").forEach((el) => {
    el.addEventListener("click", onGrainClick);
  });
  forecastBtn?.addEventListener("click", onForecastClick);
  forecastMethodSelect?.addEventListener("change", onForecastMethodChange);
  modal.addEventListener("keydown", onKeyDown);

  modal.hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => closeBtn?.focus());
  await paintChartExpandModal(meta.kind, grain);
}

function bindChartExpand() {
  document.querySelectorAll("[data-chart-expand]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-chart-expand");
      openChartExpandModal(id).catch((err) => console.warn(err));
    });
  });
}

function ensureLeaveModal() {
  let modal = document.getElementById("leaveDashboardModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "leaveDashboardModal";
  modal.className = "app-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "leaveDashboardTitle");
  modal.innerHTML = `
    <div class="app-modal-backdrop" data-leave-dismiss="true"></div>
    <div class="app-modal-panel">
      <h2 class="app-modal-title" id="leaveDashboardTitle">Leave this dashboard?</h2>
      <p class="app-modal-text">You will return to the Data Analytics Platform (PSA OpenSTAT) home.</p>
      <div class="app-modal-actions">
        <button type="button" class="app-modal-btn app-modal-btn-secondary" data-leave-dismiss="true">Stay</button>
        <button type="button" class="app-modal-btn app-modal-btn-primary" id="leaveDashboardConfirm">Leave</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openLeaveModal(onConfirm) {
  const modal = ensureLeaveModal();
  if (!modal.hidden) return;

  const confirmBtn = modal.querySelector("#leaveDashboardConfirm");
  const previouslyFocused = document.activeElement;

  const close = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modal.removeEventListener("keydown", onKeyDown);
    confirmBtn?.removeEventListener("click", onConfirmClick);
    modal.querySelectorAll("[data-leave-dismiss]").forEach((el) => {
      el.removeEventListener("click", onDismiss);
    });
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };

  const onDismiss = () => close();
  const onConfirmClick = () => {
    close();
    onConfirm?.();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  modal.querySelectorAll("[data-leave-dismiss]").forEach((el) => {
    el.addEventListener("click", onDismiss);
  });
  confirmBtn?.addEventListener("click", onConfirmClick);
  modal.addEventListener("keydown", onKeyDown);

  modal.hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    confirmBtn?.focus();
  });
}

function requestLeaveDashboard(href = "/") {
  openLeaveModal(() => {
    window.location.href = href;
  });
}

function bindLeaveGuards() {
  // Keep the user on this page until they confirm leave (browser Back included).
  const guardState = { agriStatDashboardGuard: true };
  history.pushState(guardState, "", location.href);
  window.addEventListener("popstate", () => {
    history.pushState(guardState, "", location.href);
    requestLeaveDashboard("/");
  });
}

function bindBrandHomeLink() {
  const link = document.querySelector(".header-brand-home");
  if (!link) return;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    requestLeaveDashboard(link.getAttribute("href") || "/");
  });
}

function bindGalleryBackLink() {
  const btn = document.getElementById("dashboardGalleryBackBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    requestLeaveDashboard("/dashboards");
  });
}

function bind() {
  applyDashboardConfig();
  bindRawTips();
  bindSortableTables();
  bindRegionVolumeDrilldown();
  bindRegionAnnualDrilldown();
  bindFarmgateBoard();
  ["quarter", "semester", "month", "crop", "subsector", "region", "province"].forEach((id) => {
    const group = els[id];
    if (!group) return;
    syncMultiSelectSummary(group);

    const toggle = group.querySelector(".multi-select-toggle");
    toggle?.addEventListener("click", (event) => {
      event.preventDefault();
      const willOpen = !group.classList.contains("is-open");
      closeAllMultiSelects(group);
      setMultiSelectOpen(group, willOpen);
    });

    group.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-multi-action]");
      if (!actionBtn || !group.contains(actionBtn)) return;
      event.preventDefault();
      const action = actionBtn.dataset.multiAction;
      const searchInput = group.querySelector(".multi-select-search-input");
      const searchActive = Boolean(searchInput?.value?.trim());
      // Crop filter: "Deselect all" must clear every option, not only search matches.
      // With 100+ vegetables, users search then narrow — partial clear left hidden
      // selections checked and the dashboard stayed unfiltered.
      const visibleOnly = id === "crop" ? false : searchActive;
      if (action === "select-all") checkAllValues(group, { visibleOnly: searchActive });
      else if (action === "clear") {
        clearAllValues(group, { visibleOnly });
        if (id === "crop") resetMultiSelectSearch(group);
      }
      else return;
      if (id === "quarter" || id === "semester" || id === "month") syncPeriodFilters(id);
      if (id === "region") populateProvinces(true);
      if (id === "subsector") populateSpeciesOptions({ preserve: true });
      markActiveFilterIcons();
      refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
    });

    group.addEventListener("input", (event) => {
      if (!event.target?.matches?.(".multi-select-search-input")) return;
      filterMultiSelectOptions(group, event.target.value);
    });

    group.addEventListener("keydown", (event) => {
      if (!event.target?.matches?.(".multi-select-search-input")) return;
      if (event.key === "Enter") event.preventDefault();
      if (event.key === "Escape") {
        event.stopPropagation();
        setMultiSelectOpen(group, false);
        group.querySelector(".multi-select-toggle")?.focus();
      }
    });

    group.addEventListener("change", (event) => {
      if (event.target && event.target.matches('input[type="checkbox"]')) {
        ensureAtLeastOne(group);
      }
      if (id === "quarter" || id === "semester" || id === "month") syncPeriodFilters(id);
      if (id === "region") populateProvinces(true);
      if (id === "subsector") populateSpeciesOptions({ preserve: true });
      syncMultiSelectSummary(group);
      markActiveFilterIcons();
      refreshDashboard().catch((err) => console.error("Dashboard refresh failed:", err));
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".multi-select")) return;
    closeAllMultiSelects();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllMultiSelects();
  });

  els.ecosystemMetric?.addEventListener("change", () => {
    renderEcosystemTrendChart();
  });
  els.regionEcosystemMetric?.addEventListener("change", () => {
    renderRegionEcosystemTable();
  });
  els.provinceVolumeTopN?.addEventListener("change", () => {
    renderProvinceVolumeTableFromCache();
  });
  els.ecosystemVolumeTopN?.addEventListener("change", () => {
    if (ecoVolumeLatestYear == null) return;
    renderEcosystemVolumeTable(ecoVolumeLatestYear, ecoVolumePoints);
  });

  const onYearFromInput = () => {
    activeYearThumb = "from";
    if (Number(els.yearFrom.value) > Number(els.yearTo.value)) {
      els.yearTo.value = els.yearFrom.value;
    }
    scheduleYearRefresh();
  };
  const onYearToInput = () => {
    activeYearThumb = "to";
    if (Number(els.yearTo.value) < Number(els.yearFrom.value)) {
      els.yearFrom.value = els.yearTo.value;
    }
    scheduleYearRefresh();
  };
  const markThumb = (which) => () => {
    activeYearThumb = which;
    syncYearRangeUI();
  };
  els.yearFrom.addEventListener("pointerdown", markThumb("from"));
  els.yearTo.addEventListener("pointerdown", markThumb("to"));
  els.yearFrom.addEventListener("focus", markThumb("from"));
  els.yearTo.addEventListener("focus", markThumb("to"));
  els.yearFrom.addEventListener("input", onYearFromInput);
  els.yearTo.addEventListener("input", onYearToInput);

  els.refreshBtn?.addEventListener("click", () => {
    triggerRefresh().catch((err) =>
      renderStatus({ status: "error", message: err.message, last_error: err.message })
    );
  });
  document.getElementById("resetFiltersBtn")?.addEventListener("click", resetFilters);

  const layout = document.getElementById("appLayout");
  const sidebar = document.getElementById("app-sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const menuToggle = document.getElementById("menuToggle");
  const collapseToggle = document.getElementById("sidebarCollapseToggle");
  const collapseBtn = document.getElementById("sidebarCollapseBtn");
  const collapseLabel = collapseBtn?.querySelector(".sidebar-collapse-label");
  const storageKey = `${CONFIG.slug || DATASET}-dashboard-sidebar-collapsed`;
  bindLeaveGuards();
  bindBrandHomeLink();
  bindGalleryBackLink();
  bindSmartAnalysis();
  bindChartExpand();

  function syncMenuToggleAria() {
    if (!menuToggle || !layout) return;
    if (window.innerWidth <= 900) return;
    const collapsed = layout.classList.contains("sidebar-collapsed");
    menuToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    menuToggle.setAttribute("aria-label", collapsed ? "Show filters" : "Hide filters");
    menuToggle.setAttribute("title", collapsed ? "Show filters" : "Hide filters");
  }

  function setSidebarCollapsed(collapsed) {
    if (!layout || !sidebar) return;
    closeAllMultiSelects();
    layout.classList.toggle("sidebar-collapsed", collapsed);
    sidebar.classList.toggle("is-collapsed", collapsed);
    sidebar.setAttribute("aria-expanded", collapsed ? "false" : "true");
    syncMenuToggleAria();

    const label = collapsed ? "Show Filter" : "Hide Filter";
    [collapseToggle, collapseBtn].forEach((btn) => {
      if (!btn) return;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
    if (collapseLabel) collapseLabel.textContent = collapsed ? "Show Filter" : "Hide Filter";

    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }

    requestAnimationFrame(() => {
      if (trendChart) trendChart.resize();
      if (volumeGrowthChart) volumeGrowthChart.resize();
      if (subsectorVolumeChart) subsectorVolumeChart.resize();
      if (monthSeasonalityChart) monthSeasonalityChart.resize();
      if (yieldTrendChart) yieldTrendChart.resize();
      if (ecosystemTrendChart) ecosystemTrendChart.resize();
      syncPairedRegionTableHeights();
    });
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed(!layout.classList.contains("sidebar-collapsed"));
  }

  try {
    // Always open dashboards with a collapsed filter sidebar.
    setSidebarCollapsed(true);
  } catch {
    setSidebarCollapsed(true);
  }

  collapseToggle?.addEventListener("click", toggleSidebarCollapsed);
  collapseBtn?.addEventListener("click", toggleSidebarCollapsed);

  document.querySelectorAll(".filter-field").forEach((field) => {
    field.addEventListener("click", (event) => {
      if (!sidebar?.classList.contains("is-collapsed")) return;
      if (window.innerWidth <= 900) return;
      event.preventDefault();
      const focusEl =
        field.dataset.filter === "year"
          ? field.querySelector("#yearFrom")
          : field.querySelector("select");
      setSidebarCollapsed(false);
      requestAnimationFrame(() => {
        focusEl?.focus();
      });
    });
  });

  markActiveFilterIcons();

  function setSidebarOpen(open) {
    if (!sidebar || !menuToggle) return;
    if (open) closeAllMultiSelects();
    sidebar.classList.toggle("is-open", open);
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    const mobileLabel = open ? "Close filters" : "Show filters";
    menuToggle.setAttribute("aria-label", mobileLabel);
    menuToggle.setAttribute("title", mobileLabel);
    document.body.classList.toggle("nav-open", open);
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        setSidebarOpen(!sidebar.classList.contains("is-open"));
      } else {
        toggleSidebarCollapsed();
      }
    });
    syncMenuToggleAria();
  }
  if (backdrop) {
    backdrop.addEventListener("click", () => setSidebarOpen(false));
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (document.querySelector(".app-modal.is-open")) return;
      if (window.innerWidth <= 900) {
        setSidebarOpen(false);
      } else if (layout && !layout.classList.contains("sidebar-collapsed")) {
        setSidebarCollapsed(true);
      }
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      setSidebarOpen(false);
      syncMenuToggleAria();
    } else {
      closeAllMultiSelects();
    }
    requestAnimationFrame(() => {
      if (trendChart) trendChart.resize();
      if (volumeGrowthChart) volumeGrowthChart.resize();
      if (subsectorVolumeChart) subsectorVolumeChart.resize();
      if (monthSeasonalityChart) monthSeasonalityChart.resize();
      if (yieldTrendChart) yieldTrendChart.resize();
      if (ecosystemTrendChart) ecosystemTrendChart.resize();
      syncPairedRegionTableHeights();
    });
  });
}

async function boot() {
  bind();
  try {
    const health = await api("/api/health");
    renderStatus(health.refresh || {});
    const datasetHealth = health.datasets?.[DATASET];
    const dbReady = datasetHealth?.ready ?? health.db_exists;
    if (dbReady) {
      if (PREVIEW_EMBED) {
        await Promise.all([loadMeta(), refreshDashboard()]);
        await openPreviewFarmgateCommodityIfNeeded();
      } else {
        await loadEnso();
        await loadMeta();
        if (!(hasCommodityBoard() && !selectedFarmgateCommodity && farmgateOverviewReady)) {
          await refreshDashboard();
        }
      }
    } else {
      renderStatus({ status: "running", message: "First-time PSA fetch…" });
      pollTimer = setInterval(pollRefreshStatus, 2500);
    }
  } catch (err) {
    renderStatus({ status: "error", message: err.message, last_error: err.message });
  }
}

boot();
