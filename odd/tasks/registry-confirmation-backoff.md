# Registry confirmation backoff (issue #78)

## Objective
Prevent delayed npm registry visibility from falsely failing a successful token-free publication, without ever retrying the irreversible upload.

## Scope
- `.github/scripts/verify-release.mjs`
- `.github/scripts/test-release-guards.mjs`
- `.github/workflows/publish.yml`
- `docs/releasing.md`
- `CHANGELOG.md` (Unreleased note only, if needed)

## Constraints
- Preserve the single pre-publish absence check and exactly one `pnpm publish` invocation.
- Preserve the 10-second per-request registry timeout.
- Retry only bounded transient/visibility failures; fail closed for identity, redirect, malformed metadata, and authorization failures.
- Do not change versions, tags, package metadata, dependencies, lockfiles, JSON contract, or release 2.3.1.
- Effective TDD: off, source `openspec/config.yaml`; runner `pnpm run test:cli` is CLI-scoped. Verification uses ordinary functional checks.
- RDD clone-local switch is off.

## Tasks
- [x] Implement classified, injectable bounded confirmation helper and `--wait` path.
- [x] Replace workflow shell loop with one bounded helper invocation.
- [x] Add deterministic unit/static coverage and update runbook/changelog.
- [x] Run focused and required verification; record failures honestly.

## Acceptance checks
- `node --check .github/scripts/verify-release.mjs`
- `node --test .github/scripts/test-release-guards.mjs`
- `pnpm run validate:data`
- `pnpm run build`
- `SKIP_CAPSULE_TESTS=1 SKIP_CLI_E2E=1 pnpm run test:cli`
- `git diff --check`

