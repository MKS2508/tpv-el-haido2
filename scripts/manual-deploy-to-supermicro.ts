#!/usr/bin/env bun
/**
 * manual-deploy-to-supermicro.ts
 *
 * Bridges the "hub published but not on supermicro desktop yet" gap.
 * Queries desktop-release-hub for the latest TPV El Haido AppImage on a target
 * triple, downloads to /tmp, scp's to supermicro-pcbar via SSH (Tailscale-only),
 * places on Desktop, chmod +x. Optional: replace ~/.local/bin symlink, cleanup
 * older AppImages on Desktop.
 *
 * Locked by: waxin 2026-08-24 ("automatiza este proceso con manual-deploy-to-supermicro.sh o .ts")
 *   2026-08-24: appimaged as MIME handler for AppImage double-click (waxin)
 *   2026-08-24: AUR fallback via paru (CachyOS removed appimaged from official repos)
 *
 * Usage:
 *   bun run scripts/manual-deploy-to-supermicro.ts [options]
 *
 * Options:
 *   --version <v>       Specific version to deploy (default: latest from hub)
 *   --target <t>        Target triple (default: linux/x86_64)
 *   --hostname <h>      SSH host (default: supermicro-pcbar.vpn.mks2508.local)
 *   --dest <path>       Remote destination dir (default: ~/Desktop)
 *   --replace-symlink   Also point ~/.local/bin/tpv-el-haido.AppImage → new
 *   --cleanup           Remove older tpv-haido-*.AppImage on remote Desktop
 *   --skip-mime-handler  Skip appimaged install on remote (default: false, appimaged is installed)
 *   --list              List hub latest, don't download/transfer
 *   --dry-run           Show actions, no mutations
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';

const HUB_OTA_BASE = 'https://haido.releases.mks2508.systems';
const DEFAULT_TARGET = 'linux/x86_64';
const DEFAULT_HOSTNAME = 'supermicro-pcbar.vpn.mks2508.local';
const DEFAULT_DEST = '~/Desktop';

type Args = {
  version?: string;
  target: string;
  hostname: string;
  dest: string;
  replaceSymlink: boolean;
  cleanup: boolean;
  installMimeHandler: boolean;
  list: boolean;
  dryRun: boolean;
};

function parseCli(): Args {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      target: { type: 'string', default: DEFAULT_TARGET },
      hostname: { type: 'string', default: DEFAULT_HOSTNAME },
      dest: { type: 'string', default: DEFAULT_DEST },
      'replace-symlink': { type: 'boolean', default: false },
      cleanup: { type: 'boolean', default: false },
      'skip-mime-handler': { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
  });
  return {
    version: values.version,
    target: values.target!,
    hostname: values.hostname!,
    dest: values.dest!,
    replaceSymlink: !!values['replace-symlink'],
    cleanup: !!values.cleanup,
    installMimeHandler: !values['skip-mime-handler'],
    list: !!values.list,
    dryRun: !!values['dry-run'],
  };
}

function info(msg: string): void {
  console.error(`[INFO] ${msg}`);
}

function err(msg: string): void {
  console.error(`[ERROR] ${msg}`);
}

function exec(args: string[], opts: { dryRun?: boolean } = {}): string {
  if (opts.dryRun) {
    info(`[dry-run] ${args.join(' ')}`);
    return '';
  }
  info(`exec: ${args.join(' ')}`);
  return execFileSync(args[0]!, args.slice(1), {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Expands a leading `~` to `$HOME` so the path is safe in SSH non-interactive
 * bash (bash non-login non-interactive doesn't expand `~`, but `$HOME` is always
 * an env var so `${HOME}` expands in any mode). Use for commands passed to
 * `sshExec` — the remote bash will expand it.
 *
 * Do NOT use this for paths passed to `scpPush`: scp does NOT spawn a remote
 * shell, it constructs the destination path natively, so `$HOME` would end up
 * as a literal directory name. For SCP use `expandTildeScp` instead.
 */
function expandTildeBash(path: string): string {
  if (path === '~' || path.startsWith('~/')) {
    return '${HOME}' + path.slice(1);
  }
  return path;
}

/**
 * Expands a leading `~` to a literal `~/` prefix for use with `scpPush`. SCP
 * resolves `~` natively on the remote (it uses the user's home dir from the
 * remote shell context, no shell invocation needed).
 */
function expandTildeScp(path: string): string {
  if (path === '~' || path.startsWith('~/')) {
    return '~' + path.slice(1);
  }
  return path;
}

type Manifest = {
  version: string;
  url: string;
  pub_date: string;
  filename: string;
};

