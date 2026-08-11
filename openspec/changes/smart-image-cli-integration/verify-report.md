```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f4d80d3ae269b67ca2171a874f7cfbe606028a149f62682535ac559f836d75fc
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 15/15
test_command: pnpm run test:cli
test_exit_code: 0
test_output_hash: sha256:88e4b5c9bf8e51db823256fa8ff906a31393ca107836073acb688fafde21d471
build_command: pnpm run build
build_exit_code: 0
build_output_hash: sha256:de6b6e48100bffb162a39c07b03b88759534ec832dfc2464ec87280caa86c4b8
```

## Verification Report

**Change**: smart-image-cli-integration  
**Version**: N/A  
**Mode**: Standard  
**Branch**: `docs/smart-image-tooling-guide`  
**Artifact store**: OpenSpec

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 14 |
| Tasks complete | 14 |
| Tasks incomplete | 0 |
| Requirements complete | 6/6 |
| Scenarios compliant | 15/15 |

The authoritative specs contain four `image-tooling` requirements with eight scenarios and two `contractor-theme` requirements with seven scenarios.

### Build & Tests Execution

All hashes below are SHA-256 digests of the captured merged command output preimages.

| Command | Exit | Output hash | Runtime result |
|---------|-----:|-------------|----------------|
| `pnpm run images:check` | 0 | `sha256:2c46e6b6cb68752ed915c4680fe01192412ec1075994cf61e59a015ebb7a699f` | `ready` |
| `pnpm run images:setup` | 0 | `sha256:5eb5ab6e21db5211805002d40e68359a183640ccc9f0204dd38c840b993dc4c5` | Already up to date; pnpm 11.18.0 |
| `pnpm run images:setup` (immediate rerun) | 0 | `sha256:22b9c89b0491269f75cee57b36ab87c997532feecf5f1508e2d81aea483f2c2b` | Already up to date; no fetch |
| `pnpm run images:check` (post-setup) | 0 | `sha256:2c46e6b6cb68752ed915c4680fe01192412ec1075994cf61e59a015ebb7a699f` | `ready` |
| `pnpm run images:run -- doctor --json` | 0 | `sha256:30d7b4fcf610e791e6f4a8967f57629bd2bfe1b2813c1a22740e597d0c8f5483` | JSON success; nine checks passed; credential was redacted |
| `pnpm run test:cli` | 0 | `sha256:88e4b5c9bf8e51db823256fa8ff906a31393ca107836073acb688fafde21d471` | 35 passed, 0 failed |
| `pnpm install --frozen-lockfile` | 0 | `sha256:b41735d7b6c49d2a963ee92b218876313f9e4978144b9d960794693c22243d14` | Scope remained exactly two workspace projects |
| `pnpm run validate:data` | 0 | `sha256:3c95b8ee84d08b4afc350be192c402332ccf6d77104a28f8aad9b97d43606204` | 12 contract files valid |
| `pnpm run build` | 0 | `sha256:de6b6e48100bffb162a39c07b03b88759534ec832dfc2464ec87280caa86c4b8` | 0 Astro diagnostics; 16 pages built; route gate passed |
| `pnpm --dir tools/smart-image list --depth 10` | 0 | `sha256:0e887a85b628f9b71226fb2872b8f4dec7e7b677904ad1ea588d1b45f1e4bca5` | Capsule resolved `smart-image-cli 0.3.0`, `better-sqlite3 13.0.3`, `sharp 0.35.3`, `zod 3.25.76` |

#### Focused adversarial probes

