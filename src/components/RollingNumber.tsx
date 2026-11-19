import { useEffect, useRef, useState } from "react";
import { formatCompactTokens } from "../utils/format";

interface RollingNumberProps {
  value: number;
  className?: string;
}

export function RollingNumber({ value, className }: RollingNumberProps) {
  // Always render the formatted value immediately on initial mount so there is zero blank-frame delay
  const [display, setDisplay] = useState(() => formatCompactTokens(value));
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setDisplay(formatCompactTokens(value));
    }
  }, [value]);

  return <span className={className}>{display}</span>;
}

