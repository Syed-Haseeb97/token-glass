import { motion } from "framer-motion";
import { formatCompactTokens } from "../utils/format";

interface TokenMixBarProps {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
}

export function TokenMixBar({
  inputTokens,
  outputTokens,
  cacheTokens,
}: TokenMixBarProps) {
  const sum = Math.max(1, inputTokens + outputTokens + cacheTokens);
  const inputPct = (inputTokens / sum) * 100;
  const outputPct = (outputTokens / sum) * 100;
  const cachePct = (cacheTokens / sum) * 100;

  const segments = [
    {
      key: "input",
      label: "Input",
      value: inputTokens,
      pct: inputPct,
      barColor: "#0A84FF",
      swatch: "#0A84FF",
    },
    {
      key: "output",
      label: "Output",
      value: outputTokens,
      pct: outputPct,
      barColor: "#30D158",
      swatch: "#30D158",
    },
    {
      key: "cache",
      label: "Cache",
      value: cacheTokens,
      pct: cachePct,
      barColor: "#8E8E93",
      swatch: "#8E8E93",
    },
  ];

  return (
    <div className="glass-inset rounded-[20px] px-4 py-3">
      <div className="glass-bar-bg mb-2.5 flex h-[7px] w-full overflow-hidden rounded-full">
        {segments.map((seg) =>
          seg.value > 0 ? (
            <motion.div
              key={seg.key}
              initial={false}
              animate={{ width: `${Math.max(seg.pct, 2.5)}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ backgroundColor: seg.barColor }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ) : null
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {segments.map((seg) => (
          <div key={seg.key} className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ backgroundColor: seg.swatch }}
              />
              <span className="text-muted text-[11px] font-medium tracking-[-0.01em]">
                {seg.label}
              </span>
            </div>
            <span className="text-ink tabular-nums mt-0.5 text-[13px] font-semibold tracking-[-0.02em]">
              {formatCompactTokens(seg.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
