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
      barColor: "#24A16A",
      swatch: "#24A16A",
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
    <div className="glass-inset rounded-[16px] px-3.5 py-2.5">
      <div className="glass-bar-bg mb-2 flex h-[6px] w-full overflow-hidden rounded-full">
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
                className="inline-block h-[6px] w-[6px] rounded-[2px]"
                style={{ backgroundColor: seg.swatch }}
              />
              <span className="text-muted text-[10.5px] font-medium tracking-[0.01em]">
                {seg.label}
              </span>
            </div>
            <span
              className="text-ink tabular-nums mt-0.5 text-[12px] font-semibold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {formatCompactTokens(seg.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
