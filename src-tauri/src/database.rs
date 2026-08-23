use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::{Product, Category, Order, OrderItem, Table, User, ExportData, ImportData};
use crate::models::license::LicenseKey;
use crate::models::audit::{AuditLog, AuditLogCreateRequest, AuditLogFilter, AuditLogExportOptions, AuditLogExportResult};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            -- Products table
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                brand TEXT,
                icon_type TEXT,
                selected_icon TEXT,
                uploaded_image TEXT,
                stock INTEGER DEFAULT 0
            );

            -- Categories table
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT
            );

            -- Orders table
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY,
                date TEXT NOT NULL,
                total REAL NOT NULL,
                change REAL DEFAULT 0,
                total_paid REAL DEFAULT 0,
                item_count INTEGER DEFAULT 0,
                table_number INTEGER DEFAULT 0,
                payment_method TEXT DEFAULT 'efectivo',
                ticket_path TEXT,
                status TEXT DEFAULT 'inProgress'
            );

            -- Order items table
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER DEFAULT 1,
                category TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            );

            -- Tables table
            CREATE TABLE IF NOT EXISTS tables (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                available INTEGER DEFAULT 1,
                current_order_id INTEGER
            );

            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                profile_picture TEXT,
                pin TEXT NOT NULL,
                pinned_product_ids TEXT
            );

            -- Licenses table
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_hash TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                machine_fingerprint TEXT NOT NULL,
                activated_at INTEGER NOT NULL,
                expires_at INTEGER,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                license_type TEXT NOT NULL
            );

            -- App state table (key-value store for app-level state like onboarding completion)
            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Audit logs table
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                business_nif TEXT NOT NULL,
                operation_details TEXT,
                old_values TEXT,
                new_values TEXT,
                success BOOLEAN NOT NULL DEFAULT 1,
                error_code TEXT,
                error_message TEXT,
                ip_address TEXT,
                user_agent TEXT,
                session_id TEXT,
                table_number INTEGER,
                order_id INTEGER,
                payment_method TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
            );

            -- Índices para optimizar consultas de auditoría
            CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type ON audit_logs(operation_type);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_business_nif ON audit_logs(business_nif);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(date);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_timestamp ON audit_logs(operation_type, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_business_date ON audit_logs(business_nif, date DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_business_operation ON audit_logs(business_nif, operation_type, timestamp DESC);

            -- Enable foreign keys
            PRAGMA foreign_keys = ON;
            "
        )?;

        Ok(())
    }

    // ==================== Products ====================

    pub fn get_products(&self) -> Result<Vec<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, price, category, brand, icon_type, selected_icon, uploaded_image, stock
             FROM products"
        )?;

        let products = stmt.query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                price: row.get(2)?,
                category: row.get(3)?,
                brand: row.get(4)?,
                icon_type: row.get(5)?,
                selected_icon: row.get(6)?,
                uploaded_image: row.get(7)?,
                stock: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(products)
    }

    pub fn create_product(&self, product: &Product) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO products (id, name, price, category, brand, icon_type, selected_icon, uploaded_image, stock)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                product.id,
                product.name,
                product.price,
                product.category,
                product.brand,
                product.icon_type,
                product.selected_icon,
                product.uploaded_image,
                product.stock
            ],
        )?;
        Ok(())
    }

    pub fn update_product(&self, product: &Product) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE products SET name = ?2, price = ?3, category = ?4, brand = ?5,
             icon_type = ?6, selected_icon = ?7, uploaded_image = ?8, stock = ?9
             WHERE id = ?1",
            params![
                product.id,
                product.name,
                product.price,
                product.category,
                product.brand,
                product.icon_type,
                product.selected_icon,
                product.uploaded_image,
                product.stock
            ],
        )?;
        Ok(())
    }

    pub fn delete_product(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM products WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== Categories ====================

    pub fn get_categories(&self) -> Result<Vec<Category>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, description, icon FROM categories")?;

        let categories = stmt.query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                icon: row.get(3)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(categories)
    }

    pub fn create_category(&self, category: &Category) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO categories (id, name, description, icon) VALUES (?1, ?2, ?3, ?4)",
            params![category.id, category.name, category.description, category.icon],
        )?;
        Ok(())
    }

    pub fn update_category(&self, category: &Category) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE categories SET name = ?2, description = ?3, icon = ?4 WHERE id = ?1",
            params![category.id, category.name, category.description, category.icon],
        )?;
        Ok(())
    }

    pub fn delete_category(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== Orders ====================

    pub fn get_orders(&self) -> Result<Vec<Order>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, date, total, change, total_paid, item_count, table_number,
                    payment_method, ticket_path, status
             FROM orders"
        )?;

        let mut orders: Vec<Order> = stmt.query_map([], |row| {
            Ok(Order {
                id: row.get(0)?,
                date: row.get(1)?,
                total: row.get(2)?,
                change: row.get(3)?,
                total_paid: row.get(4)?,
                item_count: row.get(5)?,
                table_number: row.get(6)?,
                payment_method: row.get(7)?,
                ticket_path: row.get(8)?,
                status: row.get(9)?,
                items: Vec::new(),
            })
        })?.collect::<Result<Vec<_>>>()?;

        // Load items for each order
        for order in &mut orders {
            order.items = self.get_order_items_internal(&conn, order.id)?;
        }

        Ok(orders)
    }

    fn get_order_items_internal(&self, conn: &Connection, order_id: i64) -> Result<Vec<OrderItem>> {
        let mut stmt = conn.prepare(
            "SELECT product_id, name, price, quantity, category
             FROM order_items WHERE order_id = ?1"
        )?;

        let items = stmt.query_map(params![order_id], |row| {
            Ok(OrderItem {
                id: row.get(0)?,
                name: row.get(1)?,
                price: row.get(2)?,
                quantity: row.get(3)?,
                category: row.get(4)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(items)
    }

    pub fn create_order(&self, order: &Order) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO orders (id, date, total, change, total_paid, item_count,
             table_number, payment_method, ticket_path, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                order.id,
                order.date,
                order.total,
                order.change,
                order.total_paid,
                order.item_count,
                order.table_number,
                order.payment_method,
                order.ticket_path,
                order.status
            ],
        )?;

        // Delete existing items and insert new ones
        conn.execute("DELETE FROM order_items WHERE order_id = ?1", params![order.id])?;

        for item in &order.items {
            conn.execute(
                "INSERT INTO order_items (order_id, product_id, name, price, quantity, category)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    order.id,
                    item.id,
                    item.name,
                    item.price,
                    item.quantity,
                    item.category
                ],
            )?;
        }

        Ok(())
    }

    pub fn update_order(&self, order: &Order) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE orders SET date = ?2, total = ?3, change = ?4, total_paid = ?5,
             item_count = ?6, table_number = ?7, payment_method = ?8, ticket_path = ?9, status = ?10
             WHERE id = ?1",
            params![
                order.id,
                order.date,
                order.total,
                order.change,
                order.total_paid,
                order.item_count,
                order.table_number,
                order.payment_method,
                order.ticket_path,
                order.status
            ],
        )?;

        // Delete existing items and insert new ones
        conn.execute("DELETE FROM order_items WHERE order_id = ?1", params![order.id])?;

        for item in &order.items {
            conn.execute(
                "INSERT INTO order_items (order_id, product_id, name, price, quantity, category)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    order.id,
                    item.id,
                    item.name,
                    item.price,
                    item.quantity,
                    item.category
                ],
            )?;
        }

        Ok(())
    }

    pub fn delete_order(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM order_items WHERE order_id = ?1", params![id])?;
        conn.execute("DELETE FROM orders WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== Tables ====================

    pub fn get_tables(&self) -> Result<Vec<Table>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, available, current_order_id FROM tables")?;

        let tables = stmt.query_map([], |row| {
            let available: i32 = row.get(2)?;
            Ok(Table {
                id: row.get(0)?,
                name: row.get(1)?,
                available: available != 0,
                current_order_id: row.get(3)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tables)
    }

    pub fn create_table(&self, table: &Table) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO tables (id, name, available, current_order_id) VALUES (?1, ?2, ?3, ?4)",
            params![table.id, table.name, table.available as i32, table.current_order_id],
        )?;
        Ok(())
    }

    pub fn update_table(&self, table: &Table) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tables SET name = ?2, available = ?3, current_order_id = ?4 WHERE id = ?1",
            params![table.id, table.name, table.available as i32, table.current_order_id],
        )?;
        Ok(())
    }

    pub fn delete_table(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tables WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== Users ====================

    pub fn get_users(&self) -> Result<Vec<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, profile_picture, pin, pinned_product_ids FROM users")?;

        let users = stmt.query_map([], |row| {
            let pinned_json: Option<String> = row.get(4)?;
            let pinned_product_ids = pinned_json.and_then(|json| {
                serde_json::from_str(&json).ok()
            });

            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                profile_picture: row.get(2)?,
                pin: row.get(3)?,
                pinned_product_ids,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(users)
    }

    pub fn create_user(&self, user: &User) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let pinned_json = user.pinned_product_ids.as_ref()
            .map(|ids| serde_json::to_string(ids).unwrap_or_default());

        conn.execute(
            "INSERT OR REPLACE INTO users (id, name, profile_picture, pin, pinned_product_ids)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![user.id, user.name, user.profile_picture, user.pin, pinned_json],
        )?;
        Ok(())
    }

    pub fn update_user(&self, user: &User) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let pinned_json = user.pinned_product_ids.as_ref()
            .map(|ids| serde_json::to_string(ids).unwrap_or_default());

        conn.execute(
            "UPDATE users SET name = ?2, profile_picture = ?3, pin = ?4, pinned_product_ids = ?5 WHERE id = ?1",
            params![user.id, user.name, user.profile_picture, user.pin, pinned_json],
        )?;
        Ok(())
    }

    pub fn delete_user(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM users WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== Utility ====================

    pub fn export_data(&self) -> Result<ExportData> {
        Ok(ExportData {
            products: self.get_products()?,
            categories: self.get_categories()?,
            orders: self.get_orders()?,
            tables: self.get_tables()?,
            users: self.get_users()?,
        })
    }

    pub fn import_data(&self, data: &ImportData) -> Result<()> {
        // Import products
        for product in &data.products {
            self.create_product(product)?;
        }

        // Import categories
        for category in &data.categories {
            self.create_category(category)?;
        }

        // Import orders
        for order in &data.orders {
            self.create_order(order)?;
        }

        // Import tables if provided
        if let Some(tables) = &data.tables {
            for table in tables {
                self.create_table(table)?;
            }
        }

        // Import users if provided
        if let Some(users) = &data.users {
            for user in users {
                self.create_user(user)?;
            }
        }

        Ok(())
    }

    pub fn clear_all_data(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            DELETE FROM order_items;
            DELETE FROM orders;
            DELETE FROM products;
            DELETE FROM categories;
            DELETE FROM tables;
            DELETE FROM users;
            "
        )?;
        Ok(())
    }

    // ==================== Licenses ====================

    pub fn save_license(&self, license: &LicenseKey) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO licenses (key_hash, email, machine_fingerprint, activated_at, expires_at, is_active, license_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                license.key_hash,
                license.email,
                license.machine_fingerprint,
                license.activated_at,
                license.expires_at,
                license.is_active as i32,
                license.license_type
            ],
        )?;
        Ok(())
    }

    pub fn get_active_license(&self) -> Result<Option<LicenseKey>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT key_hash, email, machine_fingerprint, activated_at, expires_at, is_active, license_type
             FROM licenses WHERE is_active = 1 LIMIT 1"
        )?;

        let mut rows = stmt.query_map([], |row| {
            Ok(LicenseKey {
                key_hash: row.get(0)?,
                email: row.get(1)?,
                machine_fingerprint: row.get(2)?,
                activated_at: row.get(3)?,
                expires_at: row.get(4)?,
                is_active: row.get::<_, i32>(5)? != 0,
                license_type: row.get(6)?,
            })
        })?;

        match rows.next() {
            Some(license) => Ok(Some(license?)),
            None => Ok(None),
        }
    }

    pub fn update_license_status(&self, key_hash: &str, is_active: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE licenses SET is_active = ?1 WHERE key_hash = ?2",
            params![is_active as i32, key_hash],
        )?;
        Ok(())
    }

    pub fn clear_license(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM licenses", [])?;
        Ok(())
    }

    // ==================== App State ====================

    pub fn get_app_state(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM app_state WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        match rows.next()? {
            Some(row) => Ok(Some(row.get(0)?)),
            None => Ok(None),
        }
    }

    pub fn set_app_state(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    // ==================== Audit Logs ====================

    /// Crea un nuevo log de auditoría
    pub fn create_audit_log(&self, request: AuditLogCreateRequest) -> Result<i64> {
        let conn = self.conn.lock().unwrap();

        let now = chrono::Utc::now().timestamp_millis();
        let datetime = chrono::Utc::now();
        let date = datetime.format("%Y-%m-%d").to_string();
        let time = datetime.format("%H:%M:%S").to_string();

        conn.execute(
            "INSERT INTO audit_logs (
                timestamp, date, time, user_id, user_name, operation_type, entity_type,
                entity_id, business_nif, operation_details, old_values, new_values,
                success, error_code, error_message, session_id, table_number, order_id, payment_method
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                now,
                date,
                time,
                request.user_id,
                request.user_name,
                request.operation_type,
                request.entity_type,
                request.entity_id,
                request.business_nif,
                request.operation_details,
                request.old_values,
                request.new_values,
                request.success as i32,
                request.error_code,
                request.error_message,
                request.session_id,
                request.table_number,
                request.order_id,
                request.payment_method,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Obtiene logs de auditoría según filtros
    pub fn get_audit_logs(&self, filter: Option<AuditLogFilter>) -> Result<Vec<AuditLog>> {
        let conn = self.conn.lock().unwrap();

        let filter = filter.unwrap_or_default();
        let limit = filter.limit.unwrap_or(1000);
        let offset = filter.offset.unwrap_or(0);

        let mut query = String::from(
            "SELECT id, timestamp, date, time, user_id, user_name, operation_type, entity_type,
                    entity_id, business_nif, operation_details, old_values, new_values,
                    success, error_code, error_message, ip_address, user_agent, session_id,
                    table_number, order_id, payment_method, created_at
             FROM audit_logs WHERE 1=1"
        );

        // Owned values must outlive params_vec which borrows them
        let user_id_val = filter.user_id;
        let success_val = filter.success.map(|b| b as i32);

        let mut params_vec: Vec<&dyn rusqlite::ToSql> = Vec::new();

        if let Some(ref start_date) = filter.start_date {
            query.push_str(" AND date >= ?1");
            params_vec.push(start_date);
        }

        if let Some(ref end_date) = filter.end_date {
            let param_idx = params_vec.len() + 1;
            query.push_str(&format!(" AND date <= ?{param_idx}"));
            params_vec.push(end_date);
        }

        if let Some(ref uid) = user_id_val {
            let param_idx = params_vec.len() + 1;
            query.push_str(&format!(" AND user_id = ?{param_idx}"));
            params_vec.push(uid);
        }

        if let Some(ref operation_type) = filter.operation_type {
            let param_idx = params_vec.len() + 1;
            query.push_str(&format!(" AND operation_type = ?{param_idx}"));
            params_vec.push(operation_type);
        }

        if let Some(ref entity_type) = filter.entity_type {
            let param_idx = params_vec.len() + 1;
            query.push_str(&format!(" AND entity_type = ?{param_idx}"));
            params_vec.push(entity_type);
        }

        if let Some(ref business_nif) = filter.business_nif {
            let param_idx = params_vec.len() + 1;
            query.push_str(&format!(" AND business_nif = ?{param_idx}"));
            params_vec.push(business_nif);
        }

        if let Some(ref sval) = success_val {
            let param_idx = params_vec.len() + 1;
            query.push_str(&format!(" AND success = ?{param_idx}"));
            params_vec.push(sval);
        }

        query.push_str(" ORDER BY timestamp DESC");
        query.push_str(&format!(" LIMIT {limit} OFFSET {offset}"));

        let mut stmt = conn.prepare(&query)?;

        let logs = stmt.query_map(params_vec.as_slice(), |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                date: row.get(2)?,
                time: row.get(3)?,
                user_id: row.get(4)?,
                user_name: row.get(5)?,
                operation_type: row.get(6)?,
                entity_type: row.get(7)?,
                entity_id: row.get(8)?,
                business_nif: row.get(9)?,
                operation_details: row.get(10)?,
                old_values: row.get(11)?,
                new_values: row.get(12)?,
                success: row.get::<_, i32>(13)? != 0,
                error_code: row.get(14)?,
                error_message: row.get(15)?,
                ip_address: row.get(16)?,
                user_agent: row.get(17)?,
                session_id: row.get(18)?,
                table_number: row.get(19)?,
                order_id: row.get(20)?,
                payment_method: row.get(21)?,
                created_at: row.get(22)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(logs)
    }

    /// Exporta logs de auditoría en el formato especificado (JSON o CSV)
    pub fn export_audit_logs(&self, options: AuditLogExportOptions) -> Result<AuditLogExportResult> {
        let logs = self.get_audit_logs(options.filter)?;
        let record_count = logs.len() as i64;

        let format_name = match options.format {
            crate::models::audit::AuditExportFormat::Json => "json".to_string(),
            crate::models::audit::AuditExportFormat::Csv => "csv".to_string(),
        };

        let content = match options.format {
            crate::models::audit::AuditExportFormat::Json => {
                serde_json::to_string_pretty(&logs).map_err(|e| {
                    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                })?
            }
            crate::models::audit::AuditExportFormat::Csv => {
                self.logs_to_csv(&logs)?
            }
        };

        Ok(AuditLogExportResult {
            format: format_name,
            record_count,
            file_path: None,
            content: Some(content),
        })
    }

    /// Convierte logs a formato CSV
    fn logs_to_csv(&self, logs: &[AuditLog]) -> Result<String> {
        use std::fmt::Write;

        let mut buffer = String::new();

        // fmt::Write on String is infallible, map_err for type consistency
        writeln!(
            buffer,
            "ID,Timestamp,Date,Time,UserID,UserName,OperationType,EntityType,EntityID,\
            BusinessNIF,OperationDetails,OldValues,NewValues,Success,ErrorCode,\
            ErrorMessage,IPAddress,UserAgent,SessionID,TableNumber,OrderID,\
            PaymentMethod,CreatedAt"
        ).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
        )))?;

        for log in logs {
            writeln!(
                buffer,
                "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
                log.id,
                log.timestamp,
                escape_csv_field(&log.date),
                escape_csv_field(&log.time),
                log.user_id,
                escape_csv_field(&log.user_name),
                escape_csv_field(&log.operation_type),
                escape_csv_field(&log.entity_type),
                log.entity_id.as_deref().map(escape_csv_field).unwrap_or_default(),
                escape_csv_field(&log.business_nif),
                log.operation_details.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.old_values.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.new_values.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.success,
                log.error_code.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.error_message.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.ip_address.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.user_agent.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.session_id.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.table_number.map(|v| v.to_string()).unwrap_or_default(),
                log.order_id.map(|v| v.to_string()).unwrap_or_default(),
                log.payment_method.as_deref().map(escape_csv_field).unwrap_or_default(),
                log.created_at
            ).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
            )))?;
        }

        Ok(buffer)
    }

    /// Limpia logs antiguos según la fecha de corte
    pub fn cleanup_audit_logs(&self, cutoff_date: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM audit_logs WHERE date < ?1",
            params![cutoff_date],
        ).map(|v| v as i64)
    }
}

/// Función auxiliar para escapar valores CSV
fn escape_csv_field(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace("\"", "\"\""))
    } else {
        value.to_string()
    }
}
