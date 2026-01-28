import db from "../db/schema.ts";
import { CryptoService } from "./crypto.service.ts";

export class LicenseService {
  static createLicense(
    email: string,
    licenseType: "basic" | "pro" | "enterprise",
    expiresInDays?: number
  ): { key: string; keyHash: string } {
    const key = CryptoService.generateLicenseKey();
    const keyHash = CryptoService.hashLicenseKey(key);

    const expiresAt = expiresInDays
      ? Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60)
      : null;

    const query = db.prepare(`
      INSERT INTO licenses (key_hash, key_plain, email, license_type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    query.run(keyHash, key, email, licenseType, expiresAt);

    return { key, keyHash };
  }

  static validateLicense(
    key: string,
    machineFingerprint: string
  ): {
    valid: boolean;
    expiresAt?: number;
    userEmail: string;
    licenseType: string;
    error?: string;
  } {
    const keyHash = CryptoService.hashLicenseKey(key);

    const query = db.prepare(`
      SELECT * FROM licenses WHERE key_hash = ?
    `);

    const license = query.get(keyHash) as any;

    if (!license) {
      return {
        valid: false,
        userEmail: "",
        licenseType: "",
        error: "License key not found"
      };
    }

    if (!license.is_active) {
      return {
        valid: false,
        userEmail: license.email,
        licenseType: license.license_type,
        error: "License is deactivated"
      };
    }

    if (license.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now > license.expires_at) {
        return {
          valid: false,
          userEmail: license.email,
          licenseType: license.license_type,
          error: "License has expired"
        };
      }
    }

    if (license.machine_fingerprint && license.machine_fingerprint !== machineFingerprint) {
      if (license.activation_count >= license.max_activations) {
        return {
          valid: false,
          userEmail: license.email,
          licenseType: license.license_type,
          error: "Maximum activations exceeded"
        };
      }
    }

    const updateQuery = db.prepare(`
      UPDATE licenses
      SET machine_fingerprint = ?, activated_at = ?, activation_count = activation_count + 1
      WHERE id = ?
    `);
    updateQuery.run(machineFingerprint, Math.floor(Date.now() / 1000), license.id);

    const logQuery = db.prepare(`
      INSERT INTO validation_logs (license_id, machine_fingerprint, valid)
      VALUES (?, ?, 1)
    `);
    logQuery.run(license.id, machineFingerprint);

    return {
      valid: true,
      expiresAt: license.expires_at,
      userEmail: license.email,
      licenseType: license.license_type
    };
  }

  static listLicenses(): any[] {
    const query = db.prepare(`
      SELECT id, email, license_type, expires_at, is_active, activated_at, activation_count, created_at
      FROM licenses
      ORDER BY created_at DESC
    `);
    return query.all() as any[];
  }

  static revokeLicense(licenseId: number): boolean {
    const query = db.prepare(`
      UPDATE licenses SET is_active = 0 WHERE id = ?
    `);
    const result = query.run(licenseId);
    return result.changes > 0;
  }

  static reactivateLicense(licenseId: number): boolean {
    const query = db.prepare(`
      UPDATE licenses SET is_active = 1 WHERE id = ?
    `);
    const result = query.run(licenseId);
    return result.changes > 0;
  }

  static getLicensesByEmail(email: string): any[] {
    const query = db.prepare(`
      SELECT id, license_type, expires_at, is_active, created_at
      FROM licenses WHERE email = ?
    `);
    return query.all(email) as any[];
  }
}
