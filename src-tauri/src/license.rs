use sha2::{Sha256, Digest};
use hex;
use std::process::Command;
use crate::models::license::{LicenseValidationRequest, LicenseValidationResponse};

pub fn generate_machine_fingerprint() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        let output = Command::new("getmac")
            .output()
            .map_err(|e| format!("Failed to get MAC: {}", e))?;
        let mac = String::from_utf8_lossy(&output.stdout);
        Ok(mac.lines().next().unwrap_or("unknown").to_string())
    } else {
        let interface = if cfg!(target_os = "macos") { "en0" } else { "eth0" };
        let output = Command::new("ifconfig")
            .args(&[interface, "ether"])
            .output()
            .map_err(|e| format!("Failed to get MAC: {}", e))?;
        let mac = String::from_utf8_lossy(&output.stdout);
        let mac_address = mac.split_whitespace()
            .skip(1)
            .next()
            .unwrap_or("unknown");
        Ok(mac_address.to_string())
    }
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
