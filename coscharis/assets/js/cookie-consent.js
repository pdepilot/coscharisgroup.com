/**
 * Coscharis cookie consent — localStorage, accessible, no layout shift
 * Storage key: coscharis:cookieConsent:v1
 */
(function () {
  "use strict";

  var STORAGE_KEY = "coscharis:cookieConsent:v1";
  var BANNER_ID = "coscharis-cookie-banner";
  var MODAL_ID = "coscharis-cookie-modal";

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var o = safeParse(raw);
      if (!o || typeof o !== "object") return null;
      if (o.v !== 1) return null;
      if (o.status !== "accepted" && o.status !== "declined" && o.status !== "custom") return null;
      return {
        v: 1,
        status: o.status,
        necessary: true,
        analytics: !!o.analytics,
        marketing: !!o.marketing,
        ts: typeof o.ts === "string" ? o.ts : new Date().toISOString()
      };
    } catch (e) {
      return null;
    }
  }

  function writeConsent(data) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          status: data.status,
          necessary: true,
          analytics: !!data.analytics,
          marketing: !!data.marketing,
          ts: new Date().toISOString()
        })
      );
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent("coscharis-cookie-consent-updated", { detail: readConsent() }));
    } catch (e2) {}
  }

  function getBanner() {
    return document.getElementById(BANNER_ID);
  }

  function getModalEl() {
    return document.getElementById(MODAL_ID);
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function showBanner(banner) {
    if (!banner) return;
    banner.removeAttribute("hidden");
    banner.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      banner.classList.add("coscharis-cc-banner--visible");
    });
  }

  function hideBannerAnimated(banner, done) {
    if (!banner) {
      if (done) done();
      return;
    }
    banner.classList.remove("coscharis-cc-banner--visible");
    banner.classList.add("coscharis-cc-banner--leaving");
    var ms = prefersReducedMotion() ? 200 : 420;
    window.setTimeout(function () {
      banner.setAttribute("hidden", "");
      banner.setAttribute("aria-hidden", "true");
      banner.classList.remove("coscharis-cc-banner--leaving");
      if (done) done();
    }, ms);
  }

  function syncTogglesFromConsent(consent) {
    var a = document.getElementById("coscharis-cc-toggle-analytics");
    var m = document.getElementById("coscharis-cc-toggle-marketing");
    if (!a || !m) return;
    if (!consent) {
      a.checked = false;
      m.checked = false;
      return;
    }
    if (consent.status === "accepted") {
      a.checked = true;
      m.checked = true;
    } else if (consent.status === "declined") {
      a.checked = false;
      m.checked = false;
    } else {
      a.checked = !!consent.analytics;
      m.checked = !!consent.marketing;
    }
  }

  function openModal(focusReturnEl) {
    var el = getModalEl();
    if (!el || typeof bootstrap === "undefined" || !bootstrap.Modal) return;
    var M = bootstrap.Modal;
    var modal =
      typeof M.getOrCreateInstance === "function"
        ? M.getOrCreateInstance(el, { backdrop: true, keyboard: true, focus: true })
        : M.getInstance(el) || new M(el, { backdrop: true, keyboard: true });
    el.addEventListener(
      "shown.bs.modal",
      function onShown() {
        el.removeEventListener("shown.bs.modal", onShown);
        var first =
          el.querySelector("#coscharis-cc-toggle-analytics") ||
          el.querySelector(".modal-body button, .modal-body input");
        if (first) first.focus();
      },
      { once: true }
    );
    el.addEventListener(
      "hidden.bs.modal",
      function onHidden() {
        el.removeEventListener("hidden.bs.modal", onHidden);
        if (focusReturnEl && typeof focusReturnEl.focus === "function") {
          focusReturnEl.focus();
        }
      },
      { once: true }
    );
    modal.show();
  }

  function closeModal() {
    var el = getModalEl();
    if (!el || typeof bootstrap === "undefined" || !bootstrap.Modal) return;
    var M = bootstrap.Modal;
    var modal =
      typeof M.getOrCreateInstance === "function"
        ? M.getOrCreateInstance(el)
        : M.getInstance(el);
    if (modal) modal.hide();
  }

  function init() {
    var existing = readConsent();
    var banner = getBanner();
    if (!banner) return;

    if (existing) {
      banner.setAttribute("hidden", "");
      banner.setAttribute("aria-hidden", "true");
      return;
    }

    var showDelay = prefersReducedMotion() ? 80 : 420;
    window.setTimeout(function () {
      showBanner(banner);
    }, showDelay);

    var btnAccept = document.getElementById("coscharis-cc-accept-all");
    var btnDecline = document.getElementById("coscharis-cc-decline");
    var btnManage = document.getElementById("coscharis-cc-manage");
    var btnSave = document.getElementById("coscharis-cc-save-prefs");

    if (btnAccept) {
      btnAccept.addEventListener("click", function () {
        writeConsent({ status: "accepted", analytics: true, marketing: true });
        hideBannerAnimated(banner, null);
      });
    }

    if (btnDecline) {
      btnDecline.addEventListener("click", function () {
        writeConsent({ status: "declined", analytics: false, marketing: false });
        hideBannerAnimated(banner, null);
      });
    }

    if (btnManage) {
      btnManage.addEventListener("click", function () {
        var c = readConsent();
        syncTogglesFromConsent(c || { analytics: false, marketing: false });
        openModal(btnManage);
      });
    }

    if (btnSave) {
      btnSave.addEventListener("click", function () {
        var aEl = document.getElementById("coscharis-cc-toggle-analytics");
        var mEl = document.getElementById("coscharis-cc-toggle-marketing");
        var analytics = aEl ? aEl.checked : false;
        var marketing = mEl ? mEl.checked : false;
        writeConsent({ status: "custom", analytics: analytics, marketing: marketing });
        closeModal();
        hideBannerAnimated(banner, null);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.CoscharisCookieConsent = {
    getConsent: readConsent,
    STORAGE_KEY: STORAGE_KEY
  };
})();
