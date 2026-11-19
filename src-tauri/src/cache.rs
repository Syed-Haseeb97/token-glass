use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyRecord {
    pub date: String,
    pub source: String,
    pub total_tokens: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_tokens: u64,
    pub estimated_cost_usd: f64,
    #[serde(default)]
    pub model_usage: BTreeMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageCache {
    #[serde(default)]
    pub records: BTreeMap<String, DailyRecord>,
    #[serde(default)]
    pub active_sources: Vec<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub last_updated: Option<String>,
}

fn default_theme() -> String {
    "light".to_string()
}

impl Default for UsageCache {
    fn default() -> Self {
        Self {
            records: BTreeMap::new(),
            active_sources: Vec::new(),
            theme: default_theme(),
            last_updated: None,
        }
    }
}

pub fn cache_file_path() -> PathBuf {
    if let Some(custom) = std::env::var_os("TOKEN_GLASS_DATA_DIR") {
        return PathBuf::from(custom).join("cache.json");
    }
    let base = std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("APPDATA"))
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local").join("share"))
        })
        .unwrap_or_else(std::env::temp_dir);
    base.join("TokenGlass").join("cache.json")
}

/// Old builds kept the cache in <project>/data/cache.json. Read it once if present
/// so existing history is not lost; it is rewritten to the new location on next save.
fn legacy_cache_path() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let root = exe.parent()?.parent()?.parent()?.parent()?;
    let candidate = root.join("data").join("cache.json");
    candidate.is_file().then_some(candidate)
}

pub fn load_cache() -> UsageCache {
    let path = cache_file_path();
    let content = fs::read_to_string(&path).ok().or_else(|| {
        legacy_cache_path().and_then(|p| fs::read_to_string(p).ok())
    });
    match content {
        Some(c) => serde_json::from_str(&c).unwrap_or_default(),
        None => UsageCache::default(),
    }
}

pub fn save_cache(cache: &UsageCache) -> Result<(), String> {
    let path = cache_file_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create data dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(cache)
        .map_err(|e| format!("Failed to serialize cache: {e}"))?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).map_err(|e| format!("Failed to write temp cache: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("Failed to commit cache: {e}"))?;
    Ok(())
}
