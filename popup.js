(function () {
  const btn = document.getElementById("toggle");

  // Check if PageTurn is already active in the current tab
  async function updateButton() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => !!window.__pageturnActive,
      });
      if (result && result.result) {
        btn.textContent = "Stop Reading Mode";
        btn.classList.add("active");
      }
    } catch (e) {
      // Can't inject into this page (e.g. chrome:// URLs)
    }
  }

  updateButton();

  btn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    window.close();
  });
})();
