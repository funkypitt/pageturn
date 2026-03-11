(function () {
  "use strict";

  // If already active, toggle off
  if (window.__pageturnActive) {
    if (typeof window.__pageturnDeactivate === "function") {
      window.__pageturnDeactivate();
    }
    return;
  }

  window.__pageturnActive = true;

  // ── State ──
  let currentPage = 0;
  let totalPages = 1;
  let pageWidth = 0; // exact px width of one column/page (wrapper content area)
  let wrapper = null;
  let columnsEl = null;
  let indicator = null;
  let savedScrollY = 0;
  let savedBodyClasses = null;

  // ── Content extraction ──
  // Platform-specific selectors ordered by priority.
  // Blog platforms first, then generic article selectors, then fallback.
  const CONTENT_SELECTORS = [
    // Substack
    ".available-content",
    ".post-content",
    "article.post",
    ".body.markup",
    // Medium
    "article[data-post-id]",
    'article section[data-field="body"]',
    ".meteredContent",
    // WordPress
    ".entry-content",
    ".post-content",
    ".article-content",
    ".post-body",
    ".blog-post-content",
    // Ghost
    ".gh-content",
    ".post-full-content",
    // Blogger / Blogspot
    ".post-body.entry-content",
    ".hentry .entry-content",
    // Dev.to
    "#article-body",
    ".crayons-article__body",
    // Hashnode
    ".blog-content-wrapper",
    // Hugo / Jekyll common
    ".post__content",
    ".page__content",
    // Generic article / semantic
    "article",
    '[role="article"]',
    "main",
    '[role="main"]',
    ".article-body",
    ".story-body",
    ".content-body",
    "#content",
    ".content",
  ];

  // Elements to strip from extracted content
  const STRIP_SELECTORS = [
    "nav",
    "header",
    "footer",
    ".sidebar",
    "aside",
    '[role="complementary"]',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    ".share-buttons",
    ".social-share",
    ".comments",
    "#comments",
    ".comment-section",
    ".related-posts",
    ".newsletter-signup",
    ".subscription-widget",
    ".subscribe-widget",
    ".subscribe-prompt",
    ".paywall",
    // Substack specifics
    ".subscribe-footer",
    ".post-footer",
    ".subscription-widget-wrap",
    ".footer-wrap",
    ".header-anchor-widget",
    ".pencraft.pc-display-flex.pc-gap-4",
    ".like-button-container",
    ".post-ufi",
    ".recommendations",
    // Medium specifics
    ".meteredContent + div",
    'div[data-testid="audioPlayButton"]',
    ".pw-multi-vote-count",
    // Generic ad / promo
    '[class*="ad-"]',
    '[class*="promo"]',
    '[id*="ad-"]',
    "iframe",
    "script",
    "style",
    "noscript",
  ];

  function findContent() {
    for (const selector of CONTENT_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 200) {
        return el;
      }
    }
    // Fallback: find the largest text block
    return findLargestTextBlock();
  }

  function findLargestTextBlock() {
    const candidates = document.querySelectorAll(
      "div, section, article, main"
    );
    let best = null;
    let bestLen = 0;
    for (const el of candidates) {
      const len = el.textContent.trim().length;
      // Avoid selecting the body or very top-level containers
      if (el === document.body || el === document.documentElement) continue;
      // Prefer elements that are not too nested but contain substantial text
      if (len > bestLen && len > 500) {
        best = el;
        bestLen = len;
      }
    }
    return best || document.body;
  }

  function cleanContent(container) {
    for (const sel of STRIP_SELECTORS) {
      try {
        container.querySelectorAll(sel).forEach((el) => el.remove());
      } catch (e) {
        // Invalid selector, skip
      }
    }

    // Remove hidden elements
    container
      .querySelectorAll('[style*="display:none"], [style*="display: none"], [hidden], .hidden, .visually-hidden')
      .forEach((el) => el.remove());

    // Remove empty divs that just add whitespace
    container.querySelectorAll("div").forEach((div) => {
      if (
        div.children.length === 0 &&
        div.textContent.trim().length === 0
      ) {
        div.remove();
      }
    });
  }

  // ── Pagination ──

  function activate() {
    savedScrollY = window.scrollY;
    savedBodyClasses = document.body.className;

    const source = findContent();
    if (!source) return;

    // Deep clone the content
    const content = source.cloneNode(true);
    cleanContent(content);

    // Build wrapper
    wrapper = document.createElement("div");
    wrapper.id = "pageturn-wrapper";

    columnsEl = document.createElement("div");
    columnsEl.id = "pageturn-columns";
    columnsEl.innerHTML = content.innerHTML;

    wrapper.appendChild(columnsEl);

    // Page indicator
    indicator = document.createElement("div");
    indicator.id = "pageturn-indicator";

    // Hide original content, append ours
    document.body.classList.add("pageturn-active");
    document.body.appendChild(wrapper);
    document.body.appendChild(indicator);

    // Calculate pages after layout
    requestAnimationFrame(() => {
      recalcPages();
      goToPage(0);
    });

    // Listen for keys
    document.addEventListener("keydown", onKey, true);

    // Recalc on resize (e.g., rotation on tablet)
    window.addEventListener("resize", onResize);
  }

  function deactivate() {
    window.__pageturnActive = false;
    window.__pageturnDeactivate = null;

    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);

    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    if (indicator && indicator.parentNode)
      indicator.parentNode.removeChild(indicator);

    document.body.classList.remove("pageturn-active");
    if (savedBodyClasses !== null) {
      document.body.className = savedBodyClasses;
    }

    window.scrollTo(0, savedScrollY);

    wrapper = null;
    columnsEl = null;
    indicator = null;
  }

  // Expose deactivate so re-injection can toggle off
  window.__pageturnDeactivate = deactivate;

  function recalcPages() {
    if (!columnsEl || !wrapper) return;
    // Measure the wrapper's content area (viewport minus its padding).
    // This is the exact visible width for one page of content.
    // Using this for both column-width AND translateX stride guarantees
    // columns align perfectly — no content can fall between pages.
    var cs = getComputedStyle(wrapper);
    pageWidth = wrapper.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

    columnsEl.style.columnWidth = pageWidth + "px";

    // Force a layout so scrollWidth reflects the new column width
    void columnsEl.offsetHeight;

    totalPages = Math.max(1, Math.round(columnsEl.scrollWidth / pageWidth));
  }

  // Track reading progress as a fraction 0..1 so we can restore position
  // after a resize reflows the columns.
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
    if (indicator) {
      indicator.textContent = (currentPage + 1) + " / " + totalPages;
    }
  }

  // ── Event handlers ──

  function onKey(e) {
    switch (e.key) {
      case "ArrowRight":
      case " ":
        if (e.shiftKey && e.key === " ") {
          goToPage(currentPage - 1);
        } else {
          goToPage(currentPage + 1);
        }
        e.preventDefault();
        e.stopPropagation();
        break;
      case "ArrowLeft":
        goToPage(currentPage - 1);
        e.preventDefault();
        e.stopPropagation();
        break;
      case "Escape":
        deactivate();
        e.preventDefault();
        e.stopPropagation();
        break;
      case "Home":
        goToPage(0);
        e.preventDefault();
        e.stopPropagation();
        break;
      case "End":
        goToPage(totalPages - 1);
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Save reading position as a fraction before reflow
      const progress = getReadingProgress();
      recalcPages();
      // Restore to the nearest equivalent page after reflow
      const newPage = Math.round(progress * (totalPages - 1));
      goToPage(newPage);
    }, 150);
  }

  // ── Go ──
  activate();
})();
