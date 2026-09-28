# npm trusted publishing infrastructure

## Objective
Prepare a reviewable, pnpm-only GitHub Actions CI and npm trusted-publishing workflow for `create-contractor-site`, without tagging, publishing or changing package versions in this work unit. This is the infrastructure prerequisite for a later coordinated v2.3.1 GitHub/npm release.

## Context and constraints
- Branch: `ci/trusted-publishing-infrastructure` from clean `main` after PR #73.
- The repository currently has no GitHub workflows; GitHub environment `npm` exists, and `create-contractor-site@2.3.0` is already published. A maintainer must bind the exact owner/repository/workflow/environment in npmjs.com after the workflow lands on `main`.
- pnpm 11.18.0 only. Do not alter `.npmrc`, `pnpm-workspace.yaml`, package-manager guards, or the 12-file JSON data contract. Do not add any `images:*` invocation to CI, install, build or validation. Image tooling stays optional and local. Do not add npm credentials, tokens or secret values to the repo.
- User previously authorized a command-local `--config.minimumReleaseAge=0` exception for this dependency-upgrade/release work while global minimumReleaseAge=43200 blocks fresh lockfile checks; never persist that exception in CI or repository policy.
- TDD mode: no explicit configured mode found; use ordinary focused checks and full applicable verification. Exact runners: `SKIP_CAPSULE_TESTS=1 SKIP_CLI_E2E=1 pnpm --config.minimumReleaseAge=0 run test:cli` for fast CI-equivalent smoke; a full local `pnpm --config.minimumReleaseAge=0 run test:cli` requires the installed optional capsule and skill gate; `pnpm --config.minimumReleaseAge=0 run validate:data`; `pnpm --config.minimumReleaseAge=0 run build`.
- Delivery strategy: ask-on-risk. Forecast ~300–400 authored changed diff lines across tests, two workflows and docs; generated files excluded. Reassess before PR if the running total exceeds 400.

## Tasks
- [x] **T1 — Isolate optional capsule smoke.** Route: delegated writer (multi-file preparation/context trigger). Added an opt-in `SKIP_CAPSULE_TESTS=1` gate around three capsule runtime tests; static no-images-in-CI assertions and default full suite remain unchanged. Core smoke passed 31/31 and local capsule smoke passed 34/34 with E2E skipped. Work-unit commit: `2809c21c68186a355a4ec7bc5e18a0b4447c77d4`.
- [ ] **T2 — Add pnpm-only CI checks.** Route: delegated writer for new workflow and any narrowly necessary test/script coupling. On PR and main, run frozen install, build and core CLI smoke, without `images:*` commands or persisted age exception. Validate workflow structure and affected smoke gate. Work-unit commit: pending.
- [ ] **T3 — Add guarded token-free publish workflow and docs.** Route: delegated writer. Manual dispatch from `main` with exact annotated tag input; verify tag/Main/working commit/version identity and package dry-run, use GitHub-hosted environment `npm` plus `id-token: write` only in publishing job; pnpm native publish with provenance and no `NPM_TOKEN`; confirm registry result before creating GitHub release. Document one-time npmjs.com trusted-publisher binding and recovery boundaries. No actual publish, tag or version bump. Work-unit commit: pending.
- [ ] **T4 — Independently verify and prepare PR.** Route: delegated verifier for commands and parent for issue/PR orchestration. Rerun relevant tests/build, inspect diff and policy files, create/link an approved issue and PR with exactly one type label; do not merge, tag or publish until the workflow has passed its own checks and user release step is ready. Work-unit commit: pending if follow-up corrections are needed.

## Progress and evidence
- 2026-09-28: read-only mapping found optional capsule runtime tests in `packages/create-contractor-site/scripts/smoke-test.mjs`, plus a static CI policy test that scans workflow YAML for forbidden image command strings. Root version and CLI remain 2.3.0; next release 2.3.1 is intentionally paused pending safe publication automation. Official npm trusted publishing documentation requires an exact workflow filename, repository and optional GitHub environment binding. pnpm v11 publish is native, not an npm CLI proxy; validate OIDC behavior on the first actual release.

- 2026-09-28 T1 complete: delegated writer changed only `packages/create-contractor-site/scripts/smoke-test.mjs` (+21/-4); `SKIP_CAPSULE_TESTS=1 SKIP_CLI_E2E=1 pnpm --config.minimumReleaseAge=0 run test:cli` passed 31/31, and default capsule runtime path with `SKIP_CLI_E2E=1` passed 34/34. `node --check` and `git diff --check` passed; capsule lockfile restored and ignored probe directories absent. Native committed-range ASSESS initially returned unassessable because this task document remained untracked; commit the task record and reassess on a clean tree before proceeding.

## Next step
Commit task evidence, assess the committed work unit on a clean tree, then delegate T2 CI workflow.
