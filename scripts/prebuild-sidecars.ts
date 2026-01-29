#!/usr/bin/env bun
/**
 * Prebuild Sidecars Script
 *
 * Verifica si los sidecars necesarios existen para la plataforma actual.
 * Si no existen, los compila automáticamente.
 *
 * Uso:
 *   bun run scripts/prebuild-sidecars.ts
 */

import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { $ } from 'bun';

const SIDECARS_DIR = resolve(__dirname, '../src-tauri/sidecars');

type Target = 'linux-x64' | 'linux-arm64' | 'darwin-x64' | 'darwin-arm64' | 'windows-x64';

const TARGET_TO_TRIPLE: Record<Target, string> = {
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'windows-x64': 'x86_64-pc-windows-msvc',
};

function getCurrentPlatformTarget(): Target {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'linux') {
    return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  }
  return 'windows-x64';
}

function getSidecarPath(name: string, target: Target): string {
  const triple = TARGET_TO_TRIPLE[target];
  const extension = target.startsWith('windows') ? '.exe' : '';
  return join(SIDECARS_DIR, `${name}-${triple}${extension}`);
}

interface SidecarConfig {
  name: string;
  buildScript: string;
}

const SIDECARS: SidecarConfig[] = [
  {
    name: 'aeat-bridge',
    buildScript: 'build:aeat-sidecar',
  },
];

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║           Prebuild Sidecars Check                  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const target = getCurrentPlatformTarget();
  console.log(`Platform: ${target}\n`);

  let needsBuild = false;

  for (const sidecar of SIDECARS) {
    const path = getSidecarPath(sidecar.name, target);
    const exists = existsSync(path);

    if (exists) {
      console.log(`✅ ${sidecar.name}: Found`);
    } else {
      console.log(`❌ ${sidecar.name}: Missing (${path})`);
      needsBuild = true;

      console.log(`   Building ${sidecar.name}...`);
      try {
        await $`bun run ${sidecar.buildScript}`;
        console.log(`   ✅ Built successfully`);
      } catch (error) {
        console.error(`   ⚠️  Build failed (continuing without sidecar):`, error);
      }
    }
  }

  if (!needsBuild) {
    console.log('\n✅ All sidecars ready!');
  } else {
    console.log('\n✅ Prebuild check complete');
  }
}

main().catch((error) => {
  console.error('Prebuild error:', error);
  process.exit(1);
});
