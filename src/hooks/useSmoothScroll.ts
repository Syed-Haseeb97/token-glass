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

      // Pure fluid momentum interpolation without rubber-band glitches
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

      // Velocity acceleration: rapid successive wheel spins accelerate dynamically up to 3.5x
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
