# Tasks: v2.2 Template Usability

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 (across chained slices; PR 2 split into 2a/2b/2c) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 docs → PR 2a CLI text trust → PR 2b payments/hours → PR 2c social/directories → PR 3a theme tokens/fonts → PR 3b lint+offenders → PR 4a route policy+gates → PR 4b prune+nav+CLI |
| Delivery strategy | chained PRs (feature-branch-chain; apply does not open PRs) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No (orchestrator preflight: chained PRs, 400-line budget; **3a/3b and 4a/4b are default splits, not overflow fallbacks**; **PR 2 further split into 2a/2b/2c**)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Authoritative-identity vs seed-content guidance | PR 1 | feature branch | Docs-only; low risk. |
| 2a | CLI text trust fields (estimate, years, license, insurance, founded_year) | PR 2a | PR 1 | Value-only `business.json`; `founded_year` skip → `""`. |
| 2b | CLI payment methods + business hours | PR 2b | PR 2a | CSV payments; 3-row hours shape. |
| 2c | CLI social links + directories.json intake | PR 2c | PR 2b | Blank social = key omitted; directories min(1) + `enable_directories`. |
| 3a | Theme tokens, fonts, Zod/CJS, CSS aligned to existing `site.json.theme`, full color-audit inventory | PR 3a | PR 2c | No lint in build yet. Preserve `light: #f8fafc`. |
| 3b | Tokenize inventoried offenders, then land `lint-theme.cjs` in build | PR 3b | PR 3a | Lint must pass on same PR; do not merge failing lint. |
| 4a | `site_type` + `routes.ts` + dynamic gates (blog + **services/[slug]**) + sitemap/llm | PR 4a | PR 3b | `site_type` authority; flags subordinate. Missing key → seo. |
| 4b | Split: **4b1** nav/CTA anchors → **4b2** prune+audit → **4b3** CLI siteType | PR 4b1–4b3 | PR 4a | Each child under 400 lines. |

## Phase 1: Agent Guidance (PR 1)

- [x] 1.1 Update `AGENTS.md` to state `business.json` + `site.json` are authoritative client identity.
- [x] 1.2 Update `SKILL.md` and `README.md` to state leftover masonry/hardscape content, assets, blog, and services after scaffold are normal seed content to rewrite — not a conflict.
- [x] 1.3 Confirm docs remain pnpm-only and reference `pnpm run build` as the pre-finish check.

## Phase 2a: CLI Text Trust Fields (PR 2a)

- [x] 2a.1 Extend `ScaffoldAnswers` + `prompts.mjs` for free-estimate wording, years of experience, license, and insurance (Enter accepts defaults; trim + blank → defaults).
- [x] 2a.2 Keep `founded_year` optional/secondary: skippable prompt; skipped/blank/whitespace **preserves the top-level key** as `""` (never remove the key).
- [x] 2a.3 Extend `replace-data.mjs` value-only writes for `free_estimate`, `years_experience`, `license`, `insurance`, `founded_year`; preserve `_instructions` and JSON shape. Do **not** touch payment_methods, hours, social, or directories in this slice.
- [x] 2a.4 Route ALL answer paths (interactive, `--yes`, `CREATE_CONTRACTOR_SITE_ANSWERS_JSON`) through extended `buildAnswers`; document defaults in `--help` and the CLI README.
- [x] 2a.5 Update `smoke-test.mjs` for text trust fields, blank normalization, `founded_year` → `""`, and JSON-env/`buildAnswers` path coverage.
- [x] 2a.6 Verify `pnpm run validate:data` and `pnpm run test:cli` pass; source template `src/data/*.json` stays placeholder-only.

## Phase 2b: CLI Payments + Hours (PR 2b)

- [x] 2b.1 Extend prompts/`ScaffoldAnswers`/`buildAnswers` for payment methods (CSV → `payment_methods[]`) and hours (3 fixed prompts: Mon–Fri / Sat / Sun → existing 3-row shape). Enter accepts defaults.
- [x] 2b.2 Extend `replace-data.mjs` value-only writes for `payment_methods` and `hours`; preserve keys, arrays, and `_instructions`.
- [x] 2b.3 Smoke coverage for payments CSV parsing, hours 3-row shape, and schema preservation.
- [x] 2b.4 Verify `pnpm run validate:data` and `pnpm run test:cli` pass.

## Phase 2c: CLI Social + Directories (PR 2c)

- [x] 2c.1 Extend prompts/`ScaffoldAnswers`/`buildAnswers` for social links (blank = key omitted from `business.social`) and directory links (per template row: URL or Enter to skip URL).
- [x] 2c.2 Directory handling: `directories.json.directories` MUST remain `.min(1)`. If operator provides no URLs, keep a placeholder/default row and set `enable_directories: false` — **do not** write `[]`.
- [x] 2c.3 Extend `replace-data.mjs` for social + directories value-only updates; preserve keys, arrays, slugs, `variant`, and `_instructions`.
- [x] 2c.4 Smoke coverage for social omit-on-blank, directories min(1) when none provided, and answer-path parity.
- [x] 2c.5 Verify `pnpm run validate:data` and `pnpm run test:cli` pass; source template stays placeholder-only.

## Phase 3a: Theme Tokens + Fonts + Audit (PR 3a)

