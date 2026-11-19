import { useEffect, useRef } from "react";

export function useSmoothScroll<T extends HTMLElement>(deps: any = null) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const contentEl = el.firstElementChild as HTMLElement | null;

    let targetScroll = el.scrollTop;
    let currentScroll = el.scrollTop;
    let overshoot = 0;
    let velocityMultiplier = 1.0;
    let lastWheelTime = 0;
    let lastDirection = 0;
    let isRunning = false;
    let animFrame: number;

    const getMaxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);

    const update = () => {
      const scrollDiff = targetScroll - currentScroll;

      // 1. Smoothly interpolate scrollTop towards targetScroll
      if (Math.abs(scrollDiff) > 0.25) {
        currentScroll += scrollDiff * 0.22;
        el.scrollTop = currentScroll;
      } else {
        currentScroll = targetScroll;
        el.scrollTop = currentScroll;
      }

      // 2. Crisp, fast Apple spring-back for rubber-band overshoot (snappy ~180ms rebound)
      overshoot += (0 - overshoot) * 0.32;

      if (contentEl) {
        if (Math.abs(overshoot) > 0.3) {
          contentEl.style.transform = `translateY(${overshoot.toFixed(2)}px)`;
        } else {
          contentEl.style.transform = "";
          overshoot = 0;
        }
      }

      // Keep running while animating scroll or rebounding rubber-band
      if (Math.abs(scrollDiff) > 0.25 || Math.abs(overshoot) > 0.3) {
        animFrame = requestAnimationFrame(update);
      } else {
        isRunning = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0 && Math.abs(e.deltaY) < 1) return;

      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      const dt = now - lastWheelTime;
      lastWheelTime = now;

      const rawDelta = e.deltaY;
      const dir = Math.sign(rawDelta);

      // Velocity acceleration: rapid successive wheel spins accelerate dynamically up to 3.5x
      if (dt < 130 && dir === lastDirection) {
        velocityMultiplier = Math.min(velocityMultiplier * 1.3 + 0.35, 3.5);
      } else if (dt > 240) {
        velocityMultiplier = 1.0;
      }
      lastDirection = dir;

      // Responsive scaled impulse
      let delta = dir * Math.min(Math.abs(rawDelta), 100) * 0.55 * velocityMultiplier;
      if (e.deltaMode === 1) delta = rawDelta * 28;

      // Check boundary rubber-banding vs smooth scrolling
      if (targetScroll <= 0 && delta < 0) {
        // Already at top and scrolling UP: stretch downward with rubber resistance
        const resistance = 1 - Math.min(1, Math.abs(overshoot) / 28);
        overshoot = Math.min(24, overshoot - delta * 0.25 * resistance);
      } else if (targetScroll >= maxScroll && delta > 0) {
        // Already at bottom and scrolling DOWN: stretch upward with rubber resistance
        const resistance = 1 - Math.min(1, Math.abs(overshoot) / 28);
        overshoot = Math.max(-24, overshoot - delta * 0.25 * resistance);
      } else {
        // Normal scroll region
        const nextTarget = targetScroll + delta;

        if (nextTarget < 0) {
          const excess = -nextTarget;
          targetScroll = 0;
          overshoot = Math.min(18, overshoot + excess * 0.18);
        } else if (nextTarget > maxScroll) {
          const excess = nextTarget - maxScroll;
          targetScroll = maxScroll;
          overshoot = Math.max(-18, overshoot - excess * 0.18);
        } else {
          targetScroll = nextTarget;
        }
      }

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
      if (contentEl) {
        contentEl.style.transform = "";
      }
    };
  }, [deps]);

  return ref;
}
