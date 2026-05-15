# Contractor Multipages Template

Reusable Astro template for contractor and local service-business websites.
This repository is intentionally a template, not a client project.

Current state:
- placeholder lorem copy only
- no real client branding
- no real client contact data
- safe base for cloning into new contractor projects

## Why this template exists

It keeps a reusable page structure for:
- home
- about
- services
- gallery
- blog
- contact
- paginated blog
- service landing pages

Use it when you want to spin up a new contractor site without rebuilding the same page architecture again and again.

## Stack

- Astro 6
- Tailwind CSS 3
- Alpine.js
- Swiper
- GSAP
- sharp (dev dependency for asset processing)

Output mode is static.

## Repository rules

This repo is **pnpm-only**.

Required:
- `pnpm install`
- `pnpm run dev`
- `pnpm run build`
- `pnpm run preview`
- `pnpm add <package>`
- `pnpm remove <package>`
- `pnpm outdated`

Forbidden:
- `npm install`
- `npm run`
- `npx`
- committing `package-lock.json`

Canonical lockfile:
- `pnpm-lock.yaml`

## Quick start

```bash
pnpm install
pnpm run dev
pnpm run build
```

## How this repository enforces pnpm

This repo does not rely only on documentation.

It enforces pnpm in three layers:

1. **Repository policy docs**
   - `README.md`
   - `AGENTS.md`

2. **Runtime guard**
   - `scripts/enforce-package-manager.cjs`
   - `package.json` scripts run the guard before Astro commands

3. **Package-manager metadata**
   - `.npmrc`
   - `devEngines.packageManager`
   - `package-lock=false`
   - `engine-strict=true`

That means:
- npm build commands are blocked at runtime
- npm installs are blocked by `devEngines`
- `package-lock.json` generation is intentionally discouraged

Do not remove or weaken these safeguards.

## Security model

The security posture is intentionally conservative.

### 1. pnpm-only policy
npm is not allowed here.
That reduces the surface for npm-specific workflow drift, accidental `package-lock.json` conflicts, and npm script behavior differences.

### 2. Deterministic installs
Reproducible environments should use:

```bash
pnpm install --frozen-lockfile
```

CI already uses that command.

### 3. Blind upgrades are not allowed
Do not do:
- `pnpm update` without review
- mass upgrades without inspecting `pnpm-lock.yaml`
- unverified dependency bumps on production branches

Instead:
- review why the upgrade matters
- inspect the lockfile diff
- run `pnpm run build`
- verify no unexpected install scripts are introduced

See `DEPENDENCY_POLICY.md`.

### 4. Restricted build scripts
`pnpm-workspace.yaml` currently limits install-time build scripts to:
- `esbuild`
- `sharp`
- `fsevents`

If a new package needs install-time build scripts, update that allowlist intentionally.
Do not loosen the policy just to silence a warning.

### 5. No secrets in template content
This template is intentionally lorem-only.
Before adding real client data, make sure you are working in a real client repo, not the shared template base.

## Template structure

### JSON data contract
The canonical data layer is:

- `src/data/content.json`
- `src/data/blogs.json`
- `src/data/landings.json`

These JSON files must stay schema-compatible with the components that consume them.
If a component expects a field, the JSON must provide it.

### Why structure matters more than wording
The UI consumes structured keys, not magic paragraphs.
If you change the JSON shape carelessly, the build may break even if the text looks fine.

Follow these rules:
- preserve existing keys
- preserve expected nested shapes
- preserve array/object contracts
- do not rename keys without updating the frontend

### Files that define reusable page logic
Useful starting points:

- `src/pages/index.astro`
- `src/pages/about-us.astro`
- `src/pages/services.astro`
- `src/pages/gallery.astro`
- `src/pages/contact-us.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/[page].astro`
- `src/pages/privacy-policy.astro`
- `src/layouts/LandingLayout.astro`

### Reuse workflow
When creating a new contractor project from this template:

1. Clone or copy the template into a new client repository.
2. Keep the pnpm enforcement files intact:
   - `AGENTS.md`
   - `README.md`
   - `scripts/enforce-package-manager.cjs`
   - `.npmrc`
   - `package.json`
   - `pnpm-workspace.yaml`
3. Replace only business data:
   - company name
   - phone
   - email
   - address
   - service area
   - SEO copy
   - navigation labels
   - social links
   - testimonials
   - FAQ
   - directories
   - hero slides
   - blog content
   - landing pages
4. Keep the JSON contract stable.
5. Run:
   ```bash
   pnpm install
   pnpm run build
   ```
6. Commit:
   - `pnpm-lock.yaml`
   - business data changes
   - new assets if required

### Do not template-destroy by accident
When reusing this repo, do not:
- introduce npm
- remove the package-manager guard
- copy-paste from a client repo without diffing JSON keys
- add real contact data back into the shared template base
- rename or flatten structured JSON keys without updating components

## Updating dependencies safely

Preferred sequence:

```bash
pnpm outdated
# inspect what changed
pnpm run build
# verify build
# commit pnpm-lock.yaml only if the change is intentional
```

## License

ISC
