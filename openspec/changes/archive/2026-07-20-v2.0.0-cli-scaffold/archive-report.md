# Archive Report: v2.0.0-cli-scaffold

**Archived on**: 2026-07-20
**Archive path**: `openspec/changes/archive/2026-07-20-v2.0.0-cli-scaffold/`
**Verdict at archive time**: PASS WITH WARNINGS (no CRITICAL issues)
**Mode**: openspec

---

## Executive Summary

The `v2.0.0-cli-scaffold` change added a publishable monorepo CLI package (`packages/create-contractor-site/`) that safely scaffolds client contractor sites from this placeholder-only template. The CLI copies template files (with a denylist for internal/generated artifacts), prompts for client business data, performs value-only JSON replacement on the 12-file contract, runs `pnpm install`/`validate:data`/`build`, initializes git, and creates an initial commit — all without modifying the source template.

**19/19 tasks completed**, all 21 spec scenarios verified compliant. No CRITICAL issues found.

---

## Artifacts Archived

| Artifact | Status | Notes |
|----------|--------|-------|
| `proposal.md` | ✅ | Intent, scope, capabilities, approach, risks, success criteria |
| `spec.md` | ✅ | 8 sections, 21 scenarios, all compliant |
| `design.md` | ✅ | 10 design decisions, CLI flow, copy/prompt/JSON/git strategies |
| `tasks.md` | ✅ | 19 tasks across 5 phases, all `[x]` |
| `apply-progress.md` | ✅ | 19/19 tasks, 4 deviations documented, E2E evidence |
| `verify-report.md` | ✅ | PASS WITH WARNINGS — 21/21 scenarios compliant |

---

## Implementation Decisions (from apply-progress deviations)

1. **Denylist also excludes `packages/` and `.atl`** — prevents client scaffolds from receiving the CLI monorepo package or internal agent tooling. Not in the original denylist but appropriate client-scaffold hygiene.
2. **Service slugs preserved** — an early attempt that remapped slugs broke `landings.json` cross-validation. Names/descriptions update in place; slugs/ids stay stable.
3. **Non-interactive flags for verification** — `--yes` and `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` support scripted E2E without a TTY.
4. **Windows command runner** — quotes argv when `shell: true` so multi-word `git commit -m` messages are not split.

---

## Verification Evidence

| Check | Result |
|-------|--------|
| `pnpm run validate:data` (template) | ✅ Pass |
| `pnpm run build` (template) | ✅ Pass (16 pages) |
| Full E2E temp-target scaffold | ✅ Pass |
| Target `pnpm install` | ✅ Pass |
| Target `pnpm run validate:data` | ✅ Pass |
| Target `pnpm run build` | ✅ Pass (16 pages, `dist/` produced) |
| Target git init + commit | ✅ Pass |
| Guard files hash-matched source | ✅ Pass |
| Denied internal paths excluded | ✅ Pass |
| Source template unchanged | ✅ Pass |
| Missing arg → exit 1 | ✅ Pass |
| Non-empty target → exit 1 | ✅ Pass |

---

## Warnings Carried Forward

1. **No committed automated regression test suite for the CLI.** The project has no test runner configured (Standard mode). Runtime E2E evidence is strong but not preserved as reusable tests. A small scripted smoke test is recommended for future maintenance.

---

## Spec Sync Assessment

The `v2.0.0-cli-scaffold` spec describes a **CLI scaffolding capability** — a separate concern from the `contractor-theme` spec (which covers the static site template, section variants, JSON contract, SEO, etc.). The `contractor-theme` spec explicitly lists the CLI as out of scope in §5.

**No delta merge performed.** The CLI spec is additive to the project's capabilities but does not modify or extend the `contractor-theme` spec's requirements. The main `openspec/specs/contractor-theme/spec.md` remains accurate and unchanged.

---

## Next Steps

- The CLI package is ready for publishing (`packages/create-contractor-site/`).
- Consider adding a small scripted smoke test for CLI regression coverage.
- Future changes to the template (new JSON keys, new sections) should update the CLI's `replace-data.mjs` to handle the new fields.

---

## SDD Cycle Complete

The change has been fully planned, proposed, specified, designed, implemented, verified, and archived. Ready for the next change.
