# Raven analytics hooks — issue #71

## Objective
Provide stable GTM selectors and a harmless dataLayer bootstrap across the reusable template without client IDs, channel computation or PII.

## Authorized scope and constraints
User approved implementation of the previously proposed plan. Preserve the twelve JSON schemas and business-data loaders, pnpm guards, routes and native Netlify POST to /thank-you. Do not add AJAX, share/related UI, GTM snippets, dependencies or optional form_start. Existing share/related UI is absent. Preserve international + in phone links; do not infer a country code. User now explicitly authorized commits, push and PR creation in github.com/glacayo/website-multipages. Selected feature-branch-chain: draft/no-merge tracker feat/71-raven-analytics-hooks -> main; child1 -> tracker; child2 -> child1. Tracker uses Closes #71, children Refs #71. No merge or native review activation authorized.

## Tasks
- [x] T1 (implemented and verified; commit deferred by user-authority constraint): Implement the coherent analytics contract with focused tests and docs. Bootstrap in BaseLayout; explicit Button attributes; primary CTA and real call hooks across variants; safe phone href handling; docs/analytics-hooks.md. Observe meaningful RED and GREEN, then focused checks. Commit pending explicit user authorization.
- [x] T2 (verified under explicitly approved temporary exception): Assess the writer diff and follow the returned verification plan, run validate:data and build, inspect rendered coverage and privacy/schema constraints. Record outcomes and remaining limitations. Commit pending explicit user authorization.

## Acceptance criteria
- dataLayer preserves an existing queue and initializes before client GTM injection.
- Primary CTAs and real call destinations expose stable attributes across relevant variants.
- No invalid empty telephone links; preserve + without assuming +1.
- Existing native form/thank-you flow unchanged; no false form_success emitted.
- Docs specify selectors, safe conditional event payloads, absent share/related UI, canonical paths and GTM duplicate-trigger considerations.
- pnpm run validate:data and pnpm run build pass; focused regression tests pass.
- No JSON schema changes, hardcoded client IDs, PII events, dependency/lock changes or guard weakening.

- [x] B1 (done): Writer authentication/startup restored; read-only probe returned `status: ready`. No provider configuration changed by parent.

## Evidence and progress
Read-only exploration completed; ContactForm native POST /thank-you independently inspected. Initial worktree clean on main; feature branch created. RDD clone-local switch is off. Writer launch failed before implementation: `No API key found for openai-codex`. No alternative native Agent tool or configured generic worker is available. Incident readback: git status shows only this untracked task document; git diff --stat is empty. At that incident boundary no source edits or tests had occurred. Authentication later recovered and writer implemented the contract locally across 27 files. Initial incorrect selector names were caught by parent and corrected to data-raven-cta/data-raven-call; docs reserve data-raven-share/data-related and include bootstrapped form_success with form_id/form_name. Correction tests observed RED (5 failures/4 passes), then GREEN (9/9 direct Node checks passed). git diff --check passed. pnpm test:analytics, validate:data, build and rendered tests were blocked before execution by ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION (23 existing entries). No guards relaxed, no JSON/dependency/lockfile edits. Native ASSESS returned unassessable due to undeclared untracked files; its plan requires independent verification.

## Independent verification and remaining blocker
Verifier confirmed exact attribute forwarding, queue bootstrap, native form flow, no runtime PII/IDs and no JSON, dependency, lockfile or guard changes. Required pnpm test:analytics, validate:data and build again failed before scripts with ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION; rendered test skipped because build did not succeed. Effective user configuration minimumReleaseAge=43200 minutes (30 days), pnpm 11.18.0 automatic dependency status check; existing lockfile last changed in 7478bac. No override applied. Actual rendered markup, Astro checks, browser/GTM Preview and Netlify acceptance remain unverified.
Verifier found AboutStory primary estimate CTA missing; bounded correction added exact hook, docs coverage and test. RED 9 pass/1 fail then GREEN 10/10 focused Node checks. git diff --check passed. Review covers many component variants and exceeds the advisory 400 changed-line heuristic; no source minification or test removal used.
- [x] B2 (resolved for this verification run): Resolve the existing release-age policy/dependency mismatch without bypassing safeguards, then rerun required pnpm verification. Wait for dependencies to satisfy current policy or obtain a separately authorized policy/dependency remediation.

## Approved temporary exception
User explicitly approved an ephemeral minimumReleaseAgeExclude list for exactly the 23 existing versions presented in chat, only for pnpm run test:analytics, validate:data, build and test:analytics -- --rendered (after successful build). Keep effective 30-day rule, trust/integrity controls and all persistent configurations unchanged. Do not export or widen the list; stop on additional violations. User was informed cached hash matching is not code audit and three packages lack recorded provenance. Exception executed separately for each approved command; no extra violations, no exported variable or persistent settings. Effective rule remains 43200 minutes.

## Final verification evidence
Independent verifier observed: pnpm run test:analytics PASS 10/10; pnpm run validate:data PASS all 12 contract files; pnpm run build PASS (theme 5/5, route 4/4 plus self-tests, Astro check 129 files with 0 errors/warnings/hints, 16 generated pages, route gate 14 indexable pages); pnpm run test:analytics -- --rendered PASS 11/11 with 16 pages and 2 native forms actually inspected. git diff --check clean. Before/after git status identical, SHA-256 unchanged for package.json, pnpm-lock.yaml, .npmrc and pnpm-workspace.yaml. Only Node experimental type-stripping warning. Exception expired with each process; 30-day policy unchanged.
Browser interactions, GTM Preview, client consent behavior and Netlify server acceptance were not executed; generated HTML checks are static and cover configured variants, source tests cover inactive variants. No runtime form_success claim.

## Delivery tasks
- [ ] D1 (in progress): Prepare two cohesive review slices, keep tests/docs with each behavior. Initial 529-line full candidate; foundation (phone/Button/bootstrap) then call-site coverage. Tracker starts with this task document as a draft/no-merge PR.
- [ ] D2 (pending): Verify slice boundaries, commit with Conventional Commits, push tracker and both child branches, create issue-linked type:feature PRs and report CI. No merge.

## Next step
Prepare slice-specific tests and docs with one bounded writer. No code-golf or removal of coverage; retain all verified behavior. Native review remains off by clone-local setting.
