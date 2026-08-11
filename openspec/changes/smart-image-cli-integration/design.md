# Design: Smart Image CLI Integration (Isolated Capsule)

## Technical Approach

`smart-image-cli@0.3.0` runs for real from a **checked-in nested pnpm workspace** at `tools/smart-image/` — own `package.json`, `pnpm-workspace.yaml`, committed `pnpm-lock.yaml` — outside root `packages: [., packages/*]`. Root install/`validate:data`/`build`/CI never resolve, build, or import it. Three explicit scripts are the only entry points; a checked-in wrapper importing `runCli` is the sole path. JSON data contract impact: **none**; root `pnpm-workspace.yaml`, `.npmrc`, and `pnpm-lock.yaml` stay **unchanged**, leaving the high-risk enforcement surface untouched.

## Architecture Decisions

### Decision: capsule-local `allowBuilds.better-sqlite3: false`

| Option | Tradeoff | Decision |
|---|---|---|
| `true` | tarball still ships `binding.gyp` → `node-gyp rebuild` fails, no Python/MSVC | Reject |
| **`false`** | skips build; `13.0.3` ships `prebuilds/*.node` → loads toolchain-free | **Chosen** |
| root-level | leaks native policy into the enforcement file | Reject |

### Decision: import `runCli`, never the `smart-img` bin

`0.3.0`'s `isDirectRun()` compares `process.argv[1]` (symlink) against `import.meta.url` (real `.pnpm/...` path). Under pnpm on Windows they differ, `runCli()` never fires: **exit 0, zero output** — a fake command. The wrapper calls `runCli` with an argv array: truthful, shell-free.

### Decision: deny the `.img-ia` parent, never bare `_out`

`isDeniedName` (`copy-template.mjs:36`) is exact-basename membership at any depth; `walk` (`:220`) skips denied entries without recursing, so `DENY_DIR_NAMES += CUSTOMER-IMAGES, .img-ia` already excludes `.img-ia/_out/`. Bare `_out` would kill unrelated client dirs. `tools` is never denied — the capsule scaffolds.

## Data Flow

```
install --frozen-lockfile / validate:data / build / CI ──✗── no capsule code path

images:check → node tools/smart-image/check.mjs
images:setup → pnpm install --frozen-lockfile --dir tools/smart-image
images:run -- <args> → node tools/smart-image/run.mjs <args>
                        └→ runCli(argv[]) → CLI → exit propagated

tools/smart-image/**  checked in ──→ scaffold target (required)
.img-ia/, CUSTOMER-IMAGES/ ignored ──✗── git, dist/, scaffold
                                     └── manual copy ──→ src/assets/
```

## File Changes

| File | Action | Description |
|---|---|---|
| `tools/smart-image/package.json` | Create | private; `smart-image-cli` exact `0.3.0` |
| `tools/smart-image/pnpm-workspace.yaml` | Create | `packages:[.]`; `allowBuilds.better-sqlite3:false`; `verifyDepsBeforeRun:false`; `minimumReleaseAgeExclude:[smart-image-cli@0.3.0]` — pre-set, so pnpm never rewrites it |
| `tools/smart-image/pnpm-lock.yaml` | Create | committed; exact `0.3.0`/`13.0.3`/`sharp 0.35.3`/`zod 3.25.76` |
| `tools/smart-image/run.mjs` | Create | wrapper: `runCli`, argv array, exit propagation |
| `tools/smart-image/check.mjs` | Create | readiness probe + remediation |
| `.agents/skills/smart-image-cli/SKILL.md` | Create | agent contract |
| `package.json` | Modify | +3 `images:*`; no dependency, no lifecycle hook |
| `.gitignore` | Modify | `/CUSTOMER-IMAGES/`, `/.img-ia/`, `tools/smart-image/node_modules/` |
| `.../src/copy-template.mjs` | Modify | +2 deny entries; `REQUIRED_AFTER_COPY` += capsule manifest/workspace/lock, `run.mjs`, skill |
| `.../scripts/smoke-test.mjs` | Modify | tests below |
| `AGENTS.md`, `README.md`, `SKILL.md` | Modify | boundary, prerequisites, skill gate |
| root `pnpm-workspace.yaml`, `.npmrc`, `pnpm-lock.yaml`, `src/**` | **Unchanged** | asserted by test |

