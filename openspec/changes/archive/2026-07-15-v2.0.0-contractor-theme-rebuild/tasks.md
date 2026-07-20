# Tasks: v2.0.0 Contractor Theme Rebuild

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2200–3000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Est. lines | Notes |
|------|------|-----------|-----------|-------|
| 1 | Project foundation + config + styles | PR 1 | ~150 | base=main; build green |
| 2 | JSON contract + types + loaders + Zod | PR 2 | ~280 | base=main; `validate:data` green |
| 3 | Image pipeline + UI primitives | PR 3 | ~200 | base=main; `ResponsiveImage` renders |
| 4 | Layout components + 4 header/footer variants | PR 4 | ~260 | base=main; BaseLayout renders |
| 5 | Section dispatchers + variants (part A) | PR 5 | ~300 | base=main; Hero/Services/Gallery |
| 6 | Section dispatchers + variants (part B) | PR 6 | ~260 | base=main; Testimonials/FAQ/Areas/Directories |
| 7 | SEO/schema utils + components | PR 7 | ~200 | base=main; JSON-LD emitted |
| 8 | Routing + ContactForm + docs + assets | PR 8 | ~250 | base=main; full build green |

## Phase 1: Project Foundation (PR 1)

- [x] 1.1 Upgrade `package.json`: Astro ^7, Tailwind 4, drop `gsap`, add `zod`, `schema-dts`, `@lucide/astro`, Alpine.js, Swiper; keep pnpm guard prefix.
- [x] 1.2 Configure `astro.config.mjs` (`output: 'static'`, Tailwind 4 integration), `tsconfig.json`.
- [x] 1.3 Create `src/styles/global.css` (`@import "tailwindcss"` + `@theme` tokens) and `animations.css`.
- [x] 1.4 Update `netlify.toml` (`pnpm install --frozen-lockfile && pnpm run build`).
- [x] 1.5 Add `scripts/validate-data.cjs` placeholder (no-op until PR 2).
- [x] 1.6 Verify: `pnpm install --frozen-lockfile && pnpm run build` exits 0; npm guard rejects `npm install`.

## Phase 2: JSON Data Contract (PR 2)

- [x] 2.1 Create `src/data/types.ts` with one interface per file + optional `variant`.
- [x] 2.2 Create the 12 JSON files under `src/data/` with `_instructions` blocks and placeholder values per spec §4.
- [x] 2.3 Implement `src/data/loaders.ts` typed getters (`getServices`, `getService`, `getLandingPage`, etc.).
- [x] 2.4 Implement `src/data/validation.ts` Zod schemas mirroring each interface.
- [x] 2.5 Wire `scripts/validate-data.cjs`: assert 12 files present, valid JSON, unique slugs, all image paths resolvable; fail build otherwise.
- [x] 2.6 Verify: `pnpm run validate:data` passes; removing a required field fails the build (spec §2.2 scenario).

## Phase 3: Image Pipeline + UI Primitives (PR 3)

- [x] 3.1 Create `src/assets/images/{hero,services,gallery,blog,about}/` with placeholder images.
- [x] 3.2 Implement `src/utils/images.ts` (`import.meta.glob` eager, `getImageByPath`).
- [x] 3.3 Create `ResponsiveImage.astro` (WebP default, AVIF+eager+fetchpriority for LCP, explicit width/height, alt from JSON).
- [x] 3.4 Create UI primitives: `Button`, `Badge`, `Card`, `SectionHeader`, `SectionWrapper`, `Input`, `Textarea`, `Breadcrumb`.
- [x] 3.5 Create `src/components/icons/icon-map.ts` (`@lucide/astro` per-icon import).
- [x] 3.6 Implement `src/utils/motion.ts` (`data-reveal` IntersectionObserver, `prefers-reduced-motion` aware).
- [x] 3.7 Verify: `pnpm run build` green; missing image path fails validation (spec §2.4 scenario).

## Phase 4: Layout Components (PR 4)

- [x] 4.1 Create `BaseLayout.astro` skeleton (SEO + schema slots, TopBar/Header/NavMenu/Footer/MobileStickyBar + slot).
- [x] 4.2 Implement `Header/` dispatcher + 4 variants reading `site.json.header_variant`.
- [x] 4.3 Implement `Footer/` dispatcher + 4 variants reading `site.json.footer_variant`.
- [x] 4.4 Implement `TopBar`, `NavMenu` (Alpine.js), `MobileStickyBar`.
- [x] 4.5 Unknown variant falls back to documented default (spec §2.3).
- [x] 4.6 Verify: `pnpm run build` green; header variant switch renders correct sub-component.

