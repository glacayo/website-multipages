# Tasks: initial-astro-scaffold

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600-800 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Data) → PR 2 (Layout) → PR 3 (Pages) → PR 4 (Dynamic) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Infrastructure & Data Layer | PR 1 | Base config, Tailwind v4, global.css, TS interfaces, data loaders. |
| 2 | Base Layouts & SEO | PR 2 | `SeoHead.astro`, `BaseLayout.astro`, `Navbar.astro`, `Footer.astro`. |
| 3 | Static Pages | PR 3 | Home (`index.astro`), About (`about.astro`), Services (`services.astro`). |
| 4 | Dynamic Routes & Blog | PR 4 | `blog/index.astro`, `blog/[slug].astro`, `landing/[slug].astro`. |

## Phase 1: Infrastructure & Data Layer (PR 1)
- [x] 1.1 Create `tsconfig.json` and `src/env.d.ts` for Astro.
- [x] 1.2 Initialize `astro.config.mjs` with `@astrojs/sitemap` integration.
- [x] 1.3 Create `src/styles/global.css` with Tailwind v4 `@theme` config for brand CSS variables.
- [x] 1.4 Create `src/data/types.ts` defining TS interfaces matching JSON shapes.
- [x] 1.5 Create `src/data/loaders.ts` exposing typed getter functions (e.g., `getSiteContent()`).

## Phase 2: Base Layouts & SEO (PR 2)
- [x] 2.1 Create `src/components/seo/SeoHead.astro` integrating `getSiteContent()`.
- [x] 2.2 Create `src/layouts/BaseLayout.astro` wiring `SeoHead.astro` and `global.css`.
- [x] 2.3 Create `src/components/site/Navbar.astro` (CSS-only or Astro island toggle).
- [x] 2.4 Create `src/components/site/Footer.astro` rendering global company data.

## Phase 3: Static Pages & UI Components (PR 3)
- [x] 3.1 Create `src/components/shared/SectionHeading.astro` and `CTASection.astro`.
- [x] 3.2 Create `src/components/home/HeroSection.astro` and `src/pages/index.astro`.
- [x] 3.3 Create `src/components/services/ServiceCard.astro` and `src/pages/services.astro`.
- [x] 3.4 Create `src/pages/about.astro` rendering content from global JSON.

## Phase 4: Dynamic Routes & Blog (PR 4)
- [x] 4.1 Create `src/utils/json-ld.ts` for LocalBusiness JSON-LD generation.
- [x] 4.2 Create `src/layouts/LandingLayout.astro` and `src/pages/landing/[slug].astro` using `getStaticPaths()`.
- [x] 4.3 Create `src/components/blog/BlogCard.astro`, `src/layouts/BlogLayout.astro`, and `src/pages/blog/index.astro`.
- [x] 4.4 Create `src/pages/blog/[slug].astro` using `getStaticPaths()`.
