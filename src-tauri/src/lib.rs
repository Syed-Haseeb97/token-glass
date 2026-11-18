mod aggregator;
mod cache;
mod collector;
mod hit_test;

use aggregator::{build_snapshot, UsageSnapshot};
use cache::{load_cache, save_cache, UsageCache};
use chrono::{Local, Utc};
use collector::{collect_sources_streaming, ALL_SOURCES, PRIORITY_SOURCES};
use hit_test::{position_bottom_right, start_click_through_watcher, InteractiveRect};
use std::collections::BTreeSet;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex as AsyncMutex;

struct AppState {
    cache: Arc<Mutex<UsageCache>>,
    syncing: Arc<Mutex<bool>>,
    last_error: Arc<Mutex<Option<String>>>,
    interactive_rect: Arc<Mutex<InteractiveRect>>,
    sync_lock: Arc<AsyncMutex<()>>,
}

impl AppState {
    fn snapshot(&self) -> UsageSnapshot {
        let cache = self.cache.lock().unwrap_or_else(|e| e.into_inner());
        let syncing = *self.syncing.lock().unwrap_or_else(|e| e.into_inner());
        let error = self.last_error.lock().unwrap_or_else(|e| e.into_inner()).clone();
        build_snapshot(&cache, syncing, error)
    }
}

fn emit_snapshot(app: &AppHandle, state: &AppState) {
    let snap = state.snapshot();
    let _ = app.emit("usage-updated", &snap);
}

async fn run_sync(app: AppHandle, full: bool) {
    let state = app.state::<AppState>();

    let Ok(_guard) = state.sync_lock.try_lock() else {
        return;
    };

    {
        if let Ok(mut s) = state.syncing.lock() {
            *s = true;
        }
    }
    emit_snapshot(&app, &state);

    let (sources_to_scan, since) = {
        let cache = state.cache.lock().unwrap_or_else(|e| e.into_inner());
        if full {
            let all: Vec<String> = ALL_SOURCES.iter().map(|s| s.to_string()).collect();
            (all, None)
        } else {
            let mut set: BTreeSet<String> = cache.active_sources.iter().cloned().collect();
            for s in PRIORITY_SOURCES {
                set.insert((*s).to_string());
            }
            let today_compact = Local::now().format("%Y%m%d").to_string();
            (set.into_iter().collect(), Some(today_compact))
        }
    };

    let result = collect_sources_streaming(&sources_to_scan, since, |batch| {
        {
            let mut cache = state.cache.lock().unwrap_or_else(|e| e.into_inner());
            let mut active: BTreeSet<String> = cache.active_sources.iter().cloned().collect();
            for rec in batch {
                active.insert(rec.source.clone());
                let key = format!("{}:{}", rec.source, rec.date);
                cache.records.insert(key, rec);
            }
            cache.active_sources = active.into_iter().collect();
            cache.last_updated = Some(Utc::now().to_rfc3339());
            let _ = save_cache(&cache);
        }
        emit_snapshot(&app, &state);
    })
    .await;

    match result {
        Ok(_) => {
            {
                let mut cache = state.cache.lock().unwrap_or_else(|e| e.into_inner());
                cache.last_updated = Some(Utc::now().to_rfc3339());
                let _ = save_cache(&cache);
            }
            if let Ok(mut err) = state.last_error.lock() {
                *err = None;
            }
        }
        Err(msg) => {
            if let Ok(mut err) = state.last_error.lock() {
                *err = Some(msg);
            }
        }
    }

    if let Ok(mut s) = state.syncing.lock() {
        *s = false;
    }
    emit_snapshot(&app, &state);
}

#[tauri::command]
fn get_usage_snapshot(state: State<'_, AppState>) -> UsageSnapshot {
    state.snapshot()
}

#[tauri::command]
async fn refresh_usage(app: AppHandle, full: bool) -> UsageSnapshot {
    run_sync(app.clone(), full).await;
    let state = app.state::<AppState>();
    state.snapshot()
}

