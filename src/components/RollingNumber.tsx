import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { formatCompactTokens } from "../utils/format";

interface RollingNumberProps {
  value: number;
  className?: string;
}

export function RollingNumber({ value, className }: RollingNumberProps) {
  const isFirst = useRef(true);
  const spring = useSpring(value, {
    stiffness: 280,
    damping: 32,
    mass: 0.65,
  });

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    spring.set(value);
  }, [spring, value]);

  const display = useTransform(spring, (latest) =>
    formatCompactTokens(Math.max(0, latest))
  );

  return <motion.span className={className}>{display}</motion.span>;
}
