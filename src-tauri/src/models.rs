use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub price: f64,
    pub category: String,
    #[serde(default)]
    pub brand: Option<String>,
    #[serde(default)]
    pub icon_type: Option<String>,
    #[serde(default)]
    pub selected_icon: Option<String>,
    #[serde(default)]
    pub uploaded_image: Option<String>,
    #[serde(default)]
    pub stock: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderItem {
    pub id: i64,
    pub name: String,
    pub price: f64,
    pub quantity: i32,
    #[serde(default)]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub id: i64,
    pub date: String,
    pub total: f64,
    #[serde(default)]
    pub change: f64,
    #[serde(default)]
    pub total_paid: f64,
    #[serde(default)]
    pub item_count: i32,
    #[serde(default)]
    pub table_number: i32,
    #[serde(default)]
    pub payment_method: String,
    #[serde(default)]
    pub ticket_path: Option<String>,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Table {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub available: bool,
    #[serde(default)]
    pub current_order_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub profile_picture: Option<String>,
    pub pin: String,
    #[serde(default)]
    pub pinned_product_ids: Option<Vec<i64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    pub products: Vec<Product>,
    pub categories: Vec<Category>,
    pub orders: Vec<Order>,
    pub tables: Vec<Table>,
    pub users: Vec<User>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportData {
    pub products: Vec<Product>,
    pub categories: Vec<Category>,
    pub orders: Vec<Order>,
    #[serde(default)]
    pub tables: Option<Vec<Table>>,
    #[serde(default)]
    pub users: Option<Vec<User>>,
}
