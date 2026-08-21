use sha2::{Sha256, Digest};
use hex;
use std::process::Command;
use crate::models::license::LicenseValidationResponse;

/// Identificador estable de la máquina.
///
/// Se usa para atar una licencia a un equipo y para que el release-hub pueda
/// pinear un dispositivo a un bundle concreto.
pub fn generate_machine_fingerprint() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("getmac")
            .output()
            .map_err(|e| format!("Failed to get MAC: {}", e))?;
        let mac = String::from_utf8_lossy(&output.stdout);
        Ok(mac.lines().next().unwrap_or("unknown").to_string())
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("ifconfig")
            .args(&["en0", "ether"])
            .output()
            .map_err(|e| format!("Failed to get MAC: {}", e))?;
        let mac = String::from_utf8_lossy(&output.stdout);
        let mac_address = mac.split_whitespace().skip(1).next().unwrap_or("unknown");
        Ok(mac_address.to_string())
    }

    #[cfg(target_os = "linux")]
    {
        linux_fingerprint()
    }
}

/// En Linux no se puede depender de `ifconfig`: net-tools no viene instalado en
/// las distribuciones actuales (CachyOS, la de producción, no lo trae) y `eth0`
/// es un nombre legacy que systemd ya no usa. La versión anterior fallaba con
/// "No such file or directory" en la máquina del bar, lo que dejaba sin
/// fingerprint tanto a la licencia como al canal OTA, en silencio.
///
/// `/etc/machine-id` lo genera systemd al instalar, es estable, único por
/// instalación y no exige ningún proceso externo. Se devuelve su sha256 en vez
/// del valor crudo: sirve igual como identificador opaco y no propaga un
/// identificador de máquina reutilizable por terceros.
#[cfg(target_os = "linux")]
fn linux_fingerprint() -> Result<String, String> {
    use std::fs;

    for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"] {
        if let Ok(raw) = fs::read_to_string(path) {
            let id = raw.trim();
            if !id.is_empty() {
                return Ok(hex::encode(Sha256::digest(id.as_bytes())));
            }
        }
    }

    // Sin machine-id, la MAC de la primera interfaz física. Se descartan loopback
    // y virtuales (docker, veth, bridges), cuya dirección cambia o se repite
    // entre equipos.
    let interfaces = fs::read_dir("/sys/class/net")
        .map_err(|e| format!("no se pudo enumerar interfaces de red: {e}"))?;

    let mut candidates: Vec<String> = interfaces
        .flatten()
        .filter(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            name != "lo" && !name.starts_with("docker") && !name.starts_with("veth") && !name.starts_with("br-")
        })
        // Las interfaces físicas cuelgan de un dispositivo real; las virtuales no.
        .filter(|entry| entry.path().join("device").exists())
        .filter_map(|entry| fs::read_to_string(entry.path().join("address")).ok())
        .map(|mac| mac.trim().to_string())
        .filter(|mac| !mac.is_empty() && mac != "00:00:00:00:00:00")
        .collect();

    // Orden estable: el enumerado del directorio no lo garantiza entre arranques.
    candidates.sort();

    candidates
        .first()
        .map(|mac| hex::encode(Sha256::digest(mac.as_bytes())))
        .ok_or_else(|| "no se encontró machine-id ni ninguna interfaz de red física".to_string())
}

pub fn hash_license_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

pub async fn validate_license_online(
    key: String,
    email: String,
    machine_fingerprint: String,
) -> Result<LicenseValidationResponse, String> {
    let client = reqwest::Client::new();

    let license_server_url = std::env::var("LICENSE_SERVER_URL")
        .unwrap_or_else(|_| "http://localhost:3002".to_string());

    let request_body = serde_json::json!({
        "key": key,
        "email": email,
        "machine_fingerprint": machine_fingerprint
    });

    let response = client
        .post(format!("{}/api/license/validate", license_server_url))
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let result: LicenseValidationResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(result)
}
