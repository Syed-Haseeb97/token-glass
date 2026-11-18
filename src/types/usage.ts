export type TimeframeKey = "today" | "week" | "month" | "allTime";

export interface ModelStat {
  name: string;
  tokens: number;
  share: number;
}

export interface SourceStat {
  id: string;
  label: string;
  tokens: number;
  costUsd: number;
  share: number;
}

export interface PeriodStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  estimatedCostUsd: number;
  activeDays: number;
  topModels: ModelStat[];
  sources: SourceStat[];
}

export interface UsageSnapshot {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  allTime: PeriodStats;
  lastUpdated: string | null;
  syncing: boolean;
  theme: "light" | "dark";
  activeSourcesCount: number;
  error: string | null;
}

export const EMPTY_PERIOD: PeriodStats = {
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheTokens: 0,
  estimatedCostUsd: 0,
  activeDays: 0,
  topModels: [],
  sources: [],
};

export const EMPTY_SNAPSHOT: UsageSnapshot = {
  today: EMPTY_PERIOD,
  week: EMPTY_PERIOD,
  month: EMPTY_PERIOD,
  allTime: EMPTY_PERIOD,
  lastUpdated: null,
  syncing: true,
  theme: "light",
  activeSourcesCount: 0,
  error: null,
};
