import { crypto } from "bun";

export class CryptoService {
  static generateLicenseKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments: string[] = [];

    for (let i = 0; i < 4; i++) {
      let segment = "";
      for (let j = 0; j < 4; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }

    return segments.join("-");
  }

  static hashLicenseKey(key: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static verifyLicenseKey(key: string, storedHash: string): boolean {
    const keyHash = this.hashLicenseKey(key);
    return keyHash === storedHash;
  }
}
