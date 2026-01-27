use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::{Product, Category, Order, OrderItem, Table, User, ExportData, ImportData};

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
}