#[tauri::command]
fn set_interactive_rect(
    state: State<'_, AppState>,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) {
    if let Ok(mut rect) = state.interactive_rect.lock() {
        *rect = InteractiveRect {
            x,
            y,
            width,
            height,
        };
    }
}

#[tauri::command]
fn set_theme(app: AppHandle, state: State<'_, AppState>, theme: String) -> UsageSnapshot {
    let normalized = if theme == "dark" { "dark" } else { "light" }.to_string();
    {
        let mut cache = state.cache.lock().unwrap_or_else(|e| e.into_inner());
        cache.theme = normalized;
        let _ = save_cache(&cache);
    }
    let snap = state.snapshot();
    let _ = app.emit("usage-updated", &snap);
    snap
}

#[tauri::command]
fn reset_position(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        position_bottom_right(&window);
    }
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Show / Hide Widget", true, None::<&str>)?;
    let refresh_item = MenuItem::with_id(app, "refresh", "Refresh Now", true, None::<&str>)?;
    let theme_item = MenuItem::with_id(app, "theme", "Switch Light / Dark Glass", true, None::<&str>)?;
    let reset_item = MenuItem::with_id(app, "reset_pos", "Anchor Bottom-Right", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Token Glass", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &toggle_item,
            &refresh_item,
            &theme_item,
            &reset_item,
            &sep,
            &quit_item,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("token-glass-tray")
        .menu(&menu)
        .tooltip("Token Glass · AI Token Usage")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => {
                if let Some(win) = app.get_webview_window("main") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        position_bottom_right(&win);
                        let _ = win.show();
                    }
                }
            }
            "refresh" => {
                let handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    run_sync(handle, true).await;
                });
            }
            "theme" => {
                let state = app.state::<AppState>();
                let next_theme = {
                    let mut cache = state.cache.lock().unwrap_or_else(|e| e.into_inner());
                    cache.theme = if cache.theme == "dark" {
                        "light".to_string()
                    } else {
                        "dark".to_string()
                    };
                    let _ = save_cache(&cache);
                    cache.theme.clone()
                };
                let _ = next_theme;
                emit_snapshot(app, &state);
            }
            "reset_pos" => {
                if let Some(win) = app.get_webview_window("main") {
                    position_bottom_right(&win);
                    let _ = win.show();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        position_bottom_right(&win);
                        let _ = win.show();
                    }
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_cache = load_cache();

    let state = AppState {
        cache: Arc::new(Mutex::new(initial_cache)),
        syncing: Arc::new(Mutex::new(false)),
        last_error: Arc::new(Mutex::new(None)),
        interactive_rect: Arc::new(Mutex::new(InteractiveRect::default())),
        sync_lock: Arc::new(AsyncMutex::new(())),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_usage_snapshot,
            refresh_usage,
            set_interactive_rect,
            set_theme,
            reset_position,
            quit_app
        ])
        .setup(|app| {
            setup_tray(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                position_bottom_right(&window);
                let _ = window.set_always_on_top(true);
                let _ = window.show();

                let rect_state = app.state::<AppState>().interactive_rect.clone();
                start_click_through_watcher(window, rect_state);
            }

            // Background live sync loop:
            // 1. Immediate fast today-only sync (lights up the pill in seconds!)
            // 2. Full 16-tool historical backfill immediately after (streams each tool as it finishes)
            // 3. Fast today poll every 60s, full 16-tool historical resync every 30 minutes
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                run_sync(handle.clone(), false).await;
                tokio::time::sleep(Duration::from_secs(1)).await;
                run_sync(handle.clone(), true).await;

                let mut tick: u32 = 0;
                loop {
                    tokio::time::sleep(Duration::from_secs(60)).await;
                    tick = tick.wrapping_add(1);
                    let full = tick % 30 == 0;
                    run_sync(handle.clone(), full).await;
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Token Glass");
}
