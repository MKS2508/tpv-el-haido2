//! Tipos y estructuras para el sistema de auditoría
//!
//! Este módulo define todos los tipos necesarios para el registro,
//! consulta y exportación de logs de auditoría conforme a AEAT VERI*FACTU.

use serde::{Deserialize, Serialize};

/// Tipos de operaciones de auditoría
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditOperationType {
    // Autenticación
    Login,
    Logout,
    // Productos
    ProductCreate,
    ProductUpdate,
    ProductDelete,
    // Categorías
    CategoryCreate,
    CategoryUpdate,
    CategoryDelete,
    // Pedidos
    OrderCreate,
    OrderUpdate,
    OrderDelete,
    OrderComplete,
    OrderCancel,
    // Pagos
    PaymentProcess,
    // Mesas
    TableAssign,
    TableClear,
    // Usuarios
    UserCreate,
    UserUpdate,
    UserDelete,
    // Datos
    DataExport,
    DataImport,
    // Sistema
    SettingsChange,
    LicenseActivate,
    LicenseDeactivate,
}

/// Tipos de entidades de auditoría
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEntityType {
    Product,
    Category,
    Order,
    Table,
    User,
    License,
    Settings,
    Payment,
    Session,
    System,
}

/// Entrada de log de auditoría
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLog {
    pub id: i64,
    pub timestamp: i64,
    pub date: String,
    pub time: String,
    pub user_id: i64,
    pub user_name: String,
    pub operation_type: String,
    pub entity_type: String,
    #[serde(default)]
    pub entity_id: Option<String>,
    pub business_nif: String,
    #[serde(default)]
    pub operation_details: Option<String>,
    #[serde(default)]
    pub old_values: Option<String>,
    #[serde(default)]
    pub new_values: Option<String>,
    pub success: bool,
    #[serde(default)]
    pub error_code: Option<String>,
    #[serde(default)]
    pub error_message: Option<String>,
    #[serde(default)]
    pub ip_address: Option<String>,
    #[serde(default)]
    pub user_agent: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub table_number: Option<i32>,
    #[serde(default)]
    pub order_id: Option<i64>,
    #[serde(default)]
    pub payment_method: Option<String>,
    pub created_at: i64,
}

/// Request para crear un log de auditoría
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogCreateRequest {
    pub user_id: i64,
    pub user_name: String,
    pub operation_type: String,
    pub entity_type: String,
    #[serde(default)]
    pub entity_id: Option<String>,
    pub business_nif: String,
    #[serde(default)]
    pub operation_details: Option<String>,
    #[serde(default)]
    pub old_values: Option<String>,
    #[serde(default)]
    pub new_values: Option<String>,
    pub success: bool,
    #[serde(default)]
    pub error_code: Option<String>,
    #[serde(default)]
    pub error_message: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub table_number: Option<i32>,
    #[serde(default)]
    pub order_id: Option<i64>,
    #[serde(default)]
    pub payment_method: Option<String>,
}

/// Filtros para consultar logs de auditoría
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogFilter {
    #[serde(default)]
    pub start_date: Option<String>,
    #[serde(default)]
    pub end_date: Option<String>,
    #[serde(default)]
    pub user_id: Option<i64>,
    #[serde(default)]
    pub operation_type: Option<String>,
    #[serde(default)]
    pub entity_type: Option<String>,
    #[serde(default)]
    pub business_nif: Option<String>,
    #[serde(default)]
    pub success: Option<bool>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub offset: Option<i64>,
}

/// Opciones para exportar logs de auditoría
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogExportOptions {
    #[serde(default)]
    pub format: AuditExportFormat,
    #[serde(default)]
    pub filter: Option<AuditLogFilter>,
}

/// Formato de exportación de logs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuditExportFormat {
    Json,
    Csv,
}

/// Implement Default para AuditLogFilter
impl Default for AuditLogFilter {
    fn default() -> Self {
        Self {
            start_date: None,
            end_date: None,
            user_id: None,
            operation_type: None,
            entity_type: None,
            business_nif: None,
            success: None,
            limit: Some(1000),
            offset: Some(0),
        }
    }
}

/// Implement Default para AuditExportFormat
impl Default for AuditExportFormat {
    fn default() -> Self {
        Self::Json
    }
}

/// Resultado de exportación de logs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogExportResult {
    pub format: String,
    pub record_count: i64,
    pub file_path: Option<String>,
    pub content: Option<String>,
}
