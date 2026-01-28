import { Database } from "bun:sqlite";

const dbPath = "db/licenses.db";
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    key_plain TEXT NOT NULL,
    email TEXT NOT NULL,
    machine_fingerprint TEXT,
    license_type TEXT NOT NULL,
    expires_at INTEGER,
    activated_at INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    activation_count INTEGER DEFAULT 0,
    max_activations INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS validation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    machine_fingerprint TEXT NOT NULL,
    valid BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    validated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (license_id) REFERENCES licenses(id)
  );
`);

console.log(`Database initialized at ${dbPath}`);

export default db;
