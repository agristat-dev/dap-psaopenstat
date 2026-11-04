(function () {
  "use strict";

  const state = {
    datasets: [],
    datasetId: null,
    valueMode: "sum",
    meta: null,
    offset: 0,
    limit: 100,
    pageMax: 1000,
    total: 0,
    loading: false,
    loadCount: 0,
    columns: [],
    filtersSyncing: false,
    exporting: false,
    exportingFormat: null,
  };

  let browseFilterApplyTimer = null;

  const PAGE_SIZE_CHOICES = [50, 100, 200, 500, 1000];

  const els = {};

  let browseYearBounds = { min: 1990, max: new Date().getFullYear() };
  let browseActiveYearThumb = "to";

  /** Matches dashboard gallery sections (Commodity Production vs Marketing & Trade). */
  const DATASET_GROUPS = [
    {
      label: "Commodity Production",
      ids: ["palay_corn", "fruits", "vegetables", "industrial", "livestock", "fisheries"],
    },
    {
      label: "Marketing & Trade",
      ids: ["farmgate", "farmgate_fisheries", "farmgate_livestock"],
    },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function api(path) {
    return window.agriApiUrl(path);
  }

  function formatInt(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-PH").format(n);
  }

  const BROWSE_PLAIN_NUMBER_COLUMNS = new Set(["year", "quarter", "semester"]);

  function formatBrowseNumber(n) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(n);
  }

  function formatBrowseMonthLabel(raw) {
    const n = Number(raw);
    if (n >= 1 && n <= 12) return MONTH_NAMES[n];
    return raw == null || raw === "" ? "—" : String(raw);
  }

  function formatBrowseCellValue(col, raw) {
    if (raw == null || raw === "") return "—";
    if (
      col === "month" &&
      state.datasetId &&
      BROWSE_FARMGATE_IDS.has(state.datasetId)
    ) {
      return formatBrowseMonthLabel(raw);
    }
    if (BROWSE_PLAIN_NUMBER_COLUMNS.has(col)) {
      const plain = Number(raw);
      return Number.isFinite(plain) ? String(Math.trunc(plain)) : String(raw);
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(raw);
    return formatBrowseNumber(n);
  }

  const BROWSE_HIDDEN_COLUMNS = new Set(["is_aggregate"]);
  const BROWSE_FARMGATE_IDS = new Set(["farmgate", "farmgate_fisheries", "farmgate_livestock"]);
  const BROWSE_LEADING_COLUMNS = ["crop_group", "crop_subtype", "region", "province"];

  const BROWSE_DATASET_FIELD_LABELS = {
    palay_corn: {
      crop_group: "Crop",
      crop_subtype: "Ecosystem / Variety",
      groupAll: "All crops",
      subtypeAll: "All ecosystems / varieties",
      subtypeSearch: "Search ecosystems / varieties…",
    },
    fruits: {
      crop_group: "Fruit Crop",
      crop_subtype: "Variety",
      groupAll: "All fruit crops",
      subtypeAll: "All varieties",
      subtypeSearch: "Search varieties…",
    },
    vegetables: {
      crop_group: "Vegetable Crop",
      crop_subtype: "Variety",
      groupAll: "All vegetable crops",
      subtypeAll: "All varieties",
      subtypeSearch: "Search varieties…",
    },
    industrial: {
      crop_group: "Crop",
      crop_subtype: "Specifics",
      groupAll: "All crops",
      subtypeAll: "All specifics",
      subtypeSearch: "Search specifics…",
    },
    livestock: {
      crop_group: "Commodity",
      hideSubtype: true,
      groupAll: "All commodities",
    },
    fisheries: {
      crop_group: "Species",
      crop_subtype: "Sub-sector",
      groupAll: "All species",
      subtypeAll: "All sub-sectors",
      subtypeSearch: "Search sub-sectors…",
    },
    farmgate: {
      crop_group: "Crop / Commodity",
      crop_subtype: "Crop group",
      groupAll: "All commodities",
      subtypeAll: "All groups",
      subtypeSearch: "Search groups…",
      leadingColumns: ["crop_subtype", "crop_group", "region", "province"],
    },
    farmgate_fisheries: {
      crop_group: "Species",
      crop_subtype: "Classification",
      groupAll: "All species",
      subtypeAll: "All classifications",
      subtypeSearch: "Search classifications…",
    },
    farmgate_livestock: {
      crop_group: "Commodity",
      crop_subtype: "Price Source",
      groupAll: "All commodities",
      subtypeAll: "All price sources",
      subtypeSearch: "Search price sources…",
    },
  };

  function browseLeadingColumns(datasetId) {
    const spec = datasetId ? BROWSE_DATASET_FIELD_LABELS[datasetId] : null;
    if (spec?.leadingColumns?.length) return spec.leadingColumns;
    return BROWSE_LEADING_COLUMNS;
  }

  function orderBrowseColumns(columns, datasetId) {
    const list = columns || [];
    const leadingCols = browseLeadingColumns(datasetId);
    const leadingSet = new Set(leadingCols);
    const leading = leadingCols.filter((col) => list.includes(col));
    const rest = list.filter((col) => !leadingSet.has(col));
    return [...leading, ...rest];
  }

  function defaultBrowseFieldLabels() {
    return {
      crop_group: "Crop group",
      crop_subtype: "Crop / commodity",
      groupAll: "All groups",
      subtypeAll: "All commodities",
      subtypeSearch: "Search commodities…",
      hideSubtype: false,
    };
  }

  function browseFieldLabelsForDataset(datasetId) {
    const spec = datasetId ? BROWSE_DATASET_FIELD_LABELS[datasetId] : null;
    return spec ? { ...defaultBrowseFieldLabels(), ...spec } : defaultBrowseFieldLabels();
  }

  function visibleBrowseColumns(columns, datasetId) {
    const hidden = new Set(BROWSE_HIDDEN_COLUMNS);
    if (datasetId && BROWSE_FARMGATE_IDS.has(datasetId)) hidden.add("area_ha");
    const labels = browseFieldLabelsForDataset(datasetId);
    if (labels.hideSubtype) hidden.add("crop_subtype");
    const visible = (columns || []).filter((col) => !hidden.has(col));
    return orderBrowseColumns(visible, datasetId);
  }

  function syncBrowseTableColgroup(dataColumnCount) {
    const table = els.table;
    if (!table || dataColumnCount < 1) return;
    let colgroup = table.querySelector("colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.firstChild);
    }
    const rowCol = document.createElement("col");
    rowCol.className = "browse-col-rownum";
    const dataCols = Array.from({ length: dataColumnCount }, () => {
      const col = document.createElement("col");
      col.className = "browse-col-data";
      return col;
    });
    colgroup.replaceChildren(rowCol, ...dataCols);
    table.style.setProperty("--browse-col-count", String(dataColumnCount));
  }

  function isFarmgateBrowseDataset(datasetId) {
    return Boolean(datasetId && BROWSE_FARMGATE_IDS.has(datasetId));
  }

  function syncBrowseCropFilterLabels() {
    const labels = browseFieldLabelsForDataset(state.datasetId);

    if (els.cropGroup) {
      els.cropGroup.dataset.allLabel = labels.groupAll;
      const labelEl = els.cropGroup.closest(".filter-field")?.querySelector(".filter-label-text");
      if (labelEl) labelEl.textContent = labels.crop_group;
      const panel = els.cropGroup.querySelector(".multi-select-panel");
      if (panel) panel.setAttribute("aria-label", labels.crop_group);
      syncBrowseMultiSummary(els.cropGroup);
    }
    const subtypeField = els.cropSubtype?.closest(".filter-field");
    if (subtypeField) subtypeField.hidden = Boolean(labels.hideSubtype);
    if (els.cropSubtype && !labels.hideSubtype) {
      els.cropSubtype.dataset.allLabel = labels.subtypeAll;
      els.cropSubtype.dataset.searchPlaceholder = labels.subtypeSearch;
      const labelEl = els.cropSubtype.closest(".filter-field")?.querySelector(".filter-label-text");
      if (labelEl) labelEl.textContent = labels.crop_subtype;
      const panel = els.cropSubtype.querySelector(".multi-select-panel");
      if (panel) panel.setAttribute("aria-label", labels.crop_subtype);
      const searchInput = els.cropSubtype.querySelector(".multi-select-search-input");
      if (searchInput) {
        searchInput.placeholder = labels.subtypeSearch;
        searchInput.setAttribute("aria-label", labels.subtypeSearch);
      }
      syncBrowseMultiSummary(els.cropSubtype);
    }
  }

  function columnTitle(key, valueMode) {
    const labels = browseFieldLabelsForDataset(state.datasetId);
    if (key === "crop_group") return labels.crop_group;
    if (key === "crop_subtype") return labels.crop_subtype;
    const map = {
      year: "Year",
      month: "Month",
      quarter: "Quarter",
      semester: "Semester",
      region: "Region",
      province: "Province",
      volume_mt: valueMode === "avg" ? "Price (PHP/kg)" : "Volume (MT)",
      area_ha: "Area (ha)",
    };
    return map[key] || key;
  }

  const BROWSE_MULTI_IDS = [
    "browseQuarter",
    "browseRegion",
    "browseProvince",
    "browseCropGroup",
    "browseCropSubtype",
  ];

  const MONTH_NAMES = [
    "",
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

  function formatFilterOptionLabel(field, value) {
    if (field === "month") {
      const n = Number(value);
      if (n >= 1 && n <= 12) return MONTH_NAMES[n];
    }
    if (field === "quarter") {
      const n = Number(value);
      if (n >= 1 && n <= 4) return `Quarter ${n}`;
    }
    return String(value);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function browseCheckedValues(groupEl) {
    if (!groupEl) return [];
    return [...groupEl.querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
  }

  function browseMultiFilterValues(groupEl) {
    if (!groupEl || groupEl.closest("[hidden]")) return [];
    const total = groupEl.querySelectorAll('input[type="checkbox"]').length;
    const checked = browseCheckedValues(groupEl);
    if (!total || !checked.length || checked.length === total) return [];
    return checked;
  }

  function syncBrowseMultiSummary(groupEl) {
    if (!groupEl) return;
    const summary = groupEl.querySelector(".multi-select-summary");
    if (!summary) return;
    const allLabel = groupEl.dataset.allLabel || "All";
    const boxes = [...groupEl.querySelectorAll('input[type="checkbox"]')];
    const selected = boxes.filter((b) => b.checked);
    if (!boxes.length || selected.length === boxes.length) {
      summary.textContent = allLabel;
      return;
    }
    if (!selected.length) {
      summary.textContent = allLabel;
      return;
    }
    summary.textContent = `${selected.length} selected`;
  }

  function setBrowseMultiOpen(groupEl, open) {
    if (!groupEl) return;
    const panel = groupEl.querySelector(".multi-select-panel");
    const toggle = groupEl.querySelector(".multi-select-toggle");
    groupEl.classList.toggle("is-open", open);
    if (panel) panel.hidden = !open;
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && groupEl.dataset.searchable === "true") {
      const input = groupEl.querySelector(".multi-select-search-input");
      if (input) {
        input.value = "";
        filterBrowseMultiOptions(groupEl, "");
        requestAnimationFrame(() => input.focus());
      }
    }
  }

  function closeBrowseMultiSelects(exceptEl = null) {
    document.querySelectorAll(".browse-sidebar .multi-select.is-open").forEach((el) => {
      if (el === exceptEl || el.classList.contains("browse-single-select")) return;
      setBrowseMultiOpen(el, false);
    });
  }

  function multiSelectActionsHtml(groupEl) {
    const searchable = groupEl?.dataset?.searchable === "true";
    const placeholder = groupEl?.dataset?.searchPlaceholder || "Search…";
    const search = searchable
      ? `<div class="multi-select-search"><input type="search" class="multi-select-search-input" placeholder="${escapeAttr(
          placeholder
        )}" aria-label="${escapeAttr(placeholder)}" autocomplete="off" /></div>`
      : "";
    return `${search}<div class="multi-select-actions">
      <button type="button" class="multi-select-action" data-multi-action="select-all">Select all</button>
      <span class="multi-select-actions-sep" aria-hidden="true">·</span>
      <button type="button" class="multi-select-action" data-multi-action="clear">Deselect all</button>
    </div>`;
  }

  function filterBrowseMultiOptions(groupEl, query) {
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

  function checkAllBrowseMulti(groupEl, { visibleOnly = false } = {}) {
    if (!groupEl) return;
    groupEl.querySelectorAll(".multi-select-option").forEach((opt) => {
      if (visibleOnly && opt.hidden) return;
      const input = opt.querySelector('input[type="checkbox"]');
      if (input) input.checked = true;
    });
    syncBrowseMultiSummary(groupEl);
  }

  function clearAllBrowseMulti(groupEl, { visibleOnly = false } = {}) {
    if (!groupEl) return;
    groupEl.querySelectorAll(".multi-select-option").forEach((opt) => {
      if (visibleOnly && opt.hidden) return;
      const input = opt.querySelector('input[type="checkbox"]');
      if (input) input.checked = false;
    });
    syncBrowseMultiSummary(groupEl);
  }

  function fillBrowseMultiSelect(groupEl, values, { field = "", preserve = true, checkAll = true } = {}) {
    if (!groupEl) return;
    const panel = groupEl.querySelector(".multi-select-panel");
    if (!panel) return;
    const previous = preserve ? new Set(browseCheckedValues(groupEl)) : new Set();
    const hadPrevious = previous.size > 0;
    const optionsHtml = (values || [])
      .map((value) => {
        const str = String(value);
        const checked = checkAll && (!hadPrevious || previous.has(str));
        const label = formatFilterOptionLabel(field, value);
        return `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(
          str
        )}"${checked ? " checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
      })
      .join("");
    panel.innerHTML = `${multiSelectActionsHtml(groupEl)}${optionsHtml}`;
    if (hadPrevious && !browseCheckedValues(groupEl).length && checkAll) {
      checkAllBrowseMulti(groupEl);
    } else {
      syncBrowseMultiSummary(groupEl);
    }
  }

  function bindBrowseMultiSelects() {
    BROWSE_MULTI_IDS.forEach((id) => {
      const group = document.getElementById(id);
      if (!group) return;
      syncBrowseMultiSummary(group);

      const toggle = group.querySelector(".multi-select-toggle");
      toggle?.addEventListener("click", (event) => {
        event.preventDefault();
        closeBrowseDatasetSelect();
        const willOpen = !group.classList.contains("is-open");
        closeBrowseMultiSelects(willOpen ? group : null);
        setBrowseMultiOpen(group, willOpen);
      });

      group.addEventListener("click", (event) => {
        const actionBtn = event.target.closest("[data-multi-action]");
        if (!actionBtn || !group.contains(actionBtn)) return;
        event.preventDefault();
        const action = actionBtn.dataset.multiAction;
        const searchInput = group.querySelector(".multi-select-search-input");
        const searchActive = Boolean(searchInput?.value?.trim());
        if (action === "select-all") checkAllBrowseMulti(group, { visibleOnly: searchActive });
        else if (action === "clear") clearAllBrowseMulti(group, { visibleOnly: searchActive });
        else return;
        if (id === "browseRegion") refreshProvinceDropdown();
        if (id === "browseCropGroup") refreshCropSubtypeDropdown();
        scheduleApplyBrowseFilters();
      });

      group.addEventListener("input", (event) => {
        if (!event.target?.matches?.(".multi-select-search-input")) return;
        filterBrowseMultiOptions(group, event.target.value);
      });

      group.addEventListener("change", (event) => {
        if (!event.target?.matches?.('input[type="checkbox"]')) return;
        syncBrowseMultiSummary(group);
        if (id === "browseRegion") refreshProvinceDropdown();
        if (id === "browseCropGroup") refreshCropSubtypeDropdown();
        scheduleApplyBrowseFilters();
      });
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".browse-sidebar .multi-select")) return;
      closeBrowseMultiSelects();
      closeBrowseDatasetSelect();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeBrowseMultiSelects();
        closeBrowseDatasetSelect();
      }
    });
  }

  function browseGetYearRange() {
    let from = Number(els.yearFrom?.value);
    let to = Number(els.yearTo?.value);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return { year_from: null, year_to: null };
    }
    if (from > to) [from, to] = [to, from];
    return { year_from: from, year_to: to };
  }

  function browseYearRangeIsFull() {
    const { year_from, year_to } = browseGetYearRange();
    if (year_from == null || year_to == null) return true;
    return year_from === browseYearBounds.min && year_to === browseYearBounds.max;
  }

  function syncBrowseYearRangeUI() {
    const { year_from, year_to } = browseGetYearRange();
    if (year_from == null || year_to == null) return;
    const min = browseYearBounds.min;
    const max = browseYearBounds.max;
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
    }

    if (els.yearFrom && els.yearTo) {
      els.yearFrom.style.zIndex = year_from >= year_to - 1 ? "5" : "3";
      els.yearTo.style.zIndex = "4";
      els.yearFrom.classList.toggle("is-active", browseActiveYearThumb === "from");
      els.yearTo.classList.toggle("is-active", browseActiveYearThumb === "to");
    }

    const yearCount = year_to - year_from + 1;
    const isFullRange = browseYearRangeIsFull();
    if (els.yearRangeCount) {
      els.yearRangeCount.textContent = isFullRange
        ? "All years"
        : yearCount === 1
          ? "1 year"
          : `${yearCount} years`;
    }
  }

  function buildBrowseYearScale() {
    const host = els.yearRangeScale;
    if (!host) return;
    const min = browseYearBounds.min;
    const max = browseYearBounds.max;
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

  function setBrowseYearRange(from, to, { silent = false } = {}) {
    if (!els.yearFrom || !els.yearTo) return;
    const min = browseYearBounds.min;
    const max = browseYearBounds.max;
    let yFrom = Math.min(Math.max(Number(from), min), max);
    let yTo = Math.min(Math.max(Number(to), min), max);
    if (yFrom > yTo) [yFrom, yTo] = [yTo, yFrom];
    els.yearFrom.min = String(min);
    els.yearFrom.max = String(max);
    els.yearTo.min = String(min);
    els.yearTo.max = String(max);
    els.yearFrom.value = String(yFrom);
    els.yearTo.value = String(yTo);
    syncBrowseYearRangeUI();
  }

  function bindBrowseYearRange() {
    if (!els.yearFrom || !els.yearTo) return;

    const onYearFromInput = () => {
      browseActiveYearThumb = "from";
      if (Number(els.yearFrom.value) > Number(els.yearTo.value)) {
        els.yearTo.value = els.yearFrom.value;
      }
      syncBrowseYearRangeUI();
      scheduleApplyBrowseFilters();
    };
    const onYearToInput = () => {
      browseActiveYearThumb = "to";
      if (Number(els.yearTo.value) < Number(els.yearFrom.value)) {
        els.yearFrom.value = els.yearTo.value;
      }
      syncBrowseYearRangeUI();
      scheduleApplyBrowseFilters();
    };
    const markThumb = (which) => () => {
      browseActiveYearThumb = which;
      syncBrowseYearRangeUI();
    };

    els.yearFrom.addEventListener("pointerdown", markThumb("from"));
    els.yearTo.addEventListener("pointerdown", markThumb("to"));
    els.yearFrom.addEventListener("focus", markThumb("from"));
    els.yearTo.addEventListener("focus", markThumb("to"));
    els.yearFrom.addEventListener("input", onYearFromInput);
    els.yearTo.addEventListener("input", onYearToInput);
  }

  function applyBrowseFilters() {
    if (!state.datasetId || state.filtersSyncing) return;
    state.offset = 0;
    setStatus("");
    loadRows();
  }

  function scheduleApplyBrowseFilters(delayMs = 320) {
    if (state.filtersSyncing) return;
    clearTimeout(browseFilterApplyTimer);
    browseFilterApplyTimer = setTimeout(() => {
      browseFilterApplyTimer = null;
      applyBrowseFilters();
    }, delayMs);
  }

  function buildQueryParams(forExport = false) {
    const params = new URLSearchParams();
    if (state.datasetId) params.set("dataset", state.datasetId);
    if (!browseYearRangeIsFull()) {
      const { year_from, year_to } = browseGetYearRange();
      if (year_from != null) params.set("year_from", String(year_from));
      if (year_to != null) params.set("year_to", String(year_to));
    }
    for (const value of browseMultiFilterValues(els.region)) params.append("region", value);
    for (const value of browseMultiFilterValues(els.province)) params.append("province", value);
    for (const value of browseMultiFilterValues(els.cropGroup)) params.append("crop_group", value);
    for (const value of browseMultiFilterValues(els.cropSubtype)) params.append("crop_subtype", value);
    for (const value of browseMultiFilterValues(els.quarter)) params.append("quarter", value);
    if (!forExport) {
      params.set("limit", String(state.limit));
      params.set("offset", String(state.offset));
    }
    return params;
  }

  function setStatus(message, isError = false) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.classList.toggle("is-error", Boolean(isError));
  }

  function loadingHintForMessage(message) {
    const text = String(message || "").toLowerCase();
    if (text.includes("dataset")) {
      return "Loading filters and preparing the table";
    }
    if (text.includes("datasets")) {
      return "Discovering available PSA OpenSTAT datasets";
    }
    return "Applying filters and fetching rows";
  }

  function updateLoadingChrome(message) {
    const active = state.loadCount > 0;
    if (els.loading) els.loading.hidden = !active;
    if (els.loadingLabel && message) els.loadingLabel.textContent = message;
    if (els.loadingHint) {
      els.loadingHint.textContent = loadingHintForMessage(message);
    }
    if (els.panel) els.panel.classList.toggle("is-data-loading", active);
    if (els.results) {
      els.results.classList.toggle("is-loading", active);
      els.results.setAttribute("aria-busy", active ? "true" : "false");
    }
  }

  function setBusy(busy, { message = "Loading data…" } = {}) {
    if (busy) {
      state.loadCount += 1;
      updateLoadingChrome(message);
    } else {
      state.loadCount = Math.max(0, state.loadCount - 1);
      if (state.loadCount === 0) {
        updateLoadingChrome();
      }
    }
    state.loading = state.loadCount > 0;
    if (els.form) {
      els.form.querySelectorAll("button, select, input[type='range']").forEach((el) => {
        el.disabled = state.loading;
      });
    }
    document.querySelectorAll(".browse-sidebar .multi-select .multi-select-toggle").forEach((btn) => {
      btn.disabled = state.loading;
    });
    if (els.prevPage) els.prevPage.disabled = state.loading || state.offset <= 0;
    if (els.nextPage) {
      els.nextPage.disabled = state.loading || state.offset + state.limit >= state.total;
    }
    syncBrowseExportUI();
    if (els.datasetSelect) els.datasetSelect.disabled = state.loading;
    updateBrowseDatasetSelectSummary();
    if (els.pageSize) els.pageSize.disabled = state.loading;
  }

  function updateDatasetTitle(label) {
    if (els.title) els.title.textContent = label || "Browse data";
  }

  function updateDatasetMeta(ds) {
    if (!els.meta) return;
    const parts = [];
    const range = (ds?.period_range || "").trim();
    if (range) {
      parts.push(range);
    } else {
      const summary = state.meta?.summary || {};
      if (summary.year_min != null && summary.year_max != null) {
        parts.push(`${summary.year_min}–${summary.year_max}`);
      }
    }
    const source = (state.meta?.source || "").trim();
    if (source) parts.push(source);
    const text = parts.join(" · ");
    els.meta.textContent = text;
    const show = Boolean(text);
    els.meta.hidden = !show;
    if (els.metaSep) els.metaSep.hidden = !show;
  }

  function datasetOptionLabel(ds) {
    return ds.label || ds.id || "";
  }

  function renderDatasetSelect() {
    if (!els.datasetSelect) return;
    const current = state.datasetId || els.datasetSelect.value;
    const byId = new Map(state.datasets.map((ds) => [ds.id, ds]));
    const groupedIds = new Set();
    const parts = [];

    for (const group of DATASET_GROUPS) {
      const items = group.ids.map((id) => byId.get(id)).filter(Boolean);
      if (!items.length) continue;
      items.forEach((ds) => groupedIds.add(ds.id));
      parts.push(`<optgroup label="${escapeHtml(group.label)}">`);
      for (const ds of items) {
        parts.push(
          `<option value="${escapeHtml(ds.id)}">${escapeHtml(datasetOptionLabel(ds))}</option>`
        );
      }
      parts.push("</optgroup>");
    }

    const ungrouped = state.datasets.filter((ds) => !groupedIds.has(ds.id));
    if (ungrouped.length) {
      parts.push(`<optgroup label="Other">`);
      for (const ds of ungrouped) {
        parts.push(
          `<option value="${escapeHtml(ds.id)}">${escapeHtml(datasetOptionLabel(ds))}</option>`
        );
      }
      parts.push("</optgroup>");
    }

    els.datasetSelect.innerHTML = parts.join("");
    const next = current && state.datasets.some((d) => d.id === current) ? current : state.datasets[0]?.id;
    if (next) els.datasetSelect.value = next;
    els.datasetSelect.disabled = state.loading;
    els.datasetSelect.removeAttribute("aria-busy");
    syncBrowseDatasetSelectUI();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function browseDatasetSelectWrap() {
    return els.datasetSelect?.closest(".browse-single-select") || null;
  }

  function setBrowseDatasetSelectOpen(open) {
    const wrap = browseDatasetSelectWrap();
    if (!wrap) return;
    const panel = wrap.querySelector(".multi-select-panel");
    const toggle = wrap.querySelector(".multi-select-toggle");
    if (open) closeBrowseMultiSelects();
    wrap.classList.toggle("is-open", open);
    if (panel) panel.hidden = !open;
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const input = panel?.querySelector(".multi-select-search-input");
      if (input) {
        input.value = "";
        filterBrowseDatasetSelectPanel("");
        requestAnimationFrame(() => input.focus());
      }
    }
  }

  function closeBrowseDatasetSelect() {
    setBrowseDatasetSelectOpen(false);
  }

  function updateBrowseDatasetSelectSummary() {
    const wrap = browseDatasetSelectWrap();
    const select = els.datasetSelect;
    if (!wrap || !select) return;
    const summary = wrap.querySelector(".multi-select-summary");
    const toggle = wrap.querySelector(".multi-select-toggle");
    if (!summary) return;
    const option = select.selectedOptions?.[0] || select.options[select.selectedIndex];
    summary.textContent = option?.textContent?.trim() || "Choose dataset…";
    if (toggle) {
      toggle.disabled = select.disabled;
      toggle.setAttribute("aria-expanded", wrap.classList.contains("is-open") ? "true" : "false");
    }
    wrap.querySelectorAll(".browse-single-select-option").forEach((btn) => {
      const selected = btn.dataset.value === select.value;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function filterBrowseDatasetSelectPanel(query) {
    const wrap = browseDatasetSelectWrap();
    if (!wrap) return;
    const q = String(query || "")
      .trim()
      .toLowerCase();
    let visible = 0;
    wrap.querySelectorAll(".browse-single-select-option").forEach((btn) => {
      const text = btn.textContent?.toLowerCase() || "";
      const show = !q || text.includes(q);
      btn.hidden = !show;
      if (show) visible += 1;
    });
    wrap.querySelectorAll(".browse-single-select-optgroup-label").forEach((label) => {
      let next = label.nextElementSibling;
      let groupVisible = false;
      while (next && !next.classList.contains("browse-single-select-optgroup-label")) {
        if (next.classList.contains("browse-single-select-option") && !next.hidden) {
          groupVisible = true;
          break;
        }
        next = next.nextElementSibling;
      }
      label.hidden = !groupVisible;
    });
    const empty = wrap.querySelector(".browse-single-select-empty");
    if (empty) empty.hidden = !q || visible > 0;
  }

  function appendBrowseDatasetOptionButton(select, optionEl, panel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "multi-select-option browse-single-select-option";
    btn.dataset.value = optionEl.value;
    btn.setAttribute("role", "option");
    btn.innerHTML = `<span>${escapeHtml(optionEl.textContent || "")}</span>`;
    btn.addEventListener("click", () => {
      select.value = optionEl.value;
      updateBrowseDatasetSelectSummary();
      closeBrowseDatasetSelect();
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    panel.appendChild(btn);
  }

  function syncBrowseDatasetSelectUI() {
    const select = els.datasetSelect;
    const wrap = browseDatasetSelectWrap();
    if (!select || !wrap) return;
    const panel = wrap.querySelector(".multi-select-panel");
    if (!panel) return;

    panel.innerHTML = "";
    const searchWrap = document.createElement("div");
    searchWrap.className = "multi-select-search";
    searchWrap.innerHTML =
      '<input type="search" class="multi-select-search-input" placeholder="Search datasets…" autocomplete="off" aria-label="Search datasets" />';
    panel.appendChild(searchWrap);
    const input = searchWrap.querySelector("input");
    input?.addEventListener("input", () => filterBrowseDatasetSelectPanel(input.value));
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeBrowseDatasetSelect();
      }
    });

    for (const node of select.children) {
      if (node.tagName === "OPTGROUP") {
        const heading = document.createElement("div");
        heading.className = "browse-single-select-optgroup-label";
        heading.textContent = node.label || "";
        panel.appendChild(heading);
        for (const opt of node.children) {
          if (opt.tagName === "OPTION") appendBrowseDatasetOptionButton(select, opt, panel);
        }
      } else if (node.tagName === "OPTION") {
        appendBrowseDatasetOptionButton(select, node, panel);
      }
    }

    const empty = document.createElement("div");
    empty.className = "multi-select-empty browse-single-select-empty";
    empty.hidden = true;
    empty.textContent = "No matches";
    panel.appendChild(empty);

    updateBrowseDatasetSelectSummary();
    filterBrowseDatasetSelectPanel("");
  }

  function initBrowseDatasetSelectWidget() {
    const select = els.datasetSelect;
    if (!select || select.closest(".browse-single-select")) return;
    const field = select.closest(".filter-field");
    const label = field?.querySelector('label[for="browseDatasetSelect"]');

    const wrap = document.createElement("div");
    wrap.className = "multi-select browse-single-select browse-dataset-select";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "multi-select-toggle";
    toggle.id = "browseDatasetSelect-toggle";
    toggle.setAttribute("aria-haspopup", "listbox");
    toggle.setAttribute("aria-expanded", "false");
    if (label) {
      toggle.setAttribute("aria-labelledby", label.id || "browse-datasets-heading");
    }

    const summary = document.createElement("span");
    summary.className = "multi-select-summary";
    toggle.appendChild(summary);

    const panel = document.createElement("div");
    panel.className = "multi-select-panel multi-select-panel-tall";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");

    select.classList.add("browse-native-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(toggle);
    wrap.appendChild(panel);
    wrap.appendChild(select);

    if (label) label.setAttribute("for", toggle.id);

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (toggle.disabled) return;
      setBrowseDatasetSelectOpen(!wrap.classList.contains("is-open"));
    });

    syncBrowseDatasetSelectUI();
  }

  function provinceNamesForRegions(regions) {
    let rows = state.meta?.provinces || [];
    if (regions?.length) rows = rows.filter((p) => regions.includes(p.region));
    return [...new Set(rows.map((p) => p.province).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  function cropSubtypesForGroups(groups) {
    let rows = state.meta?.crops || [];
    if (groups?.length) rows = rows.filter((c) => groups.includes(c.crop_group));
    return [...new Set(rows.map((c) => c.crop_subtype).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  function refreshProvinceDropdown() {
    const regions = browseMultiFilterValues(els.region);
    const names = provinceNamesForRegions(regions.length ? regions : null);
    fillBrowseMultiSelect(els.province, names, { preserve: true, checkAll: true });
  }

  function refreshCropSubtypeDropdown() {
    const groups = browseMultiFilterValues(els.cropGroup);
    const names = cropSubtypesForGroups(groups.length ? groups : null);
    fillBrowseMultiSelect(els.cropSubtype, names, { preserve: true, checkAll: true });
  }

  function populateFilters(meta) {
    state.filtersSyncing = true;
    try {
    const years = (meta.years || []).map(Number).filter((y) => Number.isFinite(y));
    if (els.yearField) els.yearField.hidden = years.length === 0;
    if (years.length) {
      browseYearBounds = { min: Math.min(...years), max: Math.max(...years) };
      setBrowseYearRange(browseYearBounds.min, browseYearBounds.max, { silent: true });
      buildBrowseYearScale();
    }
    fillBrowseMultiSelect(els.region, meta.regions || [], { preserve: false, checkAll: true });
    fillBrowseMultiSelect(els.cropGroup, meta.crop_groups || [], { preserve: false, checkAll: true });
    refreshProvinceDropdown();
    refreshCropSubtypeDropdown();

    const hasQuarter = (meta.quarters || []).length > 0;
    if (els.quarterWrap) els.quarterWrap.hidden = !hasQuarter;
    if (hasQuarter) {
      fillBrowseMultiSelect(els.quarter, meta.quarters, { field: "quarter", preserve: false, checkAll: true });
    }
    } finally {
      state.filtersSyncing = false;
    }
  }

  function renderTableHeader(columns) {
    const rowNumHead = `<th scope="col" class="browse-th-rownum" aria-label="Row number">#</th>`;
    const labelCells = columns
      .map(
        (col) =>
          `<th scope="col"><span class="browse-th-label">${escapeHtml(
            columnTitle(col, state.valueMode)
          )}</span></th>`
      )
      .join("");
    return `<tr class="browse-table-label-row">${rowNumHead}${labelCells}</tr>`;
  }

  function renderTableBodyRows(columns, rows) {
    if (!els.tableBody) return;
    const colSpan = columns.length + 1;
    if (!rows.length) {
      els.tableBody.innerHTML = `<tr><td colspan="${colSpan}">No matching records.</td></tr>`;
      return;
    }
    els.tableBody.innerHTML = rows
      .map((row, index) => {
        const rowNum = state.offset + index + 1;
        const rowNumCell = `<td class="browse-rownum">${formatInt(rowNum)}</td>`;
        const cells = columns
          .map((col) => {
            const display = formatBrowseCellValue(col, row[col]);
            return `<td>${escapeHtml(display)}</td>`;
          })
          .join("");
        return `<tr>${rowNumCell}${cells}</tr>`;
      })
      .join("");
  }

  function renderTable(payload) {
    const columns = visibleBrowseColumns(payload.columns || [], state.datasetId);
    state.columns = columns;
    if (!els.tableHead || !els.tableBody || !els.tableWrap) return;

    syncBrowseTableColgroup(columns.length);
    els.tableHead.innerHTML = renderTableHeader(columns);
    renderTableBodyRows(columns, payload.rows || []);
    if (els.tableShell) els.tableShell.hidden = false;
  }

  function updatePagination() {
    if (!els.pagination || !els.pageIndicator) return;
    const page = Math.floor(state.offset / state.limit) + 1;
    const pages = Math.max(1, Math.ceil(state.total / state.limit) || 1);
    els.pageIndicator.textContent = `${page} / ${pages}`;
    els.pagination?.classList.toggle("is-inactive", state.total === 0);
    if (els.prevPage) {
      els.prevPage.disabled = state.loading || state.total === 0 || state.offset <= 0;
    }
    if (els.nextPage) {
      els.nextPage.disabled =
        state.loading || state.total === 0 || state.offset + state.limit >= state.total;
    }
    if (els.pageSize) els.pageSize.disabled = state.loading;
  }

  async function loadMeta(datasetId) {
    const res = await fetch(api(`/api/meta?dataset=${encodeURIComponent(datasetId)}`), {
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Could not load filters (${res.status})`);
    }
    return res.json();
  }

  async function loadRows() {
    if (!state.datasetId) return;
    setBusy(true, { message: "Loading data…" });
    setStatus("");
    try {
      const params = buildQueryParams(false);
      const res = await fetch(api(`/api/browse/rows?${params}`), { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (
          res.status === 422 &&
          state.limit > 500 &&
          isPageLimitValidationError(err.detail)
        ) {
          configurePageSizeOptions(500);
          setStatus(
            "This backend allows up to 500 rows per page. Restart run_dashboard.bat to enable 1,000-row pages.",
            false
          );
          return loadRows();
        }
        throw new Error(formatApiDetail(err.detail) || `Could not load table (${res.status})`);
      }
      const payload = await res.json();
      state.total = payload.total || 0;
      state.valueMode = payload.value_mode || state.valueMode;
      renderTable(payload);
      setStatus(state.total ? "" : "No matching records.");
      updatePagination();
    } catch (error) {
      setStatus(error.message || "Failed to load data.", true);
      if (els.tableShell) els.tableShell.hidden = true;
      if (els.pagination) els.pagination.classList.add("is-inactive");
    } finally {
      setBusy(false);
    }
  }

  async function selectDataset(datasetId) {
    state.datasetId = datasetId;
    state.offset = 0;
    const ds = state.datasets.find((d) => d.id === datasetId);
    state.valueMode = ds?.value_mode || "sum";
    updateDatasetTitle(ds?.label);
    if (els.meta) {
      els.meta.textContent = "";
      els.meta.hidden = true;
    }
    if (els.metaSep) els.metaSep.hidden = true;
    renderDatasetSelect();
    syncBrowseCropFilterLabels();
    setBusy(true, { message: "Loading dataset…" });
    setStatus("");
    try {
      state.meta = await loadMeta(datasetId);
      populateFilters(state.meta);
      syncBrowseCropFilterLabels();
      updateDatasetMeta(ds);
      await loadRows();
    } catch (error) {
      setStatus(error.message || "Dataset unavailable.", true);
    } finally {
      setBusy(false);
    }
  }

  function formatApiDetail(detail) {
    if (detail == null) return "";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (item && typeof item.msg === "string" ? item.msg : JSON.stringify(item)))
        .join(" ");
    }
    return JSON.stringify(detail);
  }

  async function readApiError(res) {
    try {
      const body = await res.json();
      if (body && body.detail) return formatApiDetail(body.detail);
    } catch (_err) {
      /* ignore */
    }
    return `Request failed (${res.status})`;
  }

  function configurePageSizeOptions(pageMax) {
    state.pageMax = Math.max(1, Number(pageMax) || 1000);
    if (!els.pageSize) return;
    const previous = state.limit || Number(els.pageSize.value) || 100;
    let allowed = PAGE_SIZE_CHOICES.filter((n) => n <= state.pageMax);
    if (!allowed.length) allowed = [state.pageMax];
    els.pageSize.innerHTML = allowed
      .map((n) => {
        const label = n >= 1000 ? formatInt(n) : String(n);
        return `<option value="${n}">${label}</option>`;
      })
      .join("");
    const next = allowed.includes(previous)
      ? previous
      : allowed.reduce((best, n) => (n <= previous ? n : best), allowed[0]);
    state.limit = next;
    els.pageSize.value = String(next);
  }

  function isPageLimitValidationError(detail) {
    const text = formatApiDetail(detail).toLowerCase();
    return text.includes("limit") && (text.includes("less than") || text.includes("maximum"));
  }

  async function initDatasets() {
    setBusy(true, { message: "Loading datasets…" });
    try {
      const res = await fetch(api("/api/browse/datasets"), { cache: "no-store" });
      if (!res.ok) {
        const detail = await readApiError(res);
        if (res.status === 404) {
          throw new Error(
            "Browse API not found. Restart the backend (run_dashboard.bat or uvicorn app:app on port 8765), then open http://127.0.0.1:8765/browse — do not open browse.html from a static-only server."
          );
        }
        throw new Error(detail || "Could not list datasets. Is the API running?");
      }
      const payload = await res.json();
      state.datasets = payload.datasets || [];
      configurePageSizeOptions(payload.page_max ?? 1000);
      if (!state.datasets.length) {
        setStatus("No datasets are available yet. Run the data refresh pipeline first.", true);
        return;
      }
      renderDatasetSelect();
      await selectDataset(state.datasets[0].id);
    } finally {
      setBusy(false);
    }
  }

  function resetFilters() {
    setBrowseYearRange(browseYearBounds.min, browseYearBounds.max, { silent: true });
    BROWSE_MULTI_IDS.forEach((id) => {
      const group = document.getElementById(id);
      if (!group || group.closest("[hidden]")) return;
      checkAllBrowseMulti(group);
    });
    refreshProvinceDropdown();
    refreshCropSubtypeDropdown();
    state.offset = 0;
    setStatus("");
    loadRows();
  }

  function syncBrowseExportUI() {
    const busy = state.exporting;
    const blocked = state.loading || busy || !state.datasetId;
    const busyCsv = busy && state.exportingFormat === "csv";
    const busyExcel = busy && state.exportingFormat === "xlsx";

    if (els.downloadCsvBtn) {
      els.downloadCsvBtn.disabled = blocked;
      els.downloadCsvBtn.classList.toggle("is-busy", busyCsv);
      els.downloadCsvBtn.setAttribute("aria-busy", busyCsv ? "true" : "false");
      els.downloadCsvBtn.setAttribute(
        "aria-label",
        busyCsv ? "Preparing CSV download" : "Download CSV"
      );
    }
    if (els.downloadCsvSpinner) els.downloadCsvSpinner.hidden = !busyCsv;

    if (els.downloadExcelBtn) {
      els.downloadExcelBtn.disabled = blocked;
      els.downloadExcelBtn.classList.toggle("is-busy", busyExcel);
      els.downloadExcelBtn.setAttribute("aria-busy", busyExcel ? "true" : "false");
      els.downloadExcelBtn.setAttribute(
        "aria-label",
        busyExcel ? "Preparing Excel download" : "Download Excel"
      );
    }
    if (els.downloadExcelSpinner) els.downloadExcelSpinner.hidden = !busyExcel;
  }

  function setExportBusy(busy, format = null) {
    state.exporting = busy;
    state.exportingFormat = busy ? format : null;
    syncBrowseExportUI();
  }

  async function downloadCsv() {
    if (!state.datasetId || state.exporting) return;
    setExportBusy(true, "csv");
    setStatus("");
    try {
      const params = buildQueryParams(true);
      const res = await fetch(api(`/api/browse/export?${params}`), { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `psa-openstat-${state.datasetId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("");
    } catch (error) {
      setStatus(error.message || "CSV export failed.", true);
    } finally {
      setExportBusy(false);
    }
  }

  async function downloadExcel() {
    if (!state.datasetId || state.exporting) return;
    if (typeof XLSX === "undefined") {
      setStatus("Excel export is unavailable.", true);
      return;
    }
    setExportBusy(true, "xlsx");
    setStatus("");
    try {
      const params = buildQueryParams(true);
      const res = await fetch(api(`/api/browse/export?${params}`), { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Export failed (${res.status})`);
      }
      const csvText = await res.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      XLSX.writeFile(workbook, `psa-openstat-${state.datasetId}.xlsx`);
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Excel export failed.", true);
    } finally {
      setExportBusy(false);
    }
  }

  function bindEvents() {
    els.form?.addEventListener("submit", (event) => event.preventDefault());
    els.reset?.addEventListener("click", resetFilters);
    els.datasetSelect?.addEventListener("change", () => {
      const id = els.datasetSelect.value;
      if (id && id !== state.datasetId) selectDataset(id);
    });
    els.pageSize?.addEventListener("change", () => {
      const parsed = Number(els.pageSize.value);
      state.limit =
        Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, state.pageMax) : 100;
      state.offset = 0;
      loadRows();
    });
    els.prevPage?.addEventListener("click", () => {
      state.offset = Math.max(0, state.offset - state.limit);
      loadRows();
    });
    els.nextPage?.addEventListener("click", () => {
      if (state.offset + state.limit < state.total) {
        state.offset += state.limit;
        loadRows();
      }
    });
    els.downloadCsvBtn?.addEventListener("click", () => downloadCsv());
    els.downloadExcelBtn?.addEventListener("click", () => downloadExcel());
    syncBrowseExportUI();
  }

  function cacheElements() {
    els.datasetSelect = $("browseDatasetSelect");
    els.title = $("browseDatasetTitle");
    els.meta = $("browseDatasetMeta");
    els.metaSep = $("browseDatasetMetaSep");
    els.form = $("browseFiltersForm");
    els.yearField = $("browseYearField");
    els.yearFrom = $("browseYearFrom");
    els.yearTo = $("browseYearTo");
    els.yearRangeTrack = $("browseYearRangeTrack");
    els.yearTooltip = $("browseYearTooltip");
    els.yearRangeCount = $("browseYearRangeCount");
    els.yearRangeScale = $("browseYearRangeScale");
    els.region = $("browseRegion");
    els.province = $("browseProvince");
    els.cropGroup = $("browseCropGroup");
    els.cropSubtype = $("browseCropSubtype");
    els.quarter = $("browseQuarter");
    els.quarterWrap = $("browseQuarterWrap");
    els.panel = $("browsePanel");
    els.head = $("browseHead");
    els.results = $("browseResults");
    els.loading = $("browseLoading");
    els.loadingLabel = $("browseLoadingLabel");
    els.loadingHint = $("browseLoadingHint");
    els.status = $("browseStatus");
    els.tableShell = $("browseTableShell");
    els.tableWrap = $("browseTableWrap");
    els.table = $("browseTable");
    els.tableHead = $("browseTableHead");
    els.tableBody = $("browseTableBody");
    els.pagination = $("browsePagination");
    els.pageIndicator = $("browsePageIndicator");
    els.pageSize = $("browsePageSize");
    els.prevPage = $("browsePrevPage");
    els.nextPage = $("browseNextPage");
    els.downloadCsvBtn = $("browseDownloadCsv");
    els.downloadExcelBtn = $("browseDownloadExcel");
    els.downloadCsvSpinner = $("browseDownloadCsvSpinner");
    els.downloadExcelSpinner = $("browseDownloadExcelSpinner");
    els.reset = $("browseResetFilters");
  }

  function bindBrowseSidebar() {
    const layout = document.getElementById("browseLayout");
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    const menuToggle = document.getElementById("menuToggle");
    const storageKey = "browse-sidebar-collapsed";

    function syncFilterToggleAria(filtersVisible) {
      if (!menuToggle) return;
      if (window.innerWidth <= 900) return;
      menuToggle.setAttribute("aria-expanded", filtersVisible ? "true" : "false");
      const label = filtersVisible ? "Hide filters" : "Show filters";
      menuToggle.setAttribute("aria-label", label);
      menuToggle.setAttribute("title", label);
    }

    function setSidebarCollapsed(collapsed) {
      if (!layout || !sidebar) return;
      layout.classList.toggle("sidebar-collapsed", collapsed);
      sidebar.classList.remove("is-collapsed");
      sidebar.setAttribute("aria-expanded", collapsed ? "false" : "true");
      syncFilterToggleAria(!collapsed);

      try {
        localStorage.setItem(storageKey, collapsed ? "1" : "0");
      } catch {
        /* ignore */
      }
    }

    function toggleSidebarCollapsed() {
      setSidebarCollapsed(!layout.classList.contains("sidebar-collapsed"));
    }

    function setSidebarOpen(open) {
      if (!sidebar || !menuToggle) return;
      sidebar.classList.toggle("is-open", open);
      if (backdrop) {
        backdrop.hidden = !open;
        backdrop.setAttribute("aria-hidden", open ? "false" : "true");
      }
      const label = open ? "Close filters" : "Show filters";
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", label);
      menuToggle.setAttribute("title", label);
      document.body.classList.toggle("nav-open", open);
    }

    let startCollapsed = false;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "1") startCollapsed = true;
      else if (stored === "0") startCollapsed = false;
    } catch {
      /* ignore */
    }
    setSidebarCollapsed(startCollapsed);

    menuToggle?.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        setSidebarOpen(!sidebar.classList.contains("is-open"));
      } else {
        toggleSidebarCollapsed();
      }
    });

    backdrop?.addEventListener("click", () => setSidebarOpen(false));

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (typeof window.isPreliminaryNoticeOpen === "function" && window.isPreliminaryNoticeOpen()) {
        return;
      }
      if (window.innerWidth <= 900) {
        setSidebarOpen(false);
      } else if (layout && !layout.classList.contains("sidebar-collapsed")) {
        setSidebarCollapsed(true);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) {
        setSidebarOpen(false);
        syncFilterToggleAria(!layout.classList.contains("sidebar-collapsed"));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    initBrowseDatasetSelectWidget();
    bindBrowseMultiSelects();
    bindBrowseYearRange();
    bindBrowseSidebar();
    bindEvents();
    initDatasets().catch((error) => {
      setBusy(false);
      setStatus(error.message || "Could not initialize data browser.", true);
    });
  });
})();
