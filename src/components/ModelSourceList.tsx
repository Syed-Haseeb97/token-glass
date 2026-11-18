import { motion } from "framer-motion";
import type { ModelStat, SourceStat } from "../types/usage";
import { formatCompactTokens, formatModelName, formatUsd } from "../utils/format";

interface ModelSourceListProps {
  models: ModelStat[];
  sources: SourceStat[];
}

export function ModelSourceList({ models, sources }: ModelSourceListProps) {
  const maxModel = models[0]?.tokens || 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {/* Top Models */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span
            className="text-soft text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Top Models
          </span>
          <span
            className="text-soft text-[10px] font-medium"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {models.length} active
          </span>
        </div>

        <div className="apple-scroll flex flex-col gap-1.5 overflow-y-auto pr-0.5">
          {models.length === 0 ? (
            <div className="glass-inset text-muted rounded-[13px] px-3 py-3 text-center text-[12px]">
              No token usage recorded in this period
            </div>
          ) : (
            models.slice(0, 4).map((m) => {
              const fillPct = Math.max(6, Math.min(100, (m.tokens / maxModel) * 100));
              return (
                <div
                  key={m.name}
                  title={`${m.name} · ${m.tokens.toLocaleString("en-US")} tokens`}
                  className="glass-inset relative flex items-center justify-between overflow-hidden rounded-[12px] px-3 py-[7px]"
                >
                  <motion.div
                    initial={false}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ type: "spring", stiffness: 280, damping: 30 }}
                    className="model-fill pointer-events-none absolute inset-y-0 left-0"
                  />
                  <span className="text-ink relative z-10 truncate pr-2 text-[12px] font-medium tracking-[-0.01em]">
                    {formatModelName(m.name)}
                  </span>
                  <span
                    className="text-ink tabular-nums relative z-10 shrink-0 text-[11.5px] font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {formatCompactTokens(m.tokens)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Tools */}
      {sources.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span
              className="text-soft text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Tools
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sources.slice(0, 5).map((src) => (
              <div
                key={src.id}
                title={`${src.label} · ${src.tokens.toLocaleString("en-US")} tokens (${formatUsd(src.costUsd)})`}
                className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-[4px] text-[11px] font-medium"
              >
                <span>{src.label}</span>
                <span
                  className="text-muted tabular-nums text-[10.5px] font-semibold"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatCompactTokens(src.tokens)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
