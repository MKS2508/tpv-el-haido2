#!/usr/bin/env bun
import { $ } from 'bun';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const DIST = join(ROOT, 'dist');
const TARGET = join(ROOT, 'apps/haidodocs/public/tpv');

async function main() {
  console.log('🔨 Building TPV PWA...\n');

  // Build frontend
  console.log('📦 Running Vite build...');
  await $`bun run build`.cwd(ROOT);

  // Clean target directory
  if (existsSync(TARGET)) {
    console.log('🧹 Cleaning target directory...');
    rmSync(TARGET, { recursive: true });
  }

  // Create target directory
  mkdirSync(TARGET, { recursive: true });

  // Copy dist to target
  console.log(`📁 Copying dist to ${TARGET}...`);
  cpSync(DIST, TARGET, { recursive: true });

  // Copy PWA files
  const pwaFiles = [
    'manifest.json',
    'sw.js',
    'icon-128x128.png',
    'icon-192x192.png',
    'icon-256x256.png',
    'icon-512x512.png',
    'logo.svg',
  ];

  for (const file of pwaFiles) {
    const src = join(ROOT, 'public', file);
    const dest = join(TARGET, file);
    if (existsSync(src)) {
      cpSync(src, dest);
      console.log(`  ✓ ${file}`);
    }
  }

  console.log('\n✅ PWA build complete!');
  console.log(`   Output: ${TARGET}`);
  console.log('\n📝 To deploy:');
  console.log('   cd apps/haidodocs && bun run build');
}

main().catch(console.error);
