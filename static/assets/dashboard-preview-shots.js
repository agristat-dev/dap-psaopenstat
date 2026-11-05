(() => {
  "use strict";

  const VERSION = 2;
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

  function revokeElementBlob(el) {
    const prev = el?.dataset?.blobUrl;
    if (prev) {
      URL.revokeObjectURL(prev);
      delete el.dataset.blobUrl;
    }
  }

  async function applyProtectedBackground(el, slug) {
    if (!el || !slug) return false;
    const url = assetUrl(slug);
    if (!url) return false;

    if (blobCache.has(url)) {
      revokeElementBlob(el);
      const blobUrl = blobCache.get(url);
      el.dataset.blobUrl = blobUrl;
      el.style.backgroundImage = `url("${blobUrl}")`;
      return true;
    }

    try {
      const res = await fetch(url, { credentials: "same-origin", cache: "force-cache" });
      if (!res.ok) return false;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(url, blobUrl);
      revokeElementBlob(el);
      el.dataset.blobUrl = blobUrl;
      el.style.backgroundImage = `url("${blobUrl}")`;
      return true;
    } catch {
      return false;
    }
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
