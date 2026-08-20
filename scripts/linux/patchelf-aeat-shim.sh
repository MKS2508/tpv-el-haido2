#!/bin/sh
# patchelf-aeat-shim.sh — wraps patchelf to skip the AEAT sidecar binary.
#
# linuxdeploy's bundled patchelf silently corrupts binaries produced by
# `bun build --compile` (an ELF with a Bun runtime payload appended after
# the normal sections) when it rewrites their rpath: the file grows a few
# KB, the md5 changes, and the binary stops running (empty/garbled output).
# Root-caused with a discriminator experiment (patch a pristine copy of the
# sidecar, diff md5 before/after) during TR-07 (2026-08-20), building
# linux-x64 natively on supermicro-pcbar.
#
# linuxdeploy supports overriding the patchelf binary it calls via the
# $PATCHELF env var (confirmed via `strings` on the linuxdeploy AppImage).
# Point $PATCHELF at this script, and set $REAL_PATCHELF to the actual
# patchelf binary — build-release.ts wires both automatically for linux
# targets, see `runTauriBuild()`.
#
# Match on the raw arg instead of `basename` — some basename implementations
# (coreutils/busybox) treat a leading `--` in the arg as an option and abort
# with "unrecognized option", which silently broke an earlier iteration of
# this shim.
set -eu

if [ -z "${REAL_PATCHELF:-}" ]; then
  echo "patchelf-aeat-shim: \$REAL_PATCHELF is not set — refusing to guess, would risk an infinite loop." >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    *aeat-bridge*)
      # Pretend patchelf ran successfully; leave the binary untouched.
      exit 0
      ;;
  esac
done

exec "$REAL_PATCHELF" "$@"
