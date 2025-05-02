let originalTexts = new Map();
let loadingStates = {};
let toolbarActiveForContextMenu = false;
let toolbarActiveForAction = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applySettings") {
    applyUserSettings();
    sendResponse({ success: true });
  } else if (request.action === "replaceTextFallback") {
    replaceTextFallback(request.text, request.originalText);
    sendResponse({ success: true });
  } else if (request.action === "storeOriginalText") {
    originalTexts.set(request.id, {
      text: request.originalText,
      html: request.originalHTML
    });
    console.log("Stored original text and HTML in Map:", {
      id: request.id,
      originalText: request.originalText,
      originalHTML: request.originalHTML
    });
    sendResponse({ success: true });
  } else if (request.action === "revert" || request.action === "revertFallback") {
    revertToOriginal();
    sendResponse({ success: true });
  } else if (request.action === "startLoading") {
    loadingStates[request.menuItemId] = true;
    updateToolbarButtons();
    sendResponse({ success: true });
  } else if (request.action === "stopLoading") {
    loadingStates[request.menuItemId] = false;
    updateToolbarButtons();
    if (!Object.values(loadingStates).some(state => state)) {
      toolbarActiveForContextMenu = false;
      toolbarActiveForAction = false;
      chrome.storage.local.get("isToolbarCollapsed", (data) => {
        if (!data.isToolbarCollapsed) {
          hideToolbar();
        }
      });
    }
    sendResponse({ success: true });
  } else if (request.action === "showError") {
    showError(request.error);
    toolbarActiveForContextMenu = false;
    toolbarActiveForAction = false;
    chrome.storage.local.get("isToolbarCollapsed", (data) => {
      if (!data.isToolbarCollapsed) {
        hideToolbar();
      }
    });
    sendResponse({ success: true });
  } else if (request.action === "showLoadingOverlay") {
    showLoadingOverlay();
    sendResponse({ success: true });
  } else if (request.action === "hideLoadingOverlay") {
    hideLoadingOverlay();
    sendResponse({ success: true });
  } else if (request.action === "showToolbarForContextMenu") {
    showToolbarForContextMenu(request.text, request.menuItemId);
    sendResponse({ success: true });
  }
});

document.addEventListener("mouseup", (event) => {
  const selection = window.getSelection();
  console.log("Mouseup event triggered, selected text:", selection.toString());
  const isToolbarClick = event.target.closest("#smart-text-toolbar");
  if (selection.toString().length > 0 && !isToolbarClick) {
    chrome.storage.sync.get("enableToolbar", (data) => {
      if (data.enableToolbar !== false && !toolbarActiveForContextMenu && !toolbarActiveForAction) {
        console.log("Showing toolbar for selection:", selection.toString());
        showToolbar(selection);
      } else {
        console.log("Toolbar disabled or active for action/context menu, not showing.");
      }
    });
  } else if (!isToolbarClick && !toolbarActiveForContextMenu && !toolbarActiveForAction) {
    console.log("Hiding toolbar, no valid selection or click outside toolbar");
    chrome.storage.local.get("isToolbarCollapsed", (data) => {
      if (!data.isToolbarCollapsed) {
        hideToolbar();
      }
    });
  } else {
    console.log("Toolbar click detected or action active, keeping toolbar visible");
  }
});

