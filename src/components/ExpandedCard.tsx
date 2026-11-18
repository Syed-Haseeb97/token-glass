import { ChevronDown, Layers, Moon, RefreshCw, Sun, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { PeriodStats, TimeframeKey, UsageSnapshot } from "../types/usage";
import { SegmentedControl } from "./SegmentedControl";
import { RollingNumber } from "./RollingNumber";
import { TokenMixBar } from "./TokenMixBar";
import { ModelSourceList } from "./ModelSourceList";
import { formatExactTokens, formatRelativeTime, formatUsd } from "../utils/format";

interface ExpandedCardProps {
  snapshot: UsageSnapshot;
  timeframe: TimeframeKey;
  onTimeframeChange: (next: TimeframeKey) => void;
  onCollapse: () => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
  onQuit: () => void;
}

const PERIOD_SUBTITLES: Record<TimeframeKey, string> = {
  today: "Today's usage",
  week: "Last 7 days",
  month: "This month",
  allTime: "All-time tracked",
};

export function ExpandedCard({
  snapshot,
  timeframe,
  onTimeframeChange,
  onCollapse,
  onRefresh,
  onToggleTheme,
  onQuit,
}: ExpandedCardProps) {
  const period: PeriodStats = snapshot[timeframe];
  const isDark = snapshot.theme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 flex h-full w-full flex-col gap-3 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="glass-inset flex h-[32px] w-[32px] items-center justify-center rounded-[11px]">
            <Layers className="text-ink h-[15px] w-[15px]" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-ink text-[14px] font-semibold tracking-[-0.02em]">
              Token Glass
            </span>
            <span className="text-soft text-[11px] font-normal tracking-[-0.01em]">
              {snapshot.syncing ? "Syncing local logs…" : formatRelativeTime(snapshot.lastUpdated)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? "Switch to Frosted Light Glass" : "Switch to Smoked Dark Glass"}
            className="glass-btn flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            {isDark ? (
              <Sun className="h-[13.5px] w-[13.5px]" strokeWidth={2.1} />
            ) : (
              <Moon className="h-[13.5px] w-[13.5px]" strokeWidth={2.1} />
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={snapshot.syncing}
            title="Refresh all local AI tools"
            className="glass-btn flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={`h-[13px] w-[13px] transition-transform duration-500 ${
                snapshot.syncing ? "rotate-180" : ""
              }`}
              strokeWidth={2.1}
            />
          </button>

          <button
            type="button"
            onClick={onCollapse}
            title="Collapse to corner pill (or press Escape)"
            className="glass-btn flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <ChevronDown className="h-[14.5px] w-[14.5px]" strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={onQuit}
            title="Close Token Glass"
            className="glass-btn flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full transition-colors hover:text-red-400"
          >
            <X className="h-[13.5px] w-[13.5px]" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* iOS Segmented Control */}
      <SegmentedControl value={timeframe} onChange={onTimeframeChange} />

      {/* Hero Metric Card */}
      <div
        className="glass-inset rounded-[20px] px-4 py-3.5"
        title={`${formatExactTokens(period.totalTokens)} exact tokens`}
      >
        <div className="flex items-center justify-between">
          <span className="text-muted text-[12px] font-medium tracking-[-0.01em]">
            {PERIOD_SUBTITLES[timeframe]}
          </span>
          <span className="glass-chip tabular-nums rounded-full px-2.5 py-[3px] text-[11px] font-medium tracking-[-0.01em]">
            {formatUsd(period.estimatedCostUsd)} est.
          </span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <RollingNumber
              value={period.totalTokens}
              className="text-ink tabular-nums text-[32px] leading-tight font-bold tracking-[-0.04em]"
            />
            <span className="text-muted text-[13px] font-medium tracking-[-0.01em]">
              tokens
            </span>
          </div>

          {timeframe !== "today" && (
            <span className="text-soft tabular-nums text-[11px] font-medium tracking-[-0.01em]">
              {period.activeDays} {period.activeDays === 1 ? "day" : "days"}
            </span>
          )}
        </div>
      </div>

      {/* Token Mix Bar */}
      <TokenMixBar
        inputTokens={period.inputTokens}
        outputTokens={period.outputTokens}
        cacheTokens={period.cacheTokens}
      />

      {/* Animated Section Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={timeframe}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <ModelSourceList models={period.topModels} sources={period.sources} />
        </motion.div>
      </AnimatePresence>

      {snapshot.error && (
        <div className="glass-error rounded-[12px] px-3 py-2 text-[11px] font-medium">
          {snapshot.error}
        </div>
      )}
    </motion.div>
  );
}
