# Archive Report: v2.0.0-contractor-theme-rebuild

**Archived:** 2026-07-15
**Change:** v2.0.0-contractor-theme-rebuild
**Mode:** openspec
**Verdict:** PASS
**Archive type:** Standard (intentional, no overrides)

---

## Executive Summary

The v2.0.0 Contractor Theme Rebuild is complete and archived. This change rebuilt the broken v1 template as a buildable Astro 7 static contractor theme with a stable, typed, Zod-validated 12-file JSON contract and JSON-selectable section variants. All 49 tasks across 8 phases are complete. The full build pipeline (`validate:data` → `astro check` → `astro build`) exits 0, producing 16 HTML pages, 25 optimized images, and correct SEO/schema output.

---

## Task Completion Gate

| Check | Status |
|-------|--------|
| All implementation tasks checked `[x]` | ✅ PASS — 49/49 tasks complete |
| CRITICAL issues in verify-report | ✅ None found |
| Warnings in verify-report | ⚠️ W1: Malformed OG/Twitter image URLs (non-blocking) |

**Gate verdict:** PASS — no stale unchecked tasks, no CRITICAL issues.

---

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `contractor-theme` | Created (new main spec) | Copied full spec from change artifacts to `openspec/specs/contractor-theme/spec.md`. No delta specs existed — the change spec IS the full spec. |

No delta specs were present in `openspec/changes/v2.0.0-contractor-theme-rebuild/specs/`. The change spec (`spec.md`) was a complete spec, not a delta, and was copied directly to `openspec/specs/contractor-theme/spec.md` as the source of truth.

---

## Archive Contents

| Artifact | Size | Status |
|----------|------|--------|
| `proposal.md` | 3,045 B | ✅ Archived |
| `spec.md` | 10,092 B | ✅ Archived |
| `design.md` | 8,361 B | ✅ Archived |
| `tasks.md` | 7,391 B | ✅ Archived (49/49 tasks complete) |
| `verify-report.md` | 18,034 B | ✅ Archived |
| `archive-report.md` | — | ✅ Created |

---

## Key Decisions (from design.md)

| Decision | Choice | Rationale |
|----------|--------|----------|
| Framework | Astro 7.x static | Rust compiler, Vite 8 |
| CSS | Tailwind 4 `@theme` tokens | Single token source maps to `site.json.theme` |
| Icons | `@lucide/astro` per-icon import | Zero-JS inline SVG, tree-shakeable |
| Interactivity | Alpine.js (nav, accordion) | No framework runtime cost |
| Sliders | Swiper (modular) | Known from v1, built-in a11y |
| Images | `astro:assets` + Sharp | Build-time WebP/AVIF, layout-shift safety |
| Validation | Zod pre-build script | Fail the build, never ship broken data |
| Schema typing | `schema-dts` | Type-safe Schema.org objects |
| Variant source | Per-section JSON `variant` field | Keeps visual choice beside its content |

---

## Key Learnings

1. **Astro 7 + Tailwind 4 integration is stable.** The `@astrojs/tailwind` integration was replaced with Tailwind 4's Vite plugin approach via `@import "tailwindcss"` in `global.css`. No fallback to Tailwind 3 was needed.

2. **Image path normalization is a common gotcha.** The `absoluteUrl()` function in `seo.ts` does not strip the `./` prefix from JSON image paths before concatenating with the site base URL, producing malformed OG/Twitter image URLs (`/./images/...`). The schema layer (`schema.ts`) handles this correctly by falling back to `og-default.jpg`. This is the only warning in the entire verification.

3. **The 12-file JSON contract with `_instructions` works well in practice.** Each file owns exactly one domain, and the `_instructions` block provides inline guidance for developers customizing the template. The Zod validation layer catches structural errors at build time.

4. **Section variant dispatcher pattern is clean and extensible.** The `variants[data.variant ?? default] ?? variants[default]` pattern handles unknown variants gracefully without failing the build, satisfying the spec requirement for graceful fallback.

5. **Chained PRs (8 PRs) kept review under the 400-line budget.** The work was split into 8 stacked PRs, each under ~300 lines, making review manageable.

---

## Risks and Open Items

### Open Items (from design.md)

| Item | Status | Notes |
|------|--------|-------|
| Astro 7.0.9 + Tailwind 4 stability | ✅ Resolved | Stable, no fallback needed |
| `AggregateRating` auto-derivation | ⏭️ Deferred | Manual rating remains; not in scope |
| `business.json.coordinates` for GeoCoordinates | ⏭️ Deferred | Optional local-SEO boost; not in scope |

### Warnings Carried Forward

| ID | Issue | Impact | Recommendation |
|----|-------|--------|----------------|
| W1 | Malformed OG/Twitter image URLs on 6 pages (service landings + blog posts) | Social media scrapers may fail to resolve OG images | Fix `absoluteUrl()` in `src/utils/seo.ts` to strip `./` prefix before concatenation. One-line fix. |

### Suggestions (non-blocking)

| ID | Suggestion | Priority |
|----|------------|----------|
| S1 | Add `image` field to `Service` JSON-LD schema for rich-result eligibility | Low |
| S2 | Add `aria-busy`/`aria-live="polite"` if skeleton components are added in future | Low |
| S3 | Clean up `docs_trash/` directory before tagging a release | Low |
| S4 | Fix double separator in blog post meta titles when `meta_title` already contains a separator | Low |

---

## Source of Truth Updated

The following main spec now reflects the new behavior:

- `openspec/specs/contractor-theme/spec.md` — Created (full spec from change)

---

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
