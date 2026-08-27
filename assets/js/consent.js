/*
 * PU4FOS consent engine.
 * - Google Consent Mode v2 defaults set BEFORE analytics/adsense load (see head snippet).
 * - Analytics + (non-personalized) ads run without consent.
 * - Accepting only ADDS personalization (ad_storage / ad_user_data / ad_personalization).
 * - If Google's own CMP is present (regions where a CMP is mandatory), the site banner is
 *   delayed and suppressed, and Google's choice drives the consent update.
 * - Footer "manage data" button reopens the preferences modal.
 */
(function () {
  "use strict";
  var STORE = "pu4fos_consent_v1";
  var gtag = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };

  function readChoice() {
    try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; }
  }
  function saveChoice(o) {
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function apply(granted) {
    var v = granted ? "granted" : "denied";
    gtag("consent", "update", {
      ad_storage: v, ad_user_data: v, ad_personalization: v,
      analytics_storage: "granted"
    });
  }

  // Detect Google's own CMP (Funding Choices / AdSense messaging or any IAB TCF v2 CMP).
  function googleCmpPresent() {
    if (window.googlefc && (window.googlefc.showRevocationMessage || window.googlefc.callbackQueue)) return true;
    if (typeof window.__tcfapi === "function") return true;
    if (document.querySelector(".fc-consent-root, .fc-dialog-container, .grecaptcha-badge ~ .fc-consent-root")) return true;
    return false;
  }
  // If a TCF CMP exists, mirror its purpose-1 (storage) decision into Consent Mode.
  function hookTcf() {
    if (typeof window.__tcfapi !== "function") return false;
    try {
      window.__tcfapi("addEventListener", 2, function (data, ok) {
        if (!ok || !data) return;
        if (data.eventStatus === "tcloaded" || data.eventStatus === "useractioncomplete") {
          var p = data.purpose && data.purpose.consent ? data.purpose.consent : {};
          var granted = !!(p[1] && p[3] && p[4]); // storage, personalized ads select, personalized ads
          apply(granted);
        }
      });
    } catch (e) { return false; }
    return true;
  }

  function el(id) { return document.getElementById(id); }
  function showBanner() { var b = el("consent"); if (b) b.classList.add("show"); }
  function hideBanner() { var b = el("consent"); if (b) b.classList.remove("show"); }
  function openModal() {
    var m = el("consent-modal"); if (!m) return;
    var c = readChoice();
    var t = el("cm-ads"); if (t) t.checked = !!(c && c.ads);
    m.classList.add("show");
  }
  function closeModal() { var m = el("consent-modal"); if (m) m.classList.remove("show"); }

  function decide(ads) {
    saveChoice({ ads: !!ads, ts: Date.now() });
    apply(!!ads);
    hideBanner(); closeModal();
  }

  function init() {
    // Wire buttons.
    var a = el("consent-accept"), r = el("consent-reject"), mg = el("consent-manage");
    if (a) a.onclick = function () { decide(true); };
    if (r) r.onclick = function () { decide(false); };
    if (mg) mg.onclick = function () { openModal(); };
    var save = el("cm-save"), cancel = el("cm-cancel");
    if (save) save.onclick = function () { var t = el("cm-ads"); decide(t && t.checked); };
    if (cancel) cancel.onclick = function () { closeModal(); };
    // Footer manage-data buttons (may be several).
    Array.prototype.forEach.call(document.querySelectorAll("[data-manage-consent]"), function (btn) {
      btn.onclick = function (e) { e.preventDefault(); openModal(); };
    });

    var choice = readChoice();
    if (choice) { apply(!!choice.ads); return; } // already decided -> apply, no banner

    // No stored choice: give Google's CMP a few seconds to take over.
    var settled = false;
    function settle() {
      if (settled) return; settled = true;
      if (googleCmpPresent()) { hookTcf(); return; } // Google CMP handles it, keep our banner hidden
      showBanner();
    }
    // Poll briefly for a Google CMP appearing.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (googleCmpPresent()) { clearInterval(iv); settle(); }
      else if (tries >= 12) { clearInterval(iv); settle(); } // ~3s
    }, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
