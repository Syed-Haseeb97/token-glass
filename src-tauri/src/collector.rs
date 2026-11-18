use crate::cache::DailyRecord;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::process::Command;
use tokio::sync::Semaphore;

pub const ALL_SOURCES: &[&str] = &[
    "antigravity",
    "claude",
    "codex",
    "gemini",
    "copilot",
    "opencode",
    "amp",
    "droid",
    "goose",
    "kimi",
    "qwen",
    "kilo",
    "openclaw",
    "hermes",
    "pi",
    "codebuff",
];

pub const PRIORITY_SOURCES: &[&str] = &[
    "antigravity",
    "claude",
    "codex",
    "copilot",
    "opencode",
    "gemini",
];

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn resolve_ccusage_bin() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        if let Some(root) = PathBuf::from(manifest_dir).parent() {
            candidates.push(
                root.join("node_modules")
                    .join("@ccusage")
                    .join("ccusage-win32-x64")
                    .join("bin")
                    .join("ccusage.exe"),
            );
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("ccusage.exe"));
            if let Some(project_root) = dir.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
                candidates.push(
                    project_root
                        .join("node_modules")
                        .join("@ccusage")
                        .join("ccusage-win32-x64")
                        .join("bin")
                        .join("ccusage.exe"),
                );
            }
        }
    }

    candidates.push(PathBuf::from(
        "D:\\projects\\token-glass\\node_modules\\@ccusage\\ccusage-win32-x64\\bin\\ccusage.exe",
    ));

    // Also inspect any installed runtime versions as fallback (read-only)
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let runtime_dir = PathBuf::from(&profile)
            .join(".config")
            .join("uni-social-tokens")
            .join("runtime");
        if let Ok(entries) = std::fs::read_dir(&runtime_dir) {
            let mut versions: Vec<PathBuf> = entries
                .filter_map(|e| e.ok().map(|v| v.path()))
                .filter(|p| p.is_dir())
                .collect();
            versions.sort();
            versions.reverse();
            for v in versions {
                candidates.push(
                    v.join("node_modules")
                        .join("@ccusage")
                        .join("ccusage-win32-x64")
                        .join("bin")
                        .join("ccusage.exe"),
                );
            }
        }
    }

    for candidate in candidates {
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    None
}

fn val_u64(v: &Value, key: &str) -> u64 {
    v.get(key)
        .and_then(|x| x.as_u64().or_else(|| x.as_f64().map(|f| f.max(0.0) as u64)))
        .unwrap_or(0)
}

fn val_f64(v: &Value, key: &str) -> f64 {
    v.get(key)
        .and_then(|x| x.as_f64())
        .filter(|f| f.is_finite() && *f >= 0.0)
        .unwrap_or(0.0)
}

fn is_valid_date(s: &str) -> bool {
    let bytes = s.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[..4].iter().all(|b| b.is_ascii_digit())
        && bytes[5..7].iter().all(|b| b.is_ascii_digit())
        && bytes[8..10].iter().all(|b| b.is_ascii_digit())
}

fn extract_models(day: &Value) -> BTreeMap<String, u64> {
    let mut map = BTreeMap::new();

    // Variant 1: modelBreakdowns array (antigravity, claude, gemini, etc.)
    if let Some(arr) = day.get("modelBreakdowns").and_then(|v| v.as_array()) {
        for item in arr {
            let Some(name) = item.get("modelName").and_then(|v| v.as_str()) else {
                continue;
            };
            let trimmed = name.trim();
            if trimmed.is_empty() || trimmed == "<synthetic>" {
                continue;
            }
            let total = val_u64(item, "totalTokens");
            let tokens = if total > 0 {
                total
            } else {
                val_u64(item, "inputTokens")
                    + val_u64(item, "outputTokens")
                    + val_u64(item, "cacheCreationTokens")
                    + val_u64(item, "cacheReadTokens")
            };
            if tokens > 0 {
                *map.entry(trimmed.to_string()).or_insert(0) += tokens;
            }
        }
        return map;
    }

    // Variant 2: models object map (codex, etc.)
    if let Some(obj) = day.get("models").and_then(|v| v.as_object()) {
        for (name, item) in obj {
            let trimmed = name.trim();
            if trimmed.is_empty() || trimmed == "<synthetic>" {
                continue;
            }
            let total = val_u64(item, "totalTokens");
            let tokens = if total > 0 {
                total
            } else {
                val_u64(item, "inputTokens")
                    + val_u64(item, "outputTokens")
                    + val_u64(item, "cacheCreationTokens")
                    + val_u64(item, "cacheReadTokens")
            };
            if tokens > 0 {
                *map.entry(trimmed.to_string()).or_insert(0) += tokens;
            }
        }
    }

    map
}