## Interfaces / Contracts

```
images:check  0 ready | 1 "<missing prerequisite>" + setup command   never writes/downloads
images:setup  0 installed | 1 "setup failed: <network|package>"   no fallback
images:run    CLI exit propagated (0,2,3,4,5) | 1 "run images:setup first"   no fallback
```

Credentials: `~/.config/smart-image-cli/` or env only — never repo, never `dist/`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | deny entries, `*.log`, `.env*`, negatives (`tools`, `_out`) | direct `isDeniedName` import |
| Integration | `copyTemplate` temp tree; `git check-ignore`; wrapper argv/exit | `mkdtempSync` + `spawnSync` |
| E2E | scaffold retention + exclusion + 3 scripts | extend `smoke-test.mjs:1112` |
| Lifecycle | root `install --frozen-lockfile`/`validate:data`/`build`, capsule absent + installed | `pnpm run build` |

## Threat Matrix

| Boundary | Adversarial cases | Applicability | Safe / failure behavior | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `CUSTOMER-IMAGES.md`, `my-CUSTOMER-IMAGES`, `README.sh` in `.img-ia/` | **Applicable** | exact basename only; parent deny halts recursion | near-miss `false`, exact `true`, nested files absent |
| Git repository selection | root vs `src/CUSTOMER-IMAGES/`; capsule `node_modules` vs sources | **Applicable** | root-anchored ignores; capsule sources tracked | `check-ignore` true at root/`node_modules`, false nested and on lock/manifest/wrapper |
| Argument composition | `-- --json; rm -rf /`, `$(...)`, `&&` | **Applicable** | argv array to `runCli`; no shell | literal passthrough, exit 3, no side-effect file |
| Executable invocation (Windows/symlink) | pnpm isolated layout; upstream bin | **Applicable** | wrapper sole path; bin never invoked | `images:run -- doctor --json` parses; bin stdout empty |
| Lifecycle reachability | `images:*` in `preinstall`/`build`/`validate:data`/CI | **Applicable** | no hook; isolated failure, no fallback | no lifecycle script matches `images:`; `build` green sans capsule |
| Capsule integrity + network | missing dir, deleted/truncated lock, offline | **Applicable** | `check` not-ready + remediation; `setup` explicit non-zero | non-zero + remediation; `build` exits 0 |
| Workspace/store isolation | root absorbs capsule; `sharp`/`zod` leak; `dist/` refs | **Applicable** | outside root globs; isolated store; no production import | root scope = 2 projects; ranges unchanged, no `overrides`; `dist/` 0 matches |
| Scaffold retention | required capsule/wrapper/skill path absent | **Applicable** | `assertRequiredCopied` lists misses | delete a required path → reported, non-success exit |
| Commit state | staged, `commit -a`, empty index | **N/A** — no commit automation | — | — |
| Push state | tracking branch, first push, refspec | **N/A** — no push automation | — | — |
| PR commands | `--head`, env prefix, composed | **N/A** — no PR automation | — | — |

## Migration / Rollout

No data migration. Three chained slices, each far under 400 lines: (1) capsule + `images:*` + `.gitignore`, (2) deny/required + tests, (3) skill + docs.

**Rollback**: delete `tools/smart-image/` + the skill dir; revert `package.json`, `.gitignore`, `copy-template.mjs`, `smoke-test.mjs`, docs. Root lock/workspace/`.npmrc`/`src/` were never touched — install and `build` stay green.

## Open Questions

- [ ] Non-blocking: should `images:check` warn on a missing provider key, or stay silent since `pick`/`analyze` fail explicitly?
- [ ] Non-blocking: once upstream fixes `isDirectRun()`, keep the wrapper as pass-through or retire it?
