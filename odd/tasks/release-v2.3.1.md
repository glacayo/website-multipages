# Prepare release v2.3.1

## Authorization and scope
- Approved issue: #76 (created and approved before implementation with explicit maintainer consent).
- Branch: `chore/prepare-v2.3.1`, based on `origin/main` at `314aa94d1126a732f34444091b15599eff59c13c`.
- Prepare version identity, companion help/tests, current-version docs and release notes only.
- No dependency upgrades, lockfile regeneration, JSON schema changes, image tooling, tag, publication, workflow dispatch or GitHub Release.
- Commits, push and PR require a separate explicit delivery decision. RDD is clone-local off; terminal prior lineage is not repaired or approved.
- npm trusted publisher binding and 2FA policy were confirmed by the maintainer, not independently authenticated. Real OIDC/provenance remains untested.

## Execution and checks
- Route: delegated mapper and bounded writer (multi-file preparation); independent delegated verification after assessment.
- TDD: no explicit configured mode; ordinary functional checks, not inferred strict TDD.
- Exact checks: `node --test .github/scripts/test-release-guards.mjs`; `SKIP_CAPSULE_TESTS=1 SKIP_CLI_E2E=1 pnpm run test:cli`; `pnpm run validate:data`; `pnpm run build`. Independent verification also attempts capsule-free CLI E2E with `SKIP_CAPSULE_TESTS=1 pnpm run test:cli`.
- Do not run pre-tag identity command: it requires an existing annotated tag and matching main commit. Validate identity by manifests/ref and existing pure guard tests.
- Forecast: approximately 11 source/docs paths, 60–180 authored diff lines, excluding this tracker. Single small future PR linked to #76; no commit authorized yet.

## Tasks
- [x] T1 — Synchronize candidate versions, pinned tests/help and current-version documentation, with truthful release notes. Route: delegated writer. Status: implementation and focused checks complete. Commit: pending explicit authorization.
- [x] T2 — Independently verify identity, no unintended policy/data/dependency changes and required checks. Route: delegated verifier. Status: full capsule-free core E2E, data, build and release guards passed; no unexpected tracked changes. Delivery remains pending authorization.

## Progress
- Read-only mapping identified hardcoded smoke/help v2.3.0 pins requiring coordinated changes, bump-safe release guards, and no expected lockfile version changes.
- Issue #76 readback confirmed OPEN with `status:approved` and `type:chore`; main base confirmed before branching.

- Candidate diff: 10 tracked files, +78/-29, plus this tracker. Historical changelog entries preserved; lockfiles, dependency ranges, data contract and policy untouched.
- Initial ordinary pnpm commands failed before script execution because the version bump made ignored workspace install metadata stale; the auto-install child reapplied global minimumReleaseAge=43200. Native assessment was unavailable due to this untracked tracker, so independent verification was required (high-risk fallback), without starting RDD.
- Independent verifier succeeded with the previously authorized CLI-only exception used consistently: `pnpm --config.minimumReleaseAge=0 install --frozen-lockfile`, then guard tests 33/33, focused core CLI 31/31, data 12/12, build (Astro 127 files, zero errors/warnings/hints), and `git diff --check`. No lockfile or unexpected tracked changes.
- The maintainer explicitly authorized the inherited process-local exception `pnpm_config_minimum_release_age=0` for final E2E verification, with ordinary ignored install/build outputs and temporary scaffold git operations. No persistent setting was changed; the final sequence consistently used environment overrides rather than mixing mechanisms.
- Final independent verification: frozen install (0.976s); `SKIP_CAPSULE_TESTS=1 pnpm_config_minimum_release_age=0 pnpm run test:cli` passed 32/32 including temporary scaffold install/validate/build/git (26.141s); data 12/12 (0.684s); build (13.444s), Astro 127 checked files with zero diagnostics, 16 pages and 14 indexable routes; guards 33/33 (0.212s); whitespace clean. Pre/post status, diff and tracked index checks matched. Root/capsule lockfiles, policy and data unchanged.
- Three capsule-runtime tests were intentionally skipped; static isolation/policy checks ran. Remote fallback cloning, hosted CI for this candidate, real tag/registry identity and OIDC/provenance were not exercised. No blockers in the authorized local verification scope.

## Next step
Request explicit commit/push/PR authorization for the verified candidate linked to #76. Keep merge, tag and publication as separate decisions.
