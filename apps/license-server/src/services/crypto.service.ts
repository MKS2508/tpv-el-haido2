// Bun provides crypto.subtle globally
declare const crypto: {
  subtle: {
    digestSync(algorithm: string, data: Uint8Array): ArrayBuffer;
  };
};

export class CryptoService {
  /**
   * Generates a unique license key in format XXXX-XXXX-XXXX-XXXX
   * @returns {string} Generated license key
   */
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

  /**
   * Hashes a license key using SHA-256
   * @param {string} key - License key to hash
   * @returns {string} Hex-encoded hash
   */
  static hashLicenseKey(key: string): string {
    const data = new TextEncoder().encode(key);
    const hashBuffer = webcrypto.subtle.digestSync("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies if a license key matches a stored hash
   * @param {string} key - License key to verify
   * @param {string} storedHash - Hash to compare against
   * @returns {boolean} True if key matches hash
   */
  static verifyLicenseKey(key: string, storedHash: string): boolean {
    const keyHash = this.hashLicenseKey(key);
    return keyHash === storedHash;
  }
}