function showToolbar(selection) {
  let toolbar = document.getElementById("smart-text-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.id = "smart-text-toolbar";
    document.body.appendChild(toolbar);
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  toolbar.setAttribute("data-theme", prefersDark ? "dark" : "light");

  chrome.storage.local.get("isToolbarCollapsed", (data) => {
    const isCollapsed = data.isToolbarCollapsed || false;
    chrome.storage.sync.get("translateLanguage", (data) => {
      const language = data.translateLanguage || "Farsi";
      if (isCollapsed) {
        toolbar.innerHTML = `
          <img src="${chrome.runtime.getURL("icons/expand.png")}" class="toolbar-icon" alt="Expand Toolbar">
        `;
        toolbar.classList.add("collapsed");
        const expandIcon = toolbar.querySelector(".toolbar-icon");
        expandIcon.addEventListener("mouseenter", () => {
          chrome.storage.local.set({ isToolbarCollapsed: false }, () => {
            showToolbar(selection); // Re-render as expanded
          });
        });
      } else {
        toolbar.innerHTML = `
          <button class="toolbar-btn" data-action="simplify"></button>
          <button class="toolbar-btn" data-action="translate"></button>
          <button class="toolbar-btn" data-action="summarize"></button>
          <button class="toolbar-btn" data-action="tone_formal"></button>
          <button class="toolbar-btn" data-action="tone_casual"></button>
          <button class="toolbar-btn" data-action="revert"></button>
          <button class="toolbar-btn collapse-btn">
            <img src="${chrome.runtime.getURL("icons/collapse.png")}" alt="Collapse Toolbar">
          </button>
        `;
        toolbar.classList.remove("collapsed");
        updateToolbarButtons(language);
        const buttons = toolbar.querySelectorAll(".toolbar-btn:not(.collapse-btn)");
        buttons.forEach(button => {
          button.addEventListener("click", () => {
            const action = button.dataset.action;
            if (action === "revert") {
              revertToOriginal();
            } else {
              sendMessage(action);
            }
          });
        });
        const collapseBtn = toolbar.querySelector(".collapse-btn");
        collapseBtn.addEventListener("click", () => {
          chrome.storage.local.set({ isToolbarCollapsed: true }, () => {
            showToolbar(selection); // Re-render as collapsed
          });
        });
      }

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        toolbar.style.top = `${rect.bottom + window.scrollY + 5}px`;
        toolbar.style.left = `${rect.left + window.scrollX}px`;
      } else {
        console.warn("No valid range found for toolbar positioning, using default position");
        toolbar.style.top = `${window.scrollY + 10}px`;
        toolbar.style.left = `${window.scrollX + 10}px`;
      }
      toolbar.style.display = "flex";
      console.log("Toolbar displayed at position:", { top: toolbar.style.top, left: toolbar.style.left, collapsed: isCollapsed });
    });
  });
}

function showToolbarForContextMenu(text, menuItemId) {
  toolbarActiveForContextMenu = true;
  const selection = window.getSelection();
  if (!selection.toString()) {
    console.log("No active selection, attempting to reselect text:", text);
    const range = document.createRange();
    let found = false;
    function searchNode(node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(text)) {
        const index = node.textContent.indexOf(text);
        range.setStart(node, index);
        range.setEnd(node, index + text.length);
        found = true;
        return true;
      }
      for (const child of node.childNodes) {
        if (searchNode(child)) return true;
      }
      return false;
    }
    searchNode(document.body);
    if (found) {
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      console.warn("Could not find text to reselect:", text);
    }
  }

  // Expand toolbar if collapsed for context menu actions
  chrome.storage.local.set({ isToolbarCollapsed: false }, () => {
    showToolbar(selection);
    loadingStates[menuItemId] = true;
    updateToolbarButtons();
    console.log("Toolbar shown for context menu action:", menuItemId);
  });
}

function updateToolbarButtons(language = "Farsi") {
  const buttons = document.querySelectorAll("#smart-text-toolbar .toolbar-btn:not(.collapse-btn)");
  buttons.forEach(button => {
    const action = button.dataset.action;
    const isLoading = loadingStates[action];
    if (isLoading) {
      button.innerHTML = '<span class="spinner"></span>';
      button.disabled = true;
    } else {
      let text;
      switch (action) {
        case "simplify": text = "Simplify"; break;
        case "translate": text = `Translate to ${language}`; break;
        case "summarize": text = "Summarize"; break;
        case "tone_formal": text = "Formal"; break;
        case "tone_casual": text = "Casual"; break;
        case "revert": text = "Revert to Original"; break;
      }
      button.innerHTML = text;
      button.disabled = false;
    }
  });
}

