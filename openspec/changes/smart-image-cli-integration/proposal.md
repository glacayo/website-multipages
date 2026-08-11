# Proposal: Smart Image CLI Integration (Isolated Capsule)

## Intent

Images are promoted by hand with no provenance tracking. Add **real** `smart-image-cli` execution behind explicit commands, isolated from root install, `validate:data`, and `build`.

## Scope

### In Scope

- Checked-in capsule `tools/smart-image/` — own `package.json`, `pnpm-workspace.yaml`, committed `pnpm-lock.yaml`; outside root workspace globs, untouched by root install/validate/build.
- Exact `smart-image-cli@0.3.0` pin. Resolved `better-sqlite3@13.0.3` ships prebuilds, so capsule-local `allowBuilds.better-sqlite3: false` skips an unnecessary source rebuild — **no Python/C++ required**.
- Three entry points only: `images:check`, `images:setup`, `images:run`; never in `preinstall`, `build`, `validate:data`, or CI.
- Checked-in wrapper importing `runCli` — the upstream `smart-img` bin silently exits under pnpm symlink paths. It passes argument arrays without shell interpolation, isolates failures, and never falls back to source images.
- Every scaffold retains `tools/smart-image/`, the scripts, wrapper, and mandatory skill.
- Only runtime state/candidates/originals (`.img-ia/`, root `CUSTOMER-IMAGES/`) are gitignored, scaffold-denied, `dist/`-excluded. No committed capsule file under `.img-ia`; `_out` never denied globally.
- Direct `isDeniedName`/`copyTemplate` tests (indirect coverage only today).

### Out of Scope

- Autonomous slot fulfillment, asset promotion, slot registry, JSON rewriting, attribution rendering.
- Root `sharp`/`zod` alignment — capsule transitives stay isolated; no bundle contamination.

## Capabilities

### New Capabilities

- `image-tooling`: capsule layout, invocation boundary, filesystem contract, secret/state isolation, skill contract.

### Modified Capabilities

- `contractor-theme`: §2.7 `cli-scaffold` (deny/required-after-copy entries, coverage), §2.6 `agent-developer-docs` (tooling boundary, mandatory skill).

## Approach

`images:setup` installs the capsule with `--frozen-lockfile`; it may need network and fail explicitly with remediation. `images:check` probes readiness, `images:run` invokes the wrapper. Site lifecycle stays green regardless.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `tools/smart-image/` | New | Manifest, workspace config, lock, wrapper |
| `package.json` | Modified | `images:*` scripts; no CLI dependency |
| `.gitignore` | Modified | `/CUSTOMER-IMAGES/`, `/.img-ia/`, capsule `node_modules/` |
| `packages/create-contractor-site/` | Modified | Deny `CUSTOMER-IMAGES`/`.img-ia`, require capsule/wrapper/skill, cover deny/copy + retention |
| `.agents/skills/smart-image-cli/SKILL.md` | New | Agent usage contract |
| `AGENTS.md`, `README.md`, `SKILL.md` | Modified | Boundary, prerequisites, skill gate |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `allowBuilds: true` forces `node-gyp` on toolchain-free hosts | Med | `false`, capsule-only |
| Upstream bin exits silently under pnpm symlinks | High | Wrapper is the sole invocation path |
| `better-sqlite3` drops prebuilds | Low | Lock pins `13.0.3`; `images:check` probes the binding |
| `images:setup` fails without network | Med | Explicit remediation; lifecycle unaffected |
| State, credentials, or originals leak | Med | `.img-ia` deny, gitignore, `dist/` audit |

## Rollback Plan

Delete `tools/smart-image/` and the skill; revert `package.json`, `.gitignore`, `copy-template.mjs`, `smoke-test.mjs`, docs. Root `pnpm-workspace.yaml` and lockfile were never touched, so root install and `build` stay green. No `src/` or JSON-contract change.

## Dependencies

- `smart-image-cli@0.3.0` pinned in the capsule lock only; network for setup; optional provider key outside the repo.

## Success Criteria

- [ ] Without Python/C++: root `install --frozen-lockfile`, `validate:data`, `build` pass; root lock/workspace unchanged.
- [ ] Capsule `install --frozen-lockfile` exits 0 without compiling; `images:run -- doctor --json` green.
- [ ] Capsule unavailable → only `images:*` fails, actionably; no fallback.
- [ ] Scaffold retains capsule, scripts, wrapper, skill; no `.img-ia/`/`CUSTOMER-IMAGES/` bytes.
- [ ] `dist/` has zero capsule or CLI references; root keeps its own `sharp`/`zod`.
- [ ] Tests cover every deny entry and prove unrelated `_out/` still copies.
