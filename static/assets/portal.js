(() => {
"use strict";

const PH_TIMEZONE = "Asia/Manila";
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 800;
const PREVIEW_INTERVAL_MS = 5500;
const PREVIEW_READY_TIMEOUT_MS = 20000;
const PREVIEW_LOAD_FALLBACK_MS = 5000;

function previewPath(href) {
  const url = new URL(href, window.location.origin);
  url.searchParams.set("preview", "1");
  return `${url.pathname}${url.search}`;
}

const PORTAL_PREVIEWS = [
  { href: "/dashboards/palay", label: "Palay Production" },
  { href: "/dashboards/corn", label: "Corn Production" },
  { href: "/dashboards/fruits", label: "Fruit Production" },
  { href: "/dashboards/fisheries", label: "Fisheries Production" },
  { href: "/dashboards/farmgate-crops", label: "Crops Farmgate Prices" },
];

let portalClockTimer = null;
let previewIndex = 0;
let previewTimer = null;
let previewBusy = false;
let previewBusySafetyTimer = null;
let previewReducedMotion = false;
let previewResizeObserver = null;

function phDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return Object.fromEntries(
    formatter.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
}

function buildPhIso(parts) {
  let h = Number(parts.hour);
  const isPm = parts.dayPeriod?.toUpperCase() === "PM";
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  const pad = (n) => String(n).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${pad(h)}:${parts.minute}:${parts.second}+08:00`;
}

function formatPhDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPhClockTime(parts) {
  const period = (parts.dayPeriod ?? parts.dayperiod ?? "").toUpperCase();
  return `${parts.hour ?? "--"}:${parts.minute ?? "--"}:${parts.second ?? "--"}${period ? ` ${period}` : ""}`;
}

function updatePortalClock() {
  const timeEl = document.getElementById("portalClockTime");
  const timeTextEl = document.getElementById("portalClockTimeText");
  const dateEl = document.getElementById("portalClockDate");
  if (!timeEl || !timeTextEl || !dateEl) return;

  const parts = phDateTimeParts();
  timeTextEl.textContent = formatPhClockTime(parts);
  if (parts.year && parts.month && parts.day && parts.hour != null) {
    timeEl.dateTime = buildPhIso(parts);
  }
  dateEl.textContent = formatPhDate();
}

function initPortalClock() {
  updatePortalClock();
  if (!portalClockTimer) {
    portalClockTimer = setInterval(updatePortalClock, 1000);
  }
}

function setPreviewViewportLoading(loading) {
  document.getElementById("portalPreviewViewport")?.classList.toggle("is-loading", loading);
}

function setPreviewBusy(busy) {
  previewBusy = busy;
  if (previewBusySafetyTimer) {
    clearTimeout(previewBusySafetyTimer);
    previewBusySafetyTimer = null;
  }
  if (busy) {
    previewBusySafetyTimer = window.setTimeout(() => {
      previewBusy = false;
      setPreviewViewportLoading(false);
    }, PREVIEW_READY_TIMEOUT_MS + 2000);
  }
}

function fitPreviewScale() {
  const viewport = document.getElementById("portalPreviewViewport");
  if (!viewport) return;
  const w = viewport.clientWidth;
  if (w < 8) return;
  const scale = w / PREVIEW_WIDTH;
  viewport.style.setProperty("--preview-scale", String(scale));
  viewport.style.height = `${Math.round(PREVIEW_HEIGHT * scale)}px`;
}

function scheduleFitPreviewScale() {
  fitPreviewScale();
  requestAnimationFrame(fitPreviewScale);
}

function setPreviewDots(index) {
  const dots = document.getElementById("portalPreviewDots");
  if (!dots) return;
  dots.querySelectorAll("button").forEach((btn, i) => {
    const active = i === index;
    btn.setAttribute("aria-selected", active ? "true" : "false");
    btn.tabIndex = active ? 0 : -1;
    btn.classList.toggle("is-active", active);
  });
}

function formatPreviewCaption(label) {
  const text = String(label ?? "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function setPreviewCaption(index) {
  const item = PORTAL_PREVIEWS[index];
  const cap = document.getElementById("portalPreviewCaption");
  if (cap) cap.textContent = formatPreviewCaption(item?.label);
}

function restartPreviewProgress() {
  const progress = document.getElementById("portalPreviewProgress");
  if (!progress || previewReducedMotion) return;
  progress.classList.remove("is-animating");
  void progress.offsetWidth;
  progress.classList.add("is-animating");
}

function stopPreviewProgress() {
  document.getElementById("portalPreviewProgress")?.classList.remove("is-animating");
}

function getPreviewFrames() {
  return {
    a: document.getElementById("portalPreviewA"),
    b: document.getElementById("portalPreviewB"),
  };
}

function activePreviewFrame(a, b) {
  if (a.classList.contains("is-active")) return a;
  if (b.classList.contains("is-active")) return b;
  return a;
}

function frameIsDocumentReady(frame) {
  try {
    return frame.contentDocument?.readyState === "complete";
  } catch {
    return false;
  }
}

function waitForPreviewFrame(frame, href) {
  const src = previewPath(href);
  return new Promise((resolve) => {
    let settled = false;
    let loadFallbackTimer = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(absoluteTimer);
      if (loadFallbackTimer) window.clearTimeout(loadFallbackTimer);
      window.removeEventListener("message", onMessage);
      frame.removeEventListener("load", onLoad);
      frame.removeEventListener("error", onError);
      resolve();
    };
    const onLoad = () => {
      loadFallbackTimer = window.setTimeout(finish, PREVIEW_LOAD_FALLBACK_MS);
    };
    const onError = () => finish();

    const onMessage = (event) => {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type === "dap-dashboard-preview-ready") finish();
    };

    const needsNavigate = frame.getAttribute("data-src") !== href || !frame.src;
    frame.setAttribute("data-src", href);

    if (!needsNavigate && frameIsDocumentReady(frame)) {
      finish();
      return;
    }

    window.addEventListener("message", onMessage);
    frame.addEventListener("load", onLoad);
    frame.addEventListener("error", onError);
    const absoluteTimer = window.setTimeout(finish, PREVIEW_READY_TIMEOUT_MS);

    const targetHref = new URL(src, window.location.origin).href;
    if (needsNavigate || frame.src !== targetHref) {
      frame.classList.remove("is-loaded");
      frame.src = src;
    } else if (frameIsDocumentReady(frame)) {
      finish();
    }
  });
}

function prefetchPreviewHref(href) {
  const src = previewPath(href);
  let link = document.querySelector(`link[data-preview-prefetch="${src}"]`);
  if (link) return;
  link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "document";
  link.href = src;
  link.setAttribute("data-preview-prefetch", src);
  document.head.appendChild(link);
}

function prefetchAllPortalPreviewsIdle() {
  const schedule = () => {
    PORTAL_PREVIEWS.forEach((item, index) => {
      window.setTimeout(() => {
        if (item?.href) prefetchPreviewHref(item.href);
      }, index * 350);
    });
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(schedule, { timeout: 5000 });
  } else {
    window.setTimeout(schedule, 1500);
  }
}

async function showPreview(index, { force = false } = {}) {
  if (previewBusy && !force) return;
  const item = PORTAL_PREVIEWS[index];
  if (!item) return;

  const { a, b } = getPreviewFrames();
  if (!a || !b) return;

  const outgoing = activePreviewFrame(a, b);
  const incoming = outgoing === a ? b : a;

  setPreviewBusy(true);
  setPreviewViewportLoading(true);
  setPreviewCaption(index);
  setPreviewDots(index);
  previewIndex = index;
  restartPreviewProgress();

  try {
    await waitForPreviewFrame(incoming, item.href);
    incoming.classList.add("is-loaded");
    incoming.classList.add("is-active");
    incoming.title = `${item.label} preview`;
    outgoing.classList.remove("is-active");
    scheduleFitPreviewScale();
    const nextItem = PORTAL_PREVIEWS[(index + 1) % PORTAL_PREVIEWS.length];
    if (nextItem?.href) prefetchPreviewHref(nextItem.href);
  } finally {
    setPreviewViewportLoading(false);
    setPreviewBusy(false);
  }
}

function advancePreview() {
  if (previewBusy) return;
  const next = (previewIndex + 1) % PORTAL_PREVIEWS.length;
  showPreview(next);
}

function startPreviewRotation() {
  if (previewTimer || previewReducedMotion) return;
  previewTimer = window.setInterval(advancePreview, PREVIEW_INTERVAL_MS);
  restartPreviewProgress();
}

function stopPreviewRotation() {
  if (previewTimer) {
    window.clearInterval(previewTimer);
    previewTimer = null;
  }
  stopPreviewProgress();
}

function initPreviewDots() {
  const dots = document.getElementById("portalPreviewDots");
  if (!dots) return;
  dots.innerHTML = PORTAL_PREVIEWS.map(
    (item, i) =>
      `<button type="button" role="tab" class="portal-preview-dot" aria-selected="${i === 0 ? "true" : "false"}" tabindex="${i === 0 ? "0" : "-1"}" aria-label="${item.label}" title="${item.label}"><span class="portal-preview-dot-fill" aria-hidden="true"></span></button>`
  ).join("");

  dots.querySelectorAll("button").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      stopPreviewRotation();
      showPreview(i, { force: true }).finally(startPreviewRotation);
    });
  });

  dots.addEventListener("keydown", (e) => {
    const count = PORTAL_PREVIEWS.length;
    let next = previewIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (previewIndex + 1) % count;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (previewIndex - 1 + count) % count;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = count - 1;
    } else {
      return;
    }
    e.preventDefault();
    stopPreviewRotation();
    showPreview(next, { force: true }).finally(() => {
      startPreviewRotation();
      dots.querySelectorAll("button")[next]?.focus();
    });
  });
}

function initPortalPreview() {
  const viewport = document.getElementById("portalPreviewViewport");
  if (!viewport) return;

  previewReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = document.getElementById("portalPreviewProgress");
  if (progress) {
    progress.style.setProperty("--preview-interval", `${PREVIEW_INTERVAL_MS}ms`);
  }

  scheduleFitPreviewScale();
  window.addEventListener("resize", fitPreviewScale);

  if (typeof ResizeObserver !== "undefined") {
    previewResizeObserver = new ResizeObserver(() => fitPreviewScale());
    previewResizeObserver.observe(viewport);
  }

  initPreviewDots();

  const { a, b } = getPreviewFrames();
  if (b) {
    b.classList.remove("is-active", "is-loaded");
    b.removeAttribute("src");
    b.removeAttribute("data-src");
  }

  previewIndex = 0;
  setPreviewDots(0);
  setPreviewCaption(0);

  if (a && PORTAL_PREVIEWS[0]) {
    a.classList.remove("is-active", "is-loaded");
    if (PORTAL_PREVIEWS[1]?.href) prefetchPreviewHref(PORTAL_PREVIEWS[1].href);
    showPreview(0, { force: true }).then(() => {
      prefetchAllPortalPreviewsIdle();
      startPreviewRotation();
    });
  } else {
    startPreviewRotation();
  }

  const stage = viewport.closest(".portal-preview-stage") || viewport;
  stage.addEventListener("mouseenter", stopPreviewRotation);
  stage.addEventListener("mouseleave", startPreviewRotation);
  stage.addEventListener("focusin", (e) => {
    if (e.target?.closest?.(".portal-preview-dots")) return;
    stopPreviewRotation();
  });
  stage.addEventListener("focusout", (e) => {
    if (stage.contains(e.relatedTarget)) return;
    startPreviewRotation();
  });
}

function initPortal() {
  initPortalClock();
  initPortalPreview();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortal);
} else {
  initPortal();
}

})();
