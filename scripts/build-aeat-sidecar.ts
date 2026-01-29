#!/usr/bin/env bun
/**
 * Build AEAT Sidecar Script
 *
 * Compila el proyecto tpv-soap-aeat como un ejecutable standalone
 * para diferentes plataformas usando Bun.
 *
 * Uso:
 *   bun run scripts/build-aeat-sidecar.ts [--target <platform>]
 *
 * Targets disponibles:
 *   - linux-x64
 *   - linux-arm64
 *   - darwin-x64
 *   - darwin-arm64
 *   - windows-x64 (por defecto si no se especifica)
 *   - all (compila para todas las plataformas)
 */

import { $ } from 'bun';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';

// ==================== Configuration ====================

const AEAT_PROJECT_PATHS = [
  resolve(__dirname, '../../tpv-soap-aeat'),
  '/Users/mks/tpv-soap-aeat',
];
const OUTPUT_DIR = resolve(__dirname, '../src-tauri/sidecars');
const SIDECAR_NAME = 'aeat-bridge';

let AEAT_PROJECT_PATH = AEAT_PROJECT_PATHS[0];

type Target = 'linux-x64' | 'linux-arm64' | 'darwin-x64' | 'darwin-arm64' | 'windows-x64';

const TARGETS: Target[] = [
  'linux-x64',
  'linux-arm64',
  'darwin-x64',
  'darwin-arm64',
  'windows-x64',
];

// Map Bun targets to Tauri triple names
const TARGET_TO_TRIPLE: Record<Target, string> = {
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'windows-x64': 'x86_64-pc-windows-msvc',
};

// ==================== Helpers ====================

function getOutputFileName(target: Target): string {
  const triple = TARGET_TO_TRIPLE[target];
  const extension = target.startsWith('windows') ? '.exe' : '';
  return `${SIDECAR_NAME}-${triple}${extension}`;
}

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

async function checkAEATProjectExists(): Promise<boolean> {
  for (const path of AEAT_PROJECT_PATHS) {
    const serverPath = join(path, 'src', 'server.ts');
    if (existsSync(serverPath)) {
      AEAT_PROJECT_PATH = path;
      return true;
    }
  }
  return false;
}

async function ensureOutputDir(): Promise<void> {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

// ==================== Build Functions ====================

async function buildForTarget(target: Target): Promise<boolean> {
  const outputName = getOutputFileName(target);
  const outputPath = join(OUTPUT_DIR, outputName);

  console.log(`\n📦 Building for ${target}...`);
  console.log(`   Output: ${outputPath}`);

  try {
    // Bun compile command
    const entryPoint = join(AEAT_PROJECT_PATH, 'src', 'server.ts');

    // Note: Bun cross-compilation requires the target flag
    // For the current platform, we can build directly
    const currentTarget = getCurrentPlatformTarget();

    if (target !== currentTarget) {
      console.log(`   ⚠️  Cross-compilation to ${target} - using --target flag`);
    }

    await $`bun build ${entryPoint} --compile --target=bun-${target} --outfile=${outputPath}`.cwd(
      AEAT_PROJECT_PATH
    );

    if (existsSync(outputPath)) {
      console.log(`   ✅ Built successfully: ${outputName}`);
      return true;
    } else {
      console.error(`   ❌ Build failed: output file not found`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Build failed:`, error);
    return false;
  }
}

async function buildAll(): Promise<void> {
  console.log('🔨 Building AEAT Bridge for all platforms...\n');

  const results: Record<string, boolean> = {};

  for (const target of TARGETS) {
    results[target] = await buildForTarget(target);
  }

  console.log('\n📊 Build Summary:');
  console.log('─'.repeat(50));

  for (const [target, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌';
    console.log(`   ${status} ${target}`);
  }

  const successCount = Object.values(results).filter(Boolean).length;
  console.log('─'.repeat(50));
  console.log(`   Total: ${successCount}/${TARGETS.length} successful\n`);
}

async function buildCurrentPlatform(): Promise<void> {
  const target = getCurrentPlatformTarget();
  console.log(`🔨 Building AEAT Bridge for current platform (${target})...\n`);

  const success = await buildForTarget(target);

  if (success) {
    console.log('\n✅ Build completed successfully!');
    console.log(`   Binary location: ${join(OUTPUT_DIR, getOutputFileName(target))}`);
  } else {
    console.error('\n❌ Build failed!');
    process.exit(1);
  }
}

// ==================== Main ====================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         AEAT VERI*FACTU Sidecar Builder            ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Check if AEAT project exists
  if (!(await checkAEATProjectExists())) {
    console.error('❌ Error: tpv-soap-aeat project not found!');
    console.error('   Searched paths:');
    for (const path of AEAT_PROJECT_PATHS) {
      console.error(`   - ${path}`);
    }
    console.error('\n   Please ensure the tpv-soap-aeat repository is cloned in one of these locations.');
    process.exit(1);
  }

  console.log(`✅ Found AEAT project at: ${AEAT_PROJECT_PATH}`);

  // Ensure output directory exists
  await ensureOutputDir();

  // Parse arguments
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--target');
  const targetArg = targetIndex !== -1 ? args[targetIndex + 1] : undefined;

  if (targetArg === 'all') {
    await buildAll();
  } else if (targetArg && TARGETS.includes(targetArg as Target)) {
    console.log(`🔨 Building for specified target: ${targetArg}\n`);
    const success = await buildForTarget(targetArg as Target);
    if (!success) process.exit(1);
  } else if (targetArg) {
    console.error(`❌ Unknown target: ${targetArg}`);
    console.error(`   Available targets: ${TARGETS.join(', ')}, all`);
    process.exit(1);
  } else {
    await buildCurrentPlatform();
  }

  console.log('\n💡 To use the sidecar, ensure tauri.conf.json includes:');
  console.log('   "bundle": { "externalBin": ["sidecars/aeat-bridge"] }');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
