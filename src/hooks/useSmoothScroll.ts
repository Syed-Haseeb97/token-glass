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
      const diff = targetScroll - currentScroll;

      // Elastic rubber-band spring back to zero
      overshoot += (0 - overshoot) * 0.16;

      if (contentEl) {
        if (Math.abs(overshoot) > 0.2) {
          contentEl.style.transform = `translateY(${overshoot.toFixed(2)}px)`;
        } else {
          contentEl.style.transform = "";
          overshoot = 0;
        }
      }

      // Smooth scroll interpolation
      if (Math.abs(diff) > 0.25) {
        currentScroll += diff * 0.18;
        el.scrollTop = currentScroll;
      } else {
        currentScroll = targetScroll;
        el.scrollTop = currentScroll;
      }

      // Continue loop while animating or springing back
      if (Math.abs(diff) > 0.25 || Math.abs(overshoot) > 0.2) {
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

      // Velocity acceleration: rapid successive wheel spins accelerate dynamically up to 3.8x
      if (dt < 140 && dir === lastDirection) {
        velocityMultiplier = Math.min(velocityMultiplier * 1.35 + 0.35, 3.8);
      } else if (dt > 260) {
        velocityMultiplier = 1.0;
      }
      lastDirection = dir;

      let delta = rawDelta;
      if (e.deltaMode === 1) {
        delta *= 32;
      } else if (e.deltaMode === 2) {
        delta *= el.clientHeight * 0.7;
      } else {
        // Scale with velocity: fast spinning covers ground rapidly; slow spinning glides gently
        delta = dir * Math.min(Math.abs(rawDelta), 100) * 0.55 * velocityMultiplier;
      }

      const nextTarget = targetScroll + delta;

      // Apple rubber-band overscroll resistance when hitting edges
      if (nextTarget < 0) {
        targetScroll = 0;
        currentScroll = 0;
        el.scrollTop = 0;
        const resistance = 1 - Math.min(1, Math.abs(overshoot) / 36);
        overshoot = Math.min(32, overshoot - delta * 0.38 * resistance);
      } else if (nextTarget > maxScroll) {
        targetScroll = maxScroll;
        currentScroll = maxScroll;
        el.scrollTop = maxScroll;
        const resistance = 1 - Math.min(1, Math.abs(overshoot) / 36);
        overshoot = Math.max(-32, overshoot - delta * 0.38 * resistance);
      } else {
        targetScroll = nextTarget;
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
