import { useEffect, useRef, useState } from "react";
import { formatCompactTokens } from "../utils/format";

interface RollingNumberProps {
  value: number;
  className?: string;
  duration?: number;
}

export function RollingNumber({
  value,
  className,
  duration = 450,
}: RollingNumberProps) {
  // Synchronous initial value so there is zero blank-frame delay
  const [display, setDisplay] = useState(() => formatCompactTokens(value));
  const currentValRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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

      // Apple fluid exponential ease-out for rapid initial roll and crisp snap into final value
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
        animFrameRef.current = null;
      }
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
