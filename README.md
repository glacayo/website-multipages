# Contractor Multipages Template (v2.1.2)

Reusable **Astro 7** static template for contractor and local service-business websites.
This repository is a template base — placeholder content only, not a client project.

## Quick path

### Option A — Scaffold a client site (recommended)

From this monorepo, use the direct Node entrypoint so the target path is resolved from the repository root:

```bash
node ./packages/create-contractor-site/bin/create-contractor-site.mjs ../acme-contractor
# or, once published: pnpm create contractor-site ../acme-contractor
```

If you use `pnpm --filter create-contractor-site exec`, remember pnpm runs from the package directory (`packages/create-contractor-site`), so relative target paths must be written from there:

```bash
pnpm --filter create-contractor-site exec node ./bin/create-contractor-site.mjs ../../../acme-contractor
```

The CLI:

1. Checks **pnpm** and **git** are available (before any writes)
2. Resolves the template source (see below), refusing targets equal to or inside the template root
3. Copies the template (denylist excludes `node_modules`, `dist`, `.astro`, `.git`, `.codegraph`, `docs_trash`, `openspec`, logs, `.env*`, `package-lock.json`, and the CLI `packages/` tree)
4. Prompts for client business fields (or uses non-interactive answers)
5. Replaces **values only** in the target `src/data/*.json` (keys, shapes, and `_instructions` stay intact; service names/slugs stay unique and aligned across `business.json` + `services.json`; service-area city lists are parsed/deduped so `areas.json` slugs stay unique)
6. Runs **`pnpm install`**, **`pnpm run validate:data`**, and **`pnpm run build`** in the target
7. Runs `git init` + initial commit: `chore: initial client scaffold from contractor template` — **only after** validate + build succeed. If install/validate/build fails, git steps are intentionally skipped.

**After scaffold:** treat `business.json` and `site.json` as the **authoritative client identity**. Any remaining masonry/hardscape services, blog posts, gallery/hero copy, and demo assets are **expected seed content** — rewrite them for the real trade. Do not treat those leftovers as a conflict or error. Keep replacing values/copy/assets only; preserve JSON shape and `_instructions`. Keep real client PII out of this shared template base.

**Required tools:** Node.js 22+, pnpm >= 11.1.2, git.

Package-runner compatibility (`pnpm create`, etc.) may invoke the binary, but **the CLI itself always uses pnpm internally**. Do not use `npm install` or `npx` as the project workflow.

#### Non-interactive answers

| Mechanism | Purpose |
|-----------|---------|
| `--yes` / `-y` | Use built-in sample answers (Acme Masonry) — useful for smoke tests |
| `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` | JSON with at least `businessName` and `primaryServices[]` |

**Answer precedence (highest first):**

1. `CREATE_CONTRACTOR_SITE_ANSWERS_JSON`
2. `--yes` / `-y` sample answers
3. Interactive prompts (default)

Example:

```bash
# Sample answers
node ./packages/create-contractor-site/bin/create-contractor-site.mjs --yes ../demo-site

# Scripted answers
CREATE_CONTRACTOR_SITE_ANSWERS_JSON='{"businessName":"Acme","primaryServices":["Masonry","Patios"]}' \
  node ./packages/create-contractor-site/bin/create-contractor-site.mjs ../acme-site
```

#### Template source (local vs published)

The published npm package ships only the CLI (`bin`/`src`/`scripts`). Template files come from:

| Priority | Source |
|----------|--------|
| 1 | `CREATE_CONTRACTOR_TEMPLATE_ROOT` — local checkout path (best for monorepo/dev) |
| 2 | Local monorepo root discovered by walking parents from the package |
| 3 | Temporary `git clone` of `CREATE_CONTRACTOR_TEMPLATE_REPO` @ `CREATE_CONTRACTOR_TEMPLATE_REF` (defaults: this GitHub repo @ `v2.1.2`), cleaned up afterward |

```bash
# Force a local template root
CREATE_CONTRACTOR_TEMPLATE_ROOT=/path/to/website-multipages \
  create-contractor-site ../client-site
```

#### CLI smoke tests

```bash
pnpm run test:cli
# or: pnpm --filter create-contractor-site run test:smoke
# Skip the full scaffold E2E (install/build): SKIP_CLI_E2E=1 pnpm run test:cli
```

### Option B — Work on this template directly

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
| `business.json` | **Authoritative** business identity: name, phones, address, hours, services_offered, license, insurance, payments, social |
| `site.json` | **Authoritative** site identity: URL, SEO defaults, theme, feature flags, header/footer variants |
| `navigation.json` | Header, footer, mobile, legal links (often still seed after scaffold — rewrite) |
| `hero.json` | Hero slides + `variant` (seed after scaffold — rewrite) |
| `services.json` | Service catalog + `variant` (seed after scaffold — rewrite) |
| `gallery.json` | Gallery items + `variant` (seed after scaffold — rewrite) |
| `testimonials.json` | Reviews + `variant` (seed after scaffold — rewrite) |
| `faq.json` | FAQ items + `variant` (seed after scaffold — rewrite) |
| `areas.json` | Service areas + `variant` (seed after scaffold — rewrite for real service area) |
| `directories.json` | Directory badges + `variant` (seed after scaffold — rewrite) |
| `blog.json` | Blog posts (`published` flag) (seed after scaffold — rewrite) |
| `landings.json` | Optional long-form service landings (seed after scaffold — rewrite) |

### Authoritative identity vs seed content

| Layer | Files | Rule |
|-------|-------|------|
| Authoritative identity | `business.json`, `site.json` | Source of truth for client/site identity after scaffold |
| Rewritable seed content | Other `src/data/*.json`, demo images/assets, leftover masonry/hardscape services & blog | Expected after scaffold; rewrite for the real trade — **not a conflict** |

Rules:

- Preserve top-level keys, nested shapes, required arrays, and `_instructions` blocks
- Replace values, copy, and assets only — do not flatten or rename fields without updating components + Zod schemas
- Run `pnpm run validate:data` after edits
- Finish nontrivial work with `pnpm run build`
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

For generated client sites:

1. Trust `business.json` + `site.json` as authoritative identity
2. Rewrite leftover masonry/hardscape seed content (services, blog, section copy, assets) for the real trade
3. Preserve JSON shape and `_instructions` while replacing values/copy/assets
4. Do not hardcode client business data into components
5. Keep the shared template base neutral — real client PII only in client repos

Before finishing nontrivial work:

```bash
pnpm run validate:data
pnpm run build
```

## License

ISC
