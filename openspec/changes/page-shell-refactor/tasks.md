# Tasks: Page Shell Refactor

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~620 total: PR1 ~170, PR2 ~150, PR3 ~300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 shell + services/gallery → PR2 remaining headers → PR3 section absorption |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | PageHeader + Breadcrumb tone/export; migrate services/gallery | PR1 base = feature/tracker branch | `pnpm run validate:data && pnpm run test:routes && pnpm run build` | Diff `dist/services/index.html`, `dist/gallery/index.html`; spot h1, breadcrumb, CTA | `PageHeader`, `Breadcrumb`, services/gallery pages |
| 2 | Migrate about/contact/blog headers only | PR2 base = PR1 branch | `pnpm run validate:data && pnpm run test:routes && pnpm run build` | Diff about/contact/blog dist HTML; accept only design-listed drift | about/contact/blog page header edits |
| 3 | Absorb AboutStory + ContactDetails; thin composers | PR3 base = PR2 branch | `pnpm run validate:data && pnpm run test:routes && pnpm run build` | Diff about/contact dist HTML; split PR3 by page if >400 | new section files + about/contact composer edits |

No threat-matrix RED tasks: design marks the matrix N/A.

## Phase 1: PR1 Shared Shell and First Pages

- [x] 1.1 Create `src/components/layout/PageHeader.astro` with `title`, `crumbs`, `size`, `reveal`, and `class`; codify existing sizes only.
- [x] 1.2 Modify `src/components/ui/Breadcrumb.astro` to export `Crumb` and add default `tone="light"` plus dark tone classes.
- [x] 1.3 Replace inline hero/breadcrumb in `src/pages/services.astro` and `src/pages/gallery.astro` with `PageHeader size="tall"`.
- [x] 1.4 Verify PR1 with `pnpm run validate:data`, `pnpm run test:routes`, `pnpm run build`, and pre/post dist HTML spot diffs.

## Phase 2: PR2 Remaining Page Headers

- [ ] 2.1 Migrate `src/pages/about-us.astro`, `src/pages/contact-us.astro`, and `src/pages/blog/index.astro` to `PageHeader size="standard"`.
- [ ] 2.2 Migrate `src/pages/blog/[page].astro`; accept only the design-listed min-height/reveal drift.
- [ ] 2.3 Migrate `src/pages/blog/[slug].astro` to `PageHeader size="post" reveal={false}` with `Home / Blog / {post headline}`.
- [ ] 2.4 Verify PR2 with `pnpm run validate:data`, `pnpm run test:routes`, `pnpm run build`, and dist HTML header diffs.

## Phase 3: PR3 Section Absorption

- [ ] 3.1 Create `src/components/sections/AboutStory.astro` for loader-driven story, stats, image, and CTA; no JSON shape changes.
- [ ] 3.2 Create `src/components/sections/ContactDetails.astro` for loader-driven contact grid plus compact `ContactForm` usage.
- [ ] 3.3 Thin `src/pages/about-us.astro` and `src/pages/contact-us.astro` to `BaseLayout` + `PageHeader` + sections; do not touch CLI/routes/data.
- [ ] 3.4 Verify PR3 with `pnpm run validate:data`, `pnpm run test:routes`, `pnpm run build`, and about/contact dist HTML diffs; split if >400.

## Phase 4: Final Verification

- [ ] 4.1 Audit no new visual variants, no CLI/package-manager edits, no `src/data/*`, loader, Zod, or route-policy changes.
- [ ] 4.2 Run final SDD verify for `page-shell-refactor` and create `openspec/changes/page-shell-refactor/verify-report.md`.
