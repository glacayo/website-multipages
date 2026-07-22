# Contractor Multipages — Template Skill (v2.2.0)

> Reusable static website template for contractors (masonry, hardscape, roofing, landscaping, tree services, etc.).
> Customize via JSON only. Never use npm.

## Purpose

Spin up a multi-page contractor marketing site that is:

- clonable
- buildable with one command
- deployable to Netlify (or any static host)
- customizable without editing component source for normal client work

## Stack

| Technology | Role |
|---|---|
| Astro 7 | Static SSG |
| Tailwind CSS 4 | Styles + design tokens |
| Alpine.js 3 | Light interactivity |
| Swiper | Sliders / carousels |
| Sharp | Image optimization |
| Zod | JSON contract validation |
| schema-dts | JSON-LD types |
| @lucide/astro | Icons |

## Non-negotiable rules

1. **pnpm only** — never `npm` / `npx`
2. **JSON contract stable** — 12 files under `src/data/`
3. **No client data hardcoded** in components
4. **Build must pass**: `pnpm run build`
5. **Content images** in `src/assets/images/`; public untransformed assets in `public/`
6. **Authoritative identity after scaffold** — `business.json` + `site.json`
7. **Seed content is rewritable** — leftover masonry/hardscape demo is expected, not a conflict

## Authoritative identity vs seed content

After scaffolding a client site, agents and developers MUST follow this split:

| Source | Role | Action |
|--------|------|--------|
| `src/data/business.json` | Authoritative business identity | Keep as source of truth for name, contact, hours, license, insurance, payments, services offered, social |
| `src/data/site.json` | Authoritative site identity | Keep as source of truth for URL, SEO defaults, theme, feature flags, header/footer variants |
| Remaining `src/data/*.json`, images, blog, services catalog/landings | Seed / demo content | Rewrite for the real trade; do **not** treat masonry/hardscape leftovers as a conflict |

### Expected leftovers after scaffold

The CLI replaces core identity fields, but demo masonry/hardscape material often remains so the site still builds. That is intentional seed content, including:

- services, landings, and related catalog copy that still describe the demo trade
- blog posts and blog images
- gallery / hero / testimonials / FAQ / areas / directories placeholder copy
- demo assets under `src/assets/images/` (and public placeholders when needed)

Rewrite those for the client’s real trade. Prefer value-only edits: preserve keys, nested shapes, required arrays, slugs the contract expects, `variant` fields, and every `_instructions` block.

### Template neutrality

- Shared template base stays placeholder/neutral — no real client PII
- Real client data belongs only in the scaffolded client repository
- Do not hardcode phones, emails, addresses, or service copy in components

## Quick start

### Scaffold a new client project

Prefer the workspace CLI so guards, pnpm enforcement, and the 12-file JSON contract stay intact:

```bash
node ./packages/create-contractor-site/bin/create-contractor-site.mjs ../client-site
# once published: pnpm create contractor-site ../client-site
```

If using `pnpm --filter create-contractor-site exec`, target paths are resolved from `packages/create-contractor-site`, not the repo root:

```bash
pnpm --filter create-contractor-site exec node ./bin/create-contractor-site.mjs ../../../client-site
```

What the CLI does:

1. Asserts **pnpm** + **git** are on PATH **before any writes**
2. Resolves template source, then validates `<target-dir>` (refuses missing arg, non-empty targets, and targets equal to/inside the template root)
3. Copies template files via denylist (excludes `node_modules`, `dist`, `.astro`, `.git`, `.codegraph`, `docs_trash`, `openspec`, `logs`, `.atl`, `*.log`, `.env*`, `package-lock.json`, and the CLI `packages/` tree)
4. Collects business/site/service/area fields (interactive, `--yes`, or env JSON)
5. Value-only JSON replacement in target `src/data/*.json` — never edits this template repo; service names **and** slugs are deduped and kept aligned between `business.services_offered` and `services.json`; service-area cities are parsed/deduped so `areas.json` slugs stay unique (city first)
6. `pnpm install` → `pnpm run validate:data` → `pnpm run build` (pnpm only; never npm/npx)
7. `git init` + commit `chore: initial client scaffold from contractor template` — **only after** validate + build succeed (intentionally skipped on earlier failure)
8. On failure after copy/replace/install/build, prints recovery guidance (partial target may remain; git was not initialized; temp clones are cleaned up)

Package runners may start the binary; **install/build inside the scaffold always use pnpm**.

#### Non-interactive mode and env vars

| Input | Behavior |
|-------|----------|
| `--yes` / `-y` | Built-in sample answers (Acme Masonry) |
| `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` | Scripted answers; must include `businessName` + `primaryServices[]` |

**Answer precedence:** env JSON → `--yes` → interactive prompts.

| Template env | Behavior |
|--------------|----------|
| `CREATE_CONTRACTOR_TEMPLATE_ROOT` | Use this local template path (preferred for monorepo/dev) |
| `CREATE_CONTRACTOR_TEMPLATE_REPO` / `CREATE_CONTRACTOR_TEMPLATE_REF` | Remote clone fallback when published (default repo + `v2.2.0`) |

