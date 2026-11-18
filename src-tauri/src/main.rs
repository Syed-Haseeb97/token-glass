#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
fn check_single_instance() -> bool {
    #[link(name = "kernel32")]
    extern "system" {
        fn CreateMutexW(
            lp_mutex_attributes: *const core::ffi::c_void,
            b_initial_owner: i32,
            lp_name: *const u16,
        ) -> *mut core::ffi::c_void;
        fn GetLastError() -> u32;
    }

    const ERROR_ALREADY_EXISTS: u32 = 183;

    let name: Vec<u16> = "Local\\TokenGlassSingletonMutex\0".encode_utf16().collect();
    unsafe {
        let handle = CreateMutexW(core::ptr::null(), 0, name.as_ptr());
        if handle.is_null() || GetLastError() == ERROR_ALREADY_EXISTS {
            return false;
        }
    }
    true
}

#[cfg(not(windows))]
fn check_single_instance() -> bool {
    true
}

fn main() {
    if !check_single_instance() {
        return;
    }
    token_glass_lib::run()
}
