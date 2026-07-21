# Tasks: v2.2 Template Usability

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 (across 6 default slices) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 docs → PR 2 CLI intake → PR 3a theme tokens/fonts → PR 3b lint+offenders → PR 4a route policy+gates → PR 4b prune+nav+CLI |
| Delivery strategy | chained PRs (feature-branch-chain; apply does not open PRs) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No (orchestrator preflight: chained PRs, 400-line budget; **3a/3b and 4a/4b are default splits, not overflow fallbacks**)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Authoritative-identity vs seed-content guidance | PR 1 | feature branch | Docs-only; low risk. |
| 2 | Expanded CLI intake + value-only replacement + smoke coverage | PR 2 | PR 1 | Preserve 12-file contract; `founded_year` skip → `""`; directories min(1). |
| 3a | Theme tokens, fonts, Zod/CJS, CSS aligned to existing `site.json.theme`, full color-audit inventory | PR 3a | PR 2 | No lint in build yet. Preserve `light: #f8fafc`. |
| 3b | Tokenize inventoried offenders, then land `lint-theme.cjs` in build | PR 3b | PR 3a | Lint must pass on same PR; do not merge failing lint. |
| 4a | `site_type` + `routes.ts` + dynamic gates (blog + **services/[slug]**) + sitemap/llm | PR 4a | PR 3b | `site_type` authority; flags subordinate. Missing key → seo. |
| 4b | Post-build prune + parity/link audit + repurpose `navigation.ts` + anchors + CLI type prompt + smoke | PR 4b | PR 4a | Explicit slice under 400 lines — not optional. |

## Phase 1: Agent Guidance (PR 1)

- [x] 1.1 Update `AGENTS.md` to state `business.json` + `site.json` are authoritative client identity.
- [x] 1.2 Update `SKILL.md` and `README.md` to state leftover masonry/hardscape content, assets, blog, and services after scaffold are normal seed content to rewrite — not a conflict.
- [x] 1.3 Confirm docs remain pnpm-only and reference `pnpm run build` as the pre-finish check.

## Phase 2: CLI Contractor Intake (PR 2)

- [ ] 2.1 Extend `packages/create-contractor-site/src/prompts.mjs` to ask for payment methods (CSV), hours (3 fixed prompts: Mon–Fri / Sat / Sun → existing 3-row shape), free-estimate wording, years of experience, license, insurance, social links (blank = key omitted), and directory links (per template row: URL or Enter to skip URL). Enter accepts defaults.
- [ ] 2.2 Keep `founded_year` optional/secondary: skippable prompt; when skipped, **preserve the top-level key** and write `""` (never remove the key; never leave unrelated seed year if operator skipped — empty string is the skip signal).
- [ ] 2.3 Directory handling: `directories.json.directories` MUST remain `.min(1)`. If operator provides no URLs, keep a placeholder/default row and set `enable_directories: false` to gate UI — **do not** write `[]`.
- [ ] 2.4 Extend `packages/create-contractor-site/src/replace-data.mjs` for value-only replacement into existing `business.json` keys (hours, license, insurance, payment_methods, free_estimate, years_experience, social, founded_year) and `directories.json` rows; preserve keys, arrays, slugs, `variant`, and `_instructions`. No new JSON keys needed in PR 2.
- [ ] 2.5 Update `packages/create-contractor-site/scripts/smoke-test.mjs` to cover the new fields, schema preservation, founded_year → `""` skip, and directories min(1) when none provided.
- [ ] 2.6 Route ALL answer paths (interactive, `--yes`, `CREATE_CONTRACTOR_SITE_ANSWERS_JSON`) through extended `buildAnswers` defaults so parity holds by construction; document defaults in `--help` and the CLI README; add smoke coverage asserting equivalent JSON shape.
- [ ] 2.7 Verify `pnpm run validate:data` and `pnpm run test:cli` pass; source template `src/data/*.json` stays placeholder-only.

## Phase 3a: Theme Tokens + Fonts + Audit (PR 3a)

- [ ] 3a.1 Create `src/utils/theme.ts` (unlayered `:root` CSS-var override from **current** `site.json.theme` values + Google Fonts URL builder) and inject both from `src/layouts/BaseLayout.astro` head.
- [ ] 3a.2 Add additive optional `theme` keys (`primary_dark`, `muted`, `surface`, `border`) with hex validation to `src/data/validation.ts` + `scripts/validate-data.cjs` mirror + `src/data/types.ts`.
- [ ] 3a.3 Align `global.css` `@theme` / body fallbacks **to** existing `site.json.theme` (preserve `light: #f8fafc` and other committed theme hexes; fonts → Source Sans 3 / Montserrat). Do **not** rewrite `site.json` theme values to match old CSS drift unless explicitly documented in this task list.
- [ ] 3a.4 Produce expanded color-audit offender inventory (start from design.md known set: blog slug styles, global.css, animations.css, NavMenu, Header variants, FooterDark/MultiColumn, DirectoryBadges, HeroSlider fallbacks, and any additional hits). Record file + literal for 3b.
- [ ] 3a.5 Verify fonts link matches configured families; `pnpm run validate:data` passes. **Do not** wire failing lint into build in this PR.

## Phase 3b: Tokenize Offenders + Theme Lint (PR 3b)

