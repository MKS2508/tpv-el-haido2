import { LicenseService } from '../src/services/license.service.js';

/**
 * License Database Seed Script
 *
 * Creates test licenses for development and testing purposes.
 * Run with: bun run db:seed
 */

const seedLogger = {
  info: (message: string) => console.log(`[Seed] ${message}`),
  success: (message: string) => console.log(`[Seed] ✓ ${message}`),
  error: (message: string) => console.error(`[Seed] ✗ ${message}`)
};

async function main() {
  seedLogger.info('Creating test licenses...');

  const licenses = [
    { email: 'user1@example.com', type: 'pro' as const, days: 30, name: 'Pro (30 days)' },
    { email: 'user2@example.com', type: 'enterprise' as const, days: undefined, name: 'Enterprise (lifetime)' },
    { email: 'user3@example.com', type: 'basic' as const, days: 365, name: 'Basic (365 days)' },
    { email: 'admin@haido.com', type: 'pro' as const, days: undefined, name: 'Admin Pro (lifetime)' }
  ];

  const created: { name: string; key: string }[] = [];

  for (const license of licenses) {
    seedLogger.info(`Creating ${license.name}...`);

    const result = await LicenseService.createLicense({
      email: license.email,
      license_type: license.type,
      expires_in_days: license.days
    });

    if (result.ok) {
      seedLogger.success(`${license.name}: ${result.value.key}`);
      created.push({ name: license.name, key: result.value.key });
    } else {
      seedLogger.error(`Failed to create ${license.name}: ${result.error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  seedLogger.success('Seed completed!');
  console.log('='.repeat(60));
  console.log('\nTest licenses created:\n');

  for (const license of created) {
    console.log(`  ${license.name}:`);
    console.log(`    Key: ${license.key}`);
  }

  console.log('\n' + '-'.repeat(60));
  console.log('\nUsage examples:\n');
  console.log('  # Check health');
  console.log('  curl http://localhost:3002/api/license/health');
  console.log('\n  # Validate a license');
  console.log(`  curl -X POST http://localhost:3002/api/license/validate \\`);
  console.log('    -H "Content-Type: application/json" \\');
  console.log(`    -d '{"key":"${created[0].key}","email":"${licenses[0].email}","machine_fingerprint":"test-machine"}'`);
  console.log('\n  # Create a new license (admin)');
  console.log('  curl -X POST http://localhost:3002/api/admin/licenses \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -H "Authorization: Bearer admin-secret-token-change-me" \\');
  console.log('    -d \'{"email":"test@example.com","license_type":"pro"}\'');
  console.log('\n  # View API documentation');
  console.log('  open http://localhost:3002/openapi');
  console.log('');
}

main().catch((error) => {
  seedLogger.error(`Seed failed: ${error.message}`);
  process.exit(1);
});
