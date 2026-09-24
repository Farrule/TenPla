use chrono::Local;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct BackendChild(Mutex<Option<CommandChild>>);

/// formatsフォルダと同階層にある logs.log のパスを解決
fn get_log_file_path() -> PathBuf {
    // 1. 実行バイナリ (.exe) のあるディレクトリをチェック (Windows配布時)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            if exe_dir.join("formats").exists() {
                return exe_dir.join("logs.log");
            }
            #[cfg(not(debug_assertions))]
            return exe_dir.join("logs.log");
        }
    }

    // 2. 開発環境時: カレントディレクトリや親ディレクトリから formats を探索
    let candidates = [
        PathBuf::from("backend"),
        PathBuf::from("../backend"),
        PathBuf::from("../../backend"),
        PathBuf::from("."),
        PathBuf::from(".."),
    ];

    for candidate in &candidates {
        if candidate.join("formats").exists() {
            return candidate.join("logs.log");
        }
    }

    // デフォルトフォールバック
    PathBuf::from("logs.log")
}

/// ログファイルへ指定のカテゴリ・レベル・メッセージを書き込む
pub fn log_to_file(category: &str, level: &str, message: &str) {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("[{category}] {now} [{}] {message}\n", level.to_uppercase());

    let log_path = get_log_file_path();
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = file.write_all(line.as_bytes());
    } else {
        eprintln!("[tauri] Failed to write to log file {:?}: {}", log_path, line);
    }
}

/// フロントエンドから呼び出されるログ出力用Tauriコマンド
#[tauri::command]
fn log_message(category: String, level: String, message: String) {
    log_to_file(&category, &level, &message);
}

fn kill_process_tree(child: CommandChild) {
    let pid = child.pid();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Windows: /F (強制) /T (子プロセスツリーごとキル)
        // CREATE_NO_WINDOW を指定して、アプリ終了時に一瞬ターミナルウィンドウ（黒い画面）が表示されるのを防止
        let mut cmd = std::process::Command::new("taskkill");
        cmd.args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW);

        if let Err(e) = cmd.output() {
            log_to_file("tauri", "WARN", &format!("Failed to kill backend process tree (PID: {pid}): {e}"));
        }
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
    if let Err(e) = child.kill() {
        log_to_file("tauri", "WARN", &format!("Error reaping backend child process: {e}"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendChild(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![log_message])
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            log_to_file("tauri", "INFO", "Initializing application and backend sidecar...");

            let sidecar_cmd = match app.shell().sidecar("backend-server") {
                Ok(cmd) => cmd.args(["--port", "8000", "--app-mode", "tauri"]),
                Err(e) => {
                    let err_msg = format!("Failed to configure backend-server sidecar: {e}");
                    log_to_file("tauri", "ERROR", &err_msg);
                    return Err(e.into());
                }
            };

            match sidecar_cmd.spawn() {
                Ok((_rx, child)) => {
                    log_to_file("tauri", "INFO", "Backend sidecar process spawned successfully");
                    let state = app.state::<BackendChild>();
                    *state.0.lock().unwrap() = Some(child);
                }
                Err(e) => {
                    let err_msg = format!("Failed to spawn backend-server sidecar process: {e}");
                    log_to_file("tauri", "ERROR", &err_msg);
                    return Err(e.into());
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                log_to_file("tauri", "INFO", "Window destroyed, shutting down backend process");
                let state = window.state::<BackendChild>();
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
                log_to_file("tauri", "INFO", "Application exit requested, cleaning up");
                let state = app_handle.state::<BackendChild>();
                let child = state.0.lock().unwrap().take();
                if let Some(child) = child {
                    kill_process_tree(child);
                }
            }
        });
}
