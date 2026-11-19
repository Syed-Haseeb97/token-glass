use crate::cache::{DailyRecord, UsageCache};
use chrono::{Duration, Local, NaiveDate};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStat {
    pub name: String,
    pub tokens: u64,
    pub share: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceStat {
    pub id: String,
    pub label: String,
    pub tokens: u64,
    pub cost_usd: f64,
    pub share: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodStats {
    pub total_tokens: u64,
    pub active_tokens: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_tokens: u64,
    pub estimated_cost_usd: f64,
    pub active_days: usize,
    pub top_models: Vec<ModelStat>,
    pub sources: Vec<SourceStat>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    pub today: PeriodStats,
    pub week: PeriodStats,
    pub month: PeriodStats,
    pub all_time: PeriodStats,
    pub last_updated: Option<String>,
    pub syncing: bool,
    pub theme: String,
    pub active_sources_count: usize,
    pub error: Option<String>,
}

fn source_label(id: &str) -> String {
    match id {
        "antigravity" => "Antigravity".to_string(),
        "claude" => "Claude Code".to_string(),
        "codex" => "Codex".to_string(),
        "gemini" => "Gemini CLI".to_string(),
        "copilot" => "Copilot".to_string(),
        "opencode" => "OpenCode".to_string(),
        "openclaw" => "OpenClaw".to_string(),
        "codebuff" => "Codebuff".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        }
    }
}

fn aggregate_period<'a, I>(records: I) -> PeriodStats
where
    I: Iterator<Item = &'a DailyRecord>,
{
    let mut total_tokens: u64 = 0;
    let mut input_tokens: u64 = 0;
    let mut output_tokens: u64 = 0;
    let mut cache_tokens: u64 = 0;
    let mut estimated_cost_usd: f64 = 0.0;

    let mut active_dates: BTreeSet<String> = BTreeSet::new();
    let mut models_map: BTreeMap<String, u64> = BTreeMap::new();
    let mut sources_tokens: BTreeMap<String, (u64, f64)> = BTreeMap::new();

    for rec in records {
        if rec.total_tokens == 0 {
            continue;
        }
        total_tokens = total_tokens.saturating_add(rec.total_tokens);
        input_tokens = input_tokens.saturating_add(rec.input_tokens);
        output_tokens = output_tokens.saturating_add(rec.output_tokens);
        cache_tokens = cache_tokens.saturating_add(rec.cache_tokens);
        estimated_cost_usd += rec.estimated_cost_usd;
        active_dates.insert(rec.date.clone());

        let entry = sources_tokens.entry(rec.source.clone()).or_insert((0, 0.0));
        entry.0 = entry.0.saturating_add(rec.total_tokens);
        entry.1 += rec.estimated_cost_usd;

        for (model, count) in &rec.model_usage {
            if *count > 0 {
                *models_map.entry(model.clone()).or_insert(0) += *count;
            }
        }
    }

    let model_total: u64 = models_map.values().copied().sum::<u64>().max(total_tokens).max(1);
    let mut top_models: Vec<ModelStat> = models_map
        .into_iter()
        .map(|(name, tokens)| ModelStat {
            name,
            tokens,
            share: (tokens as f64) / (model_total as f64),
        })
        .collect();
    top_models.sort_by(|a, b| b.tokens.cmp(&a.tokens).then_with(|| a.name.cmp(&b.name)));
    top_models.truncate(6);

    let source_denom = total_tokens.max(1) as f64;
    let mut sources: Vec<SourceStat> = sources_tokens
        .into_iter()
        .map(|(id, (tokens, cost_usd))| SourceStat {
            label: source_label(&id),
            id,
            tokens,
            cost_usd: (cost_usd * 100.0).round() / 100.0,
            share: (tokens as f64) / source_denom,
        })
        .collect();
    sources.sort_by(|a, b| b.tokens.cmp(&a.tokens).then_with(|| a.id.cmp(&b.id)));

    PeriodStats {
        total_tokens,
        active_tokens: input_tokens.saturating_add(output_tokens),
        input_tokens,
        output_tokens,
        cache_tokens,
        estimated_cost_usd: (estimated_cost_usd * 100.0).round() / 100.0,
        active_days: active_dates.len(),
        top_models,
        sources,
    }
}

pub fn build_snapshot(
    cache: &UsageCache,
    syncing: bool,
    error: Option<String>,
) -> UsageSnapshot {
    let today_date = Local::now().date_naive();
    let today_str = today_date.format("%Y-%m-%d").to_string();
    let week_start = today_date - Duration::days(6);
    let month_start = NaiveDate::from_ymd_opt(today_date.year(), today_date.month(), 1)
        .unwrap_or(today_date);

    let today = aggregate_period(
        cache
            .records
            .values()
            .filter(|r| r.date == today_str),
    );

    let week = aggregate_period(cache.records.values().filter(|r| {
        NaiveDate::parse_from_str(&r.date, "%Y-%m-%d")
            .map(|d| d >= week_start && d <= today_date)
            .unwrap_or(false)
    }));

    let month = aggregate_period(cache.records.values().filter(|r| {
        NaiveDate::parse_from_str(&r.date, "%Y-%m-%d")
            .map(|d| d >= month_start && d <= today_date)
            .unwrap_or(false)
    }));

    let all_time = aggregate_period(cache.records.values());
    let active_sources_count = all_time.sources.len();

    UsageSnapshot {
        today,
        week,
        month,
        all_time,
        last_updated: cache.last_updated.clone(),
        syncing,
        theme: cache.theme.clone(),
        active_sources_count,
        error,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cache::DailyRecord;

    #[test]
    fn aggregates_today_week_month_and_all_time() {
        let today = Local::now().date_naive();
        let three_days_ago = today - Duration::days(3);
        let forty_days_ago = today - Duration::days(40);

        let mut cache = UsageCache::default();
        let mut m1 = BTreeMap::new();
        m1.insert("gemini-3.8-flash-medium".to_string(), 1000);
        cache.records.insert(
            format!("antigravity:{}", today.format("%Y-%m-%d")),
            DailyRecord {
                date: today.format("%Y-%m-%d").to_string(),
                source: "antigravity".to_string(),
                total_tokens: 1000,
                input_tokens: 200,
                output_tokens: 100,
                cache_tokens: 700,
                estimated_cost_usd: 1.5,
                model_usage: m1,
            },
        );

        let mut m2 = BTreeMap::new();
        m2.insert("claude-sonnet-4-6".to_string(), 500);
        cache.records.insert(
            format!("claude:{}", three_days_ago.format("%Y-%m-%d")),
            DailyRecord {
                date: three_days_ago.format("%Y-%m-%d").to_string(),
                source: "claude".to_string(),
                total_tokens: 500,
                input_tokens: 400,
                output_tokens: 100,
                cache_tokens: 0,
                estimated_cost_usd: 0.75,
                model_usage: m2,
            },
        );

        let mut m3 = BTreeMap::new();
        m3.insert("gpt-6-luna".to_string(), 2500);
        cache.records.insert(
            format!("codex:{}", forty_days_ago.format("%Y-%m-%d")),
            DailyRecord {
                date: forty_days_ago.format("%Y-%m-%d").to_string(),
                source: "codex".to_string(),
                total_tokens: 2500,
                input_tokens: 2000,
                output_tokens: 500,
                cache_tokens: 0,
                estimated_cost_usd: 3.0,
                model_usage: m3,
            },
        );

        let snap = build_snapshot(&cache, false, None);
        assert_eq!(snap.today.total_tokens, 1000);
        assert_eq!(snap.today.active_tokens, 300);
        assert_eq!(snap.week.total_tokens, 1500);
        assert_eq!(snap.all_time.total_tokens, 4000);
        assert_eq!(snap.all_time.active_days, 3);
        assert_eq!(snap.active_sources_count, 3);
        assert_eq!(snap.all_time.top_models[0].name, "gpt-6-luna");
    }
}

use chrono::Datelike;
