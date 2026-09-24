use std::sync::Mutex;
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct BackendChild(Mutex<Option<CommandChild>>);

fn kill_process_tree(child: CommandChild) {
    let pid = child.pid();

    #[cfg(target_os = "windows")]
    {
        // Windows: /F (強制) /T (子プロセスツリーごとキル)
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output();
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Linux: プロセスツリーおよび同名バイナリに SIGKILL を送信
        let _ = std::process::Command::new("pkill")
            .args(["-9", "-P", &pid.to_string()])
            .output();
        let _ = std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
        let _ = std::process::Command::new("pkill")
            .args(["-9", "-f", "backend-server"])
            .output();
    }

    // Tauri 内部の wait/reap 処理を走らせてゾンビ (<defunct>) 化を防ぐ
    let _ = child.kill();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendChild(Mutex::new(None)))
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            let sidecar = app.shell().sidecar("backend-server").unwrap().args(["--port", "8000"]);
            let (_rx, child) = sidecar.spawn().unwrap();

            let state = app.state::<BackendChild>();
            *state.0.lock().unwrap() = Some(child);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                let state = window.state::<BackendChild>();
                // 行を分けて take() することで MutexGuard を即座に Drop させる
                let child = state.0.lock().unwrap().take();
                if let Some(child) = child {
                    kill_process_tree(child);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                let state = app_handle.state::<BackendChild>();
                // こちらも同様に分割
                let child = state.0.lock().unwrap().take();
                if let Some(child) = child {
                    kill_process_tree(child);
                }
            }
        });
}