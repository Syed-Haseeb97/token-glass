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
      className="glass-track relative grid grid-cols-4 rounded-[14px] p-[3px]"
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
            className={`relative z-10 flex h-[29px] cursor-pointer items-center justify-center rounded-[11px] text-[12px] transition-colors duration-150 ${
              active
                ? "text-ink font-semibold tracking-[-0.015em]"
                : "text-muted hover:text-ink font-medium tracking-[-0.01em]"
            }`}
          >
            {active && (
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
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
