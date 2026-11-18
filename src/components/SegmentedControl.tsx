import { motion } from "framer-motion";
import type { TimeframeKey } from "../types/usage";

const TABS: { key: TimeframeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 Days" },
  { key: "month", label: "Month" },
  { key: "allTime", label: "All Time" },
];

interface SegmentedControlProps {
  value: TimeframeKey;
  onChange: (next: TimeframeKey) => void;
}

export function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  return (
    <div
      className="glass-track relative grid grid-cols-4 rounded-[13px] p-[3px]"
      role="tablist"
      aria-label="Usage timeframe"
    >
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`relative z-10 flex h-[28px] cursor-pointer items-center justify-center rounded-[10px] text-[12px] font-medium tracking-[-0.01em] transition-colors duration-200 ${
              active ? "text-ink font-semibold" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="ios-segment-thumb"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 36,
                  mass: 0.7,
                }}
                className="glass-thumb absolute inset-0 -z-10 rounded-[10px]"
              />
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
