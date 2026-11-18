export function formatCompactTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000_000) {
    const n = value / 1_000_000_000;
    return `${n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    const n = value / 1_000_000;
    return `${n >= 100 ? n.toFixed(1) : n >= 10 ? n.toFixed(1) : n.toFixed(2)}M`;
  }
  if (value >= 1_000) {
    const n = value / 1_000;
    return `${n >= 100 ? n.toFixed(0) : n.toFixed(1)}K`;
  }
  return Math.round(value).toLocaleString("en-US");
}

export function formatExactTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Math.round(value).toLocaleString("en-US");
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  if (value >= 1000) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Scanning...";
  const diffSec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (Number.isNaN(diffSec)) return "Updated";
  if (diffSec < 15) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatModelName(name: string): string {
  return name
    .replace(/^models\//i, "")
    .replace(/^anthropic\//i, "")
    .replace(/^openai\//i, "")
    .replace(/^google\//i, "");
}