- [x] 3a.1 Create `src/utils/theme.ts` (unlayered `:root` CSS-var override from **current** `site.json.theme` values + Google Fonts URL builder) and inject both from `src/layouts/BaseLayout.astro` head.
- [x] 3a.2 Add additive optional `theme` keys (`primary_dark`, `muted`, `surface`, `border`) with hex validation to `src/data/validation.ts` + `scripts/validate-data.cjs` mirror + `src/data/types.ts`.
- [x] 3a.3 Align `global.css` `@theme` / body fallbacks **to** existing `site.json.theme` (preserve `light: #f8fafc` and other committed theme hexes; fonts → Source Sans 3 / Montserrat). Do **not** rewrite `site.json` theme values to match old CSS drift unless explicitly documented in this task list.
- [x] 3a.4 Produce expanded color-audit offender inventory (start from design.md known set: blog slug styles, global.css, animations.css, NavMenu, Header variants, FooterDark/MultiColumn, DirectoryBadges, HeroSlider fallbacks, and any additional hits). Record file + literal for 3b.
- [x] 3a.5 Verify fonts link matches configured families; `pnpm run validate:data` passes. **Do not** wire failing lint into build in this PR.

## Phase 3b: Tokenize Offenders + Theme Lint (PR 3b)

- [x] 3b.1 Tokenize every inventoried offender (or document rare `theme-lint-ignore` with reason) so source is lint-clean.
- [x] 3b.2 Create `scripts/lint-theme.cjs` (hex/rgb/hsl/oklch + Tailwind stock-palette utilities; strips comments + `@theme` block; allow token utilities + `white/black/transparent/current/inherit`; `theme-lint-ignore` escape).
- [x] 3b.3 Wire lint into `package.json` build **between** `validate-data` and `astro check` only after 3b.1 is clean — lint must pass on the PR that enables it.
- [x] 3b.4 Verify an out-of-palette color fails `pnpm run build` (no `dist/`), additive keys still pass `pnpm run validate:data`, and emitted Google Fonts link matches configured fonts. Keep this PR under 400 lines; split further only if still over budget.

## Phase 4a: Route Policy + Dynamic Gates (PR 4a)

- [ ] 4a.1 Add additive `site.json.site_type` (`one-page | multipage | seo`) to `site.json` `_instructions`, `types.ts`, `validation.ts`, and `validate-data.cjs` mirror. **Invalid values FAIL validation.** Document read semantics: **missing key → effective `seo`** (backward compat).
- [ ] 4a.2 Create `src/utils/routes.ts` with shared policy helpers and the precedence matrix: `site_type` is publication authority; `enable_blog` / `enable_landings` only narrow within SEO. Export helpers used by pages, sitemap, llm, and (later) nav/CTAs.
- [ ] 4a.3 Gate dynamic routes via `getStaticPaths` returning `[]`: existing blog guards must compose with `site_type`; **add a new gate to `src/pages/services/[slug].astro`** (currently ungated).
- [ ] 4a.4 Rewrite `sitemap.xml.ts` and `llm.txt.ts` to use the same helpers so unpublished routes never appear, and always-published **non-indexable/technical** routes (`/404`, `/thank-you`) are classified and **omitted** from sitemap/llm while remaining in `dist/`.
- [ ] 4a.5 Verify multipage/one-page builds emit no blog or service-detail routes from dynamic generation; missing-`site_type` fixture behaves as seo. Keep under 400 lines.

## Phase 4b: Prune, Link Safety, Nav, CLI Type (PR 4b)

- [x] 4b.1 `scripts/gate-routes.cjs` post-build prune (CJS policy mirror); wire after `astro build`. *(PR 4b2)*
- [x] 4b.2 Indexable parity audit (sitemap/llm vs dist HTML; exclude `/404`/`/thank-you`/meta) + HTML href/anchor audit; CJS↔TS drift via `test:routes` + `--self-test`. *(PR 4b2)*
- [x] 4b.3 **Repurpose** `src/utils/navigation.ts`: feature-aware one-page anchors; multipage drops blog+detail; SEO respects flags. Via `getNavigation()`. *(PR 4b1)*
- [x] 4b.4 Path helpers + `getHero` CTA resolve; `id="about"` / `id="contact"`. *(PR 4b1)*
- [x] 4b.5 Always-published technical/legal kept; per-type build verify (seo/multipage/one-page + flag-off). *(PR 4b2)*
- [ ] 4b.6 CLI website-type prompt (all answer paths default `site_type: multipage`) + smoke. *(PR 4b3)*

## Final Verification (per slice and at chain tip)

- [ ] V.1 `pnpm run validate:data` exits `0`.
- [ ] V.2 `pnpm run build` exits `0` (fails on out-of-palette colors; fails on **indexable** route parity or bad link/anchor violations).
- [ ] V.3 `pnpm run test:cli` exits `0` (includes founded_year `""`, directories min(1), scaffold `multipage`).
- [ ] V.4 Each chained PR (1, 2a, 2b, 2c, 3a, 3b, 4a, 4b) is under 400 changed lines or records an accepted `size:exception`.
- [ ] V.5 Confirm `site_type` vs `enable_*` precedence with at least one multipage + flags-true fixture (blog/landings still unpublished; no dead links).
- [ ] V.6 Confirm parity: `/404` and `/thank-you` remain in `dist/` but are absent from sitemap/llm without failing the audit; sitemap matches the indexable set only.
- [ ] V.7 Confirm one-page + `enable_gallery: false` (or equivalent) emits no `/#gallery` (or other missing-section) hrefs and the link/anchor audit passes.
