# Apple iOS Liquid Glass UI & Animation Master Specification
> **Universal Blueprint for Frameless Desktop Widgets & Glassmorphic Interfaces**
> Feed this entire document to any AI agent or frontend developer to replicate this exact design system, animation physics, and transparent desktop window behavior.

---

## 1. Visual Design Philosophy & Aesthetics

This design system combines **Apple iOS Liquid Glass (Obsidian & Frosted Material Systems)** with surgical technical precision. It is designed specifically to look immaculate on top of any wallpaper or background without visual artifacts, dirty halos, or jitter.

### 1.1 Strict Color & Material Palettes

#### A. Smoked Obsidian Dark Glass (Pure Neutral Apple iOS)
* **Goal**: A deep, neutral, translucent glass surface with zero purple, blue, or muddy gray tint.
* **Backdrop Filter**: `backdrop-filter: blur(36px) saturate(180%); -webkit-backdrop-filter: blur(36px) saturate(180%);`
* **Surface Gradient**:
  ```css
  background: linear-gradient(
    165deg,
    rgba(32, 32, 35, 0.65) 0%,
    rgba(22, 22, 24, 0.58) 50%,
    rgba(14, 14, 16, 0.68) 100%
  );
  ```
* **Specular Rim Lighting & Hairline Border**:
  ```css
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 0 rgba(255, 255, 255, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.18);
  ```
* **Top Specular Flare (`::before` pseudo-element)**:
  ```css
  background: radial-gradient(
    120% 60% at 20% 0%,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.03) 50%,
    transparent 80%
  );
  ```
* **Typography & Contrast Colors**:
  - Primary text / ink: `#ffffff`
  - Muted secondary text: `rgba(235, 235, 245, 0.65)`
  - Soft tertiary labels: `rgba(235, 235, 245, 0.42)`
  - Inset card background: `rgba(255, 255, 255, 0.065)` with hairline border `0 0 0 0.5px rgba(255, 255, 255, 0.07)`
  - Buttons & interactive chips: `rgba(255, 255, 255, 0.08)` hover: `rgba(255, 255, 255, 0.16)`
  - Track background: `rgba(0, 0, 0, 0.32)`
  - Active segment thumb: `rgba(255, 255, 255, 0.22)` with backdrop blur `blur(20px)`

#### B. Frosted Light Glass
* **Surface Gradient**:
  ```css
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.88) 0%,
    rgba(245, 245, 247, 0.82) 50%,
    rgba(235, 235, 240, 0.86) 100%
  );
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 0 rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.12);
  ```
* **Text & Contrast**: Primary ink `#000000`, secondary `rgba(60, 60, 67, 0.75)`, soft `rgba(60, 60, 67, 0.50)`.

---

### 1.2 The "No-Halo" Rule for Transparent Desktop Windows
> [!CAUTION]
> **CRITICAL WINDOWS DWM RULE**: Never use heavy black outer CSS drop shadows (e.g. `box-shadow: 0 20px 48px rgba(0,0,0,0.65)`) on transparent frameless webview windows.
> Windows DWM per-pixel alpha blending renders black blurred pixels as dirty, dark muddy halos/smudges on the user's wallpaper.
> **The Remedy**: Always rely exclusively on crisp **1px specular hairline borders** (`0 0 0 1px rgba(255, 255, 255, 0.18)`) and **inner specular highlights** (`inset 0 1px 0 0 ...`). The outer canvas remains 100% transparent (`opacity: 0`), producing razor-sharp, crystal-clear glass floating over any wallpaper.

---

### 1.3 Strict Prohibition on Blinking Elements
> [!IMPORTANT]
> **NO BLINKING / PULSING INDICATORS**: Never use `animate-pulse`, `animate-ping`, or flashing dots on status badges, pills, or legends. All indicators, color swatches, and badges must remain completely static, clean, and calm.

---

## 2. Typography & Tabular Numerals

