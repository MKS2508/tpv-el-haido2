#!/usr/bin/env bun
/**
 * Database Seed Script
 *
 * Seeds the SQLite database with initial data from seed-data.json
 *
 * Usage:
 *   bun run scripts/seed.ts [--db-path <path>] [--clear]
 *
 * Options:
 *   --db-path  Path to SQLite database (default: auto-detect from Tauri app data)
 *   --clear    Clear existing data before seeding
 */

import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync } from "fs";
import seedData from "./seed-data.json";

// Get database path
function getDefaultDbPath(): string {
  const platform = process.platform;
  const appName = "com.elhaido.tpv";
  const dbName = "tpv-haido.db";

  let appDataPath: string;

  if (platform === "win32") {
    appDataPath = join(process.env.APPDATA || "", appName);
  } else if (platform === "darwin") {
    appDataPath = join(process.env.HOME || "", "Library", "Application Support", appName);
  } else {
    // Linux
    appDataPath = join(process.env.HOME || "", ".local", "share", appName);
  }

  return join(appDataPath, dbName);
}

function parseArgs(): { dbPath: string; clear: boolean } {
  const args = process.argv.slice(2);
  let dbPath = getDefaultDbPath();
  let clear = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--db-path" && args[i + 1]) {
      dbPath = args[i + 1];
      i++;
    } else if (args[i] === "--clear") {
      clear = true;
    }
  }

  return { dbPath, clear };
}

function ensureTablesExist(db: Database): void {
  console.log("Ensuring tables exist...");

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      brand TEXT,
      icon_type TEXT,
      selected_icon TEXT,
      uploaded_image TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      table_number INTEGER,
      status TEXT,
      payment_method TEXT,
      total REAL,
      total_paid REAL,
      change_amount REAL,
      item_count INTEGER,
      date TEXT,
      ticket_path TEXT,
      items TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      available INTEGER DEFAULT 1
    )
  `);

  console.log("Tables ready.");
}

function clearData(db: Database): void {
  console.log("Clearing existing data...");
  db.run("DELETE FROM categories");
  db.run("DELETE FROM products");
  db.run("DELETE FROM tables");
  console.log("Data cleared.");
}

function seedCategories(db: Database): void {
  console.log(`Seeding ${seedData.categories.length} categories...`);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO categories (id, name, description)
    VALUES (?, ?, ?)
  `);

  for (const category of seedData.categories) {
    stmt.run(category.id, category.name, category.description);
  }

  console.log("Categories seeded.");
}

function seedProducts(db: Database): void {
  console.log(`Seeding ${seedData.products.length} products...`);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO products (id, name, price, category, brand, icon_type, selected_icon, uploaded_image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const product of seedData.products) {
    stmt.run(
      product.id,
      product.name,
      product.price,
      product.category,
      product.brand,
      product.iconType,
      product.selectedIcon,
      product.uploadedImage
    );
  }

  console.log("Products seeded.");
}

function seedTables(db: Database): void {
  console.log(`Seeding ${seedData.tables.length} tables...`);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO tables (id, name, available)
    VALUES (?, ?, ?)
  `);

  for (const table of seedData.tables) {
    stmt.run(table.id, table.name, table.available ? 1 : 0);
  }

  console.log("Tables seeded.");
}

function main(): void {
  const { dbPath, clear } = parseArgs();

  console.log("=".repeat(50));
  console.log("TPV El Haido - Database Seed Script");
  console.log("=".repeat(50));
  console.log(`Database path: ${dbPath}`);

  if (!existsSync(dbPath)) {
    console.log("Database file not found. It will be created.");
  }

  const db = new Database(dbPath, { create: true });

  try {
    ensureTablesExist(db);

    if (clear) {
      clearData(db);
    }

    seedCategories(db);
    seedProducts(db);
    seedTables(db);

    console.log("=".repeat(50));
    console.log("Seed completed successfully!");
    console.log("=".repeat(50));

    // Show summary
    const categoryCount = db.query("SELECT COUNT(*) as count FROM categories").get() as { count: number };
    const productCount = db.query("SELECT COUNT(*) as count FROM products").get() as { count: number };
    const tableCount = db.query("SELECT COUNT(*) as count FROM tables").get() as { count: number };

    console.log("\nDatabase summary:");
    console.log(`  Categories: ${categoryCount.count}`);
    console.log(`  Products:   ${productCount.count}`);
    console.log(`  Tables:     ${tableCount.count}`);

  } finally {
    db.close();
  }
}

main();
