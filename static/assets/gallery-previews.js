(() => {
  "use strict";

  const PREVIEW_WIDTH = 1280;
  const PREVIEW_HEIGHT = 800;
  const PREVIEW_READY_TIMEOUT_MS = 20000;
  const PREVIEW_LOAD_FALLBACK_MS = 5000;
  const PREVIEW_MAX_CONCURRENT = 2;

  const LOADER_STEPS = [
    "Applying dashboard filters",
    "Loading PSA OpenSTAT view",
    "Rendering live preview",
  ];

  let previewInFlight = 0;
  const previewQueue = [];
  let galleryPreviewMountIndex = 0;

  function previewPath(path) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("preview", "1");
    return `${url.pathname}${url.search}`;
  }

  function prefetchPreviewDocument(path) {
    const src = previewPath(path);
    if (document.querySelector(`link[data-preview-doc-prefetch="${src}"]`)) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "document";
    link.href = src;
    link.setAttribute("data-preview-doc-prefetch", src);
    document.head.appendChild(link);
  }

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

  function waitForGalleryPreview(iframe) {
    return new Promise((resolve) => {
      let settled = false;
      let loadFallbackTimer = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", onMessage);
        window.clearTimeout(absoluteTimer);
        if (loadFallbackTimer) window.clearTimeout(loadFallbackTimer);
        resolve();
      };

      const onMessage = (event) => {
        if (event.source !== iframe.contentWindow) return;
        if (event.data?.type === "dap-dashboard-preview-ready") finish();
      };

      window.addEventListener("message", onMessage);
      const absoluteTimer = window.setTimeout(finish, PREVIEW_READY_TIMEOUT_MS);

      iframe.addEventListener(
        "load",
        () => {
          loadFallbackTimer = window.setTimeout(finish, PREVIEW_LOAD_FALLBACK_MS);
        },
        { once: true }
      );
      iframe.addEventListener("error", () => finish(), { once: true });
    });
  }

  function startGalleryPreviewLoader(viewport) {
    const loader = viewport.querySelector(".gallery-preview-loader");
    const statusEl = viewport.querySelector(".gallery-preview-loader-status");
    const bar = viewport.querySelector(".gallery-preview-loader-bar span");
    if (!loader) return () => Promise.resolve();

    viewport.classList.add("is-gallery-preview-loading");
    let stepIndex = 0;
    let progress = 0;

    const timer = window.setInterval(() => {
      progress = Math.min(progress + 6 + Math.random() * 10, 94);
      if (bar) bar.style.width = `${progress}%`;

      const nextAt = ((stepIndex + 1) / LOADER_STEPS.length) * 85;
      if (progress >= nextAt && stepIndex < LOADER_STEPS.length - 1) {
        stepIndex += 1;
        if (statusEl) statusEl.textContent = `${LOADER_STEPS[stepIndex]}…`;
      }
    }, 120);

    return async () => {
      window.clearInterval(timer);
      if (bar) bar.style.width = "100%";
      if (statusEl) statusEl.textContent = "Preview ready";
      await delay(100);
      loader.classList.add("is-done");
      viewport.classList.remove("is-gallery-preview-loading");
      viewport.classList.add("is-gallery-preview-ready");
      await delay(140);
      loader.remove();
    };
  }

  function runPreviewJob(task, priority = 10) {
    return new Promise((resolve, reject) => {
      previewQueue.push({ task, priority, resolve, reject });
      previewQueue.sort((a, b) => a.priority - b.priority);
      drainPreviewQueue();
    });
  }

  function drainPreviewQueue() {
    while (previewInFlight < PREVIEW_MAX_CONCURRENT && previewQueue.length) {
      const job = previewQueue.shift();
      previewInFlight += 1;
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          previewInFlight -= 1;
          drainPreviewQueue();
        });
    }
  }

  async function loadPreviewWithEffect(viewport, iframe, path) {
    if (iframe.getAttribute("data-loaded") === "true") return;
    iframe.setAttribute("data-loaded", "true");

    const finishLoader = startGalleryPreviewLoader(viewport);
    const src = previewPath(path);
    iframe.src = src;

    await waitForGalleryPreview(iframe);
    await finishLoader();
    viewport.querySelector(".gallery-preview-poster")?.classList.add("is-hidden");
    iframe.classList.add("is-visible");
  }

  function mountGalleryPreview(wrap) {
    const link = wrap.querySelector("a.landing-card[href]");
    if (!link || link.querySelector(".landing-card-preview")) return;

    const mountIndex = galleryPreviewMountIndex;
    galleryPreviewMountIndex += 1;

    let path;
    try {
      path = new URL(link.getAttribute("href"), window.location.origin).pathname;
    } catch {
      return;
    }

    const titleEl = wrap.querySelector(".landing-card-title");
    const cropEl = wrap.querySelector(".landing-card-crop");
    const previewTitle = titleEl?.textContent?.trim() || "Dashboard preview";
    const previewCrop = cropEl?.textContent?.trim() || "";

    const preview = document.createElement("div");
    preview.className = "landing-card-preview";
    preview.innerHTML = `
      <div class="landing-card-preview-viewport">
        <div class="gallery-preview-poster" aria-hidden="true">
          <span class="gallery-preview-poster-kicker">${previewCrop.replace(/</g, "")}</span>
          <span class="gallery-preview-poster-title">${previewTitle.replace(/</g, "")}</span>
          <span class="gallery-preview-poster-chart">
            <span class="gallery-preview-poster-bar" style="--h:42%"></span>
            <span class="gallery-preview-poster-bar" style="--h:68%"></span>
            <span class="gallery-preview-poster-bar" style="--h:55%"></span>
            <span class="gallery-preview-poster-bar" style="--h:78%"></span>
            <span class="gallery-preview-poster-bar" style="--h:61%"></span>
            <span class="gallery-preview-poster-bar" style="--h:48%"></span>
          </span>
        </div>
        <div class="gallery-preview-loader" aria-live="polite" aria-busy="true" hidden>
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
    const loader = viewport?.querySelector(".gallery-preview-loader");
    if (!viewport || !iframe) return;

    let loadQueued = false;
    const beginLoad = (priority = mountIndex) => {
      if (loadQueued) return;
      loadQueued = true;
      if (loader) loader.hidden = false;
      viewport.classList.add("is-gallery-preview-loading");
      return runPreviewJob(
        () =>
          loadPreviewWithEffect(viewport, iframe, path).catch(() => {
            viewport.classList.remove("is-gallery-preview-loading");
            viewport.querySelector(".gallery-preview-loader")?.remove();
            viewport.querySelector(".gallery-preview-poster")?.classList.add("is-hidden");
            iframe.classList.add("is-visible");
            if (!iframe.getAttribute("src")) iframe.src = previewPath(path);
          }),
        priority
      );
    };

    const boostLoad = () => beginLoad(-1);

    link.addEventListener("mouseenter", boostLoad, { once: true });
    link.addEventListener("focusin", boostLoad, { once: true });

    if ("IntersectionObserver" in window) {
      const prefetchObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              prefetchPreviewDocument(path);
              prefetchObserver.disconnect();
            }
          }
        },
        { root: null, rootMargin: "240px 0px", threshold: 0 }
      );
      prefetchObserver.observe(preview);

      const loadObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const ratio = entry.intersectionRatio || 0.01;
            const priority = Math.max(0, mountIndex - Math.round(ratio * 4));
            beginLoad(priority);
            loadObserver.disconnect();
          }
        },
        { root: null, rootMargin: "60px 0px", threshold: [0, 0.08, 0.2] }
      );
      loadObserver.observe(preview);
    } else {
      beginLoad(mountIndex);
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
