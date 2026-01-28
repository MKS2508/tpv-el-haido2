import { LicenseService } from "../src/services/license.service.ts";

console.log("Creating test licenses...");

const license1 = LicenseService.createLicense("user1@example.com", "pro", 30);
console.log("License 1 (Pro, 30 days):", license1.key);

const license2 = LicenseService.createLicense("user2@example.com", "enterprise");
console.log("License 2 (Enterprise, lifetime):", license2.key);

const license3 = LicenseService.createLicense("user3@example.com", "basic", 365);
console.log("License 3 (Basic, 365 days):", license3.key);

console.log("\nDone! You can use these keys for testing:");
console.log("- Pro (30 days):", license1.key);
console.log("- Enterprise (lifetime):", license2.key);
console.log("- Basic (365 days):", license3.key);
