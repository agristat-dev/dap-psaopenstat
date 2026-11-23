(() => {
  "use strict";

  const VERSION = 3;
  const BASE = "/assets/images/dashboard-previews";
  const EXT = "webp";

  const blobCache = new Map();

  function slugFromDashboardPath(pathOrHref) {
    try {
      const pathname = new URL(pathOrHref, window.location.origin).pathname.toLowerCase();
      const match = pathname.match(/\/dashboards\/([^/]+)/);
      if (!match) return "";
      return match[1].replace(/\.html$/, "");
    } catch {
      return "";
    }
  }

  function assetUrl(slug) {
    if (!slug) return "";
    return `${BASE}/${encodeURIComponent(slug)}.${EXT}?v=${VERSION}`;
  }

  function isCachedBlobUrl(blobUrl) {
    for (const cached of blobCache.values()) {
      if (cached === blobUrl) return true;
    }
    return false;
  }

  /** Detach an element from its blob background without revoking shared cache URLs. */
  function clearElementBlob(el) {
    const prev = el?.dataset?.blobUrl;
    if (!prev) return;
    delete el.dataset.blobUrl;
    if (!isCachedBlobUrl(prev)) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        /* ignore */
      }
    }
    if (el.style) el.style.backgroundImage = "";
  }

  async function loadBlobUrl(url) {
    const res = await fetch(url, { credentials: "same-origin", cache: "force-cache" });
    if (!res.ok) return "";
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobCache.set(url, blobUrl);
    return blobUrl;
  }

  async function applyProtectedBackground(el, slug) {
    if (!el || !slug) return false;
    const url = assetUrl(slug);
    if (!url) return false;

    clearElementBlob(el);

    let blobUrl = blobCache.get(url) || "";
    if (!blobUrl) {
      try {
        blobUrl = await loadBlobUrl(url);
      } catch {
        blobUrl = "";
      }
    }

    if (!blobUrl) return false;

    el.dataset.blobUrl = blobUrl;
    el.style.backgroundImage = `url("${blobUrl}")`;
    return true;
  }

  function prefetchSlug(slug) {
    const url = assetUrl(slug);
    if (!url || blobCache.has(url)) return;
    fetch(url)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob) blobCache.set(url, URL.createObjectURL(blob));
      })
      .catch(() => {});
  }

  function bindProtection(root) {
    if (!root || root.dataset.previewProtectionBound === "true") return;
    root.dataset.previewProtectionBound = "true";
    root.addEventListener(
      "contextmenu",
      (event) => {
        if (event.target.closest(".preview-shot-protected")) event.preventDefault();
      },
      true
    );
    root.addEventListener(
      "dragstart",
      (event) => {
        if (event.target.closest(".preview-shot-protected")) event.preventDefault();
      },
      true
    );
  }

  window.DashboardPreviewShots = {
    VERSION,
    slugFromDashboardPath,
    assetUrl,
    applyProtectedBackground,
    prefetchSlug,
    bindProtection,
  };

  bindProtection(document.documentElement);
})();
