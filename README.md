# Token Glass 🪟✨

> An Apple iOS Liquid Glass floating desktop widget for Windows that tracks your local AI coding agent token consumption in real-time. Built with **Tauri v2**, **React 19**, **Framer Motion**, and **Rust**, powered locally by **`ccusage`**.

[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white)](#)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=black)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#)
[![Rust](https://img.shields.io/badge/Rust-1.85+-DEA584?logo=rust&logoColor=black)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

---

## Highlights

- 🍏 **Apple iOS Liquid Glass Aesthetics:** Frosted translucent glass with specular top-edge refraction, micro-grain frosted texture, crisp tabular typography, and a 1-click toggle between **Frosted Light Glass** and **Smoked Dark Glass**.
- 🧈 **Dynamic Island Spring Physics:** Anchored to the bottom-right corner right above your Windows taskbar. Clicking the compact pill smoothly morphs into an expanded card using Apple spring physics (`stiffness: 420, damping: 32`).
- 👻 **True Click-Through Transparency:** Empty transparent space around the collapsed pill passes all clicks directly through to underlying IDEs, browsers, or desktop apps.
- ⏱️ **4 Granular Timeframes:** Smooth iOS segmented control switching across **Today**, **Last 7 Days**, **This Month**, and **All Time**.
- 📊 **Detailed Breakdowns:** Rolling hero token counters, estimated USD costs, Input / Output / Cache distribution bar, Top Models breakdown, and active tool badges.
- 🔒 **100% Private & Local-First:** No accounts, no cloud sync, no API proxying. Directly parses local session logs via `ccusage` with `CREATE_NO_WINDOW` (zero command prompt flashing).
- 🤫 **Calm & Peaceful:** Strict zero-blink policy — no distracting flashing or pulsing dots.
- 🪶 **Featherweight Footprint:** ~6.7 MB binary size, ~25 MB RAM idle usage.
-  tray **Windows System Tray:** Hidden from taskbar (`skipTaskbar: true`). Left-click tray icon to toggle visibility; right-click for Refresh, Theme switch, Re-anchor, and Quit.

---

## Supported AI Coding Tools (16 Local Agents)

Token Glass auto-detects and aggregates tokens from:
- **Antigravity**
- **Claude Code**
- **Codex CLI**
- **GitHub Copilot CLI**
- **OpenCode**
- **Gemini CLI**
- **Amp**
- **Droid**
- **Goose**
- **Kimi**
- **Qwen**
- **Kilo**
- **OpenClaw**
- **Hermes**
- **Pi Agent**
- **Codebuff**

---

## Architecture

```text
token-glass/
├── src/                          # React 19 Frontend (WebView2)
│   ├── components/
│   │   ├── CollapsedPill.tsx     # Bottom-right curved glass capsule (Today's tokens)
│   │   ├── ExpandedCard.tsx      # iOS card (Header, Segmented Control, Breakdown)
│   │   ├── SegmentedControl.tsx  # Apple sliding-pill tab switcher (Today | 7D | Month | All)
│   │   ├── RollingNumber.tsx     # Smooth spring-animated tabular counter
│   │   ├── TokenMixBar.tsx       # Input / Output / Cache proportional bar
│   │   └── ModelSourceList.tsx   # Top models + active tool badges
│   ├── styles/glass.css          # Multi-layer iOS Liquid Glass design system
│   └── types/usage.ts            # Strongly-typed metrics definitions
├── src-tauri/                    # Native Rust Core (Tauri v2)
│   ├── src/
│   │   ├── hit_test.rs           # Real-time cursor hit-tester for click-through transparency
│   │   ├── collector.rs          # Asynchronous multi-worker ccusage scanner (CREATE_NO_WINDOW)
│   │   ├── aggregator.rs         # Rollups for Today, 7D, Month, and All-Time stats
│   │   ├── cache.rs              # Local cache management (data/cache.json)
│   │   └── lib.rs                # Window placement, system tray, and auto-sync loop
└── scripts/
    └── generate-icons.mjs        # Script generating native Apple-style icons (.ico, .png)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/) (only to install dependencies and build; the finished app does not need Node)
- [Rust](https://www.rust-lang.org/) (stable)
- Windows 10/11 with WebView2 runtime (pre-installed on modern Windows)

### Installation

```powershell
# Clone the repository
git clone https://github.com/Syed-Haseeb97/token-glass.git
cd token-glass

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Production Build

```powershell
# Build standalone release executable
npm run tauri build -- --no-bundle

# Copy the ccusage engine next to the exe so it works on any machine
npm run bundle-ccusage
```

The app looks for `ccusage.exe` next to `token-glass.exe`, then in the project `node_modules`, then on `PATH`. Set `TOKEN_GLASS_CCUSAGE` to point at a specific binary. The usage cache is stored in `%LOCALAPPDATA%\\TokenGlass\\cache.json` (override with `TOKEN_GLASS_DATA_DIR`).

The headline number is input + output tokens. Cache reads are far larger and are shown separately (hover the number for the exact split).

The optimized standalone binary will be generated at:
`src-tauri/target/release/token-glass.exe`

### Silent Windows Startup (Optional)

Double-click `Launch Token Glass.vbs` to launch Token Glass in the background without any terminal window. To start on Windows login, place a shortcut to this script into your Windows Startup folder (`shell:startup`).

---

## Keyboard Shortcuts

- `Escape` — Smoothly collapse the expanded card back into the compact bottom-right glass pill.

---

## License

MIT © [Syed Haseeb](https://github.com/Syed-Haseeb97)
