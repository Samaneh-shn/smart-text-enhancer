chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("translateLanguage", (data) => {
    const language = data.translateLanguage || "Farsi";
    updateContextMenu(language);
  });
});

function updateContextMenu(language) {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.log("No existing context menus to remove:", chrome.runtime.lastError.message);
    }
    try {
      chrome.contextMenus.create({
        id: "translate",
        title: `Translate to ${language}`,
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error creating 'Translate' menu item:", chrome.runtime.lastError.message);
        } else {
          console.log("Created 'Translate to " + language + "' menu item.");
        }
      });

      chrome.contextMenus.create({
        id: "simplify",
        title: "Simplify Text",
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error creating 'Simplify' menu item:", chrome.runtime.lastError.message);
        } else {
          console.log("Created 'Simplify Text' menu item.");
        }
      });

      chrome.contextMenus.create({
        id: "summarize",
        title: "Summarize Text",
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error creating 'Summarize' menu item:", chrome.runtime.lastError.message);
        } else {
          console.log("Created 'Summarize Text' menu item.");
        }
      });

      chrome.contextMenus.create({
        id: "tone_formal",
        title: "Rewrite: Formal Tone",
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error creating 'Formal Tone' menu item:", chrome.runtime.lastError.message);
        } else {
          console.log("Created 'Rewrite: Formal Tone' menu item.");
        }
      });

      chrome.contextMenus.create({
        id: "tone_casual",
        title: "Rewrite: Casual Tone",
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error creating 'Casual Tone' menu item:", chrome.runtime.lastError.message);
        } else {
          console.log("Created 'Rewrite: Casual Tone' menu item.");
        }
      });

      chrome.contextMenus.create({
        id: "revert",
        title: "Revert to Original",
        contexts: ["selection"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error creating 'Revert' menu item:", chrome.runtime.lastError.message);
        } else {
          console.log("Created 'Revert to Original' menu item.");
        }
      });

      console.log("Context menu setup completed.");
    } catch (error) {
      console.error("Error during context menu setup:", error);
    }
  });
}