* **Font Stack**:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif;
  ```
* **Tabular Numbers (Mandatory for counters and metrics)**:
  Prevents layout shifts and jitter when numbers tick up or down.
  ```css
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "cv05" 1;
  }
  ```
* **Hierarchy**:
  - Major Metric Hero: `text-[30px] font-bold tracking-[-0.04em] leading-tight`
  - Card Titles: `text-[14px] font-semibold tracking-[-0.02em]`
  - Eyebrow / Section Headers: `text-[10.5px] font-semibold uppercase tracking-[0.05em]`
  - Segment Tabs & Controls: `text-[12px] font-medium tracking-[-0.01em]`
  - Data Rows / Model Names: `text-[12px] font-medium tracking-[-0.015em]`

---

## 3. Motion & Animation Physics System

### 3.1 Morphing Spring Physics (Expand & Collapse)
When transforming between the compact corner pill and the expanded dashboard:

```ts
export const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 440,
  damping: 36,
  mass: 0.7,
};
```

#### The Zero-Blank-Flash & Anchored Bottom-Right Rule
* **The Problem**: If you center the collapsed pill inside a morphing box that shrinks from 518px to 56px, the content awkwardly flies down from the center, creating layout jumpiness.
* **The Solution**: 
  1. The outer glass surface has `transformOrigin: "bottom right"`.
  2. The collapsed pill is pinned to `position: absolute; right: 0; bottom: 0; width: 198px; height: 56px;`.
  3. When collapsing, the expanded card fades out (`duration: 0.15s`) while the collapsed pill (already sitting at `right: 0, bottom: 0`) fades in (`duration: 0.15s`).
  4. The container smoothly springs shut to envelop the pill. There is zero blank frame, zero jump, and zero delay.

---

### 3.2 Rapid 450ms Slot-Machine Odometer Count-Up
Numbers dynamically roll into place rather than statically snapping, catching the eye with high-velocity excitement:

```tsx
import { useEffect, useRef, useState } from "react";
import { formatCompactTokens } from "../utils/format";

export function RollingNumber({ value, className, duration = 450 }: { value: number; className?: string; duration?: number }) {
  // Synchronous first-frame paint guarantees ZERO blank flicker
  const [display, setDisplay] = useState(() => formatCompactTokens(value));
  const currentValRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const startVal = isFirstMount.current ? 0 : currentValRef.current;
    isFirstMount.current = false;
    const targetVal = value;

    if (startVal === targetVal) {
      currentValRef.current = targetVal;
      setDisplay(formatCompactTokens(targetVal));
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Apple fluid exponential ease-out: rapid initial spin, smooth deceleration
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + (targetVal - startVal) * ease);

      currentValRef.current = current;
      setDisplay(formatCompactTokens(current));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentValRef.current = targetVal;
        setDisplay(formatCompactTokens(targetVal));
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
```

---

### 3.3 Segmented Control Thumb Glide
Using Framer Motion `layoutId`, the white glass capsule slides under the active tab with native Apple inertia:

```tsx
<motion.span
  layoutId="ios-segment-thumb"
  transition={{
    type: "spring",
    stiffness: 480,
    damping: 36,
    mass: 0.65,
  }}
  className="glass-thumb absolute inset-0 -z-10 rounded-[11px]"
/>
```

---

## 4. Apple Momentum Inertial Scroll Engine

Windows mouse wheels send stepped 100–120px jumps per notch. In a 200px widget, this skips content abruptly. CSS `scroll-behavior: smooth` does not intercept notched mouse wheel ticks in Chromium/WebView2.

### 4.1 The Custom Inertial Scroll Hook (`useSmoothScroll.ts`)
This hook intercepts mouse wheel events, applies velocity acceleration, and smoothly glides to the boundaries with zero visible scrollbar:

```ts
import { useEffect, useRef } from "react";

export function useSmoothScroll<T extends HTMLElement>(deps: any = null) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let targetScroll = el.scrollTop;
    let currentScroll = el.scrollTop;
    let velocityMultiplier = 1.0;
    let lastWheelTime = 0;
    let lastDirection = 0;
    let isRunning = false;
    let animFrame: number;

    const getMaxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);
    const clamp = (val: number, max: number) => Math.max(0, Math.min(val, max));

    const update = () => {
      const scrollDiff = targetScroll - currentScroll;

      // Pure fluid exponential decay momentum (diff * 0.22 per frame)
      if (Math.abs(scrollDiff) > 0.25) {
        currentScroll += scrollDiff * 0.22;
        el.scrollTop = currentScroll;
        animFrame = requestAnimationFrame(update);
      } else {
        currentScroll = targetScroll;
        el.scrollTop = currentScroll;
        isRunning = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      const dt = now - lastWheelTime;
      lastWheelTime = now;

      const rawDelta = e.deltaY;
      const dir = Math.sign(rawDelta);

      // Velocity acceleration: rapid successive spins scale up to 3.5x
      if (dt < 130 && dir === lastDirection) {
        velocityMultiplier = Math.min(velocityMultiplier * 1.3 + 0.35, 3.5);
      } else if (dt > 240) {
        velocityMultiplier = 1.0;
      }
      lastDirection = dir;

      let delta = dir * Math.min(Math.abs(rawDelta), 100) * 0.55 * velocityMultiplier;
      if (e.deltaMode === 1) delta = rawDelta * 28;

      targetScroll = clamp(targetScroll + delta, maxScroll);

      if (!isRunning) {
        isRunning = true;
        animFrame = requestAnimationFrame(update);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    const onScroll = () => {
      if (!isRunning) {
        currentScroll = el.scrollTop;
        targetScroll = el.scrollTop;
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animFrame);
    };
  }, [deps]);

  return ref;
}
```

### 4.2 Universal Scrollbar Suppression
Eliminates ugly Windows scrollbar thumbs across all webview elements:

```css
*::-webkit-scrollbar {
  display: none !important;
  width: 0px !important;
  height: 0px !important;
  background: transparent !important;
}

