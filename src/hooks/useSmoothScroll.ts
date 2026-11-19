import { useEffect, useRef } from "react";

export function useSmoothScroll<T extends HTMLElement>(deps: any = null) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let targetScroll = el.scrollTop;
    let currentScroll = el.scrollTop;
    let isRunning = false;
    let animFrame: number;

    const clamp = (val: number) => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      return Math.max(0, Math.min(val, max));
    };

    const update = () => {
      const diff = targetScroll - currentScroll;
      if (Math.abs(diff) < 0.25) {
        currentScroll = targetScroll;
        el.scrollTop = currentScroll;
        isRunning = false;
        return;
      }

      // Apple fluid exponential decay (lerp factor: 0.15 for butter-smooth momentum)
      currentScroll += diff * 0.15;
      el.scrollTop = currentScroll;
      animFrame = requestAnimationFrame(update);
    };

    const onWheel = (e: WheelEvent) => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      // Normalize delta across different mouse wheels & trackpads on Windows
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        // Line mode
        delta *= 28;
      } else if (e.deltaMode === 2) {
        // Page mode
        delta *= el.clientHeight * 0.6;
      } else {
        // Standard Windows mouse wheel: notched clicks are often ±100 or ±120.
        // Scale to a luxurious ~42px impulse with soft momentum
        if (Math.abs(delta) >= 80) {
          delta = Math.sign(delta) * 44;
        } else {
          delta *= 0.6;
        }
      }

      targetScroll = clamp(targetScroll + delta);

      if (!isRunning) {
        isRunning = true;
        animFrame = requestAnimationFrame(update);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    // Sync state when scrolled or resized
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