function sendMessage(action) {
  const text = window.getSelection().toString();
  if (text) {
    if (chrome.runtime && chrome.runtime.id) {
      console.log(`Sending message for action: ${action}, text: ${text}`);
      toolbarActiveForAction = true;
      loadingStates[action] = true;
      updateToolbarButtons();
      chrome.runtime.sendMessage({ action, text }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          showError("Extension context invalidated. Please refresh the page.");
          loadingStates[action] = false;
          toolbarActiveForAction = false;
          updateToolbarButtons();
          chrome.storage.local.get("isToolbarCollapsed", (data) => {
            if (!data.isToolbarCollapsed) {
              hideToolbar();
            }
          });
        }
      });
    } else {
      console.error("Extension context invalidated.");
      showError("Extension context invalidated. Please refresh the page.");
      loadingStates[action] = false;
      toolbarActiveForAction = false;
      updateToolbarButtons();
      chrome.storage.local.get("isToolbarCollapsed", (data) => {
        if (!data.isToolbarCollapsed) {
          hideToolbar();
        }
      });
    }
  } else {
    console.error("No text selected for action:", action);
    showError("Please highlight some text to process.");
    loadingStates[action] = false;
    toolbarActiveForAction = false;
    updateToolbarButtons();
    chrome.storage.local.get("isToolbarCollapsed", (data) => {
      if (!data.isToolbarCollapsed) {
        hideToolbar();
      }
    });
  }
}

function hideToolbar() {
  if (toolbarActiveForContextMenu || toolbarActiveForAction) {
    console.log("Toolbar kept visible due to active context menu or action");
    return;
  }
  const toolbar = document.getElementById("smart-text-toolbar");
  if (toolbar) {
    chrome.storage.local.get("isToolbarCollapsed", (data) => {
      if (!data.isToolbarCollapsed) {
        toolbar.style.display = "none";
        console.log("Toolbar hidden");
      }
    });
  }
}

function showError(message) {
  let errorDiv = document.getElementById("smart-text-error");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "smart-text-error";
    document.body.appendChild(errorDiv);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
  console.log("Displayed error:", message);
}

function showLoadingOverlay() {
  let overlay = document.getElementById("smart-text-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "smart-text-loading-overlay";
    overlay.innerHTML = '<span class="spinner"></span>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = "flex";
  console.log("Displayed loading overlay");
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("smart-text-loading-overlay");
  if (overlay) {
    overlay.style.display = "none";
    console.log("Hid loading overlay");
  }
}

function revertToOriginal() {
  console.log("Starting revertToOriginal");
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    let span = range.startContainer.parentNode;
    while (span && span.className !== "smart-text-enhanced") {
      span = span.parentNode;
    }
    if (span && span.className === "smart-text-enhanced") {
      const spanId = span.dataset.id;
      let original = originalTexts.get(spanId);
      let originalHTML = original?.html || span.dataset.originalHtml;
      let originalText = original?.text || span.dataset.original;

      if (originalHTML) {
        console.log("Original HTML to revert:", originalHTML);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = originalHTML;

        const nodes = Array.from(tempDiv.childNodes);
        console.log("Parsed nodes for reversion:", nodes.map(node => node.outerHTML || node.textContent));

        const parent = span.parentNode;
        const fragment = document.createDocumentFragment();
        nodes.forEach(node => fragment.appendChild(node));
        
        parent.insertBefore(fragment, span);
        span.remove();

        console.log("Reverted to original HTML successfully");
        return;
      } else if (originalText) {
        span.textContent = originalText;
        span.dataset.current = originalText;
        console.warn("Reverted to original text (HTML not found):", originalText);
        return;
      }
    }

    console.log("No enhanced span found in selection, searching document");
    const allSpans = document.getElementsByClassName("smart-text-enhanced");
    for (let i = 0; i < allSpans.length; i++) {
      const span = allSpans[i];
      const spanId = span.dataset.id;
      let original = originalTexts.get(spanId);
      let originalHTML = original?.html || span.dataset.originalHtml;
      let originalText = original?.text || span.dataset.original;

      if (originalHTML) {
        console.log("Original HTML to revert (document search):", originalHTML);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = originalHTML;

        const nodes = Array.from(tempDiv.childNodes);
        console.log("Parsed nodes for reversion (document search):", nodes.map(node => node.outerHTML || node.textContent));

        const parent = span.parentNode;
        const fragment = document.createDocumentFragment();
        nodes.forEach(node => fragment.appendChild(node));

        parent.insertBefore(fragment, span);
        span.remove();

        console.log("Reverted to original HTML successfully (document search)");
        return;
      } else if (originalText) {
        span.textContent = originalText;
        span.dataset.current = originalText;
        console.warn("Reverted to original text from document search (HTML not found):", originalText);
        return;
      }
    }
    console.error("No enhanced text found to revert, even after document search");
  } else {
    console.error("No selection found for reverting");
  }
}