| Probe / exact invocation | Exit | Output hash | Result |
|--------------------------|-----:|-------------|--------|
| In a current-tree temp fixture with `tools/smart-image/` removed: `pnpm install --frozen-lockfile`, then `pnpm run validate:data`, then `pnpm run build` | 0 / 0 / 0 | `sha256:b26566df6cace3e933ec9e307a7693ef803685d80ed14af298d6d24e882a7659` | Root lifecycle passed with capsule absent |
| In a fresh temp fixture: `pnpm run images:setup -- --offline --store-dir "C:\Users\Geovanny Lacayo\AppData\Local\Temp\opencode\sdd-verify-smart-image-cli-integration\offline-empty-store"` | 1 (expected) | `sha256:08ce2378d6feeb49997390b4296805ceedf5ae8a306b3121b545d0a8fc29f364` | Explicit `ERR_PNPM_NO_OFFLINE_TARBALL`; no fallback |
| In that partial/offline fixture: `pnpm run validate:data`, then `pnpm run build` | 0 / 0 | `sha256:45868fbe470f0d3492add268a626725eb7a934282c7195b5f0e60fa02364cd2e` | Root lifecycle remained green after setup failure |
| Temp source missing `.agents/skills/smart-image-cli/SKILL.md`: `node .\packages\create-contractor-site\bin\create-contractor-site.mjs --yes <target>` with `CREATE_CONTRACTOR_TEMPLATE_ROOT`, `CREATE_CONTRACTOR_SITE_SKIP_SETUP=1`, and `NODE_ENV=test` | 1 (expected) | `sha256:eebd5c536bb1fd55e705c57426c666a985b6663f8315975868401cd2d2c2bfe8` | Missing path reported; `Scaffold complete` absent |
| Inline Node assertions over `AGENTS.md`, `README.md`, and `SKILL.md` | 0 | `sha256:7838918d62cd2064369a2e69508b3594341fb3121c75ec4cd9edfa53b8ca7047` | Three documentation scenarios passed |
| Fresh temp capsule: `pnpm run images:setup -- --store-dir "C:\Users\Geovanny Lacayo\AppData\Local\Temp\opencode\sdd-verify-smart-image-cli-integration\fresh-capsule-store"` | 0 | `sha256:3d5d143b2a7a65fb70ba429151a70f1fefc56d17b13fad6c3b4336874e5f32e3` | Downloaded/added 17 packages; no `node-gyp`, Python, MSVC, or C++ invocation |
| Fresh temp capsule: `pnpm run images:check` | 0 | `sha256:2c46e6b6cb68752ed915c4680fe01192412ec1075994cf61e59a015ebb7a699f` | SQLite prebuild and Sharp loaded; `ready` |
| Candidate-preservation probe over `.img-ia/_out/sdd-verify-no-promotion.txt`, `src/assets/images/`, and `src/data/` after all required commands | 0 | `sha256:cc8322a3b4ed32bd51cc6c5c5fb594f848a349fb8b02932b3149dc3407471606` | Candidate remained unchanged during the probe; no promoted bytes and no source status changes |
| Baseline and production-output isolation audit | 0 | `sha256:dc93b2e5b944c89b31e00a4c4ef7b7d0253e55178032f35c85b8eb8986ecb5a9` | Zero baseline changes in root lock/workspace/`.npmrc`/`src/data`/validator; two root workspaces; 60 `dist` files, zero prohibited hits |

The expected non-zero probes are negative-path successes and are not command failures. The primary test and build commands both exited zero.

**Coverage**: ➖ Not available — this project uses smoke, integration, scaffold E2E, Astro diagnostics, and build gates rather than coverage instrumentation.

### Spec Compliance Matrix

