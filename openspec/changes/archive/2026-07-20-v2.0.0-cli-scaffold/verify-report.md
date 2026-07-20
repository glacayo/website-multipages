# Verification Report

**Change**: `v2.0.0-cli-scaffold`
**Version**: 2.0.0
**Mode**: Standard (`strict_tdd: false`; CLI smoke tests configured)
**Verified on**: 2026-07-20
**Verdict**: PASS

> **Final update (final staged-diff verification):** Security (no spawned
> `shell: true` option), template containment, published-template fallback,
> committed smoke tests, pre-write pnpm/git checks, service name+slug alignment,
> docs/help for `--yes` and env answers, `.env*` denylisting including `.envrc`,
> and JSON-LD script escaping are verified in the staged diff. `pnpm run
> validate:data`, `pnpm run build`, and `pnpm run test:cli` all passed on
> 2026-07-20.

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 19 |
| Tasks complete | 19 |
| Tasks incomplete | 0 |

All tasks in `tasks.md` are checked complete. No incomplete core or cleanup tasks were found.

---

## Build & Tests Execution

| Command / Check | Result | Evidence |
|-----------------|--------|----------|
| `pnpm run validate:data` | ✅ Passed | `validate-data: OK — 12 contract files valid.` |
| `pnpm run build` | ✅ Passed | `astro check`: 0 errors, 0 warnings, 0 hints; `astro build`: 16 pages built, complete. |
| `pnpm run test:cli` | ✅ Passed | `create-contractor-site smoke tests`: 9 passed, 0 failed, including command resolution without shell, pnpm version comparator, missing/non-empty target failures, template-root containment, service name/slug dedupe, target data replacement, and temp-target `--yes` scaffold/install/validate/build/git. |
| CLI help/docs | ✅ Passed | `node packages/create-contractor-site/bin/create-contractor-site.mjs --help` documents `--yes`, `CREATE_CONTRACTOR_SITE_ANSWERS_JSON`, template env vars, answer precedence, template source precedence, and pnpm-only setup. |
| Missing target argument | ✅ Passed | `node packages/create-contractor-site/bin/create-contractor-site.mjs` exited `1` and printed usage. |
| Existing non-empty target | ✅ Passed | CLI exited `1` and printed `Target directory is not empty... Choose a different directory...`. |
| Full temp-target E2E | ✅ Passed | Covered by `pnpm run test:cli`: temp-target `--yes` scaffold/install/validate/build/git passed. |
| Target `pnpm install` | ✅ Passed | Covered by `pnpm run test:cli` temp-target E2E; CLI ran `pnpm install` successfully. |
| Target `pnpm run validate:data` | ✅ Passed | Covered by `pnpm run test:cli` temp-target E2E; target JSON contract validation passed. |
| Target `pnpm run build` | ✅ Passed | Covered by `pnpm run test:cli` temp-target E2E; target build passed and produced `dist/`. |
| Target git init + commit | ✅ Passed | Covered by `pnpm run test:cli` temp-target E2E; target git init and required initial commit passed. |
| Guard files | ✅ Passed | E2E target retained `AGENTS.md`, `.npmrc`, `scripts/enforce-package-manager.cjs`, and `pnpm-workspace.yaml` with source-matching hashes. |
| Denylisted internal folders/files | ✅ Passed | Generated target did not contain `openspec`, `packages`, `.codegraph`, `.atl`, `docs_trash`, or `package-lock.json`. Copy source also deny-lists `node_modules`, `dist`, `.astro`, `.git`, logs, and any basename starting with `.env` (therefore `.envrc` is denied); post-install/build/git correctly creates `node_modules`, `dist`, `.astro`, and `.git` as runtime outputs. |
| No spawned `shell: true` option | ✅ Passed | Staged `run-command.mjs` has no non-comment `shell: true` match; the only spawn option is `shell: false`, and smoke tests assert command resolution without shell execution. |
| pnpm >=11.1.2 enforcement | ✅ Passed | Root and CLI package `engines.pnpm` / `devEngines.packageManager.version` require `>=11.1.2`; `run-command.mjs` uses `MIN_PNPM_VERSION = '11.1.2'` and fails older versions before writes. |
| Published clone fallback | ✅ Passed | Staged `copy-template.mjs` resolves local/env template roots first, then clones `CREATE_CONTRACTOR_TEMPLATE_REPO` / `CREATE_CONTRACTOR_TEMPLATE_REF` (default `v2.0.0`) into temp storage with a retry path for commit/default-branch refs and best-effort cleanup. |
| Service name+slug dedupe regression | ✅ Passed | Smoke tests verified `normalizePrimaryServices` drops name and slug duplicates and `buildAlignedServices` keeps unique names/slugs aligned with `business.services_offered`. |
| JSON-LD script escaping | ✅ Passed | Source inspection verified `SchemaOrg.astro` escapes `<`, `>`, `&`, U+2028, and U+2029 before `set:html` injection. |

