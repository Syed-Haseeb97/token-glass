import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { formatCompactTokens } from "../utils/format";

interface RollingNumberProps {
  value: number;
  className?: string;
}

export function RollingNumber({ value, className }: RollingNumberProps) {
  const spring = useSpring(value, {
    stiffness: 180,
    damping: 26,
    mass: 0.75,
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const display = useTransform(spring, (latest) => formatCompactTokens(Math.max(0, latest)));

  return <motion.span className={className}>{display}</motion.span>;
}
