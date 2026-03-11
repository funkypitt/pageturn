(function () {
  "use strict";

  // ── Toggle off if already active ──
  if (window.__pageturnActive) {
    if (typeof window.__pageturnDeactivate === "function") {
      window.__pageturnDeactivate();
    }
    return;
  }
  window.__pageturnActive = true;

  // ── Inject styles ──
  var style = document.createElement("style");
  style.id = "pageturn-style";
  style.textContent =
    "body.pageturn-active{overflow:hidden!important;margin:0!important;padding:0!important;height:100vh!important;width:100vw!important}" +
    "body.pageturn-active>*:not(#pageturn-wrapper):not(#pageturn-indicator):not(#pageturn-close){display:none!important}" +
    "#pageturn-wrapper{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;overflow:hidden!important;background:#fff!important;z-index:2147483640!important;padding:2vh 4vw!important;box-sizing:border-box!important}" +
    "#pageturn-columns{column-fill:auto!important;column-gap:0!important;height:100%!important;transition:none!important;will-change:transform!important;font-family:Georgia,'Times New Roman',serif!important;font-size:19px!important;line-height:1.7!important;color:#1a1a1a!important}" +
    "#pageturn-columns *{max-width:100%!important;box-sizing:border-box!important}" +
    "#pageturn-columns img{max-height:80vh!important;width:auto!important;height:auto!important;display:block!important;margin:1em auto!important;break-inside:avoid!important}" +
    "#pageturn-columns h1,#pageturn-columns h2,#pageturn-columns h3,#pageturn-columns h4,#pageturn-columns h5,#pageturn-columns h6{break-after:avoid!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif!important;color:#000!important}" +
    "#pageturn-columns h1{font-size:1.6em!important;margin:.5em 0!important}" +
    "#pageturn-columns h2{font-size:1.3em!important;margin:.8em 0 .4em!important}" +
    "#pageturn-columns p{margin:.6em 0!important;orphans:3!important;widows:3!important}" +
    "#pageturn-columns blockquote{border-left:3px solid #888!important;margin:1em 0!important;padding:.2em 0 .2em 1.2em!important;color:#444!important;font-style:italic!important}" +
    "#pageturn-columns pre,#pageturn-columns code{font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace!important;font-size:.85em!important}" +
    "#pageturn-columns pre{background:#f5f5f5!important;padding:1em!important;overflow-x:auto!important;break-inside:avoid!important;border-radius:4px!important}" +
    "#pageturn-columns a{color:#1a1a1a!important;text-decoration:underline!important}" +
    "#pageturn-columns figure{margin:1em 0!important;break-inside:avoid!important}" +
    "#pageturn-columns figcaption{font-size:.85em!important;color:#666!important;text-align:center!important;margin-top:.4em!important}" +
    "#pageturn-indicator{position:fixed!important;bottom:12px!important;left:50%!important;transform:translateX(-50%)!important;background:rgba(0,0,0,.7)!important;color:#fff!important;padding:5px 14px!important;border-radius:14px!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif!important;font-size:13px!important;font-weight:500!important;z-index:2147483647!important;pointer-events:none!important;user-select:none!important;letter-spacing:.5px!important}" +
    "#pageturn-close{position:fixed!important;top:10px!important;right:10px!important;z-index:2147483647!important;background:rgba(0,0,0,.6)!important;color:#fff!important;border:none!important;border-radius:50%!important;width:36px!important;height:36px!important;font-size:20px!important;line-height:36px!important;text-align:center!important;cursor:pointer!important;padding:0!important;font-family:sans-serif!important;-webkit-tap-highlight-color:transparent!important}";
  document.head.appendChild(style);

  // ── State ──
  var currentPage = 0;
  var totalPages = 1;
  var pageWidth = 0;
  var wrapper = null;
  var columnsEl = null;
  var indicator = null;
  var closeBtn = null;
  var savedScrollY = 0;
  var savedBodyClasses = null;

  // ── Touch state ──
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var isSwiping = false;

  // ── Content selectors ──
  var CONTENT_SELECTORS = [
    ".available-content", ".post-content", "article.post", ".body.markup",
    "article[data-post-id]", 'article section[data-field="body"]', ".meteredContent",
    ".entry-content", ".article-content", ".post-body", ".blog-post-content",
    ".gh-content", ".post-full-content",
    ".post-body.entry-content", ".hentry .entry-content",
    "#article-body", ".crayons-article__body",
    ".blog-content-wrapper",
    ".post__content", ".page__content",
    "article", '[role="article"]', "main", '[role="main"]',
    ".article-body", ".story-body", ".content-body", "#content", ".content"
  ];

  var STRIP_SELECTORS = [
    "nav", "header", "footer", ".sidebar", "aside",
    '[role="complementary"]', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    ".share-buttons", ".social-share", ".comments", "#comments", ".comment-section",
    ".related-posts", ".newsletter-signup", ".subscription-widget", ".subscribe-widget",
    ".subscribe-prompt", ".paywall",
    ".subscribe-footer", ".post-footer", ".subscription-widget-wrap", ".footer-wrap",
    ".header-anchor-widget", ".like-button-container", ".post-ufi", ".recommendations",
    'div[data-testid="audioPlayButton"]', ".pw-multi-vote-count",
    '[class*="ad-"]', '[class*="promo"]', '[id*="ad-"]',
    "iframe", "script", "style", "noscript"
  ];

  function findContent() {
    for (var i = 0; i < CONTENT_SELECTORS.length; i++) {
      var el = document.querySelector(CONTENT_SELECTORS[i]);
      if (el && el.textContent.trim().length > 200) return el;
    }
    return findLargestTextBlock();
  }

  function findLargestTextBlock() {
    var candidates = document.querySelectorAll("div, section, article, main");
    var best = null, bestLen = 0;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el === document.body || el === document.documentElement) continue;
      var len = el.textContent.trim().length;
      if (len > bestLen && len > 500) { best = el; bestLen = len; }
    }
    return best || document.body;
  }

  function cleanContent(container) {
    for (var i = 0; i < STRIP_SELECTORS.length; i++) {
      try { container.querySelectorAll(STRIP_SELECTORS[i]).forEach(function (el) { el.remove(); }); }
      catch (e) {}
    }
    container.querySelectorAll('[style*="display:none"],[style*="display: none"],[hidden],.hidden,.visually-hidden')
      .forEach(function (el) { el.remove(); });
    container.querySelectorAll("div").forEach(function (div) {
      if (div.children.length === 0 && div.textContent.trim().length === 0) div.remove();
    });
  }

  // ── Pagination ──

  function activate() {
    savedScrollY = window.scrollY;
    savedBodyClasses = document.body.className;

    var source = findContent();
    if (!source) return;

    var content = source.cloneNode(true);
    cleanContent(content);

    wrapper = document.createElement("div");
    wrapper.id = "pageturn-wrapper";

    columnsEl = document.createElement("div");
    columnsEl.id = "pageturn-columns";
    columnsEl.innerHTML = content.innerHTML;
    wrapper.appendChild(columnsEl);

    indicator = document.createElement("div");
    indicator.id = "pageturn-indicator";

    closeBtn = document.createElement("button");
    closeBtn.id = "pageturn-close";
    closeBtn.textContent = "\u00d7";
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      deactivate();
    });

    document.body.classList.add("pageturn-active");
    document.body.appendChild(wrapper);
    document.body.appendChild(indicator);
    document.body.appendChild(closeBtn);

    // Prevent mobile viewport bounce/overscroll
    document.body.style.touchAction = "none";

    requestAnimationFrame(function () {
      recalcPages();
      goToPage(0);
    });

    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);

    // Touch events on the wrapper
    wrapper.addEventListener("touchstart", onTouchStart, { passive: false });
    wrapper.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapper.addEventListener("touchend", onTouchEnd, { passive: false });

    // Also support tap zones (for devices where swipe is awkward)
    wrapper.addEventListener("click", onTap);
  }

  function deactivate() {
    window.__pageturnActive = false;
    window.__pageturnDeactivate = null;

    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);

    if (wrapper) {
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
      wrapper.removeEventListener("touchend", onTouchEnd);
      wrapper.removeEventListener("click", onTap);
    }

    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
    if (closeBtn && closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);

    var styleEl = document.getElementById("pageturn-style");
    if (styleEl) styleEl.remove();

    document.body.classList.remove("pageturn-active");
    if (savedBodyClasses !== null) document.body.className = savedBodyClasses;
    document.body.style.touchAction = "";

    window.scrollTo(0, savedScrollY);
    wrapper = null; columnsEl = null; indicator = null; closeBtn = null;
  }

  window.__pageturnDeactivate = deactivate;

  function recalcPages() {
    if (!columnsEl || !wrapper) return;
    var cs = getComputedStyle(wrapper);
    pageWidth = wrapper.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    columnsEl.style.columnWidth = pageWidth + "px";
    void columnsEl.offsetHeight;
    totalPages = Math.max(1, Math.round(columnsEl.scrollWidth / pageWidth));
  }

  function getReadingProgress() {
    if (totalPages <= 1) return 0;
    return currentPage / (totalPages - 1);
  }

  function goToPage(n) {
    currentPage = Math.max(0, Math.min(n, totalPages - 1));
    columnsEl.style.transform = "translateX(-" + (currentPage * pageWidth) + "px)";
    updateIndicator();
  }

  function updateIndicator() {
    if (indicator) indicator.textContent = (currentPage + 1) + " / " + totalPages;
  }

  // ── Keyboard ──

  function onKey(e) {
    switch (e.key) {
      case "ArrowRight":
      case " ":
        if (e.shiftKey && e.key === " ") { goToPage(currentPage - 1); }
        else { goToPage(currentPage + 1); }
        e.preventDefault(); e.stopPropagation(); break;
      case "ArrowLeft":
        goToPage(currentPage - 1);
        e.preventDefault(); e.stopPropagation(); break;
      case "Escape":
        deactivate();
        e.preventDefault(); e.stopPropagation(); break;
      case "Home":
        goToPage(0);
        e.preventDefault(); e.stopPropagation(); break;
      case "End":
        goToPage(totalPages - 1);
        e.preventDefault(); e.stopPropagation(); break;
    }
  }

  // ── Touch / Swipe ──

  var SWIPE_THRESHOLD = 50; // min px to count as swipe
  var SWIPE_MAX_TIME = 500; // ms

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isSwiping = false;
  }

  function onTouchMove(e) {
    if (e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - touchStartX;
    var dy = e.touches[0].clientY - touchStartY;
    // If horizontal movement dominates, it's a swipe — prevent scroll
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping = true;
      e.preventDefault();
    }
  }

  function onTouchEnd(e) {
    if (!isSwiping) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var elapsed = Date.now() - touchStartTime;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && elapsed <= SWIPE_MAX_TIME) {
      if (dx < 0) { goToPage(currentPage + 1); } // swipe left → next
      else { goToPage(currentPage - 1); }          // swipe right → prev
    }
    isSwiping = false;
  }

  // ── Tap zones (fallback for precise taps) ──
  // Left third → previous, right third → next, middle → ignore

  var lastTouchEnd = 0;
  function onTap(e) {
    // Ignore if this was a swipe
    if (isSwiping) return;
    // Debounce double-fire from touch+click
    var now = Date.now();
    if (now - lastTouchEnd < 300) return;
    lastTouchEnd = now;

    var x = e.clientX;
    var w = window.innerWidth;
    if (x < w * 0.30) {
      goToPage(currentPage - 1);
    } else if (x > w * 0.70) {
      goToPage(currentPage + 1);
    }
    // Middle 40% does nothing (allows selecting text, etc.)
  }

  // ── Resize ──

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var progress = getReadingProgress();
      recalcPages();
      var newPage = Math.round(progress * (totalPages - 1));
      goToPage(newPage);
    }, 150);
  }

  // ── Go ──
  activate();
})();