**Coverage**: Not available; project config declares no coverage tool. CLI smoke tests execute but do not emit coverage metrics.

---

## Spec Compliance Matrix

| Requirement | Scenario | Runtime Evidence | Result |
|-------------|----------|------------------|--------|
| CLI invocation | CLI.1 — Binary invocation | E2E CLI started, printed welcome, and completed successfully. | ✅ COMPLIANT |
| CLI invocation | CLI.2 — Missing argument | Missing-arg command exited `1` and printed `Usage: create-contractor-site <target-dir>`. | ✅ COMPLIANT |
| CLI invocation | CLI.3 — Existing non-empty directory | Non-empty temp target command exited `1` with refusal and alternate-directory guidance. | ✅ COMPLIANT |
| Template copy | COPY.1 — Denylist | E2E target omitted internal denylisted paths (`openspec`, `packages`, `.codegraph`, `.atl`, `docs_trash`, `package-lock.json`); copy code deny-lists generated and secret paths. | ✅ COMPLIANT |
| Template copy | COPY.2 — Required files copied | E2E target contained required site files/assets and completed install/validate/build. | ✅ COMPLIANT |
| Template copy | COPY.3 — Guard files intact | Guard files were present and hash-matched source. | ✅ COMPLIANT |
| Interactive prompts | PROMPT.1 — Required fields | Source inspection confirms required readline prompts for business name, legal name, tagline, phone, email, street, city, state, ZIP, service area, founded year, primary services. | ✅ COMPLIANT |
| Interactive prompts | PROMPT.2 — Optional fields | Source inspection confirms optional Site URL uses `required: false` and preserves placeholder/no-change behavior when skipped. | ✅ COMPLIANT |
| Interactive prompts | PROMPT.3 — Validation | Source inspection confirms `ask()` re-prompts empty required values; primary services empty list throws. | ✅ COMPLIANT |
| JSON value replacement | JSON.1 — `business.json` replacement | E2E target `business.name` became `Acme Masonry`; validation passed. | ✅ COMPLIANT |
| JSON value replacement | JSON.2 — `services.json` replacement | Default services became unique display names: `Masonry`, `Patios`, `Retaining Walls`, `Retaining Walls Services`; slugs/ids remained stable and validation/build passed. | ✅ COMPLIANT |
| JSON value replacement | JSON.3 — Schema preservation | Target validation passed across the 12-file JSON contract. No top-level keys were removed/renamed and arrays were not flattened. | ✅ COMPLIANT |
| JSON value replacement | JSON.4 — Template unchanged | `git diff --quiet -- src/data` exited `0`; source template data remained unmodified. | ✅ COMPLIANT |
| pnpm install | INSTALL.1 — pnpm required | E2E output shows `→ pnpm install`; install completed. | ✅ COMPLIANT |
| pnpm install | INSTALL.2 — npm forbidden | Source inspection shows setup uses `runCommand('pnpm', ...)`; no `npm install`, `npm ci`, or `npx` setup invocation is present. | ✅ COMPLIANT |
| pnpm install | INSTALL.3 — Failure handling | Source inspection shows `runPnpmSetup()` is wrapped before git init and exits non-zero on setup failure before committing. | ✅ COMPLIANT |
| Git init + commit | GIT.1 — Init | E2E output shows `→ git init`; `.git/` exists in target. | ✅ COMPLIANT |
| Git init + commit | GIT.2 — Initial commit | Target last commit subject is `chore: initial client scaffold from contractor template`. | ✅ COMPLIANT |
| Verification | VERIFY.1 — Validation passes | Target `pnpm run validate:data` passed. | ✅ COMPLIANT |
| Verification | VERIFY.2 — Build passes | Target `pnpm run build` passed and produced `dist/`. | ✅ COMPLIANT |
| Verification | VERIFY.3 — Final success message | E2E output printed `✓ Scaffold complete`, target path, and next steps. | ✅ COMPLIANT |