- [ ] 3b.1 Tokenize every inventoried offender (or document rare `theme-lint-ignore` with reason) so source is lint-clean.
- [ ] 3b.2 Create `scripts/lint-theme.cjs` (hex/rgb/hsl/oklch + Tailwind stock-palette utilities; strips comments + `@theme` block; allow token utilities + `white/black/transparent/current/inherit`; `theme-lint-ignore` escape).
- [ ] 3b.3 Wire lint into `package.json` build **between** `validate-data` and `astro check` only after 3b.1 is clean — lint must pass on the PR that enables it.
- [ ] 3b.4 Verify an out-of-palette color fails `pnpm run build` (no `dist/`), additive keys still pass `pnpm run validate:data`, and emitted Google Fonts link matches configured fonts. Keep this PR under 400 lines; split further only if still over budget.

## Phase 4a: Route Policy + Dynamic Gates (PR 4a)

- [ ] 4a.1 Add additive `site.json.site_type` (`one-page | multipage | seo`) to `site.json` `_instructions`, `types.ts`, `validation.ts`, and `validate-data.cjs` mirror. **Invalid values FAIL validation.** Document read semantics: **missing key → effective `seo`** (backward compat).
- [ ] 4a.2 Create `src/utils/routes.ts` with shared policy helpers and the precedence matrix: `site_type` is publication authority; `enable_blog` / `enable_landings` only narrow within SEO. Export helpers used by pages, sitemap, llm, and (later) nav/CTAs.
- [ ] 4a.3 Gate dynamic routes via `getStaticPaths` returning `[]`: existing blog guards must compose with `site_type`; **add a new gate to `src/pages/services/[slug].astro`** (currently ungated).
- [ ] 4a.4 Rewrite `sitemap.xml.ts` and `llm.txt.ts` to use the same helpers so unpublished routes never appear, and always-published **non-indexable/technical** routes (`/404`, `/thank-you`) are classified and **omitted** from sitemap/llm while remaining in `dist/`.
- [ ] 4a.5 Verify multipage/one-page builds emit no blog or service-detail routes from dynamic generation; missing-`site_type` fixture behaves as seo. Keep under 400 lines.

## Phase 4b: Prune, Link Safety, Nav, CLI Type (PR 4b)

- [ ] 4b.1 Create `scripts/gate-routes.cjs` post-build prune (CJS mirror of policy) removing gated **static** internal pages from `dist/` only — never delete source files. Wire after `astro build`.
- [ ] 4b.2 Add post-build **parity audit** scoped to the **indexable published route set** (sitemap/llm lists or shared manifest vs matching HTML in `dist/` — NOT every file under `dist/`). Explicitly classify/exclude always-published non-indexable/technical routes (`/404`, `/thank-you`, meta artifacts) so their presence in `dist/` without sitemap/llm entries does not fail the audit. Add **broken-link / unpublished-route audit** for internal hrefs from JSON + critical components; for hash hrefs, verify the target id exists on the published destination page (anchor existence / published target availability — not route publication alone). Fail build on indexable mismatch or bad href/anchor.
- [ ] 4b.3 **Repurpose** existing `src/utils/navigation.ts` (confirm still zero importers, then replace body — do not create a duplicate file): one-page → **feature-aware** home anchors (map `/gallery`→`/#gallery` only if `enable_gallery` and the section renders; same for other optional sections; never emit a missing `/#…` anchor); multipage → drop blog + service-detail links; SEO respects flags. Consume from Header/Footer.
- [ ] 4b.4 Ensure all internal CTAs (hero, services cards via `serviceDetailHref()`, mobile CTA, section buttons) use published routes or **rendered** anchors only; add `id="about"` to `About.astro` and `id="contact"` to `ContactForm.astro` if still missing; when a feature flag disables a section, CTAs/nav MUST NOT target its anchor.
- [ ] 4b.5 Keep `thank-you`, `sitemap.xml`, `robots.txt`, `llm.txt`, `404`, `privacy-policy`, `terms-of-service` always published; verify sitemap/llm list only **indexable** routes; verify per-type `dist/` + indexable parity + feature-aware link/anchor audits via `pnpm run build` for each `site_type` (and SEO with flags off; and one-page with at least one `enable_*` section false).
- [ ] 4b.6 Add CLI website-type prompt (numbered choice; **all answer paths default write `site_type: multipage`**) in prompts/replace-data; extend `smoke-test.mjs`. This slice is a **planned** PR under 400 lines — not a contingency split.

## Final Verification (per slice and at chain tip)

- [ ] V.1 `pnpm run validate:data` exits `0`.
- [ ] V.2 `pnpm run build` exits `0` (fails on out-of-palette colors; fails on **indexable** route parity or bad link/anchor violations).
- [ ] V.3 `pnpm run test:cli` exits `0` (includes founded_year `""`, directories min(1), scaffold `multipage`).
- [ ] V.4 Each chained PR (1, 2, 3a, 3b, 4a, 4b) is under 400 changed lines or records an accepted `size:exception`.
- [ ] V.5 Confirm `site_type` vs `enable_*` precedence with at least one multipage + flags-true fixture (blog/landings still unpublished; no dead links).
- [ ] V.6 Confirm parity: `/404` and `/thank-you` remain in `dist/` but are absent from sitemap/llm without failing the audit; sitemap matches the indexable set only.
- [ ] V.7 Confirm one-page + `enable_gallery: false` (or equivalent) emits no `/#gallery` (or other missing-section) hrefs and the link/anchor audit passes.
