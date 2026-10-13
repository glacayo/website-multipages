# Release 2.4.0 and guarded npm autopublishing

## Authorization and objective
User authorized reviewing/merging issue71 PR chain, making a new release and repairing automatic npm registry publication. Clarified npm means registry, not package manager. Keep pnpm-only, OIDC/token-free auth and supply-chain guards. Remote target github.com/glacayo/website-multipages. No native review switch change. No blind retry after uncertain publish.

## Evidence
PR83 draft tracker,84foundation,85coverage are mergeable with green CI and no review findings. Read-only source review found no severe analytics defect. Version2.3.1 published via OIDC on2026-09-29; publish workflow initially failed due missing binding (then fixed), subsequent publish succeeded but old confirmation50s timed out before registry visibility4minutes. Main624327b already has bounded300s confirmation. Workflow currently dispatch-only. Registry2.4.0 and annotated tagv2.4.0 absent at preflight. Official npm trusted-publishing docs show tag-push support with same repo/workflow/environment identity; current live npm settings not inspectable, historical OIDC success proven.

## Tasks
- [x] R1 (done; #85 merged to core as9fb2e816, aggregate CI passed, #84 merged to tracker as0456b8a5; local tracker fast-forwarded): Integrate reviewed child85 into84 then84 into draft83, preserving ancestry and fresh SHA/check gates; no final main merge yet.
- [x] R2 (verified; commit follows): Test-first guarded tag-push trigger plus dispatch retention; consistent tag binding/checkout/concurrency across all jobs. Preserve annotated tag==HEAD==fresh origin/main, token refusal, OIDC/provenance, registry absence/confirmation and remote tag drift checks. Update release docs.
- [ ] R3 (in progress): Prepare version2.4.0 in root/CLI/default template ref and tests/changelog, verify candidate with release guards, analytics/data/build/CLI/dry-run; update generated lock importer version only if required without dependency churn. No unapproved age-policy exceptions.
- [ ] R4 (pending): Commit/push verified release unit(s), recheck final tracker CI, mark ready and merge83 to main. Then create/push annotated v2.4.0 at exact refreshed main HEAD to trigger automation, monitor exact run and verify npm/GitHub release once. Stop on ambiguous outcome, never republish blindly.

## Constraints and checks
No npm commands as package manager, permanent age-rule relaxation, token fallback, schema changes, PII events, direct branch force pushes or unreviewed tag replacement. Automated tag push is irreversible publication authorization from user; guards must pass first. Every source unit has observed deterministic RED/GREEN as applicable and evidence/commit IDs; docs-only changes structural checks. Preserve unrelated worktrees. Current local branch coverage, clean before this task file.

## R2 evidence
Writer observed RED57pass/2fail then GREEN59/59 release-guard tests. Independent verifier59/59, 16 shell blocks bash-n valid, six simulated event CLI cases correct, diff check clean; no code-level trust-boundary blocker. Shellcheck/actionlint unavailable; remote workflow run pending. Effective tag propagated consistently across jobs, both event entrypoints retain fresh main/tag/HEAD equality and all OIDC/registry guards. 177 changed lines in4files. Advisory: check npm environment allows tag refs and tag creation protection before publication; current previously observed environment had no branch policy. External npm settings remain unverified live (historical OIDC successful).

## Next step
Commit R2, prepare2.4.0 version unit and tests/changelog with bounded writer, inspect remote environment/rulesets before R4. No final main merge/tag until verified.
