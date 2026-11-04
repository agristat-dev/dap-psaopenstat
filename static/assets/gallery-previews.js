(() => {
  "use strict";

  const PREVIEW_WIDTH = 1280;
  const PREVIEW_HEIGHT = 800;
  const PREVIEW_LOAD_MIN_MS = 2000;

  const LOADER_STEPS = [
    "Applying dashboard filters",
    "Loading PSA OpenSTAT view",
    "Rendering live preview",
  ];

  function fitGalleryPreviewViewport(viewport) {
    if (!viewport) return;
    const w = viewport.clientWidth;
    if (w < 4) return;
    const scale = w / PREVIEW_WIDTH;
    viewport.style.setProperty("--gallery-preview-scale", String(scale));
    viewport.style.height = `${Math.round(PREVIEW_HEIGHT * scale)}px`;
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function waitForIframe(iframe) {
    return new Promise((resolve) => {
      if (iframe.contentDocument?.readyState === "complete") {
        resolve();
        return;
      }
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.addEventListener("error", () => resolve(), { once: true });
    });
  }

  function startGalleryPreviewLoader(viewport) {
    const loader = viewport.querySelector(".gallery-preview-loader");
    const statusEl = viewport.querySelector(".gallery-preview-loader-status");
    const bar = viewport.querySelector(".gallery-preview-loader-bar span");
    if (!loader) return () => {};

    viewport.classList.add("is-gallery-preview-loading");
    let stepIndex = 0;
    let progress = 0;

    const timer = window.setInterval(() => {
      progress = Math.min(progress + 4 + Math.random() * 7, 92);
      if (bar) bar.style.width = `${progress}%`;

      const nextAt = ((stepIndex + 1) / LOADER_STEPS.length) * 85;
      if (progress >= nextAt && stepIndex < LOADER_STEPS.length - 1) {
        stepIndex += 1;
        if (statusEl) statusEl.textContent = `${LOADER_STEPS[stepIndex]}…`;
      }
    }, 160);

    return async () => {
      window.clearInterval(timer);
      if (bar) bar.style.width = "100%";
      if (statusEl) statusEl.textContent = "Preview ready";
      await delay(280);
      loader.classList.add("is-done");
      viewport.classList.remove("is-gallery-preview-loading");
      viewport.classList.add("is-gallery-preview-ready");
      await delay(320);
      loader.remove();
    };
  }

  async function loadPreviewWithEffect(viewport, iframe, path) {
    if (iframe.getAttribute("data-loaded") === "true") return;
    iframe.setAttribute("data-loaded", "true");

    const finishLoader = startGalleryPreviewLoader(viewport);
    iframe.src = path;

    await Promise.all([waitForIframe(iframe), delay(PREVIEW_LOAD_MIN_MS)]);

    await finishLoader();
    iframe.classList.add("is-visible");
  }

  function mountGalleryPreview(wrap) {
    const link = wrap.querySelector("a.landing-card[href]");
    if (!link || link.querySelector(".landing-card-preview")) return;

    let path;
    try {
      path = new URL(link.getAttribute("href"), window.location.origin).pathname;
    } catch {
      return;
    }

    const titleEl = wrap.querySelector(".landing-card-title");
    const previewTitle = titleEl?.textContent?.trim() || "Dashboard preview";

    const preview = document.createElement("div");
    preview.className = "landing-card-preview";
    preview.innerHTML = `
      <div class="landing-card-preview-viewport is-gallery-preview-loading">
        <div class="gallery-preview-loader" aria-live="polite" aria-busy="true">
          <div class="gallery-preview-loader-visual" aria-hidden="true">
            <span class="gallery-preview-loader-grid"></span>
            <span class="gallery-preview-loader-ring"></span>
            <span class="gallery-preview-loader-core"></span>
            <span class="gallery-preview-loader-scan"></span>
          </div>
          <p class="gallery-preview-loader-kicker">Live preview</p>
          <p class="gallery-preview-loader-status">${LOADER_STEPS[0]}…</p>
          <div class="gallery-preview-loader-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="gallery-preview-loader-bar"><span></span></div>
          </div>
        </div>
        <iframe
          class="landing-card-preview-iframe"
          loading="lazy"
          tabindex="-1"
          title="${previewTitle.replace(/"/g, "&quot;")} preview"
        ></iframe>
      </div>
    `;
    const footer = link.querySelector(".landing-card-footer");
    if (footer) {
      link.insertBefore(preview, footer);
    } else {
      link.appendChild(preview);
    }

    const viewport = preview.querySelector(".landing-card-preview-viewport");
    const iframe = preview.querySelector("iframe");
    if (!viewport || !iframe) return;

    const beginLoad = () => {
      loadPreviewWithEffect(viewport, iframe, path).catch(() => {
        viewport.classList.remove("is-gallery-preview-loading");
        viewport.querySelector(".gallery-preview-loader")?.remove();
        iframe.classList.add("is-visible");
        if (!iframe.getAttribute("src")) iframe.src = path;
      });
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              beginLoad();
              observer.disconnect();
            }
          }
        },
        { root: null, rootMargin: "120px 0px", threshold: 0.01 }
      );
      observer.observe(preview);
    } else {
      beginLoad();
    }

    fitGalleryPreviewViewport(viewport);
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => fitGalleryPreviewViewport(viewport));
      ro.observe(viewport);
    } else {
      window.addEventListener("resize", () => fitGalleryPreviewViewport(viewport));
    }
  }

  function initGalleryPreviews() {
    if (!document.querySelector(".landing-card-grid")) return;
    document.querySelectorAll(".landing-card-wrap").forEach(mountGalleryPreview);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGalleryPreviews);
  } else {
    initGalleryPreviews();
  }
})();
