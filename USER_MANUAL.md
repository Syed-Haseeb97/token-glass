# Token Glass — User Manual & Setup Guide

**Apple iOS Liquid Glass Floating AI Token Tracker for Windows**

---

## 1. Quick Start Installation

You only need **one file** to set up Token Glass on any Windows 10/11 computer:

### 📦 Installer File
* **File**: `Token-Glass-Setup.exe` (3.5 MB)
* **Location on your machine**: `D:\projects\Token-Glass-Setup.exe` (or `D:\projects\token-glass\dist-installer\Token-Glass-Setup.exe`)

### ⚡ Installation Steps
1. Send or copy `Token-Glass-Setup.exe` to any Windows computer.
2. Double-click **`Token-Glass-Setup.exe`**.
3. The installer runs in seconds:
   - **No Administrator rights required** (installs safely in user profile).
   - Creates a **Desktop shortcut** with the custom Token Glass icon.
   - Creates a **Start Menu** entry.
   - Automatically launches Token Glass in the bottom-right corner above your taskbar.

---

## 2. Controls & Gestures

| Action | How to Do It | What Happens |
| :--- | :--- | :--- |
| **Expand Widget** | Click anywhere on the corner pill | Springs open into the full glass dashboard showing usage metrics, model mix, and active tools. |
| **Dismiss / Minimize** | Click **anywhere outside** the card (or press <kbd>Esc</kbd>) | Automatically morphs smoothly back into the compact bottom-right pill. |
| **Scroll Models & Tools** | Rotate / flick your mouse wheel | Apple-style momentum inertial scrolling with zero visible scrollbar. Fast wheel spins accelerate up to 3.5×. |
| **Switch Timeframes** | Click **Today**, **7 Days**, **Month**, or **All Time** | Glides the segmented thumb and rapidly spins the numbers into place with a 450ms slot-machine roll. |
| **Theme Toggle** | Click the **Sun / Moon** icon in the header | Toggles between **Smoked Obsidian Glass** (neutral dark) and **Frosted Light Glass**. |
| **Force Refresh** | Click the **Sync** icon in the header | Scans all local agent and CLI session logs immediately. |
| **Quit App** | Click the **`X`** button or right-click system tray icon | Completely closes the application. |

---

## 3. Supported AI Developer Tools

Token Glass automatically detects, parses, and aggregates token usage across **16 developer tools**:

* **Google Antigravity**
* **Claude Code**
* **Codex CLI**
* **Google Gemini CLI**
* **GitHub Copilot**
* **OpenCode**
* **Cursor / Windsurf**
* **OpenClaw**, **Hermes**, **Codebuff**, and more.

---

## 4. Privacy & Offline Architecture

* **100% Local**: Token Glass never sends your code, prompts, or token counts to any third-party server.
* **Direct Log Parsing**: It reads your local CLI databases and log files on disk using the bundled portable engine (`ccusage.exe`).
* **Zero Overhead**: When collapsed, mouse clicks pass directly through to your desktop or background windows.
