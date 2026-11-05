(() => {
  "use strict";

  function isPreliminaryNoticeOpen() {
    const modal = document.getElementById("preliminaryDataNoticeModal");
    return Boolean(modal && !modal.hidden);
  }

  function setModalOpenState(open) {
    document.documentElement.classList.toggle("modal-open", open);
    document.body.classList.toggle("modal-open", open);
  }

  function ensurePreliminaryNoticeModal() {
    let modal = document.getElementById("preliminaryDataNoticeModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "preliminaryDataNoticeModal";
    modal.className = "app-modal app-modal-preliminary";
    modal.hidden = true;
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "preliminaryDataNoticeTitle");
    modal.setAttribute("aria-describedby", "preliminaryDataNoticeText");
    modal.innerHTML = `
    <div class="app-modal-backdrop" data-notice-dismiss="true"></div>
    <div class="app-modal-panel app-modal-panel-preliminary">
      <p class="app-modal-preliminary-kicker">Important reminder</p>
      <h2 class="app-modal-title" id="preliminaryDataNoticeTitle">Preliminary Data</h2>
      <p class="app-modal-text" id="preliminaryDataNoticeText">
        The statistics and figures presented in this dashboard incorporate data from PSA OpenSTAT. Some of these figures are still preliminary and subject to revision.
      </p>
      <div class="app-modal-actions">
        <button type="button" class="app-modal-btn app-modal-btn-primary" id="preliminaryDataNoticeConfirm">
          I understand
        </button>
      </div>
    </div>
  `;
    (document.body || document.documentElement).appendChild(modal);
    return modal;
  }

  function showPreliminaryDataNotice() {
    if (window.self !== window.top) return;

    const modal = ensurePreliminaryNoticeModal();
    if (!modal.hidden) return;

    const confirmBtn = modal.querySelector("#preliminaryDataNoticeConfirm");
    const previouslyFocused = document.activeElement;

    const close = () => {
      modal.hidden = true;
      setModalOpenState(false);
      modal.removeEventListener("keydown", onKeyDown);
      confirmBtn?.removeEventListener("click", onConfirm);
      modal.querySelectorAll("[data-notice-dismiss]").forEach((el) => {
        el.removeEventListener("click", onConfirm);
      });
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };

    const onConfirm = () => {
      close();
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onConfirm();
      }
    };

    modal.querySelectorAll("[data-notice-dismiss]").forEach((el) => {
      el.addEventListener("click", onConfirm);
    });
    confirmBtn?.addEventListener("click", onConfirm);
    modal.addEventListener("keydown", onKeyDown);

    document.body.appendChild(modal);

    modal.hidden = false;
    setModalOpenState(true);
    requestAnimationFrame(() => {
      confirmBtn?.focus({ preventScroll: true });
    });
  }

  function schedulePreliminaryDataNotice() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        showPreliminaryDataNotice();
      });
    });
  }

  function initPreliminaryDataNotice() {
    schedulePreliminaryDataNotice();
  }

  window.isPreliminaryNoticeOpen = isPreliminaryNoticeOpen;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPreliminaryDataNotice, { once: true });
  } else {
    initPreliminaryDataNotice();
  }
})();
