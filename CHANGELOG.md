# Changelog

All notable changes to the contractor multipages template and `create-contractor-site` CLI are documented here.

The format is release-note style. Versions follow the monorepo package version (`package.json` and `packages/create-contractor-site/package.json`).

## [2.3.0] — 2026-08-11

### Highlights

- Page layout consolidated through a shared page-shell, and optional provenance-aware image tooling added as an isolated capsule with agent-owned fulfillment.
- The root dependency graph, lockfile, build, and CI stay untouched by image tooling; credentials and working state never enter Git, scaffold output, or `dist/`.
- pnpm pinned for Corepack compatibility so installs are deterministic across environments.

### New

- **Page-shell reuse** — shared page header shell extracted across about, contact, and remaining pages, reducing duplicated layout markup while preserving per-page content and variants.
- **Isolated smart-image capsule** — optional image helpers live in a separate pnpm workspace at `tools/smart-image/` (`smart-image-cli`), outside the root install graph; root `pnpm-workspace.yaml`, lockfile, and `package.json` stay separate (no `overrides`, no root `smart-image-cli` dependency).
- **Smart-image invocation commands** — `pnpm run images:check` (readiness probe, never writes/downloads), `pnpm run images:setup` (frozen capsule install, explicit failure — no fallback), and `pnpm run images:run -- <args>` (checked-in wrapper → real CLI; never call the upstream `smart-img` bin directly). Install, `validate:data`, build, and CI never run `images:*`.
- **Scaffold/state protections** — root `CUSTOMER-IMAGES/` (working originals) and `.img-ia/` (internal state, `_out` candidates) are gitignored and scaffold-denied; capsule `node_modules/` stays ignored; no credential or state bytes reach `dist/`. `REQUIRED_AFTER_COPY` asserts the capsule manifest/workspace/lock/wrapper and the agent skill survive scaffolding.
- **Agent-owned image fulfillment** — the active coding agent autonomously selects a compliant candidate from `<image-root>/_out/`, copies it into `src/assets/images/`, and updates only values + alt text in the relevant 12 JSON files; no human promotion step, no persisted attribution metadata, no public credits.
- **Smart-image workflow docs** — README, SKILL.md, AGENTS.md, and `.agents/skills/smart-image-cli/SKILL.md` document boundaries, readiness, no-silent-fallback, and promotion rules.

### Changed / Improved

- Template and CLI package version **2.3.0**.
- Default published template clone ref: `CREATE_CONTRACTOR_TEMPLATE_REF` → **`v2.3.0`** (override still supported).
- pnpm-only package-manager guards unchanged; root sharp/zod ranges unchanged with no overrides.

### Fixed

- **pnpm/Corepack compatibility** — pnpm pinned for Corepack compatibility so `pnpm install` resolves deterministically across local, CI, and scaffold environments.

### Validation

**Scaffolded client sites / day-to-day template use** — run:

```bash
pnpm run build
```

`pnpm run build` already runs package-manager guard, data validation, theme lint/tests, route tests, Astro check/build, and the route gate. It never runs `images:*`.

**Optional image tooling** (explicit only; read `.agents/skills/smart-image-cli/SKILL.md` first):

```bash
pnpm run images:check
pnpm run images:setup
pnpm run images:run -- doctor --json
```

**Template-root maintainers only** (CLI package smoke; not for scaffolded client repos):

```bash
pnpm run test:cli
```

### Notes for maintainers

- Do not commit, tag, or publish until this release is verified on a clean tree.
- Tag the git release as `v2.3.0` so the CLI published fallback clone matches the default ref.
- Publish `create-contractor-site@2.3.0` from `packages/create-contractor-site` when ready (pnpm only).

## [2.2.0] — 2026-07-22

### Highlights

- Usable scaffolds out of the box: fuller CLI intake, website type selection, and clearer post-scaffold identity vs seed-content rules.
- Theme colors come from `site.json.theme` and are enforced at build time.
- Website modes (`one-page` / `multipage` / `seo`) control which routes are published — source files stay; `dist/` is pruned and audited.

### New

- **Expanded CLI intake** — prompts and scripted answers cover trust/payment/hours/social/directories fields (payment methods, business hours, free-estimate wording, years of experience, license, insurance, social links, directory listings) with safe blank defaults via `buildAnswers`.
- **CLI website type selection** — `siteType` (`one-page` | `multipage` | `seo`, with common aliases) writes `site.json.site_type`. New scaffolds default to `multipage`.
- **JSON-driven theme tokens** — runtime CSS variables and Google Fonts derive from `site.json.theme` (colors + body/heading fonts).
- **Strict theme palette lint** — `pnpm run lint:theme` / build-wired `lint-theme.cjs` fails the build when template colors are outside the configured palette.
- **Website modes** — shared route policy gates publication by `site_type` (feature flags only narrow within SEO scope).
- **Route policy / prune / audit gate** — dynamic empty `getStaticPaths` + post-build `dist/` prune + parity/link audit (`gate-routes`, `test:routes`).
- **Sitemap / llm indexable parity** — `sitemap.xml` and `llm.txt` list only indexable published routes for the active mode.
- **Technical routes retained, non-indexable** — `/404` and `/thank-you` always publish but are omitted from sitemap/llm and parity targets.
- **Authoritative identity vs seed content docs** — AGENTS.md, SKILL.md, and README clarify that after scaffold, `business.json` + `site.json` are identity truth; leftover masonry/hardscape services, blog, section copy, and demo assets are expected seed content to rewrite (not a conflict).

### Changed / Improved

- Template and CLI package version **2.2.0**.
- Default published template clone ref: `CREATE_CONTRACTOR_TEMPLATE_REF` → **`v2.2.0`** (override still supported).
- Build pipeline includes theme lint, route tests, and post-build route gate alongside existing data validation and `astro check` / `astro build`.
- pnpm-only package-manager guards unchanged.

### Validation

**Scaffolded client sites / day-to-day template use** — run:

```bash
pnpm run build
```

`pnpm run build` already runs package-manager guard, data validation, theme lint/tests, route tests, Astro check/build, and the route gate.

**Maintainers / debugging** (optional granular commands; not required for client scaffolds):

```bash
pnpm run validate:data
pnpm run test:routes
pnpm run lint:theme
```

**Template-root maintainers only** (CLI package smoke; not for scaffolded client repos):

```bash
pnpm run test:cli
```

### Notes for maintainers

- Do not commit, tag, or publish until this release is verified on a clean tree.
- Tag the git release as `v2.2.0` so the CLI published fallback clone matches the default ref.
- Publish `create-contractor-site@2.2.0` from `packages/create-contractor-site` when ready (pnpm only).

## [2.1.2] — prior

Previous stable template/CLI line before the v2.2 usability release. See git history for incremental fixes after 2.1.x.
