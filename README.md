# 🔍 Smart Text Enhancer

**Smart Text Enhancer** is a Chrome extension powered by **OpenAI’s GPT-3.5-turbo** that lets you simplify, translate, summarize, and rephrase text directly on any webpage — with accessibility-friendly options and a choice between a right-click context menu or a floating toolbar.

---

## ✨ Features

- 🧠 **AI-Powered Text Actions**  
  - **Simplify** text to a specific grade reading level (3, 5, 7, or 9)  
  - **Translate** into Farsi, Spanish, French, German, Chinese, Japanese, or Arabic  
  - **Summarize** long passages into 1–3 sentences  
  - **Rephrase** in a **Formal** or **Casual** tone  
  - **Revert** enhanced text back to the original anytime

- 🖱️ **Right-Click Context Menu**  
  Quickly access every transformation with your mouse’s context menu.

- 🧰 **Floating Toolbar (Optional)**  
  Highlight text and an inline toolbar appears for single-click actions.

- 🪄 **Accessibility Customization**  
  - OpenDyslexic font support  
  - Adjustable enhanced-text size  
  - Settings auto-saved via Chrome Sync

---

## 🛠️ Installation & Setup

1. **Clone or download** this repository.  
2. Open Chrome and navigate to `chrome://extensions`.  
3. Enable **Developer mode** (toggle in the top-right).  
4. Click **Load unpacked** and select the project folder.  
5. The extension is now installed.

---

## 🔧 Configuration

1. Click the extension icon to open the **Settings Popup**.  
2. Enter your [OpenAI API Key](https://platform.openai.com/account/api-keys).  
3. Choose your **Translate To** language, **Reading Level**, **Font**, and **Text Size**.  
4. Toggle the **Floating Toolbar** on or off.  
5. Click **Save** — your preferences apply immediately and persist across sessions.

---

## 🧬 Usage

### ➤ 1. Context Menu

1. Select any text on a webpage.  
2. Right-click to reveal:
   - **Translate to _[Language]_**  
   - **Simplify Text**  
   - **Summarize Text**  
   - **Rewrite: Formal Tone**  
   - **Rewrite: Casual Tone**  
   - **Revert to Original**

### ➤ 2. Floating Toolbar

1. Highlight text.  
2. An inline toolbar appears below your selection.  
3. Click the desired action button.  
4. The extension shows a loading overlay, then replaces your selection with the AI-enhanced result.

---

## 📂 Project Structure

```
smart-text-enhancer/          # Root folder
├── background.js             # Service worker: context menus & API calls
├── content.js                # Content script: toolbar, selection, DOM updates
├── popup.html                # Settings UI
├── popup.js                  # Popup logic & Chrome storage
├── styles.css                # Toolbar & enhanced-text styling
├── manifest.json             # Extension metadata & permissions
├── icons/                    # Extension icons (48×48, 128×128, collapse/expand)
└── fonts/                    # OpenDyslexic font for accessibility
```

---

## 🔐 Privacy & Security

- API key is stored securely in `chrome.storage.sync`.  
- No user text or data is stored locally or sent anywhere except OpenAI’s API.  
- All transformations occur on demand — you remain in control.

---

## 🚀 Roadmap

- [ ] Voice-to-text enhancements  
- [ ] Auto language detection & translation  
- [ ] Save or export enhanced snippets

---

## 📄 License

Released under the **MIT License** © 2025 Samaneh Shirinnezhad.

---

## 🙌 Acknowledgements

- [OpenAI](https://openai.com) for the GPT API  
- [OpenDyslexic](https://opendyslexic.org/) for the dyslexia-friendly font

---

## 📷 Preview

![smart-text-enhancer](https://github.com/user-attachments/assets/1f06e5cb-f4d7-4a5e-95d7-546cab8b7218)