*,
*::before,
*::after {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.apple-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: auto; /* Required: prevents CSS from fighting requestAnimationFrame */
  -webkit-overflow-scrolling: touch;
}
```

---

## 5. Desktop Widget Integration (Tauri v2 + Windows DWM)

### 5.1 Window Attributes (`tauri.conf.json`)
```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Token Glass",
        "width": 408,
        "height": 532,
        "resizable": false,
        "fullscreen": false,
        "decorations": false,
        "transparent": true,
        "shadow": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visible": false,
        "focus": false
      }
    ]
  }
}
```

### 5.2 Click-Through & Outside-Click Minimize (`hit_test.rs`)
1. **Click-Through When Collapsed**: Mouse events pass through transparent regions to the desktop via `window.set_ignore_cursor_events(!inside)`.
2. **Click Outside to Minimize**: Detects physical left clicks (`GetAsyncKeyState(VK_LBUTTON)`) landing outside the expanded card and collapses back to the pill:

```rust
#[cfg(windows)]
fn is_left_mouse_down() -> bool {
    #[link(name = "user32")]
    extern "system" {
        fn GetAsyncKeyState(v_key: i32) -> i16;
    }
    const VK_LBUTTON: i32 = 0x01;
    unsafe { (GetAsyncKeyState(VK_LBUTTON) as u16 & 0x8000) != 0 }
}

// In hit_test loop:
if rect.width > 250.0 && !inside {
    let mouse_down = is_left_mouse_down();
    if mouse_down && !was_outside_mouse_down {
        let _ = window.emit("collapse-requested", ());
    }
    was_outside_mouse_down = mouse_down;
} else {
    was_outside_mouse_down = false;
}
```

### 5.3 Single-Instance Mutex (`main.rs`)
Prevents duplicate instances when launched repeatedly:

```rust
#[cfg(windows)]
fn check_single_instance() -> bool {
    #[link(name = "kernel32")]
    extern "system" {
        fn CreateMutexW(lp_mutex_attributes: *const core::ffi::c_void, b_initial_owner: i32, lp_name: *const u16) -> *mut core::ffi::c_void;
        fn GetLastError() -> u32;
    }
    const ERROR_ALREADY_EXISTS: u32 = 183;
    let name: Vec<u16> = "Local\\TokenGlassSingletonMutex\0".encode_utf16().collect();
    unsafe {
        let handle = CreateMutexW(core::ptr::null(), 0, name.as_ptr());
        if handle.is_null() || GetLastError() == ERROR_ALREADY_EXISTS {
            return false;
        }
    }
    true
}
```

---

## 6. One-Click Bundling & Distribution Checklist

1. **Embedding Frontend Assets**: Always build using `npx tauri build --no-bundle` or `npx tauri build --bundles nsis`. Never build with raw `cargo build --release` (which expects a dev server at `127.0.0.1:1420`).
2. **Resource Bundling**: Put sidecars/CLIs in `src-tauri/resources/` and declare `"resources": ["resources/*"]` in `tauri.conf.json`.
3. **Installer Configuration**:
   ```json
   "bundle": {
     "active": true,
     "targets": ["nsis"],
     "windows": {
       "nsis": {
         "installMode": "currentUser"
       }
     }
   }
   ```
   `currentUser` mode ensures **zero Administrator UAC prompts** during installation on any Windows PC.
