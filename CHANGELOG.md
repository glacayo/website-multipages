# Changelog

All notable changes to the contractor multipages template and `create-contractor-site` CLI are documented here.

The format is release-note style. Versions follow the monorepo package version (`package.json` and `packages/create-contractor-site/package.json`).

## [Unreleased]

## [2.4.1] — Unreleased documentation patch

### Changed / Improved

- Prepare the corrected `create-contractor-site` README for npm distribution, with current version/default-ref documentation and absolute repository documentation links.
- Require review of all public documentation, CLI help, changelog, and the exact candidate tarball README **before** creating or pushing a release tag.
- Synchronize root/CLI versions to **2.4.1**, default template ref to **`v2.4.1`**, CLI help, and smoke assertions. No new runtime features, dependency or lockfile changes, or publishing guard changes; the features introduced in 2.4.0 remain unchanged.

This entry does not assert publication. Registry and GitHub release confirmation remain required by [`docs/releasing.md`](./docs/releasing.md).

## [2.4.0] — 2026-10-13

Published: [GitHub release v2.4.0](https://github.com/glacayo/website-multipages/releases/tag/v2.4.0) (UTC); [automated release run 38337745249](https://github.com/glacayo/website-multipages/actions/runs/38337745249) succeeded.

### Highlights

- Semantic Raven CTA/call hooks and a queue-preserving `window.dataLayer` bootstrap; client integrations own consent and event delivery.
- Guarded, token-free tag-triggered publication with bounded registry confirmation.

### Changed / Improved

- Template and CLI package version **2.4.0**; default published template clone ref **`v2.4.0`** (environment override still supported), with matching CLI help and regression smoke assertions.
- **Analytics** — semantic hooks and deterministic coverage for the optional integration, without changing the 12-file JSON contract or embedding client identity in components. No GTM installation, event delivery, or runtime form-success event is included; see [`docs/analytics-hooks.md`](./docs/analytics-hooks.md).
- **Guarded autopublishing** — stable annotated `v*` tag pushes trigger publication; manual dispatch from `main` remains a recovery path. Both entry points preserve annotated tag == HEAD == fresh `origin/main`, shared per-tag concurrency, OIDC/provenance, token refusal, registry absence checks, and remote-tag drift checks.
- Dependency ranges, lockfile, pnpm-only enforcement, and minimum release-age policy remain unchanged. Publication uses native pnpm with OIDC/provenance; registry confirmation precedes GitHub release creation. See [`docs/releasing.md`](./docs/releasing.md) for the authoritative recovery contract.

- **Bounded registry confirmation** — the publish workflow's post-publish shell retry loop is replaced by a single `verify-release.mjs registry --expect present --wait` call. It probes the exact canonical version URL and retries only transient visibility conditions (`404`, `429`, `5xx`, network/timeout) with bounded exponential backoff (10s base, doubling to a 60s ceiling) inside a fixed ~5 minute budget, never starting or sleeping for a probe that could not finish in time. Redirects, malformed/missing metadata, identity mismatches, and every other status still fail closed immediately. Publish stays a single irreversible command with its adjacent absence re-check, and non-wait behavior is unchanged.

## [2.3.1] — 2026-09-29

### Highlights

- Supported dependency refresh (Astro 7.3.x / Sharp 0.35.x) with updated CLI smoke coverage.
- Hosted pnpm CI plus guarded, token-free npm trusted publishing infrastructure prepared for `create-contractor-site`.

### Changed / Improved

- Template and CLI package version **2.3.1**.
- Default published template clone ref: `CREATE_CONTRACTOR_TEMPLATE_REF` → **`v2.3.1`** (override still supported).
- **Supported Astro upgrade** — root `astro` range moved to `^7.3.2` with compatible `@lucide/astro` (`~1.31.0`), `@tailwindcss/vite` (`^4.3.3`), `alpinejs` (`^3.16.1`), `tailwindcss` (`^4.3.3`), `@astrojs/check` (`^0.9.10`), `sharp` (`^0.35.4`), and `zod` (`^4.4.3`) refresh; `pnpm-lock.yaml` and the CLI smoke suite were updated together.
- **pnpm CI** — `.github/workflows/ci.yml` runs a frozen-lockfile install, `pnpm run build`, the release-guard self-tests, and the capsule-free core CLI smoke on pull requests and `main`; the template root stays `private: true`.
- **Trusted publishing infrastructure** — manual `main`-only `.github/workflows/publish.yml` with release identity/registry guards (`verify-release.mjs`, `test-release-guards.mjs`) and a `docs/releasing.md` runbook; the workflow refuses stored npm tokens and is wired for OIDC trusted publishing with provenance.
- **Capsule-free CLI smoke** — `SKIP_CAPSULE_TESTS=1` keeps the core suite runnable without the optional `tools/smart-image/` capsule, and the smoke suite tolerates an absent capsule directory.

### Fixed

- **Optional capsule directory** — CI smoke no longer fails when `tools/smart-image/` is not installed.

### Validation

**Scaffolded client sites / day-to-day template use** — run:

```bash
pnpm run build
```

`pnpm run build` already runs package-manager guard, data validation, theme lint/tests, route tests, Astro check/build, and the route gate. It never runs `images:*`.

**Template-root maintainers only** (CLI package smoke; not for scaffolded client repos):

```bash
pnpm run test:cli
SKIP_CAPSULE_TESTS=1 SKIP_CLI_E2E=1 pnpm run test:cli
```

**Release machinery self-tests**:

```bash
node --test .github/scripts/test-release-guards.mjs
```

### Notes for maintainers

- Do not commit, tag, or publish until this release is verified on a clean tree.
- npm trusted-publisher binding and the 2FA/trusted-publishing policy are maintainer-supplied and were not independently authenticated here; a real OIDC/provenance exchange remains untested.
- Tag the git release as `v2.3.1` so the CLI published fallback clone matches the default ref.
- Publish `create-contractor-site@2.3.1` from `packages/create-contractor-site` when ready (pnpm only).

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
