# Exploration: smart-image-cli-integration (final decision record)
> OpenSpec | sdd-explore | 2026-08-11 | **Round 2 supersedes Round 1.**
## Constraints & policy correction
- Root invariants (6, unchanged): root `install --frozen-lockfile`/`validate:data`/`build` never install/build/import the CLI; scaffold retains truthful entry points + skill; explicit setup may fail w/ remediation; no CLI/creds/state in `dist`; exact pins + isolated sharp/zod; pnpm-only.
- pnpm 11.18.0 `.npmrc` correction: v11 reads ONLY auth/registry from `.npmrc`; `ignore-scripts`/`min-release-age`/`package-lock`/`engine-strict`/`allow-git` are DEAD → effective policy lives in `pnpm-workspace.yaml` (camelCase).
## Round 1 (SUPERSEDED) — what it got wrong
- Tested `better-sqlite3@13.0.1` metadata (`install: node-gyp rebuild`, `gypfile: true`, no prebuilds) and generalized "needs Python/C++" to all 13.x → concluded CLI unrunnable, proposed deferral. Correct for 13.0.1; WRONG for the version actually resolved.
## Round 2 — evidence (proven on host w/ NO Python/cl/node-gyp)
- `smart-image-cli@0.3.0` resolves `better-sqlite3 ^13.0.1` → **`13.0.3`**: ships 8 prebuilds incl. `win32-x64.node` (1.9MB), **no install script, `gypfile: false`**; `new Database(":memory:")` → `SQLITE_OK`.
- `allowBuilds.better-sqlite3: false` (capsule-local) → pnpm skips build, uses prebuild. `true` → pnpm runs `node-gyp rebuild` (binding.gyp still in tarball) and FAILS on toolchain-free host. **True is harmful; false is correct. Root `pnpm-workspace.yaml` untouched.**
- Exact pins (capsule lock): `smart-image-cli@0.3.0`, `better-sqlite3@13.0.3`, `sharp@0.35.3`, `zod@3.25.76`; root keeps `sharp@0.34.5`/`zod@4.4.3`.
## Workspace isolation proof
- Nested `tools/smart-image/` (own `package.json`+`pnpm-workspace.yaml`+`pnpm-lock.yaml`) NOT absorbed: root scope stays "2 workspace projects"; `tools/*` ∉ root `packages` glob.
- `pnpm install --dir <cap>` → 17 pkgs in `<cap>/node_modules/.pnpm/` only; root `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml`/`.npmrc` git-status empty.
- Frozen capsule install exit 0 when lock committed ("already up to date"); **root `build` exit 0; `dist/` 0 matches** for smart-image-cli/better-sqlite3/.img-ia/CUSTOMER-IMAGES/pnpm-lock.
- Required capsule `pnpm-workspace.yaml`: `packages:[.]`, `allowBuilds.better-sqlite3: false`, `verifyDepsBeforeRun: false`, `minimumReleaseAgeExclude:[smart-image-cli@0.3.0]` (pre-set → no auto-mutation).
## Windows bin bug + wrapper
- `smart-img` bin dead on Windows pnpm isolated installs: shim path ≠ `import.meta.url` realpath → `isDirectRun()` false → `runCli()` never runs → exit 0, 0 bytes.
- Fix: wrapper imports `runCli`, passes `process.argv.slice(2)` as **array** to `runCli(["node","smart-img",...args])` — no shell, no interpolation. `node wrapper.mjs doctor --json` → 817B JSON, 9 checks pass; `--json; rm -rf /` → exit 3 `invalid_input` (literal).
## Entry points (truthful, no fallback)
- `images:check`: preflight (node≥22, capsule, sqlite binding loads, sharp, exiftool, provider) → exit 0 "ready" / exit 1 + remediation; never writes/sources.
- `images:setup`: `pnpm install --frozen-lockfile --dir <cap>` → exit 0 ready / exit 1 "setup failed"; network-isolated host = explicit failure, no fallback.
- `images:run -- <args>`: `node <cap>/wrapper.mjs <args>`; exit codes propagate (0 ok/2 no-match/3 invalid/4 provider/5 fs); not ready → exit 1 "run images:setup first"; provider warnings, no silent fallback.
## Scaffold + ignore rules
- Checked-in capsule (wrapper + lock + skill) RETAINED by scaffold; `REQUIRED_AFTER_COPY` asserts wrapper+skill presence.
- Runtime `.img-ia/` (state/`_out`/sidecars/journal/config) + root `CUSTOMER-IMAGES/` (originals) gitignored root-anchored + denied via `.img-ia` parent in `DENY_DIR_NAMES`.
- **Never add bare `_out`** to denylist (would block unrelated nested `_out/`); `.img-ia` parent transitively excludes `_out/`.
## Coverage, recommendation, risks, scope
- Existing: E2E scaffold test indirectly covers 2/10 denied dirs (openspec, packages); **no direct unit tests** for `isDeniedName`/`copyTemplate`. Required: direct `isDeniedName` unit (all entries + `*.log`/`.env*`), `copyTemplate` denylist integration, E2E asserts `.codegraph`/`.atl`/`docs_trash`.
- **Recommendation: R2-A** (isolated capsule + `runCli` wrapper). Rejected: R2-B (bin dead on Windows), R2-C (auto-created workspace placeholder → ERR_PNPM_IGNORED_BUILDS), R2-D (deferral, user-rejected), tarball/local-store (overengineered—lock pins exact).
- Risks: LOW better-sqlite3 drops prebuilds (lock pins 13.0.3; `images:check` surfaces); LOW upstream fixes bin bug (wrapper→no-op); LOW lockfile drift (both pin pnpm@11.18.0); MED `images:setup` fails offline (documented, no fallback).
- Scope EXCLUDED: autonomous image fulfillment, autonomous promotion into `src/`; human approves sourcing + promotion.