fn parse_ccusage_json(source: &str, stdout: &str) -> Option<Vec<DailyRecord>> {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return None;
    }

    // Some ccusage commands may emit leading warnings before the JSON object.
    let json_start = trimmed.find('{')?;
    let parsed: Value = serde_json::from_str(&trimmed[json_start..]).ok()?;
    let daily = parsed.get("daily")?.as_array()?;

    let mut by_date: BTreeMap<String, DailyRecord> = BTreeMap::new();

    for day in daily {
        let date = day
            .get("date")
            .or_else(|| day.get("period"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if !is_valid_date(date) {
            continue;
        }

        let input_tokens = val_u64(day, "inputTokens");
        let output_tokens = val_u64(day, "outputTokens");
        let cache_tokens =
            val_u64(day, "cacheCreationTokens") + val_u64(day, "cacheReadTokens");
        let reported_total = val_u64(day, "totalTokens");
        let total_tokens = if reported_total > 0 {
            reported_total
        } else {
            input_tokens + output_tokens + cache_tokens
        };

        if total_tokens == 0 {
            continue;
        }

        let cost = if day.get("totalCost").is_some() {
            val_f64(day, "totalCost")
        } else {
            val_f64(day, "costUSD")
        };

        let model_usage = extract_models(day);

        let record = DailyRecord {
            date: date.to_string(),
            source: source.to_string(),
            total_tokens,
            input_tokens,
            output_tokens,
            cache_tokens,
            estimated_cost_usd: (cost * 1_000_000.0).round() / 1_000_000.0,
            model_usage,
        };

        let replace = by_date
            .get(date)
            .map(|existing| record.total_tokens >= existing.total_tokens)
            .unwrap_or(true);
        if replace {
            by_date.insert(date.to_string(), record);
        }
    }

    Some(by_date.into_values().collect())
}

async fn collect_one(
    bin: PathBuf,
    source: String,
    since: Option<String>,
    timeout_secs: u64,
) -> Option<Vec<DailyRecord>> {
    let mut cmd = Command::new(&bin);
    cmd.arg(&source)
        .arg("daily")
        .arg("--json")
        .arg("--offline");

    if let Some(ref s) = since {
        cmd.arg("--since").arg(s);
    }

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = tokio::time::timeout(Duration::from_secs(timeout_secs), cmd.output())
        .await
        .ok()?
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_ccusage_json(&source, &stdout)
}

pub async fn collect_sources_streaming<F>(
    sources: &[String],
    since: Option<String>,
    mut on_batch: F,
) -> Result<usize, String>
where
    F: FnMut(Vec<DailyRecord>),
{
    let bin = resolve_ccusage_bin().ok_or_else(|| {
        "ccusage binary not found. Run `npm install` in D:\\projects\\token-glass.".to_string()
    })?;

    let timeout_secs = if since.is_some() { 90 } else { 240 };
    let semaphore = Arc::new(Semaphore::new(4));
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Vec<DailyRecord>>();

    for source in sources {
        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| e.to_string())?;
        let bin_clone = bin.clone();
        let src = source.clone();
        let since_clone = since.clone();
        let tx_clone = tx.clone();

        tokio::spawn(async move {
            let _permit = permit;
            if let Some(rows) = collect_one(bin_clone, src, since_clone, timeout_secs).await {
                if !rows.is_empty() {
                    let _ = tx_clone.send(rows);
                }
            }
        });
    }
    drop(tx);

    let mut total_rows = 0usize;
    while let Some(rows) = rx.recv().await {
        total_rows += rows.len();
        on_batch(rows);
    }

    Ok(total_rows)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_antigravity_and_codex_variants() {
        let ag_json = r#"{
          "daily": [{
            "date": "2026-11-18",
            "inputTokens": 9989932,
            "outputTokens": 482130,
            "cacheCreationTokens": 0,
            "cacheReadTokens": 307224134,
            "totalTokens": 318018379,
            "totalCost": 35.3597775,
            "modelBreakdowns": [{
              "modelName": "gemini-3.8-flash-medium",
              "inputTokens": 8874209,
              "outputTokens": 433976,
              "cacheCreationTokens": 0,
              "cacheReadTokens": 301428010
            }]
          }]
        }"#;

        let ag_rows = parse_ccusage_json("antigravity", ag_json).expect("ag rows");
        assert_eq!(ag_rows.len(), 1);
        assert_eq!(ag_rows[0].total_tokens, 318_018_379);
        assert!((ag_rows[0].estimated_cost_usd - 35.359778).abs() < 0.001);
        assert_eq!(
            ag_rows[0].model_usage.get("gemini-3.8-flash-medium").copied(),
            Some(310_736_195)
        );

        let codex_json = r#"{
          "daily": [{
            "date": "2026-11-18",
            "inputTokens": 3933134,
            "outputTokens": 9495,
            "cacheCreationTokens": 0,
            "cacheReadTokens": 0,
            "totalTokens": 3942629,
            "costUSD": 3.35788115,
            "models": {
              "auto": {
                "totalTokens": 3942629
              }
            }
          }]
        }"#;

        let codex_rows = parse_ccusage_json("codex", codex_json).expect("codex rows");
        assert_eq!(codex_rows.len(), 1);
        assert_eq!(codex_rows[0].total_tokens, 3_942_629);
        assert!((codex_rows[0].estimated_cost_usd - 3.357881).abs() < 0.001);
        assert_eq!(codex_rows[0].model_usage.get("auto").copied(), Some(3_942_629));
    }
}
