# Verification Report: v2.0.0-pending-fixes

**Change**: `v2.0.0-pending-fixes`
**Mode**: Standard (strict_tdd: false, no test runner)
**Verification date**: 2026-07-20
**Verifier**: sdd-verify executor (Gentle AI)

## 1. Completeness Table

| Artifact | Present | Notes |
|----------|---------|-------|
| Proposal | Yes | `proposal.md` referenced from spec |
| Spec | Yes | `spec.md` — 7 sections, 11 scenarios |
| Design | Yes | `design.md` — 8 sections, risks table |
| Tasks | Yes | `tasks.md` — 4 phases, 17 tasks |
| Apply progress | Yes | `apply-progress.md` — 17/17 marked complete |

### Task completion count

- Total tasks: 17
- Completed: 17
- Incomplete: 0

All implementation tasks (Phases 1–4) are checked. No unchecked tasks.

## 2. Build / Tests / Coverage Evidence

| Command | Exit | Result |
|---------|------|--------|
| `pnpm run validate:data` | 0 | `validate-data: OK — 12 contract files valid.` |
| `astro check` (part of build) | 0 | 109 files — 0 errors, 0 warnings, 0 hints |
| `pnpm run build` | 0 | 16 page(s) built in 2.05s; 25 optimized images (reused cache) |
| Package-manager guard (part of build) | 0 | `enforce-package-manager.cjs` passed |

No runtime test suite exists for this repo (no test runner configured). Strict TDD is inactive (`strict_tdd: false`), so static build + HTML inspection is the configured verification mechanism. Per spec §7, the project explicitly accepts build + HTML inspection as runtime evidence.

## 3. Spec Compliance Matrix

| Spec § | Scenario | Status | Evidence |
|--------|----------|--------|----------|
| S1.1 | Service with image | PASS | `dist/services/masonry/index.html`: `"image":"https://examplecontractor.com/_astro/masonry.BJdSwUx6.jpg"` (absolute processed URL). Also confirmed for `dist/services/hardscape/index.html`. |
| S1.2 | Absolute image passthrough | PASS (source) | `imageToAbsolute()` (`src/utils/images.ts:70`) returns http(s) URLs unchanged at line 73. Not exercised by current data (all service images are relative), but code path verified by source inspection. |
| S1.3 | Missing image fallback | PASS (source) | `buildServiceSchema()` (`src/utils/schema.ts:326`) sets `image` to `undefined` when missing/empty and spreads `...(image ? { image } : {})`, so the property is omitted. Not exercised by current data (all services have images), but code path verified. |
| S3.1 | `docs_trash/` removed | PASS | `Test-Path docs_trash` → false; `.gitignore:48` still lists `docs_trash/`; `git status` shows no `docs_trash/` entry. |
| S3.2 | Build independent | PASS | `pnpm run build` completed successfully (0 errors, 16 pages) with no `docs_trash/` on disk. |
| S4.1 | Meta title with separator | PASS | `dist/blog/how-to-plan-a-paver-patio/index.html`: `<title>How to Plan a Paver Patio \| Example Contractor</title>` — `meta_title` already contains `|`, used verbatim, no second suffix appended. Matches spec exactly. |
| S4.2 | Meta title without separator | PASS (source) | `composeTitle()` (`src/utils/seo.ts:73`) composes `${raw}${separator}${businessName}` when no separator detected. Not directly exercised by current 2 posts (post 1 has separator, post 2 has no `meta_title`), but code path verified. |
| S4.3 | Fallback title (no meta_title) | PASS | `dist/blog/retaining-wall-drainage-basics/index.html`: `<title>Retaining Wall Drainage Basics \| Example Masonry &amp; Hardscape</title>` — post has no `meta_title`; falls back to `headline + " | " + site_name` per spec. |
| AR.1 | Testimonials present | PASS | `dist/index.html` (and every page): `"aggregateRating":{"@type":"AggregateRating","ratingValue":"5.00","reviewCount":3}`. Current `testimonials.json` has three entries all with `stars: 5`, so the correct average is 5.00 — matches `avg.toFixed(2)` formula in design. (Spec example used 5/5/4 → 4.67 as illustration; implementation formula is correct against real data.) |
| AR.2 | No testimonials | PASS (source) | `buildLocalBusiness()` (`src/utils/schema.ts:184`) filters valid stars and only adds `aggregateRating` when `ratings.length > 0`. Not exercised by current data, but code path verified. |
| GEO.1 | Valid coordinates | PASS | `dist/index.html`: `"geo":{"@type":"GeoCoordinates","latitude":"36.8529","longitude":"-75.9780"}` — matches spec exactly. |
| GEO.2 | Missing coordinates | PASS (source) | `isValidCoordinatePair()` (`src/utils/schema.ts:170`) guards emission; `geo` only added when valid. Not exercised by current data (coordinates present), but code path verified. |
| GEO.3 | Placeholder values only | PASS | `src/data/business.json` `_instructions.coordinates`: `"OPTIONAL placeholder GeoCoordinates (latitude/longitude strings). FAKE/EXAMPLE only - never a real client location."` Values are Virginia Beach example coords, clearly marked fake/example. |
| §6 JSON contract | Additive coordinates only | PASS | `validate:data` OK — 12 files valid; no keys removed (additive only). |
| §7.1 | `validate:data` passes | PASS | See Build Evidence above. |
| §7.2 | `build` passes | PASS | See Build Evidence above. |
| §7.3 | Service image URL valid | PASS | See S1.1. |
| §7.4 | Blog `<title>` scenarios | PASS | See S4.1/S4.3 (exercised) and S4.2 (source). |
| §7.5 | aggregateRating + geo on home | PASS | See AR.1 and GEO.1. |
| §7.6 | `docs_trash/` absent | PASS | See S3.1. |

