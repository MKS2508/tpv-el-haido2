use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseKey {
    pub key_hash: String,
    pub email: String,
    pub machine_fingerprint: String,
    pub activated_at: i64,
    pub expires_at: Option<i64>,
    pub is_active: bool,
    pub license_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseValidationRequest {
    pub key: String,
    pub email: String,
    pub machine_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseValidationResponse {
    pub valid: bool,
    pub expires_at: Option<i64>,
    pub user_email: String,
    pub license_type: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub is_activated: bool,
    pub is_valid: bool,
    pub expires_at: Option<i64>,
    pub email: Option<String>,
    pub days_remaining: Option<i64>,
    pub license_type: Option<String>,
    pub error_message: Option<String>,
}
