(() => {
  "use strict";

  const PREVIEW_WIDTH = 1280;
  const PREVIEW_HEIGHT = 800;
  const shots = () => window.DashboardPreviewShots;

  function fitGalleryPreviewViewport(viewport) {
    if (!viewport) return;
    const w = viewport.clientWidth;
    if (w < 4) return;
    const scale = w / PREVIEW_WIDTH;
    viewport.style.setProperty("--gallery-preview-scale", String(scale));
    viewport.style.height = `${Math.round(PREVIEW_HEIGHT * scale)}px`;
  }

  function mountGalleryPreview(wrap) {
    const api = shots();
    if (!api) return;

    const link = wrap.querySelector("a.landing-card[href]");
    if (!link || link.querySelector(".landing-card-preview")) return;

    let path;
    try {
      path = new URL(link.getAttribute("href"), window.location.origin).pathname;
    } catch {
      return;
    }

    const slug = api.slugFromDashboardPath(path);
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
        <div
          class="landing-card-preview-shot preview-shot-protected"
          role="img"
          aria-label="${previewTitle.replace(/"/g, "&quot;")} preview snapshot"
        ></div>
        <div class="preview-shot-guard" aria-hidden="true"></div>
      </div>
    `;
    const footer = link.querySelector(".landing-card-footer");
    if (footer) {
      link.insertBefore(preview, footer);
    } else {
      link.appendChild(preview);
    }

    const viewport = preview.querySelector(".landing-card-preview-viewport");
    const shotEl = preview.querySelector(".landing-card-preview-shot");
    const poster = preview.querySelector(".gallery-preview-poster");
    if (!viewport || !shotEl) return;

    let loaded = false;
    const loadShot = async () => {
      if (loaded) return;
      loaded = true;
      const ok = await api.applyProtectedBackground(shotEl, slug);
      if (ok) {
        poster?.classList.add("is-hidden");
        shotEl.classList.add("is-visible");
      }
    };

    if ("IntersectionObserver" in window) {
      const prefetchObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              api.prefetchSlug(slug);
              prefetchObserver.disconnect();
            }
          }
        },
        { root: null, rootMargin: "280px 0px", threshold: 0 }
      );
      prefetchObserver.observe(preview);

      const loadObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              loadShot();
              loadObserver.disconnect();
            }
          }
        },
        { root: null, rootMargin: "40px 0px", threshold: 0.01 }
      );
      loadObserver.observe(preview);
    } else {
      loadShot();
    }

    link.addEventListener(
      "mouseenter",
      () => {
        api.prefetchSlug(slug);
        loadShot();
      },
      { once: true }
    );

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
