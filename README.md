# Contractor Multipages Template (v2.0.0)

Reusable **Astro 7** static template for contractor and local service-business websites.
This repository is a template base — placeholder content only, not a client project.

## Quick path

1. Install with **pnpm only**: `pnpm install --frozen-lockfile`
2. Customize the **12 JSON files** under `src/data/`
3. Build: `pnpm run build`
4. Deploy the `dist/` folder (Netlify is preconfigured)

## Stack

| Tool | Role |
|------|------|
| Astro 7 | Static site generation |
| Tailwind CSS 4 | Styling (`@theme` tokens in `src/styles/global.css`) |
| Alpine.js | Light interactivity (nav, FAQ, tabs) |
| Swiper | Hero/gallery carousels |
| Sharp | Image optimization via `astro:assets` |
| Zod | Build-time JSON contract validation |
| schema-dts | Typed JSON-LD |
| @lucide/astro | Icons |

Output mode is **static**. Package manager is **pnpm only** — npm/npx are forbidden.

## Requirements

- Node.js **v22+**
- pnpm **>= 11**

## Install and build

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run validate:data
pnpm run build
pnpm run preview
```

Forbidden:

```bash
npm install
npm run
npx
```

## JSON data contract (12 files)

Client customization happens only through these files under `src/data/`:

| File | Purpose |
|------|---------|
| `business.json` | Name, phones, address, hours, services_offered |
| `site.json` | URL, SEO defaults, theme, feature flags, header/footer variants |
| `navigation.json` | Header, footer, mobile, legal links |
| `hero.json` | Hero slides + `variant` |
| `services.json` | Service catalog + `variant` |
| `gallery.json` | Gallery items + `variant` |
| `testimonials.json` | Reviews + `variant` |
| `faq.json` | FAQ items + `variant` |
| `areas.json` | Service areas + `variant` |
| `directories.json` | Directory badges + `variant` |
| `blog.json` | Blog posts (`published` flag) |
| `landings.json` | Optional long-form service landings |

Rules:

- Preserve top-level keys and nested shapes
- Do not rename fields without updating components + Zod schemas
- Run `pnpm run validate:data` after edits
- Keep template content placeholder-safe (no real client PII in the shared base)

Types live in `src/data/types.ts`. Loaders live in `src/data/loaders.ts`.

## Variant system

Major sections are **dispatchers**. Pick a visual style with an optional `variant` field in that section’s JSON (or `site.json` for header/footer).

| Section | Config location | Example variants |
|---------|-----------------|------------------|
| Header | `site.json.header_variant` | default, centered, transparent, minimal |
| Footer | `site.json.footer_variant` | default, dark, compact, multi-column |
| Hero | `hero.json.variant` | one … five |
| Services | `services.json.variant` | grid, list, cards, tabs, featured |
| Gallery | `gallery.json.variant` | grid, masonry, carousel, before-after |
| Testimonials | `testimonials.json.variant` | slider, cards, list, grid |
| FAQ | `faq.json.variant` | accordion, columns, compact |
| Areas | `areas.json.variant` | list, map, cards, columns |
| Directories | `directories.json.variant` | logos, badges, list, grid |

Unknown variants fall back to the documented default without failing the build.

## Routes

| Route | Source |
|-------|--------|
| `/`, `/about-us`, `/services`, `/gallery`, `/contact-us` | Static pages |
| `/privacy-policy`, `/terms-of-service`, `/thank-you`, `/404` | Static pages |
| `/services/{slug}` | `business.json.services_offered` + `services.json` + optional `landings.json` |
| `/blog`, `/blog/{page}`, `/blog/{slug}` | `blog.json` when `site.features.enable_blog` |
| `/sitemap.xml`, `/robots.txt`, `/llm.txt` | Generated endpoints |

## Contact form (Netlify Forms)

`ContactForm` uses markup-only Netlify Forms:

- `name="contact"`
- `data-netlify="true"`
- named inputs: `name`, `email`, `phone`, `service`, `message`
- success redirect: `/thank-you`

No custom backend is required on Netlify.

## Deploy (Netlify)

`netlify.toml` is configured for:

```toml
command = "pnpm install --frozen-lockfile && pnpm run build"
publish = "dist"
```

Node 22 and pnpm frozen lockfile are set in build environment.

## pnpm enforcement

Enforced by:

- `AGENTS.md` / `README.md` / `SKILL.md`
- `scripts/enforce-package-manager.cjs`
- `package.json` script prefixes + `preinstall`
- `.npmrc` (`package-lock=false`, `engine-strict=true`)
- `devEngines.packageManager`
- `pnpm-workspace.yaml` install-script allowlist

Do not remove or weaken these safeguards.

## Agent / AI workflow

See `AGENTS.md` (non-negotiable rules) and `SKILL.md` (template skill for agents).

Before finishing nontrivial work:

```bash
pnpm run validate:data
pnpm run build
```

## License

ISC