async function fetchManifest(target: string): Promise<Manifest> {
  const url = `${HUB_OTA_BASE}/api/updates/${target}/0.0.0`;
  info(`querying hub: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`hub returned HTTP ${response.status} for ${url}`);
  }
  const data = (await response.json()) as { version: string; url: string; pub_date: string };
  const filename = data.url.split('/').pop()!;
  return { ...data, filename };
}

async function downloadToTemp(url: string, filename: string): Promise<string> {
  const localPath = `/tmp/${filename}`;
  info(`downloading ${url} → ${localPath}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await Bun.write(localPath, buffer);
  info(`downloaded ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(1)} MiB)`);
  return localPath;
}

function scpPush(localPath: string, hostname: string, remotePath: string, opts: { dryRun?: boolean }): void {
  exec(['scp', '-o', 'ConnectTimeout=8', '-o', 'BatchMode=yes', localPath, `${hostname}:${remotePath}`], opts);
}

function sshExec(hostname: string, remoteCmd: string, opts: { dryRun?: boolean }): string {
  return exec(['ssh', '-o', 'ConnectTimeout=8', '-o', 'BatchMode=yes', hostname, remoteCmd], opts);
}

async function main(): Promise<void> {
  const args = parseCli();
  info(`=== Manual deploy to ${args.hostname} ===`);
  info(`target: ${args.target}  dest: ${args.dest}${args.dryRun ? '  [DRY-RUN]' : ''}`);
  info(`install-mime-handler: ${args.installMimeHandler}`);

  const manifest = await fetchManifest(args.target);
  info(`hub latest: ${manifest.version} (published ${manifest.pub_date})`);
  info(`asset URL:  ${manifest.url}`);
  info(`asset name: ${manifest.filename}`);

  if (args.version && args.version !== manifest.version) {
    info(`note: requested version ${args.version} but hub latest is ${manifest.version}`);
  }
  const version = args.version ?? manifest.version;
  if (args.list) {
    info(`--list mode: not downloading`);
    return;
  }

  // 1. Download to /tmp
  const localPath = await downloadToTemp(manifest.url, manifest.filename);

  // 2. SCP to supermicro — use expandTildeScp (scp resolves ~ natively,
  //    does NOT spawn remote shell so $HOME would stay literal)
  const remotePathScp = `${expandTildeScp(args.dest)}/${manifest.filename}`;
  scpPush(localPath, args.hostname, remotePathScp, { dryRun: args.dryRun });

  // 3. chmod +x on remote — use expandTildeBash for SSH non-interactive bash
  const remotePathBash = `${expandTildeBash(args.dest)}/${manifest.filename}`;
  sshExec(args.hostname, `chmod +x ${JSON.stringify(remotePathBash)}`, { dryRun: args.dryRun });

  // 4. Optional: replace ~/.local/bin symlink
  if (args.replaceSymlink) {
    sshExec(args.hostname, `ln -sf ${JSON.stringify(remotePathBash)} ${expandTildeBash('~/.local/bin/tpv-el-haido.AppImage')}`, { dryRun: args.dryRun });
    info(`updated ~/.local/bin symlink`);
  }

  // 5. Optional: cleanup older AppImages on remote Desktop
  if (args.cleanup) {
    const cmd = `find ${expandTildeBash(args.dest)} -maxdepth 1 -name 'tpv-haido-*.AppImage' ! -name ${JSON.stringify(manifest.filename)} -print -exec rm -v {} \\;`;
    sshExec(args.hostname, cmd, { dryRun: args.dryRun });
    info(`cleaned up old AppImages on ${args.dest}`);
  }

  // 6. Cleanup local /tmp
  if (existsSync(localPath)) {
    unlinkSync(localPath);
    info(`removed local tmp file: ${localPath}`);
  }

  // 7. Ensure appimaged installed on remote. Tries official repo first
  //    (Arch), falls back to AUR via paru (CachyOS removes appimaged from
  //    [extra] / uses cachyos-extra-v3 which doesn't carry it). Idempotent
  //    via `--needed` in both paths. Failure tolerant — never aborts deploy.
  if (args.installMimeHandler) {
    info(`ensuring appimaged on ${args.hostname}...`);
    const cmd = `if command -v pacman >/dev/null 2>&1 && ` +
                `  sudo pacman -S --noconfirm --needed appimaged 2>/dev/null; then ` +
                `  echo '[INFO] appimaged installed via pacman (official Arch)'; ` +
                `elif command -v paru >/dev/null 2>&1; then ` +
                `  echo '[INFO] appimaged not in official repos, trying AUR via paru'; ` +
                `  paru -S --noconfirm --needed appimaged-bin || echo '[WARN] AUR install failed (non-fatal)'; ` +
                `elif command -v yay >/dev/null 2>&1; then ` +
                `  echo '[INFO] appimaged not in official repos, trying AUR via yay'; ` +
                `  yay -S --noconfirm --needed appimaged-bin || echo '[WARN] AUR install failed (non-fatal)'; ` +
                `else ` +
                `  echo '[INFO] no pacman/paru/yay detected, skipping MIME handler install (manual install required)'; ` +
                `fi`;
    sshExec(args.hostname, cmd, { dryRun: args.dryRun });
    info(`appimaged ensured on ${args.hostname} (pacman → AUR fallback; non-pkg-mgr skipped silently)`);
  }

  info(`=== DONE ===`);
  info(`on ${args.hostname}: double-click ${remotePathBash}`);
  if (!args.replaceSymlink) {
    info(`to make official install: re-run with --replace-symlink`);
  }
  info(`version deployed: ${version}`);
}

main().catch((e: Error) => {
  err(e.message);
  process.exit(1);
});