**Compliance summary**: 21/21 scenarios compliant, 0 partial, 0 failing.

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| CLI binary/package exists under `packages/create-contractor-site/` | ✅ Implemented | Package exposes `bin.create-contractor-site`; bin has node shebang. |
| Missing target exits non-zero with usage | ✅ Implemented | `main()` exits `1`; runtime verified. |
| Existing non-empty target exits non-zero | ✅ Implemented | `validateTarget()` rejects existing non-empty dirs; runtime verified. |
| Copy denylist excludes generated/internal/secret files | ✅ Implemented | Denylist includes required entries plus `logs`, `packages`, `.atl`; runtime target inspection passed for internal denylisted paths. |
| Generated target preserves guards and 12-file JSON contract | ✅ Implemented | Guard hashes match; target validation passed. |
| JSON replacement is target-only | ✅ Implemented | `replaceTargetData(targetDir, answers)` writes under target `src/data`; source `src/data` diff clean after E2E. |
| Service names stay unique without changing stable slugs | ✅ Implemented | `uniqueServiceName()` dedupes both `business.services_offered` and `servicesData.services`; default fourth slot becomes `Retaining Walls Services`. |
| Target uses pnpm-only install/validate/build | ✅ Implemented | `runPnpmSetup()` only runs `pnpm install`, `pnpm run validate:data`, `pnpm run build`; runtime verified. |
| Target git init + initial commit succeeds | ✅ Implemented | Runtime verified with required commit message. |
| Template repo still validates and builds | ✅ Implemented | Root `pnpm run validate:data` and `pnpm run build` passed. |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Workspace package layout | ✅ Yes | Expected package, bin, and source modules exist. |
| CLI flow validate → prompt → copy → replace → pnpm → git → success | ✅ Yes | `main()` follows this sequence; runtime E2E confirms. |
| Recursive denylist copy | ✅ Yes | Required denylist implemented; extra exclusions for `packages/` and `.atl` are appropriate client-scaffold hygiene. |
| `readline/promises` prompt strategy | ✅ Yes | Implemented without prompt dependencies. |
| Value-only JSON replacement | ✅ Yes | Keys/arrays remain schema-valid; slugs/ids/variants are preserved. |
| pnpm-only execution | ✅ Yes | No npm/npx fallback in implementation. |
| Git initialization after build success | ✅ Yes | Git runs after `runPnpmSetup()` succeeds. |
| Workspace updates | ✅ Yes | `pnpm-workspace.yaml` includes `packages/*`; root build still passes. |
| Manual/temp-target verification | ✅ Yes | Covered by `pnpm run test:cli` temp-target scaffold E2E. |

---

## Issues Found

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

- Keep `SKIP_CLI_E2E=1` available for fast local loops; default smoke run should still execute the full temp-target scaffold when feasible.
- When publishing `create-contractor-site`, confirm GitHub repo/tag defaults (`CREATE_CONTRACTOR_TEMPLATE_REPO` / `REF`) match the release tag.

---

## Verdict

PASS → **review blockers addressed and verified**

The prior `Retaining Walls` duplicate display-name warning is resolved. The review-blocker pass additionally removes `shell:true`, rejects template-root targets, adds published clone fallback + cleanup, commits Node built-in smoke tests, asserts pnpm/git before writes, aligns service names/slugs across business+services JSON, documents `--yes`/env precedence in README/SKILL/CLI help, and hardens JSON-LD script emission. Root validation, root build, and CLI smoke/E2E tests all passed.
