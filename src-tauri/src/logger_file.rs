use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// Singleton state holding the open file handle and path.
/// Initialized lazily on first call to append_log_line.
pub struct LogState {
    pub path: PathBuf,
    pub file: Mutex<Option<std::fs::File>>,
}

impl LogState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let log_dir = app_data_dir.join("logs");
        std::fs::create_dir_all(&log_dir).ok();
        let path = log_dir.join("tpv-haido.log");
        Self {
            path,
            file: Mutex::new(None),
        }
    }

    /// Write a single log line to the file, opening it if needed.
    pub fn append(&self, line: &str) -> Result<(), String> {
        let mut guard = self.file.lock().map_err(|e| e.to_string())?;

        if guard.is_none() {
            // Open in append mode, create if missing
            let file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.path)
                .map_err(|e| format!("Failed to open log file {:?}: {}", &self.path, e))?;
            *guard = Some(file);
        }

        let file = guard.as_mut().ok_or("File handle missing")?;
        let mut f = file.try_clone().map_err(|e| e.to_string())?;
        writeln!(f, "{}", line)
            .and_then(|_| f.flush())
            .map_err(|e| format!("Write failed: {}", e))?;
        Ok(())
    }
}

/// Append a single line to the app log file.
/// The file lives at `{app_data_dir}/logs/tpv-haido.log` and is created on first write.
/// Thread-safe via a Mutex inside LogState.
#[tauri::command]
pub fn append_log_line(state: tauri::State<'_, LogState>, line: String) -> Result<(), String> {
    state.append(&line)
}

/// Return the absolute path to the log file.
#[tauri::command]
pub fn get_log_path(state: tauri::State<'_, LogState>) -> String {
    state.path.to_string_lossy().to_string()
}