| Requirement | Scenario | Runtime evidence | Result |
|-------------|----------|------------------|--------|
| Isolated Capsule Workspace, Build Policy, and Root Lifecycle Isolation | Capsule installs in isolation with a working native binding | Fresh temp `images:setup` added 17 capsule packages without toolchain invocation; fresh `images:check` loaded SQLite/Sharp; `test:cli` verified two root workspaces and no root `better-sqlite3` policy. | ✅ COMPLIANT |
| Isolated Capsule Workspace, Build Policy, and Root Lifecycle Isolation | Root lifecycle stays green and script-free | `test:cli` runtime hook/CI assertions passed; current full-capsule install/validate/build passed; scaffold E2E covered capsule source without capsule `node_modules`; absent-capsule temp install/validate/build passed. | ✅ COMPLIANT |
| Explicit Setup and Truthful Wrapper Invocation | Setup succeeds without redundant reinstall | Two consecutive `pnpm run images:setup` executions exited 0 and both reported `Already up to date`; fresh setup also installed successfully. | ✅ COMPLIANT |
| Explicit Setup and Truthful Wrapper Invocation | Setup fails explicitly without network | Offline root-script probe exited 1 with `ERR_PNPM_NO_OFFLINE_TARBALL` and the missing package URL; subsequent validate/build passed. | ✅ COMPLIANT |
| Explicit Setup and Truthful Wrapper Invocation | Wrapper runs correctly where the bin is silent | Windows `test:cli` proved the pnpm `smart-img` shim emitted no output while both wrapper paths emitted parseable doctor JSON; explicit doctor command also passed. | ✅ COMPLIANT |
| Explicit Setup and Truthful Wrapper Invocation | Arguments never reach a shell, and failure has no silent fallback | `test:cli` passed literal `;`, `$()`, and `&&` payloads through root script/direct wrapper, received exit 3, created no marker, and verified not-ready exit 1 remediation. | ✅ COMPLIANT |
| State, Secret, and Production Output Isolation | No leakage into dist or scaffold output, dependencies stay capsule-scoped | Build plus isolation audit found zero prohibited path/content hits in 60 `dist` files; E2E scaffold excluded runtime roots and retained capsule; capsule/root version assertions passed. | ✅ COMPLIANT |
| Scope Limited to Safe Tooling | No automatic promotion | A real ignored `_out` candidate remained byte-identical while images commands, tests, validation, and build ran; all source assets/data remained clean and contained no candidate bytes. | ✅ COMPLIANT |
| Scaffold Excludes Image-Tooling State While Retaining the Capsule and Skill | Image-tooling state excluded, capsule and skill retained | Full `test:cli` scaffold E2E asserted `CUSTOMER-IMAGES`/`.img-ia` absent and capsule manifest/workspace/lock/wrappers/skill plus three scripts present. | ✅ COMPLIANT |
| Scaffold Excludes Image-Tooling State While Retaining the Capsule and Skill | Unrelated `_out` still copies; a missing required path fails loudly | Integration test copied unrelated `_out` and reported each required miss; dedicated CLI probe exited 1, named the missing skill, and emitted no success banner. | ✅ COMPLIANT |
| Scaffold Excludes Image-Tooling State While Retaining the Capsule and Skill | Direct denylist unit coverage exists | `test:cli` directly invoked `isDeniedName` for every deny entry, `*.log`, `.env*`, and allowed near-misses including `tools` and `_out`. | ✅ COMPLIANT |
| Scaffold Excludes Image-Tooling State While Retaining the Capsule and Skill | E2E smoke path covers deny and retention together | Full temp-target scaffold E2E passed install, validation, build, and git while asserting both deny and retention sets. | ✅ COMPLIANT |
| Accurate Reuse Documentation | Agent treats leftover seed content as rewritable | Runtime documentation probe passed across all three required docs for authoritative identity and expected rewritable masonry/hardscape seed content. | ✅ COMPLIANT |
| Accurate Reuse Documentation | Agent follows `SKILL.md` without violating contract | Runtime documentation probe verified the add-service workflow names only `business.json.services_offered`, `services.json.services`, optional `landings.json.landing_pages`, and `pnpm run build`, with no npm/npx command. | ✅ COMPLIANT |
| Accurate Reuse Documentation | Agent reads the image-tooling skill before invoking `images:*` | Runtime documentation probe verified the mandatory skill path/gate and lifecycle isolation in all required docs; the skill was re-read before every verification-time root `images:*` invocation. | ✅ COMPLIANT |