function replaceTextFallback(newText, originalText) {
  console.log("Applying fallback replacement with newText:", newText);
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    let span = range.startContainer.parentNode;
    while (span && span.className !== "smart-text-enhanced") {
      span = span.parentNode;
    }
    let id, finalOriginalText, finalOriginalHTML;
    if (span && span.className === "smart-text-enhanced") {
      id = span.dataset.id;
      const original = originalTexts.get(id) || {};
      finalOriginalText = original.text || originalText;
      finalOriginalHTML = original.html || span.dataset.originalHtml || originalText;
      span.remove();
    } else {
      id = Date.now().toString();
      finalOriginalText = originalText;
      const clonedContents = range.cloneContents();
      const tempDiv = document.createElement("div");
      tempDiv.appendChild(clonedContents);
      finalOriginalHTML = tempDiv.innerHTML.replace(/\s+/g, " ").trim();
      console.log("Captured original HTML (fallback):", finalOriginalHTML);
    }
    const newSpan = document.createElement("span");
    newSpan.className = "smart-text-enhanced";
    newSpan.textContent = newText;
    newSpan.dataset.id = id;
    newSpan.dataset.original = finalOriginalText;
    newSpan.dataset.originalHtml = finalOriginalHTML;
    newSpan.dataset.current = newText;
    originalTexts.set(id, { text: finalOriginalText, html: finalOriginalHTML });
    try {
      const wrapper = document.createElement("div");
      wrapper.appendChild(newSpan);
      range.deleteContents();
      range.insertNode(wrapper);
      wrapper.replaceWith(...wrapper.childNodes);
      console.log("Text replaced via fallback:", newText);
    } catch (error) {
      console.error("Error replacing text via fallback:", error);
    }
  } else {
    console.error("No text selected for fallback replacement.");
  }
}

function applyUserSettings() {
  chrome.storage.sync.get(["font", "textSize", "enableToolbar"], (data) => {
    const style = document.createElement("style");
    style.id = "smart-text-styles";
    let css = "";
    if (data.font === "opendyslexic") {
      css += `
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('${chrome.runtime.getURL("fonts/OpenDyslexic-Regular.woff")}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
        .smart-text-enhanced {
          font-family: 'OpenDyslexic', sans-serif !important;
          font-weight: normal !important;
        }
      `;
    }
    if (data.textSize) {
      css += `
        .smart-text-enhanced {
          font-size: ${data.textSize}px !important;
        }
      `;
    }
    style.textContent = css;
    const existingStyle = document.getElementById("smart-text-styles");
    if (existingStyle) existingStyle.remove();
    document.head.appendChild(style);
    console.log("Applied user settings:", { font: data.font, textSize: data.textSize, enableToolbar: data.enableToolbar });
  });
}

applyUserSettings();

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "applySettings") {
    applyUserSettings();
  }
});