## Phase 5: Section Dispatchers Part A (PR 5)

- [x] 5.1 Implement `sections/HeroSlider/` dispatcher + 5 variants from `hero.json`.
- [x] 5.2 Implement `sections/Services/` dispatcher + 4 variants (grid/list/cards/tabs/featured) from `services.json`.
- [x] 5.3 Implement `sections/Gallery/` dispatcher + 4 variants from `gallery.json`.
- [x] 5.4 Each dispatcher: `variants[data.variant ?? default] ?? variants[default]`.
- [x] 5.5 Verify: `pnpm run build` green; `services.json` `"variant":"tabs"` renders `ServicesTabs` (spec §2.3).

## Phase 6: Section Dispatchers Part B (PR 6)

- [x] 6.1 Implement `sections/Testimonials/` dispatcher + 4 variants from `testimonials.json`.
- [x] 6.2 Implement `sections/FAQ/` dispatcher + 3 variants (Alpine.js accordion) from `faq.json`.
- [x] 6.3 Implement `sections/CoveredAreas/` dispatcher + 4 variants from `areas.json`.
- [x] 6.4 Implement `sections/DirectoryBadges/` dispatcher + 4 variants from `directories.json`.
- [x] 6.5 Verify: `pnpm run build` green; unknown variant falls back without failing (spec §2.3).

## Phase 7: SEO/Schema Automation (PR 7)

- [x] 7.1 Implement `src/utils/seo.ts` `buildSeo()` (title/description/canonical/OG/Twitter from `site.json` + overrides).
- [x] 7.2 Implement `src/utils/schema.ts` `buildSchemas()` returning `WithContext<Thing>[]` via `schema-dts`.
- [x] 7.3 Create `components/seo/SeoHead.astro`, `SchemaOrg.astro`, `OpenGraph.astro`, `TwitterCard.astro`.
- [x] 7.4 Home emits `HomeAndConstructionBusiness` + `WebSite`; landings add `Service` + `BreadcrumbList`; posts add `BlogPosting`; FAQ adds `FAQPage`.
- [x] 7.5 Verify: `pnpm run build` green; home HTML embeds valid `LocalBusiness` JSON-LD from `business.json` (spec §2.5).

## Phase 8: Routing + ContactForm + Docs (PR 8)

- [x] 8.1 Create static pages: `/`, `/about-us`, `/services`, `/gallery`, `/contact-us`, legal, `/404`.
- [x] 8.2 Implement `LandingLayout.astro` (breadcrumb + `Service` schema).
- [x] 8.3 Create `/services/[slug].astro` via `getStaticPaths` over `business.json.services_offered`; merge `services.json`+`landings.json`, generic fallback (spec §2.5).
- [x] 8.4 Create `/blog/index`, `/blog/[page]`, `/blog/[slug]` gated by `site.features.enable_blog`.
- [x] 8.5 Create `sitemap.xml.ts`, `robots.txt.ts`, `llm.txt.ts` generated endpoints.
- [x] 8.6 Create `ContactForm.astro` with Netlify Forms markup only (`data-netlify`, `name="contact"`).
- [x] 8.7 Place `public/` untransformed assets (logo.svg, favicon, fonts, og-default.jpg).
- [x] 8.8 Refresh `README.md`, `AGENTS.md`, `SKILL.md` (pnpm-only, 12-file contract, variant system, `pnpm run build`; no npm/npx).
- [x] 8.9 Verify: fresh-clone `pnpm install --frozen-lockfile && pnpm run build` green; `dist/services/masonry/index.html` exists with `Service`+`BreadcrumbList` JSON-LD; sitemap lists all routes; robots references sitemap (spec §2.5 scenarios).

## PR Dependency Order

PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 (all stacked to main, each merges in order).

## Per-Slice Verification (all slices)

- `pnpm run build` exits 0.
- `pnpm run validate:data` passes (from PR 2 onward).
- Relevant spec scenario checked per slice (noted above).
- Rollback: revert the merged PR; main returns to prior slice state.