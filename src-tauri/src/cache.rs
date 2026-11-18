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
    // Keep cache cleanly on Drive D inside the project/app data directory.
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let root = PathBuf::from(manifest_dir)
            .parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("D:\\projects\\token-glass"));
        return root.join("data").join("cache.json");
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // When running inside target/debug or target/release during development,
            // resolve up to the project root data directory.
            let candidate = dir
                .parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .map(|p| p.join("data"));
            if let Some(ref c) = candidate {
                if c.parent().map(|p| p.join("package.json").exists()).unwrap_or(false) {
                    return c.join("cache.json");
                }
            }
            return dir.join("data").join("cache.json");
        }
    }

    PathBuf::from("D:\\projects\\token-glass\\data\\cache.json")
}

pub fn load_cache() -> UsageCache {
    let path = cache_file_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => UsageCache::default(),
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