Published package contents are CLI-only; template files are resolved via env, local monorepo discovery, or a temporary git clone (cleaned up).

```bash
pnpm run test:cli
```

### Work on the template itself

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run build
```

## JSON contract (exactly 12 files)

```
src/data/
├── business.json      # company identity + services_offered
├── site.json          # url, seo, theme, features, header/footer variants
├── navigation.json    # header/footer/mobile/legal nav
├── hero.json          # slides + variant
├── services.json      # service catalog + variant
├── gallery.json       # gallery + variant
├── testimonials.json  # reviews + variant
├── faq.json           # faqs + variant
├── areas.json         # service areas + variant
├── directories.json  # directory badges + variant
├── blog.json          # posts (published flag)
└── landings.json      # optional long-form service landings
```

Also:

- `types.ts` — TypeScript interfaces
- `loaders.ts` — typed getters used by pages/components
- validation via `pnpm run validate:data` (wired into build)

### Post-scaffold client rewrite (typical agent path)

1. Read `business.json` and `site.json` as authoritative identity
2. Rewrite seed services/blog/gallery/hero/FAQ/etc. for the real trade (not masonry/hardscape leftovers)
3. Replace demo images/assets while keeping JSON image path shape (`./images/...`)
4. Preserve JSON shape + `_instructions` everywhere
5. Run `pnpm run validate:data` and `pnpm run build` before finishing

### How to add a service

1. Add `{ "name", "slug" }` to `business.json.services_offered`
2. Add matching entry to `services.json.services` (same `slug`)
3. Optionally add a long-form page in `landings.json.landing_pages`
4. Add images under `src/assets/images/services/` (and gallery if needed)
5. Run `pnpm run validate:data` and `pnpm run build`

Route generated automatically: `/services/{slug}`

### How to add a blog post

1. Append a post object to `blog.json.posts`
2. Set `"published": true` when ready
3. Ensure `site.features.enable_blog` is `true`
4. Place image under `src/assets/images/blog/`
5. Rebuild

Routes: `/blog`, `/blog/{slug}`, paginated `/blog/{page}` when needed.

## Variant system

Dispatchers render a variant based on JSON:

```json
{
  "variant": "tabs"
}
```

| Section | Where to set | Defaults |
|---------|--------------|----------|
| Header | `site.header_variant` | default |
| Footer | `site.footer_variant` | default |
| Hero | `hero.variant` | one |
| Services | `services.variant` | grid |
| Gallery | `gallery.variant` | grid |
| Testimonials | `testimonials.variant` | slider |
| FAQ | `faq.variant` | accordion |
| Areas | `areas.variant` | list |
| Directories | `directories.variant` | logos |

Unknown variants → documented default (build must not fail).

## Project map

```
src/
├── assets/images/     # content images (astro:assets)
├── components/
│   ├── layout/        # TopBar, Header, NavMenu, Footer, MobileStickyBar
│   ├── sections/      # dispatchers + variants + ContactForm
│   ├── seo/           # SeoHead, SchemaOrg, OpenGraph, TwitterCard
│   ├── ui/            # Button, Input, Breadcrumb, ResponsiveImage, ...
│   └── icons/
├── data/              # 12 JSON + types + loaders + validation
├── layouts/           # BaseLayout, LandingLayout
├── pages/             # static + services/[slug] + blog/* + sitemap/robots/llm
├── styles/            # global.css, animations.css
└── utils/             # seo, schema, images, motion
public/                # logo.svg, favicon, og-default.jpg, fonts
scripts/               # enforce-package-manager, validate-data
```

## Contact form

`src/components/sections/ContactForm/ContactForm.astro`:

- Netlify Forms markup only
- `name="contact"` + `data-netlify="true"`
- Inputs: `name`, `email`, `phone`, `service`, `message` (all named)
- Action: `/thank-you`

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm install --frozen-lockfile` | Deterministic install |
| `pnpm run dev` | Local dev server |
| `pnpm run validate:data` | Validate 12 JSON files |
| `pnpm run build` | Guard + validate + `astro check` + build |
| `pnpm run preview` | Preview `dist/` |

## What NOT to do

- Do **not** use npm or npx
- Do **not** recommend `npm install` / `npx` for scaffolding or day-to-day workflow
- Do **not** reintroduce `content.json` / `blogs.json` as the contract
- Do **not** break JSON shapes without updating types + Zod + consumers
- Do **not** strip `_instructions` blocks or remove keys because seed copy “looks unused”
- Do **not** hardcode client phone/email/address/services in components
- Do **not** put real client PII into this shared template base (scaffold writes target only)
- Do **not** flag leftover masonry/hardscape services, blog, or assets after scaffold as a conflict — rewrite them
- Do **not** put content images only in `public/` (use `src/assets/images/`)
- Do **not** skip `pnpm run build` after nontrivial edits
- Do **not** strip guard files (`AGENTS.md`, `.npmrc`, `scripts/enforce-package-manager.cjs`, `pnpm-workspace.yaml`)

## Deploy

Netlify:

```toml
[build]
  command = "pnpm install --frozen-lockfile && pnpm run build"
  publish = "dist"
```

See `netlify.toml`, `README.md`, and `AGENTS.md` for full policy.
