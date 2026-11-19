use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{PhysicalPosition, WebviewWindow};

#[derive(Debug, Clone, Copy)]
pub struct InteractiveRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Default for InteractiveRect {
    fn default() -> Self {
        Self {
            x: 190.0,
            y: 456.0,
            width: 198.0,
            height: 56.0,
        }
    }
}

#[cfg(windows)]
fn get_work_area() -> Option<(i32, i32, i32, i32)> {
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};

    let mut rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let ok = unsafe {
        SystemParametersInfoW(
            SPI_GETWORKAREA,
            0,
            &mut rect as *mut RECT as *mut core::ffi::c_void,
            0,
        )
    };
    if ok != 0 {
        Some((rect.left, rect.top, rect.right, rect.bottom))
    } else {
        None
    }
}

#[cfg(not(windows))]
fn get_work_area() -> Option<(i32, i32, i32, i32)> {
    None
}

#[cfg(windows)]
fn get_cursor_pos() -> Option<(i32, i32)> {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;

    let mut pt = POINT { x: 0, y: 0 };
    let ok = unsafe { GetCursorPos(&mut pt) };
    if ok != 0 {
        Some((pt.x, pt.y))
    } else {
        None
    }
}

#[cfg(not(windows))]
fn get_cursor_pos() -> Option<(i32, i32)> {
    None
}

pub fn position_bottom_right(window: &WebviewWindow) {
    let scale = window.scale_factor().unwrap_or(1.0);
    let win_size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new((408.0 * scale) as u32, (532.0 * scale) as u32));

    let edge_gap = (6.0 * scale).round() as i32;

    if let Some((_left, _top, right, bottom)) = get_work_area() {
        let x = right - (win_size.width as i32) - edge_gap;
        let y = bottom - (win_size.height as i32) - edge_gap;
        let _ = window.set_position(PhysicalPosition::new(x, y));
        return;
    }

    if let Ok(Some(monitor)) = window.primary_monitor() {
        let m_size = monitor.size();
        let m_pos = monitor.position();
        let taskbar_fallback = (48.0 * scale).round() as i32;
        let x = m_pos.x + (m_size.width as i32) - (win_size.width as i32) - edge_gap;
        let y = m_pos.y + (m_size.height as i32) - (win_size.height as i32) - taskbar_fallback;
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}

#[cfg(windows)]
fn is_left_mouse_down() -> bool {
    #[link(name = "user32")]
    extern "system" {
        fn GetAsyncKeyState(v_key: i32) -> i16;
    }
    const VK_LBUTTON: i32 = 0x01;
    unsafe { (GetAsyncKeyState(VK_LBUTTON) as u16 & 0x8000) != 0 }
}

#[cfg(not(windows))]
fn is_left_mouse_down() -> bool {
    false
}

pub fn start_click_through_watcher(
    window: WebviewWindow,
    rect_state: Arc<Mutex<InteractiveRect>>,
) {
    tauri::async_runtime::spawn(async move {
        let mut last_ignored: Option<bool> = None;
        let mut was_outside_mouse_down = false;

        loop {
            tokio::time::sleep(Duration::from_millis(30)).await;

            if !window.is_visible().unwrap_or(false) {
                continue;
            }

            let Some((cx, cy)) = get_cursor_pos() else {
                continue;
            };
            let Ok(pos) = window.outer_position() else {
                continue;
            };
            let scale = window.scale_factor().unwrap_or(1.0);
            let rect = match rect_state.lock() {
                Ok(guard) => *guard,
                Err(_) => continue,
            };

            let pad = 3.0;
            let min_x = pos.x as f64 + (rect.x - pad) * scale;
            let min_y = pos.y as f64 + (rect.y - pad) * scale;
            let max_x = pos.x as f64 + (rect.x + rect.width + pad) * scale;
            let max_y = pos.y as f64 + (rect.y + rect.height + pad) * scale;

            let inside =
                (cx as f64) >= min_x && (cx as f64) <= max_x && (cy as f64) >= min_y && (cy as f64) <= max_y;

            // If the card is expanded (width > 250px) and user clicks outside, request collapse
            if rect.width > 250.0 && !inside {
                let mouse_down = is_left_mouse_down();
                if mouse_down && !was_outside_mouse_down {
                    use tauri::Emitter;
                    let _ = window.emit("collapse-requested", ());
                }
                was_outside_mouse_down = mouse_down;
            } else {
                was_outside_mouse_down = false;
            }

            let should_ignore = !inside;
            if last_ignored != Some(should_ignore) {
                if window.set_ignore_cursor_events(should_ignore).is_ok() {
                    last_ignored = Some(should_ignore);
                }
            }
        }
    });
}
