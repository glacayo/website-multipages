# Release 2.4.0 and guarded npm autopublishing

## Authorization and objective
User authorized reviewing/merging issue71 PR chain, making a new release and repairing automatic npm registry publication. Clarified npm means registry, not package manager. Keep pnpm-only, OIDC/token-free auth and supply-chain guards. Remote target github.com/glacayo/website-multipages. No native review switch change. No blind retry after uncertain publish.

## Evidence
PR83 draft tracker,84foundation,85coverage are mergeable with green CI and no review findings. Read-only source review found no severe analytics defect. Version2.3.1 published via OIDC on2026-09-29; publish workflow initially failed due missing binding (then fixed), subsequent publish succeeded but old confirmation50s timed out before registry visibility4minutes. Main624327b already has bounded300s confirmation. Workflow currently dispatch-only. Registry2.4.0 and annotated tagv2.4.0 absent at preflight. Official npm trusted-publishing docs show tag-push support with same repo/workflow/environment identity; current live npm settings not inspectable, historical OIDC success proven.

## Tasks
- [x] R1 (done; #85 merged to core as9fb2e816, aggregate CI passed, #84 merged to tracker as0456b8a5; local tracker fast-forwarded): Integrate reviewed child85 into84 then84 into draft83, preserving ancestry and fresh SHA/check gates; no final main merge yet.
- [x] R2 (detached-tag blocker fixed and independently verified): Test-first guarded tag-push trigger plus dispatch retention; consistent tag binding/checkout/concurrency across all jobs. Preserve annotated tag==HEAD==fresh origin/main, token refusal, OIDC/provenance, registry absence/confirmation and remote tag drift checks. Update release docs.
- [x] R3 (2.4.0 candidate independently verified): Prepare version2.4.0 in root/CLI/default template ref and tests/changelog, verify candidate with release guards, analytics/data/build/CLI/dry-run; update generated lock importer version only if required without dependency churn. No unapproved age-policy exceptions.
- [x] R4 (merged and released; automatic push-trigger run succeeded): Commit/push verified release unit(s), recheck final tracker CI, mark ready and merge83 to main. Then create/push annotated v2.4.0 at exact refreshed main HEAD to trigger automation, monitor exact run and verify npm/GitHub release once. Stop on ambiguous outcome, never republish blindly.

## Constraints and checks
No npm commands as package manager, permanent age-rule relaxation, token fallback, schema changes, PII events, direct branch force pushes or unreviewed tag replacement. Automated tag push is irreversible publication authorization from user; guards must pass first. Every source unit has observed deterministic RED/GREEN as applicable and evidence/commit IDs; docs-only changes structural checks. Preserve unrelated worktrees. Current local branch coverage, clean before this task file.

## R2 evidence
Writer observed RED57pass/2fail then GREEN59/59 release-guard tests. Independent verifier59/59, 16 shell blocks bash-n valid, six simulated event CLI cases correct, diff check clean; no code-level trust-boundary blocker. Shellcheck/actionlint unavailable; remote workflow run pending. Effective tag propagated consistently across jobs, both event entrypoints retain fresh main/tag/HEAD equality and all OIDC/registry guards. 177 changed lines in4files. Advisory: check npm environment allows tag refs and tag creation protection before publication; current previously observed environment had no branch policy. External npm settings remain unverified live (historical OIDC successful).

## R3 scope clarification
R2 committed as c400d26. Remote npm environment currently has no ref policy/protection rules; repository rulesets list empty. No policies changed. Writer discovered CLI help independently hardcodes old default ref; user explicitly approved packages/create-contractor-site/bin/create-contractor-site.mjs for default-ref help update only. README.md, SKILL.md, AGENTS.md and CLI README remain out of scope; stale version references will be disclosed.

## R3 verification and deterministic blocker
Worker observed RED30pass/1fail against2.3.1 then GREEN31/31 CLI subset and59releaseguards. Independent verifier with renewed explicitly approved exact23 ephemeral age allowlist: analytics10/10,12JSONvalid,build/Astro0diagnostics,rendered11/11,fullCLI32pass/3expectedcapsuleskips (scaffold E2E uses localroot), releaseguards59/59. Hashes unchanged during verification. Dryrun current dirty feature workspace correctly refused; clean attached-main scratch candidate dryrun passed and9file tarball38,471bytes had no secrets/internal state. Clean detached scratch failed ERR_PNPM_GIT_UNKNOWN_BRANCH: tagpush would fail before publish. This reopens R2; not a product choice—retain pnpm git-checks by preparing local main at the freshly guard-verified exact tag/main commit in disposable CI checkout. No no-git-checks exception or publish occurred. Version/docs7files prepared locally, commit pending.

## Corrected publication context evidence
Writer observed RED59pass/3fail then GREEN62/62. Independent verifier62/62,16bash-nblocks,gitdiffcheck. Exact candidate reproduced across236trackedfiles in disposable localGitfixture (archive+patch); local annotatedv2.4.0==detachedHEAD==bareorigin/main. pnpm dryrun beforehelper failed unknownbranch; prepare-publish verified clean/version/tag/mainidentity then attachedmain at sameSHA; same pnpm dryrun passed2.4.0 without git-check/age/authoverrides. Dirtytrees,prerelease,lightweighttag,maindrift refused beforebranchrewrite. Manual attached-path guarded by repeat-helper tests; liveOIDC/GitHubtagtrigger remain to be exercised. No production tag or registrypublication yet.

## Final delivery evidence
- R2 commits c400d26 (guarded trigger) and6e71d8d (verified main publication context); R3 commit934853f (2.4.0). Fresh complete trackerCI/build/CLI andgitleaks passed at934853f.
- #83 markedready and merged to main as03fb31ea1487bdb670c47fac4ce5ce658b27f4e6; issue71 closed automatically. #84/#85 already merged in order. MainCI run38337613047 passed frozeninstall/build/releaseguards/fullcoreCLI.
- Registry2.4.0 canonical404 and tagabsence confirmed before one annotatedv2.4.0 tagpush at exactfreshmain03fb31e. Identity guard passed tag/manifests/defaultref/main.
- Automatic publish.yml run38337745249 eventpush/headv2.4.0 completedSUCCESS: validate38s (includingrealCI dryrun), OIDCpublish/provenance andboundedregistryconfirmation, GitHubrelease7s. No manualdispatch, tokenfallback, git-checkbypass or publicationretry.
- Final independent registryguard confirmed200 namecreate-contractor-site/version2.4.0. GitHubrelease https://github.com/glacayo/website-multipages/releases/tag/v2.4.0 published2026-10-13T02:41:31Z, notdraft/notprerelease. Run https://github.com/glacayo/website-multipages/actions/runs/38337745249.
- Publication proves liveOIDC/tagpath worked. GitHubenvironment/ruleset recommendations are still notinstalled; pnpm30-daypolicy and all guards unchanged. Browser/GTMPreview/Netlify clientacceptance notexecuted. Fourversionreference docs remained outofscope byuserchoice.

## Next step
Release complete. Evidence-only follow-up is recorded on feat/71-raven-analytics-hooks after fast-forward to releasedmain; no newruntime changes or extra release. Productionmain/tag remain03fb31e. Futurestableannotatedtags trigger publication automatically; unknownoutcomes must never be blindly rerun.
