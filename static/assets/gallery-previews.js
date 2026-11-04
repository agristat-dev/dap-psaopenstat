(() => {
  "use strict";

  const PREVIEW_WIDTH = 1280;
  const PREVIEW_HEIGHT = 800;

  function fitGalleryPreviewViewport(viewport) {
    if (!viewport) return;
    const w = viewport.clientWidth;
    if (w < 4) return;
    const scale = w / PREVIEW_WIDTH;
    viewport.style.setProperty("--gallery-preview-scale", String(scale));
    viewport.style.height = `${Math.round(PREVIEW_HEIGHT * scale)}px`;
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
      <div class="landing-card-preview-viewport">
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

    const loadPreview = () => {
      if (iframe.getAttribute("data-loaded") === "true") return;
      iframe.src = path;
      iframe.setAttribute("data-loaded", "true");
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              loadPreview();
              observer.disconnect();
            }
          }
        },
        { root: null, rootMargin: "120px 0px", threshold: 0.01 }
      );
      observer.observe(preview);
    } else {
      loadPreview();
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