## Progress
- Issue #78 created and approved: https://github.com/glacayo/website-multipages/issues/78
- Branch created from main `dbf6256587f541c2ee913616e7591b0b034d4e90`.
- Implementation (no commit): `probeRegistry` now attaches an additive `PROBE_KIND` (`network`/`timeout`/`redirect`/`malformed`) to status-0 results; exported pure helpers `nextConfirmationDelay` and `classifyConfirmationProbe`, plus the injectable `confirmRegistryVersion` (300000ms budget, 10s base, 60s cap, 10s max probe, no unaffordable probe, no final sleep). `registry --expect present --wait` is the only wait path; absent/non-wait behavior unchanged, and `--wait` with `--expect absent` fails closed.
- `publish.yml` confirmation step is now one `registry --tag "$RELEASE_TAG" --expect present --wait` call; exactly one publish command and the adjacent absence guard are intact.
- Focused verification: `node --check .github/scripts/verify-release.mjs` exit 0; `node --test .github/scripts/test-release-guards.mjs` 41 pass / 0 fail; `git diff --check` exit 0.
- Verification finding fixed (no commit): `probeRegistry` previously classified every thrown fetch error as `PROBE_KIND.NETWORK`, so a rejection caused by `redirect: 'error'` would have been retried by `--wait` instead of failing closed. `classifyProbeFetchError` now reads conservative evidence from the caught error and its bounded, cycle-safe `cause` chain (native fetch rejects with `TypeError: fetch failed` whose cause is `Error: unexpected redirect`): `TimeoutError`/`AbortError` stay `PROBE_KIND.TIMEOUT`, redirect evidence becomes fail-closed `PROBE_KIND.REDIRECT`, everything else stays retryable `PROBE_KIND.NETWORK`. Error messages are sanitized (control chars collapsed, URL userinfo redacted, length capped) and never dropped.
- Focused verification after the fix: `node --check .github/scripts/verify-release.mjs` exit 0; `node --test .github/scripts/test-release-guards.mjs` 44 pass / 0 fail (3 new tests: redirect rejection fail-closed/no-retry end to end, native network/timeout retryable end to end, cause-chain evidence classification); `git diff --check` exit 0.
- Full verification: focused checks pass (44 tests); data validation, build, and CLI smoke are blocked before script execution by inherited `minimumReleaseAge=43200`, including the authorized command-local `minimumReleaseAge=0` and process-local `npm_config_minimumReleaseAge=0` overrides. `git diff --check` passes.
- October 1 recheck: `pnpm run validate:data` still fails before script execution on 26 lockfile entries; build and CLI smoke were not rerun because the same pre-script gate remains. Syntax, 44 release guards, and whitespace checks pass. The newest blocked entry (`ansi-regex@6.4.0`, published September 27) cannot satisfy a 30-day global cutoff until about October 27. No global policy or lockfile change was made.
- October 12 recheck: `pnpm run validate:data` still fails before script execution on 23 of 395 lockfile entries. Build and CLI smoke were not run behind the same gate. Syntax, 44 release-guard tests, and `git diff --check` pass. The newest listed violator is `ansi-regex@6.4.0` (September 27); three entries are hidden by pnpm's bounded output, so October 27 at 03:35 UTC is only the earliest *known* clearance, not a guarantee.
- Remote `main` advanced to `68c13b12d87469525647b086c9b588dc539a264e`; this uncommitted branch is still based on `dbf6256587f541c2ee913616e7591b0b034d4e90`. Reconcile the mainline before delivery without overwriting the candidate, then verify again.
- October 12 authorized verification used `pnpm_config_minimum_release_age=10080` (seven days) only on individual commands; pnpm confirmed the effective value before running them, and the default remained 43200 afterward. `validate:data` passed 12/12; build passed the full guard/data/theme/routes/Astro chain (127 checked files, zero diagnostics; 16 built pages, 14 indexable routes); CLI tests passed 31/31 with three optional capsule-runtime tests and the full scaffold E2E skipped. Release guards passed 44/44, syntax and whitespace checks passed. pnpm automatically installed 286 packages from local store before the first script (zero downloads); `.npmrc`, workspace, and lockfile hashes and tracked worktree status remained unchanged.
- Read-only mainline comparison on October 12: remote `main` is `68c13b12d87469525647b086c9b588dc539a264e`, two commits ahead of the branch base, and changes only `.github/workflows/secret-scan.yml`. No overlap with this candidate's five tracked files or the task document. Recheck the moving base at delivery; no fetch/rebase/merge was performed.
- Native read-only ASSESS returned `unassessable` because the untracked task document requires an explicit declaration; RDD is clone-local off and the returned plan requests independent verification, which was run. Do not infer native review approval.
- User selected `feature-branch-chain` for the ~696-line tracked candidate; this choice did not authorize delivery. One cohesive slicing pass identifies PR 1 as probe fetch-error/metadata classification plus associated unit tests (~350-400 changed lines), and PR 2 as the bounded confirmation loop, CLI `--wait`, workflow wiring, related tests and docs (~300-350 lines). Keep each behavior with its tests. Actual slice counts and independent checks must be measured after splitting; do not remove tests or comments to fit.
- Remote comparison from `dbf6256` to current `main` `68c13b12` has two commits and changes only `.github/workflows/secret-scan.yml`, no overlap with candidate; verified default branch is `main`.
- User authorized local branch/commit preparation and requested updating to current main. Fetched `origin/main` at `68c13b12`; original uncommitted candidate remains untouched. Created linked tracker worktree `fix/issue-78-tracker` from that main and committed this task document as `19ec2cc5fb43ebc4e8db12b01ab3a2a49214df36`. Created local child `fix/issue-78-probe` from tracker; no code was written there.
- The writer's original Ollama Cloud provider requests returned HTTP 401 despite a locally ready auth record. After the user reauthenticated, response-only tests passed in both the original and probe worktrees; no credentials were printed or altered by this task.
- PR1 child `fix/issue-78-probe` committed `bcf3faf5e2e127a976a2dd752b0ff3a23839b876` on top of tracker `19ec2cc`: probe/error classification and sanitization with six focused tests, 297 authored lines. Independent checks passed: 39/39 release guards, full process-local seven-day pnpm build (12 data files, 16 pages, 0 diagnostics, 14 indexable), syntax and diff checks.
- PR2 child `fix/issue-78-confirm` committed `eb83f8145fd7323464c7e3c994f83b951034e02f` from PR1: pure bounded engine, monotonic default clock, fail-closed finite timing checks and hard attempt cap with no trailing sleep. User explicitly accepted this cohesive **651 authored-line** review overage before commit; splitting guards from the loop would have temporarily shipped unsafe behavior. Independent checks passed: 53/53 release guards, full process-local seven-day build, syntax and diff checks.
- PR3 child `fix/issue-78-wire` committed `08bd710d2f4e6b36f781286f8afaee36fcf3c654` from PR2: CLI `--expect present --wait`, publish.yml wiring, static/negative tests and runbook/changelog, **151 authored lines**. Independent checks passed: 57/57 release guards, 12/12 data files, full build (127 Astro files zero diagnostics, 16 pages, 14 indexable), CLI 31/31 with three optional capsule runtime tests and the full scaffold E2E skipped, syntax and diff checks. All pnpm checks used only the approved process-local seven-day age override; global thirty-day policy and lockfile unchanged. Remote main still `68c13b12` at last check; chain source worktrees clean.
- No push/PR/merge/publish/tag/release occurred. Next: verify chain/issue policy, obtain separate user authorization for remote branch push and draft tracker/child PR creation; do not merge or publish automatically.
