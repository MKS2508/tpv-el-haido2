import { Database } from 'bun:sqlite';
import { tryCatchAsync } from '@mks2508/no-throw';
import type { Result, ResultError } from '@mks2508/no-throw';
import { LicenseErrorCode, type LicenseResultError } from '../lib/error-codes.js';
import { dbLogger } from '../lib/logger.js';

/**
 * Database schema and connection management for License Server
 * Handles SQLite database initialization, schema creation, and provides
 * typed database operations with Result pattern error handling
 */

/**
 * License record from database
 */
export interface License {
  id: number;
  key_hash: string;
  key_plain: string;
  email: string;
  machine_fingerprint: string | null;
  license_type: 'basic' | 'pro' | 'enterprise';
  expires_at: number | null;
  activated_at: number | null;
  is_active: boolean;
  activation_count: number;
  max_activations: number;
  created_at: number;
}

/**
 * Validation log record from database
 */
export interface ValidationLog {
  id: number;
  license_id: number;
  machine_fingerprint: string;
  valid: boolean;
  ip_address: string | null;
  user_agent: string | null;
  validated_at: number;
}

/**
 * Database connection class with Result pattern
 * Wraps Bun SQLite operations with error handling and logging
 */
export class LicenseDatabase {
  private db: Database;
  private initialized: boolean = false;

  constructor(path: string) {
    dbLogger.info('Initializing database', { path });
    this.db = new Database(path);
    this.initSchemaSync();
  }

