(function () {
  "use strict";

  var STORAGE_KEY = "crag_seo_popup_seen";
  var DELAY_MS = 8000;
  var WIDGET_ORIGIN = "https://cragdigital.com";

  // Don't show twice in 30 days
  try {
    var seen = localStorage.getItem(STORAGE_KEY);
    if (seen) {
      var seenAt = parseInt(seen, 10);
      if (Date.now() - seenAt < 30 * 24 * 60 * 60 * 1000) return;
    }
  } catch (e) { /* private browsing */ }

  function buildPopup() {
    // Overlay
    var overlay = document.createElement("div");
    overlay.id = "crag-seo-overlay";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,0.55)",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:16px",
      "animation:cragFadeIn .25s ease",
    ].join(";");

    // Wrapper (constrains iframe size)
    var wrapper = document.createElement("div");
    wrapper.style.cssText = [
      "width:100%",
      "max-width:480px",
      "position:relative",
      "animation:cragSlideUp .3s ease",
    ].join(";");

    // Close button (outside iframe so it always works)
    var closeBtn = document.createElement("button");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.style.cssText = [
      "position:absolute",
      "top:-12px",
      "right:-12px",
      "z-index:10",
      "width:30px",
      "height:30px",
      "border-radius:50%",
      "background:#fff",
      "border:none",
      "box-shadow:0 2px 8px rgba(0,0,0,.2)",
      "cursor:pointer",
      "font-size:16px",
      "line-height:1",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "color:#374151",
    ].join(";");
    closeBtn.textContent = "✕";
    closeBtn.onclick = removePopup;

    // iframe
    var iframe = document.createElement("iframe");
    var widgetUrl = WIDGET_ORIGIN + "/widget";
    iframe.src = widgetUrl;
    iframe.style.cssText = [
      "width:100%",
      "height:560px",
      "border:none",
      "border-radius:16px",
      "display:block",
      "box-shadow:0 8px 40px rgba(0,0,0,.18)",
    ].join(";");
    iframe.setAttribute("title", "Free SEO Report");
    iframe.setAttribute("loading", "eager");

    wrapper.appendChild(closeBtn);
    wrapper.appendChild(iframe);
    overlay.appendChild(wrapper);

    // CSS animations
    var style = document.createElement("style");
    style.textContent = [
      "@keyframes cragFadeIn{from{opacity:0}to{opacity:1}}",
      "@keyframes cragSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}",
    ].join("");
    document.head.appendChild(style);

    // Close on overlay click (outside wrapper)
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) removePopup();
    });

    document.body.appendChild(overlay);

    // Mark as seen
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) { /* */ }
  }

  function removePopup() {
    var el = document.getElementById("crag-seo-overlay");
    if (el) el.parentNode && el.parentNode.removeChild(el);
  }

  // Listen for close message from iframe
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "CRAG_CLOSE_POPUP") {
      removePopup();
    }
  });

  // Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") removePopup();
  });

  // Fire after delay
  setTimeout(buildPopup, DELAY_MS);
})();
