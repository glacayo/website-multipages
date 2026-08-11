# Tasks: Smart Image CLI Integration (Isolated Capsule)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–950 total |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Capsule manifests and lock | PR 1 (~300) | `pnpm install --frozen-lockfile --dir tools/smart-image` | Root `pnpm run build` with capsule present | Revert `tools/smart-image/` |
| 2 | Real wrapper and entry points | PR 2 (~300) | `pnpm run test:cli` | `pnpm run images:check && pnpm run images:run -- doctor --json` | Revert wrapper/check and root scripts |
| 3 | Scaffold and ignore boundaries | PR 3 (~180) | `pnpm run test:cli` | Temp scaffold E2E in `test:cli` | Revert denylist, `.gitignore`, tests |
| 4 | Skill, docs, final audits | PR 4 (~220) | `pnpm run test:cli` | `pnpm run validate:data && pnpm run build` | Revert skill/docs/audit assertions |

## Phase 1: Capsule Foundation (PR 1)

- [ ] 1.1 RED — Extend `packages/create-contractor-site/scripts/smoke-test.mjs` to prove root workspace scope, unchanged root sharp/zod ranges/no overrides, and zero `dist/` capsule references.
- [ ] 1.2 GREEN — Create `tools/smart-image/package.json`, its `pnpm-workspace.yaml` (`allowBuilds.better-sqlite3: false`, `verifyDepsBeforeRun: false`), and exact locked `smart-image-cli@0.3.0`/transitives; leave root workspace, lock, `.npmrc`, and `src/**` unchanged.

## Phase 2: Invocation and Lifecycle (PR 2)

- [ ] 2.1 RED — Test shell metacharacters (`--json; rm -rf /`, `$(...)`, `&&`) through `images:run`; require literal argv, exit 3, and no side-effect file.
- [ ] 2.2 RED — Test Windows isolated execution: direct `smart-img doctor --json` is empty while the wrapper produces parseable JSON.
- [ ] 2.3 RED — Test no `images:` reachability from install/build/validate/CI and root `build` success without the capsule.
- [ ] 2.4 RED — Test missing capsule, deleted/truncated lock, and offline setup: non-zero remediation; missing provider key is warning/readiness detail, while provider-required work fails explicitly with no fallback.
- [ ] 2.5 GREEN — Create `tools/smart-image/run.mjs` and `check.mjs`; add root `images:check/setup/run` scripts, with setup using frozen lockfile and run using argv-array forwarding, truthful exit propagation, readiness warnings, and no fallback. Retain `runCli` until a future pinned CLI fix independently proves the Windows issue resolved.

## Phase 3: Scaffold and Git Isolation (PR 3)

- [ ] 3.1 RED — Directly test `isDeniedName` for every deny entry, `*.log`, `.env*`, plus `CUSTOMER-IMAGES.md`/`my-CUSTOMER-IMAGES`/`tools`/`_out` negatives; test `.img-ia/README.sh` is absent.
- [ ] 3.2 RED — Test `git check-ignore`: root `CUSTOMER-IMAGES`/`.img-ia` and capsule `node_modules` true; nested lookalikes and capsule source/lock/manifest/wrapper false.
- [ ] 3.3 RED — Test `copyTemplate`/`assertRequiredCopied`: denied parents copy no bytes, unrelated `_out` copies, and deleting any required capsule/wrapper/skill path reports a non-success miss.
- [ ] 3.4 GREEN — Create `.agents/skills/smart-image-cli/SKILL.md`; update `copy-template.mjs` and `.gitignore`; deny only `CUSTOMER-IMAGES`/`.img-ia` (never bare `_out`), retain `tools`, and require capsule, wrapper, skill, and scripts.
- [ ] 3.5 GREEN — Extend the existing scaffold E2E in `smoke-test.mjs` to assert state exclusion, capsule/wrapper/skill retention, and all `images:*` scripts.

## Phase 4: Documentation and Final Verification (PR 4)

- [ ] 4.1 GREEN — Update `AGENTS.md`, `README.md`, and `SKILL.md` with pnpm-only boundaries, readiness/credential behavior, manual promotion, seed-content rules, and the mandatory skill gate.
- [ ] 4.2 VERIFY — Run `pnpm run test:cli`, `pnpm run validate:data`, and `pnpm run build`; assert no JSON-contract/root enforcement changes and no automatic promotion from `.img-ia/_out/`.
