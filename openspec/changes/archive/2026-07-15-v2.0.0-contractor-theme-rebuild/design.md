# Design: v2.0.0 Contractor Theme Rebuild

## Technical Approach

Rebuild as a fresh Astro 7 `output: 'static'` site where every component is a pure
consumer of a typed, Zod-validated JSON contract. Three layers, one direction of flow:

    src/data/*.json ──> loaders.ts ──> section dispatchers ──> variant components
         │ (Zod)              │                                        │
    validation.ts        types.ts                              astro:assets images
         │                                                            │
         └──> build fails fast on bad data ──> dist/ (static HTML + SEO + schema)

Data flows one way: JSON → typed loader → dispatcher picks a `variant` → variant renders
UI primitives + optimized images. No component holds client copy. This satisfies spec
§2.2 (JSON-only customization) and §2.3 (variant dispatchers). Realizes proposal
capabilities `json-data-contract`, `section-variant-system`, `asset-image-pipeline`,
`seo-schema-automation`.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Framework | Astro 7.x static | Astro 6 (v1) | Rust compiler, Vite 8; justifies the major bump |
| CSS | Tailwind 4 `@theme` tokens | Tailwind 3 config | Single token source maps to `site.json.theme`; verify Astro 7 integration first |
| Icons | `@lucide/astro` (per-icon import) | Font Awesome (v1), generic wrapper | Zero-JS inline SVG, tree-shakeable |
| Interactivity | Alpine.js (nav, accordion) | React/Vue islands | Micro-interactivity only; no framework runtime cost |
| Sliders | Swiper (modular) | Embla | Known from v1, built-in a11y, effects justify weight |
| Images | `astro:assets` + Sharp | `public/` raw files | Build-time WebP/AVIF, size guarantees, layout-shift safety |
| Validation | Zod pre-build script | runtime checks | Fail the build, never ship broken data |
| Schema typing | `schema-dts` | hand-written JSON-LD | Type-safe Schema.org objects |
| Variant source | Option A: per-section JSON `variant` | Option B: page config file | Keeps visual choice beside its content; no extra config file |

## Directory Structure

    src/
    ├── assets/images/{hero,services,gallery,blog,about}/   # astro:assets sources
    ├── components/
    │   ├── layout/    Header/ Footer/ (+variants/), TopBar, NavMenu, MobileStickyBar
    │   ├── sections/  HeroSlider/ Services/ Gallery/ ... (each: Dispatcher.astro + variants/)
    │   ├── ui/        Button, Badge, Card, SectionHeader, SectionWrapper, Input, Textarea, Breadcrumb
    │   ├── seo/       SeoHead, SchemaOrg, OpenGraph, TwitterCard
    │   └── icons/     icon-map.ts
    ├── data/          12 *.json + types.ts + loaders.ts + validation.ts
    ├── layouts/       BaseLayout.astro, LandingLayout.astro
    ├── pages/         static + services/[slug] + blog/{index,[page],[slug]} + sitemap/robots/llm .ts
    ├── styles/        global.css (@import "tailwindcss" + @theme), animations.css
    └── utils/         seo.ts, schema.ts, images.ts, navigation.ts, strings.ts, motion.ts
    public/            logo.svg, favicon, fonts, og-default.jpg  (no transformation)

## JSON Contract & Loader Architecture

12 domain files (spec §4). `types.ts` = one interface per file (+ optional `variant`).
`loaders.ts` = typed getters that import JSON and expose lookups:

```ts
export function getServices(): ServicesData;
export function getService(slug: string): Service | undefined;
export function getLandingPage(slug: string): LandingPage | undefined;
```

`validation.ts` holds Zod schemas mirroring each interface; `scripts/validate-data.cjs`
runs them before `astro build`, asserting: valid JSON, all 12 files present, unique slugs
per collection, and every image path resolvable (see pipeline). Invalid data → non-zero
exit, no `dist/` (spec §2.2 scenario).

## Section Variant Dispatcher

Each section is a dispatcher reading its own JSON `variant` (default documented), with an
unknown value falling back to the default (spec §2.3 both scenarios):

```astro
---
// sections/Services/Services.astro
import { getServices } from '../../data/loaders';
import { variants } from './variants';          // { grid, list, cards, tabs, featured }
const data = getServices();
const Variant = variants[data.variant ?? 'grid'] ?? variants.grid;
---
<Variant data={data} />
```

Header/Footer read `site.json.header_variant`/`footer_variant`. Minimum variant counts per
spec §2.3: Hero 5, Services/Gallery/Testimonials/FAQ/Areas/Directories 4, Header/Footer 4.

## Image Pipeline

Content images live in `src/assets/images/`; `public/` holds only untransformed assets.
JSON stores relative strings (`"./images/services/masonry.jpg"`). `utils/images.ts`
eager-globs the assets folder once and resolves string → module:

```ts
const modules = import.meta.glob('/src/assets/images/**/*.{jpg,jpeg,png,webp,avif}', { eager: true });
export function getImageByPath(path: string) {
  const mod = modules[`/src/assets/${path.replace(/^\.?\//, '')}`];
  if (!mod) throw new Error(`Image not found: ${path}`);
  return (mod as any).default;
}
```

`ResponsiveImage.astro` calls `getImageByPath`, feeds `astro:assets` `<Image>` with explicit
`width`/`height`, `format="webp"` default, `format="avif"` + `loading="eager"` +
`fetchpriority="high"` for LCP (hero, first gallery). `validate-data.cjs` re-checks every
path against the glob at build time (spec §2.4 both scenarios).

## SEO / Schema Flow

`utils/seo.ts` `buildSeo()` composes title/description/canonical/OG/Twitter from `site.json`
defaults + per-page overrides → `SeoHead.astro`. `utils/schema.ts` `buildSchemas({pageType,
path, service?, post?})` returns typed `WithContext<Thing>[]` (`schema-dts`) →
`SchemaOrg.astro` emits one JSON-LD block. Home = `HomeAndConstructionBusiness` + `WebSite`;
landings add `Service` + `BreadcrumbList`; posts add `BlogPosting`; FAQ adds `FAQPage`. All
sourced from `business.json`/`site.json` — no per-page duplication (spec §2.5).

## Routing

| Route | Source |
|-------|--------|
| `/`, `/about-us`, `/services`, `/gallery`, `/contact-us`, legal, `/404` | static `.astro` |
| `/services/[slug]` | `getStaticPaths` over `business.json.services_offered`; merges `services.json` + `landings.json`, falls back to generic landing (spec §2.5) |
| `/blog`, `/blog/[page]`, `/blog/[slug]` | `blog.json.posts` where `published`; gated by `site.features.enable_blog` |
| `sitemap.xml.ts`, `robots.txt.ts`, `llm.txt.ts` | generated endpoints from data |

## Component Architecture

`BaseLayout.astro` (SEO + schema + TopBar/Header/NavMenu/Footer/MobileStickyBar + slot);
`LandingLayout.astro` composes it, adding breadcrumb + `Service` schema. Sections =
dispatchers using `SectionHeader` + `SectionWrapper` (`background` prop) + `data-reveal`
(`motion.ts` IntersectionObserver, `prefers-reduced-motion` aware). UI primitives are
copy-free; `ContactForm.astro` uses Netlify Forms markup only (spec §2.5).

## Build & Validation Pipeline

`package.json` upgrade: `astro ^7`, add `zod`, `schema-dts` (dev), `@lucide/astro`, Tailwind 4;
drop `gsap`. Scripts (keep pnpm guard prefix): `validate:data` → `build` runs
`guard → validate-data → astro check → astro build`. `netlify.toml`:
`pnpm install --frozen-lockfile && pnpm run build`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Data | Zod schemas, unique slugs, image paths | `validate:data` in build |
| Type | Contract ↔ usage | `astro check` (tsc) |
| Build | Fresh clone builds; npm rejected | `pnpm install --frozen-lockfile && pnpm run build`; guard script |
| Render | Variant dispatch, LCP eager, alt text | manual/visual against JSON |

## Migration / Rollout

Greenfield rebuild on `v2.0.0`. Delete v1 `content.json` monolith, substring sitemap logic,
Font Awesome, GSAP. Chain work under the 400-line review budget. Rollback: revert branch or
reset to tag `v1.0.0`.

## Open Questions

- [ ] Confirm Astro 7.0.9 + Tailwind 4 integration is stable; else fall back to Tailwind 3.4.x.
- [ ] `AggregateRating` — auto-derive from `testimonials.stars` or keep manual? (default: manual)
- [ ] Optional `business.json.coordinates` for `GeoCoordinates` local-SEO boost.
