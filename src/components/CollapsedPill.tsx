import { ChevronUp, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { RollingNumber } from "./RollingNumber";
import { formatExactTokens, formatUsd } from "../utils/format";

interface CollapsedPillProps {
  todayTokens: number;
  todayCostUsd: number;
  syncing: boolean;
  hasSynced: boolean;
  onExpand: () => void;
}

export function CollapsedPill({
  todayTokens,
  todayCostUsd,
  syncing,
  hasSynced,
  onExpand,
}: CollapsedPillProps) {
  const showInitialSync = syncing && !hasSynced && todayTokens === 0;

  return (
    <motion.button
      type="button"
      onClick={onExpand}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.965 }}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      title={`Today: ${formatExactTokens(todayTokens)} tokens (${formatUsd(todayCostUsd)} est.) — Click to expand`}
      className="relative z-10 flex h-full w-full cursor-pointer items-center justify-between gap-2.5 px-3.5 text-left outline-none"
    >
      <div className="flex items-center gap-2.5">
        <div className="glass-inset flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[11px]">
          <Layers className="text-ink h-[15px] w-[15px]" strokeWidth={2.1} />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-soft text-[9.5px] font-semibold uppercase tracking-[0.09em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Today
          </span>
          <div className="mt-[3px] flex items-baseline gap-1">
            {showInitialSync ? (
              <span className="text-muted text-[13.5px] font-medium tracking-[-0.01em]">
                Syncing…
              </span>
            ) : (
              <>
                <RollingNumber
                  value={todayTokens}
                  className="text-ink tabular-nums text-[17px] font-semibold tracking-[-0.025em]"
                />
                <span
                  className="text-muted text-[10px] font-medium"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  tok
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="glass-btn flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-colors">
        <ChevronUp className="h-[14px] w-[14px]" strokeWidth={2.2} />
      </div>
    </motion.button>
  );
}
