# /tmp/tr14-report.md — Lane sib/tr14 — TR-14 OTA bundle CI pipeline

filesChanged: |
  .github/workflows/ota-bundle-deploy.yml   (120 lines, IDENTICAL to plan M1 YAML — byte-for-byte diff OK)
  $ git diff HEAD -- .github/workflows/
  (empty — working tree clean, no uncommitted changes)

verifyPassed:
  - V1: File identity — diff against plan M1 YAML block → 0 lines of diff (FILES IDENTICAL)
  - V2: Dry-run local (`bun install --frozen-lockfile && bun run build && build-bundle.ts pack --min 0.1.3 --max 0.1.3 --version 2026.08.22-99`) → bundle.zip 15.98 MB + manifest.json emitted at releases/bundles/2026.08.22-99/
  - V3: Contract checks on local dry-run → root index.html OK · signature 64 bytes OK · bundleVersion format YYYY.MM.DD-N OK · hash format sha256:<64hex> OK
  - V4: ed25519 signature verification against embedded pubkey (src-tauri/ota-bundle-pubkey.txt) → OK
  - V5: CI real (gh workflow run ota-bundle-deploy.yml, run 32541763433) → conclusion "success" in 31s, all 13 steps green including "Verify ed25519 signature against embedded pubkey"
  - V6: Artifact uploaded → ota-bundle-2026.08.22-6 (16.76 MB, created 2026-08-22T00:53:58Z)
  - V7: Prohibition grep (`grep -rln "softprops/action-gh-release\|releases/download\|latest.json" .github/workflows/ota-bundle-deploy.yml`) → no match (expected)
  - V8: Native workflows untouched (`git diff HEAD -- .github/workflows/linux-x64-deploy.yml .github/workflows/linux-arm64-deploy.yml`) → empty (expected)

verifyOutput: |
  --- CI run final state ---
  $ gh run list --workflow=ota-bundle-deploy.yml --repo MKS2508/tpv-el-haido2 --limit 1 --json ...
  {
    "conclusion": "success",
    "createdAt": "2026-08-22T00:53:22Z",
    "databaseAt": 32541763433,
    "displayTitle": "📦 OTA Bundle (JS partial channel)",
    "event": "workflow_dispatch",
    "headBranch": "main",
    "name": "📦 OTA Bundle (JS partial channel)",
    "status": "completed",
    "updatedAt": "2026-08-22T00:53:56Z",
    "url": "https://github.com/MKS2508/tpv-el-haido2/actions/runs/32541763433"
  }

  --- CI run steps (all ✓) ---
  ✓ Set up job
  ✓ Checkout
  ✓ Setup Bun
  ✓ Install dependencies
  ✓ Build frontend (typecheck + vite build)
  ✓ Restore OTA signing key
  ✓ Resolve version window + bundle id
  ✓ Pack + sign bundle
  ✓ Verify contract (index.html root, manifest shape)
  ✓ Verify ed25519 signature against embedded pubkey     ← critical check
  ✓ Upload artifact
  ✓ Publish instructions (manual interim -- incremento (a) de TR-14)
  ✓ Post Setup Bun / Post Checkout / Complete job
  Duration: 31s

  --- Local dry-run manifest.json (2026.08.22-99) ---
  {
    "bundleVersion": "2026.08.22-99",
    "hash": "sha256:325fe3cf67700684d2da60efb4b1abcc4975d97e2f22f07e24de992c8cc2400b",
    "url": "/api/bundles/2026.08.22-99/download",
    "minNativeVersion": "0.1.3",
    "maxNativeVersion": "0.1.3",
    "signature": "xnlvkwCbVWvphCsxzjrHLWSm+EBzUVLJwKEb+eO4KgbY9YPb+lfCBglg5X2sr1s8XWpU8SQWO4OZ3X21N3eQAA==",
    "releasedAt": "2026-08-22T00:52:58.342Z"
  }

  --- ed25519 verify (local) ---
  ed25519 verification OK (pubkey=xIK/I9Xm75Kr..., sig=xnlvkwCbVWvp...)

introducedWorkarounds: []

architecturalConcerns:
  - severity: info
    symptom: "lane sib/tr14 es NO-OP — el commit con el trabajo YA EXISTE en main"
    brokenContract: "el handoff asume escribir un commit nuevo en sib/tr14; el commit d902ab1 (mismo contenido, mismo autor, mismo mensaje exacto del plan) ya está merged a main desde una lane previa (2026-08-21 02:58:32 CEST)"
    cleanFix: "N/A — el orquestador que lanzó esta lane probablemente relanzó sin comprobar que el work ya estaba mergeado. La verificación real (CI dispatch end-to-end con el secret) sí aporta valor nuevo y se ejecutó (run 32541763433 success)."
    whyNotPatched: "el ejecutor no debe crear un commit duplicado (mismo árbol, mismo mensaje) — sería ruido en la historia; tampoco debe reescribir historia sin OK explícito de waxin (anti-leak / no-destructivo)."
    flaggedBy: "sib_minimax_2_tr14 (lane current)"
    details: |
      - sibo/tr14 HEAD == main HEAD == 9dd9817
      - d902ab1cb44b26edf240ab3e58f857f4b2cd15c4 es ancestro de main (merge-base OK)
      - tag v0.1.3 apunta a d902ab1 (release publicado contra ese commit)
      - working tree limpio en sib/tr14 (git status = nothing to commit)
      - diff byte-a-byte entre /tmp/plan-yaml.yml (extraído del .plan.md) y
        .github/workflows/ota-bundle-deploy.yml = 0 líneas → archivo en worktree
        es literalmente el YAML del plan, sin desviaciones
      - no se creó ningún commit nuevo en sib/tr14 → commitHash = null abajo

stopReason: null   # la verificación se completó end-to-end; no se paró por error
ghRunUrl: https://github.com/MKS2508/tpv-el-haido2/actions/runs/32541763433
commitHash: null   # ver architecturalConcerns — el commit único (d902ab1) ya está en main desde 2026-08-21
