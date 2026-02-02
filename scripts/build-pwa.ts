#!/usr/bin/env bun
import { $ } from 'bun';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const DIST = join(ROOT, 'dist');
const TARGET = join(ROOT, 'apps/haidodocs/public/tpv');

async function main() {
  console.log('🔨 Building TPV PWA...\n');

  // Build frontend
  console.log('📦 Running Vite build...');
  await $`PWA_BUILD=true bun run build`.cwd(ROOT);

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

  // Copy avatar images
  const avatarFiles = ['panxo.svg', 'nuka.svg', 'avatar-1.svg', 'avatar-2.svg', 'placeholder-avatar.svg'];
  for (const file of avatarFiles) {
    const src = join(ROOT, 'public', file);
    const dest = join(TARGET, file);
    if (existsSync(src)) {
      cpSync(src, dest);
      console.log(`  ✓ ${file}`);
    }
  }

  // Copy wallpaper
  const wallpaperSrc = join(ROOT, 'public', 'wallpaper.jpeg');
  const wallpaperDest = join(TARGET, 'wallpaper.jpeg');
  if (existsSync(wallpaperSrc)) {
    cpSync(wallpaperSrc, wallpaperDest);
    console.log('  ✓ wallpaper.jpeg');
  }

  // Copy theme CSS files to root public directory (for ThemeCore compatibility)
  // ThemeCore uses absolute paths like /src/themes/default-light.css
  const srcThemesDest = join(ROOT, 'apps', 'haidodocs', 'public', 'src', 'themes');
  mkdirSync(srcThemesDest, { recursive: true });
  const srcThemesSrc = join(TARGET, 'src', 'themes');
  if (existsSync(srcThemesSrc)) {
    const cssFiles = ['default-light.css', 'default-dark.css', 'supabase-light.css', 'supabase-dark.css', 'tangerine-light.css', 'tangerine-dark.css', 'base.css'];
    for (const file of cssFiles) {
      const src = join(srcThemesSrc, file);
      const dest = join(srcThemesDest, file);
      if (existsSync(src)) {
        cpSync(src, dest);
      }
    }
    console.log('  ✓ theme CSS files copied to public/src/themes/ for ThemeCore');
  }

  // Copy productos directory to root public directory (for product images)
  const productosDest = join(ROOT, 'apps', 'haidodocs', 'public', 'productos');
  const productosSrc = join(TARGET, 'productos');
  if (existsSync(productosSrc)) {
    mkdirSync(productosDest, { recursive: true });
    cpSync(productosSrc, productosDest, { recursive: true });
    console.log('  ✓ productos images copied to public/productos/');
  }

  // Fix manifest.json paths for /tpv subdirectory
  const manifestPath = join(TARGET, 'manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await Bun.file(manifestPath).text());
    // Update all paths to include /tpv prefix
    manifest.start_url = '/tpv/';
    manifest.icons = manifest.icons.map(icon => ({
      ...icon,
      src: icon.src.startsWith('/') ? `/tpv${icon.src}` : icon.src
    }));
    manifest.screenshots = manifest.screenshots?.map(screenshot => ({
      ...screenshot,
      src: screenshot.src.startsWith('/') ? `/tpv${screenshot.src}` : screenshot.src
    })) || [];
    manifest.shortcuts = manifest.shortcuts?.map(shortcut => ({
      ...shortcut,
      url: shortcut.url.startsWith('/') ? `/tpv${shortcut.url}` : shortcut.url,
      icons: shortcut.icons.map(icon => ({
        ...icon,
        src: icon.src.startsWith('/') ? `/tpv${icon.src}` : icon.src
      }))
    })) || [];
    await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('  ✓ manifest.json paths updated for /tpv');
  }

  // Fix products.json paths for /tpv subdirectory
  const productsJsonPath = join(TARGET, 'assets', 'products.json');
  if (existsSync(productsJsonPath)) {
    const products = JSON.parse(await Bun.file(productsJsonPath).text());
    // Transform products array to update uploadedImage paths
    if (Array.isArray(products)) {
      const updatedProducts = products.map((product: any) => ({
        ...product,
        uploadedImage: product.uploadedImage?.startsWith('/')
          ? `/tpv${product.uploadedImage}`
          : product.uploadedImage
      }));
      await Bun.write(productsJsonPath, JSON.stringify(updatedProducts, null, 2));
      console.log('  ✓ products.json paths updated for /tpv');
    }
  }

  // Generate PWA-specific service worker with /tpv paths
  const swSourcePath = join(ROOT, 'public', 'sw.js');
  const swDestPath = join(TARGET, 'sw.js');
  if (existsSync(swSourcePath)) {
    let swContent = await Bun.file(swSourcePath).text();
    // Update STATIC_ASSETS paths to include /tpv prefix
    swContent = swContent.replace(
      /const STATIC_ASSETS = \[[\s\S]*?\];/,
      `const STATIC_ASSETS = [
  '/tpv/',
  '/tpv/index.html',
  '/tpv/manifest.json',
  '/tpv/logo.svg',
  '/tpv/icon-192x192.png',
  '/tpv/icon-512x512.png',
  '/tpv/icon-128x128.png',
];`
    );
    // Update the fallback path from '/' to '/tpv/'
    swContent = swContent.replace(
      /const fallback = await caches\.match\('\/'\);/g,
      "const fallback = await caches.match('/tpv/');"
    );
    writeFileSync(swDestPath, swContent);
    console.log('  ✓ sw.js paths updated for /tpv');
  }

  console.log('\n✅ PWA build complete!');
  console.log(`   Output: ${TARGET}`);
  console.log('\n📝 To deploy:');
  console.log('   cd apps/haidodocs && bun run build');
}

main().catch(console.error);
