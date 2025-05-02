document.addEventListener("DOMContentLoaded", () => {
  // Apply theme based on system preference
  const applyTheme = () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  };

  // Apply theme on load
  applyTheme();

  // Listen for theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  // Load saved settings
  chrome.storage.sync.get(["apiKey", "translateLanguage", "readingLevel", "font", "textSize", "enableToolbar"], (data) => {
    document.getElementById("apiKey").value = data.apiKey || "";
    document.getElementById("translateLanguage").value = data.translateLanguage || "Farsi";
    document.getElementById("readingLevel").value = data.readingLevel || "5";
    document.getElementById("font").value = data.font || "default";
    document.getElementById("textSize").value = data.textSize || "";
    document.getElementById("enableToolbar").checked = data.enableToolbar !== false;
  });

  // Save settings
  document.getElementById("saveBtn").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    const translateLanguage = document.getElementById("translateLanguage").value;
    const readingLevel = document.getElementById("readingLevel").value;
    const font = document.getElementById("font").value;
    const textSize = document.getElementById("textSize").value;
    const enableToolbar = document.getElementById("enableToolbar").checked;
    chrome.storage.sync.set({ apiKey, translateLanguage, readingLevel, font, textSize, enableToolbar }, () => {
      console.log("Settings saved:", { apiKey, translateLanguage, readingLevel, font, textSize, enableToolbar });
      chrome.runtime.sendMessage({ action: "updateTranslateLanguage", language: translateLanguage });
      chrome.runtime.sendMessage({ action: "applySettings" });
      alert("Settings saved!");
    });
  });
});