**Compliance summary**: 15/15 scenarios compliant.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Isolated capsule and lifecycle | ✅ Implemented | Nested workspace owns manifest/workspace/lock; root workspace remains `[., packages/*]`; root lock, workspace, `.npmrc`, and data/validation files match the pre-implementation baseline. |
| Explicit setup and wrapper | ✅ Implemented | Three root scripts only; `run.mjs` imports capsule-local `runCli`, forwards an argv array, and propagates exit status. |
| Output/state/secret isolation | ✅ Implemented | Root-anchored runtime ignores, scaffold deny rules, no root dependency alignment, and zero production-output references were verified. |
| Safe-tooling scope | ✅ Implemented | No slot registry, fulfillment, asset promotion, JSON rewrite, or attribution pipeline was introduced. |
| Scaffold contract | ✅ Implemented | Deny names, required-after-copy paths, direct unit coverage, integration failure behavior, and E2E retention/exclusion are present. |
| Reuse documentation | ✅ Implemented | `AGENTS.md`, `README.md`, root `SKILL.md`, and the scaffolded image-tooling skill state pnpm/data/variant/build rules and the mandatory invocation boundary. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Nested capsule isolation | ✅ Yes | Capsule owns its dependency graph; root remains exactly two workspaces. |
| `allowBuilds.better-sqlite3: false` capsule-only | ✅ Yes | Present only in capsule workspace config; fresh install used the prebuild without toolchain invocation. |
| Exact pins | ✅ Yes | Runtime graph/lock confirmed CLI 0.3.0, SQLite 13.0.3, Sharp 0.35.3, and Zod 3.25.76. |
| `runCli` wrapper instead of upstream bin | ✅ Yes | Wrapper source and Windows runtime test both confirm the chosen path. |
| Three explicit scripts only | ✅ Yes | Package/CI runtime assertions found no lifecycle reachability. |
| Provider warning/failure split | ✅ Yes | Missing-provider check remained exit 0 with warning; provider-required `pick` failed explicitly in `test:cli`. |
| Root lifecycle isolation | ✅ Yes | Full, source-only/partial, failed-partial, and absent capsule states all retained green root lifecycle evidence. |
| Scaffold deny/retention | ✅ Yes | Runtime state/originals excluded; capsule/wrappers/scripts/skill retained. |
| Gitignore near-misses | ✅ Yes | Root runtime paths and capsule `node_modules` ignored; nested lookalikes and capsule sources trackable. |
| Skill contract and docs | ✅ Yes | Mandatory pre-invocation gate, no fallback, credential location, and manual promotion are documented and scaffolded. |
| No silent fallback | ✅ Yes | Negative-path probes and tests produced explicit non-zero exits without source/copy fallback. |
| Manual promotion only | ✅ Yes | Candidate/source hash and status probe found no automatic copy or JSON edit. |
| Stable setup-failure wording from design interface | ⚠️ Deviation | The direct package script truthfully propagates pnpm's actionable offline error, but it does not add the design's stable `setup failed: <network|package>` wrapper-owned prefix/remediation sentence. This does not break the spec scenario because the runtime error identifies offline mode, the missing package, and its download URL. |

### Issues Found

**CRITICAL**: None.

**WARNING**:

1. `images:setup` relies on pnpm's native failure text rather than emitting the design's stable wrapper-owned `setup failed: <network|package>` wording. The observed offline failure was explicit and actionable, so scenario compliance remains intact, but diagnostic wording may vary with pnpm versions.

**SUGGESTION**: None.

### Archive Readiness

The SDD change is verification-complete. Native review/review authority remains the next delivery gate described by the launch context; archive only after that gate succeeds.

### Verdict

PASS WITH WARNINGS

All six requirements and all fifteen scenarios have passing runtime evidence. No implementation, planning, task, source, documentation, staging, branch, commit, or review-authority changes were made by verification; only this admitted report is eligible for persistence.