console.log("Background script loaded and running.");

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked:", info.menuItemId, "on tab:", tab.id);
  const actions = {
    "simplify": simplifyText,
    "translate": translateText,
    "summarize": summarizeText,
    "tone_formal": (text) => toneShiftText(text, "formal"),
    "tone_casual": (text) => toneShiftText(text, "casual"),
    "revert": () => Promise.resolve(null)
  };

  if (actions[info.menuItemId]) {
    if (info.menuItemId === "revert") {
      console.log("Handling revert action for tab:", tab.id);
      chrome.tabs.sendMessage(tab.id, { action: "revert" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending revert message (context menu):", chrome.runtime.lastError.message);
        } else {
          console.log("Revert triggered successfully (context menu)", response);
        }
      });
    } else {
      console.log("Processing text action:", info.menuItemId, "with text:", info.selectionText);
      chrome.tabs.sendMessage(tab.id, { action: "showToolbarForContextMenu", text: info.selectionText, menuItemId: info.menuItemId });
      chrome.tabs.sendMessage(tab.id, { action: "showLoadingOverlay" });
      chrome.tabs.sendMessage(tab.id, { action: "startLoading", menuItemId: info.menuItemId });
      actions[info.menuItemId](info.selectionText).then(result => {
        console.log("Processed result from context menu:", result);
        chrome.tabs.sendMessage(tab.id, { action: "stopLoading", menuItemId: info.menuItemId });
        chrome.tabs.sendMessage(tab.id, { action: "hideLoadingOverlay" });
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: replaceTextInPage,
          args: [result, info.selectionText]
        }, (results) => {
          if (chrome.runtime.lastError) {
            const errorDetail = {
              message: chrome.runtime.lastError.message || "Unknown error",
              stack: chrome.runtime.lastError.stack || "No stack available",
              tabId: tab.id,
              url: tab.url
            };
            console.error("Detailed error injecting replacement script (context menu):", errorDetail);
            chrome.tabs.sendMessage(tab.id, { action: "replaceTextFallback", text: result, originalText: info.selectionText }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Fallback message failed (context menu):", chrome.runtime.lastError.message);
              } else {
                console.log("Fallback replacement triggered successfully (context menu)");
              }
            });
          } else {
            console.log("Text replacement script injected successfully (context menu)");
          }
        });
      }).catch(error => {
        console.error("Error processing text (context menu):", error);
        chrome.tabs.sendMessage(tab.id, { action: "stopLoading", menuItemId: info.menuItemId });
        chrome.tabs.sendMessage(tab.id, { action: "hideLoadingOverlay" });
        chrome.tabs.sendMessage(tab.id, { action: "showError", error: error.message });
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: replaceTextInPage,
          args: ["Error processing text: " + error.message, info.selectionText]
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error("Detailed error injecting replacement script (error case, context menu):", {
              message: chrome.runtime.lastError.message,
              stack: chrome.runtime.lastError.stack || "No stack available",
              tabId: tab.id
            });
          }
        });
      });
    }
  } else {
    console.error("Unknown context menu action:", info.menuItemId);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message in background.js:", request);
  const actions = {
    "simplify": simplifyText,
    "translate": translateText,
    "summarize": summarizeText,
    "tone_formal": (text) => toneShiftText(text, "formal"),
    "tone_casual": (text) => toneShiftText(text, "casual"),
    "applySettings": applySettings,
    "updateTranslateLanguage": updateTranslateLanguage
  };

  if (actions[request.action]) {
    console.log(`Handling action: ${request.action}`);
    if (request.action === "applySettings" || request.action === "updateTranslateLanguage") {
      actions[request.action](request.language);
      sendResponse({ success: true });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          console.error("No active tab found.");
          sendResponse({ error: "No active tab found." });
          return;
        }
        const tabId = tabs[0].id;
        console.log("Sending startLoading for toolbar action:", request.action);
        chrome.tabs.sendMessage(tabId, { action: "startLoading", menuItemId: request.action });
        chrome.tabs.sendMessage(tabId, { action: "showLoadingOverlay" });
        actions[request.action](request.text).then(result => {
          console.log("Processed result for toolbar action:", result);
          chrome.tabs.sendMessage(tabId, { action: "stopLoading", menuItemId: request.action });
          chrome.tabs.sendMessage(tabId, { action: "hideLoadingOverlay" });
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: replaceTextInPage,
            args: [result, request.text]
          }, (results) => {
            if (chrome.runtime.lastError) {
              const errorDetail = {
                message: chrome.runtime.lastError.message || "Unknown error",
                stack: chrome.runtime.lastError.stack || "No stack available",
                tabId: tabId,
                url: tabs[0].url
              };
              console.error("Detailed error injecting replacement script:", errorDetail);
              chrome.tabs.sendMessage(tabId, { action: "replaceTextFallback", text: result, originalText: request.text }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Fallback message failed:", chrome.runtime.lastError.message);
                  sendResponse({ error: `Injection failed: ${chrome.runtime.lastError.message}, fallback failed` });
                } else {
                  console.log("Fallback replacement triggered successfully");
                  sendResponse({ success: true, fallback: true });
                }
              });
            } else {
              console.log("Text replacement script injected successfully");
              sendResponse({ success: true });
            }
          });
        }).catch(error => {
          console.error("Error processing text:", error);
          chrome.tabs.sendMessage(tabId, { action: "stopLoading", menuItemId: request.action });
          chrome.tabs.sendMessage(tabId, { action: "hideLoadingOverlay" });
          chrome.tabs.sendMessage(tabId, { action: "showError", error: error.message });
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: replaceTextInPage,
            args: ["Error processing text: " + error.message, request.text]
          }, (results) => {
            if (chrome.runtime.lastError) {
              console.error("Detailed error injecting replacement script (error case):", {
                message: chrome.runtime.lastError.message,
                stack: chrome.runtime.lastError.stack || "No stack available",
                tabId: tabId
              });
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ success: true });
            }
          });
        });
      });
    }
    return true;
  } else {
    console.error("Unknown action:", request.action);
    sendResponse({ error: "Unknown action: " + request.action });
    return true;
  }
});