  /**
   * Initializes database schema synchronously
   * Creates tables if they don't exist with proper indexes
   */
  private initSchemaSync(): void {
    try {
      dbLogger.info('Creating database schema');

      // Create licenses table
      this.db.exec(`
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

      // Create validation_logs table
      this.db.exec(`
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

      // Create indexes for better query performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_licenses_key_hash ON licenses(key_hash);
        CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
        CREATE INDEX IF NOT EXISTS idx_licenses_is_active ON licenses(is_active);
        CREATE INDEX IF NOT EXISTS idx_validation_logs_license_id ON validation_logs(license_id);
      `);

      this.initialized = true;
      dbLogger.success('Database schema created successfully');
    } catch (error) {
      dbLogger.error('Failed to initialize database schema', { error });
      throw error;
    }
  }

  /**
   * Creates a new license in the database
   *
   * @param {object} data - License data
   * @param {string} data.keyHash - Hashed license key
   * @param {string} data.keyPlain - Plain license key (stored for admin retrieval)
   * @param {string} data.email - User email
   * @param {string} data.licenseType - Type of license (basic, pro, enterprise)
   * @param {number} [data.expiresAt] - Optional expiration timestamp
   * @returns {Result<License, ResultError<LicenseErrorCode>>}
   *
   * @error LICENSE_DATABASE_ERROR - If insert operation fails
   */
  async createLicense(data: {
    keyHash: string;
    keyPlain: string;
    email: string;
    licenseType: 'basic' | 'pro' | 'enterprise';
    expiresAt?: number;
  }): Promise<Result<License, ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.info('Creating license', { email: data.email, type: data.licenseType });

        const query = this.db.prepare(`
          INSERT INTO licenses (key_hash, key_plain, email, license_type, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        query.run(data.keyHash, data.keyPlain, data.email, data.licenseType, data.expiresAt ?? null);

        const created = this.getLicenseByKeyHash(data.keyHash);

        if (!created) {
          throw new Error('Failed to retrieve created license');
        }

        dbLogger.success('License created', { id: created.id });

        return created;
      },
      LicenseErrorCode.DatabaseError
    );
  }

  /**
   * Retrieves a license by its key hash
   *
   * @param {string} keyHash - Hash of the license key
   * @returns {License | null} License record or null if not found
   */
  getLicenseByKeyHash(keyHash: string): License | null {
    const query = this.db.prepare(`
      SELECT * FROM licenses WHERE key_hash = ?
    `);

    const result = query.get(keyHash) as unknown;

    if (!result) {
      return null;
    }

    return result as License;
  }

  /**
   * Lists all licenses in the system
   *
   * @returns {Result<License[], ResultError<LicenseErrorCode>>}
   *
   * @error LICENSE_DATABASE_ERROR - If query fails
   */
  async listLicenses(): Promise<Result<License[], ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.info('Listing all licenses');

        const query = this.db.prepare(`
          SELECT id, email, license_type, expires_at, is_active, activated_at,
                 activation_count, created_at
          FROM licenses
          ORDER BY created_at DESC
        `);

        const rows = query.all() as unknown[];

        // Convert SQLite integer booleans to JavaScript booleans
        const licenses = rows.map((row: any) => ({
          ...row,
          is_active: Boolean(row.is_active)
        }));

        dbLogger.success('Licenses retrieved', { count: licenses.length });

        return licenses as License[];
      },
      LicenseErrorCode.DatabaseError
    );
  }

  /**
   * Revokes a license by setting is_active to false
   *
   * @param {number} licenseId - ID of license to revoke
   * @returns {Result<boolean, ResultError<LicenseErrorCode>>}
   *          True if license was revoked, false if not found
   *
   * @error LICENSE_DATABASE_ERROR - If update operation fails
   */
  async revokeLicense(licenseId: number): Promise<Result<boolean, ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.info('Revoking license', { id: licenseId });

        const query = this.db.prepare(`
          UPDATE licenses SET is_active = 0 WHERE id = ?
        `);

        const result = query.run(licenseId);
        const wasRevoked = result.changes > 0;

        if (wasRevoked) {
          dbLogger.success('License revoked', { id: licenseId });
        } else {
          dbLogger.warn('License not found for revocation', { id: licenseId });
        }

        return wasRevoked;
      },
      LicenseErrorCode.DatabaseError
    );
  }

  /**
   * Reactivates a license by setting is_active to true
   *
   * @param {number} licenseId - ID of license to reactivate
   * @returns {Result<boolean, ResultError<LicenseErrorCode>>}
   *          True if license was reactivated, false if not found
   *
   * @error LICENSE_DATABASE_ERROR - If update operation fails
   */
  async reactivateLicense(licenseId: number): Promise<Result<boolean, ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.info('Reactivating license', { id: licenseId });

        const query = this.db.prepare(`
          UPDATE licenses SET is_active = 1 WHERE id = ?
        `);

        const result = query.run(licenseId);
        const wasReactivated = result.changes > 0;

        if (wasReactivated) {
          dbLogger.success('License reactivated', { id: licenseId });
        } else {
          dbLogger.warn('License not found for reactivation', { id: licenseId });
        }

        return wasReactivated;
      },
      LicenseErrorCode.DatabaseError
    );
  }

  /**
   * Updates license activation information
   * Called when a license is validated successfully
   *
   * @param {number} licenseId - ID of license to update
   * @param {string} machineFingerprint - Machine fingerprint of activation
   * @returns {Result<void, ResultError<LicenseErrorCode>>}
   *
   * @error LICENSE_DATABASE_ERROR - If update operation fails
   */
  async updateActivation(
    licenseId: number,
    machineFingerprint: string
  ): Promise<Result<void, ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.debug('Updating license activation', { licenseId, machineFingerprint });

        const query = this.db.prepare(`
          UPDATE licenses
          SET machine_fingerprint = ?, activated_at = ?, activation_count = activation_count + 1
          WHERE id = ?
        `);

        query.run(machineFingerprint, Math.floor(Date.now() / 1000), licenseId);

        dbLogger.debug('License activation updated');
      },
      LicenseErrorCode.DatabaseError
    );
  }

  /**
   * Logs a license validation attempt
   *
   * @param {object} data - Validation log data
   * @param {number} data.licenseId - ID of license being validated
   * @param {string} data.machineFingerprint - Machine fingerprint
   * @param {boolean} data.valid - Whether validation was successful
   * @param {string} [data.ipAddress] - Optional IP address
   * @param {string} [data.userAgent] - Optional user agent
   * @returns {Result<void, ResultError<LicenseErrorCode>>}
   *
   * @error LICENSE_DATABASE_ERROR - If insert operation fails
   */
  async logValidation(data: {
    licenseId: number;
    machineFingerprint: string;
    valid: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void, ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.debug('Logging validation', {
          licenseId: data.licenseId,
          valid: data.valid
        });

        const query = this.db.prepare(`
          INSERT INTO validation_logs (license_id, machine_fingerprint, valid, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?)
        `);

        query.run(
          data.licenseId,
          data.machineFingerprint,
          data.valid ? 1 : 0,
          data.ipAddress ?? null,
          data.userAgent ?? null
        );

        dbLogger.debug('Validation logged');
      },
      LicenseErrorCode.DatabaseError
    );
  }

  /**
   * Retrieves all licenses for a specific email
   *
   * @param {string} email - Email to search for
   * @returns {Result<License[], ResultError<LicenseErrorCode>>}
   *
   * @error LICENSE_DATABASE_ERROR - If query fails
   */
  async getLicensesByEmail(email: string): Promise<Result<License[], ResultError<LicenseErrorCode>>> {
    return tryCatchAsync(
      async () => {
        dbLogger.info('Retrieving licenses by email', { email });

        const query = this.db.prepare(`
          SELECT id, email, license_type, expires_at, is_active, activated_at,
                 activation_count, created_at
          FROM licenses WHERE email = ?
        `);

        const rows = query.all(email) as unknown[];

        // Convert SQLite integer booleans to JavaScript booleans
        const licenses = rows.map((row: any) => ({
          ...row,
          is_active: Boolean(row.is_active)
        }));

        dbLogger.success('Licenses retrieved by email', { email, count: licenses.length });

        return licenses as License[];
      },
      LicenseErrorCode.DatabaseError
    );
  }
}

// Initialize and export database instance
const dbPath = process.env.DB_PATH || './db/licenses.db';
export const db = new LicenseDatabase(dbPath);

dbLogger.success('Database initialized', { path: dbPath });
