# Design: Initial Astro Scaffold

## Technical Approach
Build a static Astro 6.3.0 site where the root JSON files remain the only content source. Each page imports typed loader functions, prepares a small page view-model, and passes props into generic Astro components. Tailwind v4 supplies structural tokens in CSS, while client brand values from `CONTENT.json` are injected as CSS variables by `BaseLayout`.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Rendering mode | Static SSG | Hybrid, server | This is a brochure-style SEO site with no auth or live personalization. Static gives best speed, lowest ops, and simpler hosting. |
| Content source | Direct root JSON imports through `src/data/loaders.ts` | Astro Content Collections | The repo’s customization point is already the three root JSON files. Collections add ceremony without helping the dual-repo template model. |
| Type safety | TypeScript contracts for content + props | Plain JS | JSON is large and slug-driven. Typed contracts reduce breakage across pages, layouts, and dynamic routes. |
| Theming | Tailwind v4 `@theme` for static system tokens + runtime CSS vars for brand colors/fonts | `tailwind.config.*`, hardcoded classes | Tailwind v4 is CSS-first, but JSON brand values are data-driven. Separating static tokens from runtime vars keeps the template generic. |
| Images | Use `/public/images/*` paths initially | Astro `<Image />` for dynamic JSON filenames | Current images already live in `public/` and optimization is explicitly future work. Start simple, then introduce a manifest/WebP pipeline later. |
| SEO shell | Central `SeoHead.astro` + JSON-LD utilities | Per-page ad hoc tags | Shared SEO logic prevents drift and keeps metadata, canonical URLs, and schema consistent. |
| Design-system usage | Keep Trust & Authority cues, reject the portfolio-grid homepage pattern | Use ui-ux output verbatim | The style fits contractors; the portfolio-grid structure does NOT fit a lead-gen contractor homepage. |

## Data Flow
`CONTENT.json` / `LANDINGS.json` / `BLOGS.json` → `src/data/loaders.ts` → typed page frontmatter → layouts/components → static HTML.

`company_colors` + selected font config → `BaseLayout.astro` CSS variables → `global.css` semantic utilities.

`landing_pages[].slug` / `posts[].slug` → `getStaticPaths()` → `/landing/[slug]` and `/blog/[slug]`.

Important discovery: the real data set currently contains **19** landing pages and **60** blog posts, so the scaffold must scale to the JSON count rather than proposal assumptions.

## File Structure
```text
/
├── astro.config.mjs
├── tsconfig.json
├── src/
│   ├── env.d.ts
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── services.astro
│   │   ├── blog/index.astro
│   │   ├── blog/[slug].astro
│   │   └── landing/[slug].astro
│   ├── layouts/BaseLayout.astro
│   ├── layouts/BlogLayout.astro
│   ├── layouts/LandingLayout.astro
│   ├── components/seo/SeoHead.astro
│   ├── components/site/Navbar.astro
│   ├── components/site/Footer.astro
│   ├── components/shared/CTASection.astro
│   ├── components/shared/SectionHeading.astro
│   ├── components/home/HeroSection.astro
│   ├── components/services/ServiceCard.astro
│   ├── components/services/ServiceGrid.astro
│   ├── components/blog/BlogCard.astro
│   ├── components/landing/LandingHero.astro
│   ├── components/landing/LandingSection.astro
│   ├── data/contracts.ts
│   ├── data/loaders.ts
│   ├── utils/seo.ts
│   ├── utils/jsonld.ts
│   ├── utils/routes.ts
│   └── styles/global.css
└── public/images/*
```

## Interfaces / Contracts
```ts
export interface SiteContent { company_name: string; company_colors: Record<string,string>; services: Service[]; }
export interface LandingPage { name: string; slug: string; hero: { headline: string; paragraph: string; image: string }; sections: LandingSection[]; }
export interface BlogPost { headline: string; slug: string; content: string; image_filename: string; description: string; meta_title: string; }
export interface SeoInput { title: string; description: string; path: string; image?: string; type?: 'website'|'article'; }
```

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Type/integration | JSON contracts, slug lookup, route generation | `astro check` plus loader-level assertions during implementation |
| Manual page smoke | Core routes and dynamic routes | Verify `/`, `/about`, `/services`, one blog page, one landing page in dev |
| Static output | Metadata, sitemap, zero-JS rendering | Run build/check in verification phase only, not as part of design |

## Migration / Rollout
No migration required. Existing JSON files and `public/images/` stay in place.

## Open Questions
- [ ] Should future image optimization move assets into `src/assets/` via generated manifest, or stay `public/` with a preprocessing step?
- [ ] Should font selection follow the current ui-ux output exactly, or be adjusted toward sturdier sans-serif contractor branding during implementation?
