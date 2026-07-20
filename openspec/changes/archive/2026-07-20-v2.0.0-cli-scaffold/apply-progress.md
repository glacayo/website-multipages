# Apply Progress: v2.0.0-cli-scaffold

**Mode**: Standard (Strict TDD not active — no test runner)
**Status**: 19/19 original tasks complete + **review-blocker fix pass**
**Delivery**: feature-branch-chain (conceptual work units; no PRs opened in apply)

## Work units (commit-ready boundaries)

| Unit | Scope | Status |
|------|--------|--------|
| 1 | Workspace + binary + validate-target + copy denylist | Done |
| 2 | Prompts + value-only JSON replacement | Done |
| 3 | pnpm/git commands + docs + E2E verification | Done |
| 4 | Review-blocker hardening (security, publishability, smoke tests, docs) | Done |

## Completed tasks

All Phase 1–5 tasks marked `[x]` in `tasks.md`.

## Review-blocker fix pass (post-verify)

Addressed staged-change review findings without opening a new change:

| # | Finding | Fix |
|---|---------|-----|
| 1 | Windows `shell: true` command string | `run-command.mjs` uses argv spawn only; resolves `pnpm.cmd` / `git.exe`; prefers `node pnpm.cjs` when available; cmd.exe `/d /s /c` only as last resort with discrete quoted tokens |
| 2 | Target inside template root | `validateTarget(raw, { templateRoot })` rejects same-or-inside template paths |
| 3 | Published package has no template files | CLI-only `files` kept; resolve order: `CREATE_CONTRACTOR_TEMPLATE_ROOT` → local monorepo walk → temp `git clone` of repo/ref with cleanup |
| 4 | No committed smoke tests | `packages/create-contractor-site/scripts/smoke-test.mjs` + root `pnpm run test:cli` |
| 5 | Tool checks after writes / weak recovery | pnpm+git asserted before writes; staged recovery guidance; temp clone cleanup in `finally` |
| 6 | Service dedupe names only | `normalizePrimaryServices` + `buildAlignedServices` uniquify names **and** slugs; `business.services_offered` aligned to `services.json` |
| 7 | Docs for `--yes` / env JSON | README, SKILL, CLI `--help` document flags, env vars, and precedence |
| 8 | JSON-LD `</script>` breakout | `SchemaOrg.astro` escapes `<`, `>`, `&`, U+2028/U+2029 in script context |

## Files changed

| File | Action | What Was Done |
|------|--------|---------------|
| `pnpm-workspace.yaml` | Modified | Added `packages/*` |
| `packages/create-contractor-site/package.json` | Created/Updated | bin, engines, repository metadata, `test:smoke`, files includes scripts |
| `packages/create-contractor-site/bin/create-contractor-site.mjs` | Created/Updated | Full help, preflight checks, recovery guidance, template cleanup |
| `packages/create-contractor-site/src/validate-target.mjs` | Created/Updated | Non-empty + template-root containment guards |
| `packages/create-contractor-site/src/copy-template.mjs` | Created/Updated | Denylist copy + env/local/clone template resolution |
| `packages/create-contractor-site/src/prompts.mjs` | Created | readline/promises required fields |
| `packages/create-contractor-site/src/replace-data.mjs` | Created/Updated | Aligned name/slug-safe service replacement |
| `packages/create-contractor-site/src/run-command.mjs` | Created/Updated | Argv-only spawn; safe Windows tool resolution |
| `packages/create-contractor-site/scripts/smoke-test.mjs` | Created | Committed Node built-in smoke suite |
| `src/components/seo/SchemaOrg.astro` | Modified | JSON-LD script-context escaping |
| `package.json` | Modified | `test:cli` script |
| `README.md` | Modified | Scaffold usage, env/flags, template source, smoke tests |
| `SKILL.md` | Modified | Scaffold workflow, env/flags, guards |
| `openspec/changes/archive/2026-07-20-v2.0.0-cli-scaffold/*` | Updated | Progress + verify notes for review fix pass |

## Deviations from design

1. **Denylist also excludes `packages/` and `.atl`** — required so client scaffolds do not receive the CLI monorepo package or internal agent tooling.
2. **Service slugs**: template leading slugs stay stable when unique; appended rows and collisions get uniquified slugs; offered list always mirrors final catalog.
3. **Non-interactive flags**: `--yes` and `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` (env wins over `--yes`).
4. **Published template source**: not bundled in npm `files`; remote clone fallback instead of shipping the full template tree.
5. **Windows runner**: no `shell: true`; cmd.exe only when a `.cmd` shim has no Node entrypoint.

## Remaining tasks

None for this change. Optional follow-up: publish workflow docs for npm release of `create-contractor-site`.

## Workload / PR boundary

- Mode: review-fix pass on staged `v2.0.0-cli-scaffold` (no commit requested)
- Estimated review budget impact: moderate delta on top of original CLI package
