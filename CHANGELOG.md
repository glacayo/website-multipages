# Changelog

All notable changes to the contractor multipages template and `create-contractor-site` CLI are documented here.

The format is release-note style. Versions follow the monorepo package version (`package.json` and `packages/create-contractor-site/package.json`).

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