### Coverage note

Scenarios exercised by current data at runtime: S1.1, S3.1, S3.2, S4.1, S4.3, AR.1, GEO.1, GEO.3, §6, §7.1–§7.6.
Scenarios verified by source inspection only (current data does not trigger the path): S1.2, S1.3, S4.2, AR.2, GEO.2. The repo has no test runner; per project config (`strict_tdd: false`) and spec §7, build + HTML inspection is the accepted runtime evidence, with source inspection as the fallback for paths not exercised by current placeholder data. These are logged as SUGGESTION-level (see §5).

## 4. Correctness Table

| Design Decision | Implementation | Match |
|-----------------|----------------|-------|
| Use `imageToAbsolute()` for Service image | `buildServiceSchema()` calls `imageToAbsolute(service.image)`; `imageToAbsolute` added to `images.ts:70` | Yes |
| `aggregateRating` from testimonials stars 1–5, `ratingValue: avg.toFixed(2)` | `schema.ts:209-219` filters `n >= 1 && n <= 5`, computes `avg.toFixed(2)` | Yes |
| `geo` GeoCoordinates when coordinates valid | `schema.ts:221-227` with `isValidCoordinatePair()` guard | Yes |
| Separator-aware title helper in `seo.ts` | `titleHasSeparator()` + `composeTitle()` in `seo.ts:67-82` | Yes |
| Fallback path `title + separator + site_name` | `composeTitle()` uses `defaultTitle` when `raw` empty; `buildSeo` passes `seo.default_title` | Yes |
| Additive `coordinates` only, no keys removed | `business.json` adds optional `coordinates`; `types.ts`/`validation.ts`/`validate-data.cjs` mirror | Yes |
| `docs_trash/` deleted, stays in `.gitignore` | Directory absent; `.gitignore:48` retains entry | Yes |

## 5. Design Coherence Table

| Design § | Coherent | Notes |
|----------|---------|-------|
| §1 Service image | Yes | Deviation 1 (design referenced pre-existing `imageToAbsolute`; helper was implemented) is documented in `apply-progress.md` and matches code. |
| §2 docs_trash cleanup | Yes | Matches design exactly. |
| §3 Blog title separator | Yes | Deviation 2 (caller `blog/[slug].astro` also fixed to stop pre-appending suffix) is documented; without it the helper alone would not have worked. Sensible. |
| §4 AggregateRating | Yes | Deviation 4 (removed prior `bestRating`/`worstRating`, 2-decimal string) matches spec exactly. |
| §5 GeoCoordinates | Yes | Matches design. |
| §6 JSON contract | Yes | Additive only, mirrored in 4 locations. |
| §7 Verification plan | Yes | All 6 verification steps executed. |

## 6. Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **Untested fallback scenarios (S1.2, S1.3, S4.2, AR.2, GEO.2)** — Current placeholder data only exercises the "present/with-separator" paths. The "absent/without-separator" paths are verified by source inspection only. If a future client dataset omits a service image or testimonials, these paths will run for the first time in production. Consider adding a temporary fixture or unit test for `buildServiceSchema`, `composeTitle`, and `buildLocalBusiness` to lock the fallback branches. Not blocking — the repo config explicitly accepts build + HTML inspection as runtime evidence, and the code paths are short and verifiable by reading.

2. **No automated test runner** — The repo relies on `astro check` + `astro build` + `validate:data` as its safety net. Adding a lightweight Vitest setup for pure utils (`seo.ts`, `images.ts`, `schema.ts` builders) would convert several SUGGESTION-1 paths into runtime-verified scenarios. Not in scope of this change.

## 7. Final Verdict

**PASS**

All 17 tasks complete. `pnpm run validate:data` and `pnpm run build` both pass (0 errors, 16 pages). All spec scenarios required by the change are either exercised at runtime in built `dist/` HTML (S1.1, S3.1, S3.2, S4.1, S4.3, AR.1, GEO.1, GEO.3) or verified by source inspection for the fallback/empty-data branches (S1.2, S1.3, S4.2, AR.2, GEO.2) — the latter because current placeholder data does not trigger them and the repo has no test runner. No CRITICAL or WARNING issues. Two SUGGESTION items recorded for future hardening; neither blocks archive readiness.

## 8. Skill Resolution

- Skill: `sdd-verify` (executor mode)
- Strict TDD: inactive — skipped TDD-specific checks per decision gate.
- Persistence mode: openspec file (this report).
- Artifacts read: proposal (referenced), spec, design, tasks, apply-progress.
- Commands executed: `pnpm run validate:data`, `pnpm run build`, file/path existence checks, built-HTML JSON-LD inspection, source inspection via codegraph.
- Report persisted to: `openspec/changes/v2.0.0-pending-fixes/verify-report.md`