function replaceTextInPage(newText) {
  console.log("Executing replaceTextInPage with newText:", newText);
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    console.log("Selection range:", range);

    let span = range.startContainer.parentNode;
    while (span && span.className !== "smart-text-enhanced") {
      span = span.parentNode;
    }

    let id, finalOriginalText, finalOriginalHTML;
    if (span && span.className === "smart-text-enhanced") {
      id = span.dataset.id;
      finalOriginalText = span.dataset.original;
      finalOriginalHTML = span.dataset.originalHtml || finalOriginalText;
      span.remove();
    } else {
      id = Date.now().toString();
      finalOriginalText = selection.toString();
      const clonedContents = range.cloneContents();
      const tempDiv = document.createElement("div");
      tempDiv.appendChild(clonedContents);
      finalOriginalHTML = tempDiv.innerHTML.replace(/\s+/g, " ").trim();
      console.log("Captured original HTML:", finalOriginalHTML);
    }

    const newSpan = document.createElement("span");
    newSpan.className = "smart-text-enhanced";
    newSpan.textContent = newText;
    newSpan.dataset.id = id;
    newSpan.dataset.original = finalOriginalText;
    newSpan.dataset.originalHtml = finalOriginalHTML;
    newSpan.dataset.current = newText;

    try {
      const wrapper = document.createElement("div");
      wrapper.appendChild(newSpan);
      range.deleteContents();
      range.insertNode(wrapper);
      wrapper.replaceWith(...wrapper.childNodes);
      console.log("Text replaced in page:", newText);

      chrome.runtime.sendMessage({
        action: "storeOriginalText",
        id: id,
        originalText: finalOriginalText,
        originalHTML: finalOriginalHTML
      });
    } catch (error) {
      console.error("Error replacing text in page:", error);
    }
  } else {
    console.error("No selection found for text replacement.");
  }
}

function applySettings() {
  console.log("Applying settings...");
}

function updateTranslateLanguage(language) {
  console.log("Updating translate language to:", language);
  updateContextMenu(language);
}

async function simplifyText(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("readingLevel", (data) => {
      const readingLevel = data.readingLevel || "5";
      console.log("Simplifying to reading level:", readingLevel);
      openAIRequest(text, "simplify", readingLevel).then(resolve).catch(reject);
    });
  });
}

async function translateText(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("translateLanguage", (data) => {
      const language = data.translateLanguage || "Farsi";
      console.log("Translating to:", language);
      openAIRequest(text, "translate", language).then(resolve).catch(reject);
    });
  });
}

async function summarizeText(text) {
  return await openAIRequest(text, "summarize");
}

async function toneShiftText(text, tone) {
  return await openAIRequest(text, "tone", tone);
}

async function openAIRequest(text, action, target = null) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) {
    console.error("API key not set.");
    throw new Error("Please set your OpenAI API key in the extension settings.");
  }

  console.log("Using API key (first 5 chars for logging):", apiKey.substring(0, 5) + "...");

  const endpoint = "https://api.openai.com/v1/chat/completions";
  let prompt;
  switch (action) {
    case "simplify":
      prompt = `Simplify the following text to a Grade ${target} reading level: "${text}"`;
      break;
    case "translate":
      prompt = `Translate the following text from English to ${target}: "${text}", ensuring the entire text is translated without summarizing or omitting any parts.`;
      break;
    case "summarize":
      prompt = `Summarize the following text in 1-3 sentences: "${text}"`;
      break;
    case "tone":
      prompt = `Rewrite the following text in a ${target} tone: "${text}"`;
      break;
  }

  const maxRetries = 3;
  let retryCount = 0;
  let delay = 1000;

  while (retryCount < maxRetries) {
    try {
      console.log(`Making OpenAI API request for action: ${action} (Attempt ${retryCount + 1}/${maxRetries})`);
      console.log("Request prompt:", prompt);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant for text processing." },
            { role: "user", content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        if (response.status === 429) {
          retryCount++;
          console.log(`Rate limit hit (429). Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log("API response data:", data);
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("OpenAI API error:", error);
      let friendlyMessage = "Something went wrong. Please try again.";
      if (error.message.includes("Rate limit")) {
        friendlyMessage = "Oops—rate limit hit. Try again in 30s.";
      } else if (error.message.includes("API key")) {
        friendlyMessage = "Missing API key. Please set it in the extension settings.";
      }
      throw new Error(friendlyMessage);
    }
  }

  throw new Error("Oops—rate limit hit. Try again in 30s.");
}