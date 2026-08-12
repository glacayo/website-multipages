# AGENTS.md

This repository is a reusable contractor website template (v2.3.0).
Non-negotiable rules for every AI coding agent, automation script, or contributor:

1. **pnpm is the only allowed package manager**
2. **the 12-file JSON data contract must stay schema-stable**
3. **do not hardcode client business data into components**
4. **`pnpm run build` must pass before finishing nontrivial work**

## 1. Package manager rules

Use pnpm for everything.

Allowed:

- `pnpm install`
- `pnpm install --frozen-lockfile`
- `pnpm add <package>`
- `pnpm remove <package>`
- `pnpm update <specific-package>` (only with justification)
- `pnpm run <script>`

Forbidden:

- `npm install`
- `npm add`
- `npm update`
- `npm run`
- `npx`
- committing `package-lock.json`

### Why this exists

This repo is cloned into many future contractor sites. Introducing npm breaks template consistency.

### Enforcement

- `AGENTS.md`
- `README.md`
- `SKILL.md`
- `scripts/enforce-package-manager.cjs`
- `package.json` script guards + `preinstall`
- `.npmrc`
- `devEngines.packageManager`
- `package-lock=false`
- `engine-strict=true`
- `pnpm-workspace.yaml` build-script allowlist

Do not remove, weaken, or bypass these safeguards.

### Dependency change checklist

```bash
pnpm run build
```

Also verify:

- `pnpm-lock.yaml` updated only when deps actually changed
- no unexpected install/build scripts introduced

For reproducible environments:

```bash
pnpm install --frozen-lockfile
```

## 2. Template reuse rules

This repo is not a client project. It is a reusable template.

### Do

- clone it into a new client repository
- keep guard files intact
- keep the JSON contract stable
- replace only business-specific values in `src/data/*.json` and assets

### Do not

- add real client PII back into the shared template base
- copy schema-breaking changes from a client repo into the shared template
- rename keys without updating every consumer + Zod schemas
- flatten structured JSON without code changes

## 2.1 Authoritative identity vs seed content (after scaffold)

After `create-contractor-site` scaffolds a client repo, treat identity and leftover demo content differently:

### Authoritative client identity

These two files are the **authoritative client identity** source after scaffold:

- `src/data/business.json` — legal/trade name, phones, emails, address, hours, license, insurance, payment methods, services offered, social links, and related business facts
- `src/data/site.json` — site URL, SEO defaults, theme, feature flags, header/footer variants

When identity conflicts with older copy elsewhere, **trust `business.json` and `site.json`** and rewrite the other files to match.

### Expected seed content (not a conflict)

The scaffold intentionally leaves masonry/hardscape-oriented **seed content** so the site builds and demos immediately. Leftover demo material is **normal**, not an error or merge conflict. Rewrite it for the real trade:

- services catalog and landings (`services.json`, `landings.json`, and related `business.json.services_offered` entries that still describe the demo trade)
- blog posts (`blog.json`)
- gallery, hero, testimonials, FAQ, areas, directories copy (`gallery.json`, `hero.json`, `testimonials.json`, `faq.json`, `areas.json`, `directories.json`)
- navigation labels/paths that still describe demo sections (`navigation.json`)
- demo images under `src/assets/images/` and public placeholders under `public/` when they do not match the client

### How to rewrite safely

- Replace **values, copy, and assets only**
- Preserve JSON **top-level keys**, nested object shape, required arrays/item shapes, slugs where the contract expects them, `variant` keys, and every file’s `_instructions` block
- Do **not** hardcode phones, emails, addresses, or service copy into `.astro` components — read loaders
- Keep the **shared template base** placeholder/neutral; put real client data only in client repos
- Never put real client PII back into this template repository
- Finish nontrivial client customization with:

```bash
pnpm run validate:data
pnpm run build
```

## 3. JSON data contract (v2 — 12 files)

Canonical data layer under `src/data/`:

1. `business.json`
2. `site.json`
3. `navigation.json`
4. `hero.json`
5. `services.json`
6. `gallery.json`
7. `testimonials.json`
8. `faq.json`
9. `areas.json`
10. `directories.json`
11. `blog.json`
12. `landings.json`

Supporting code:

- `src/data/types.ts` — interfaces
- `src/data/loaders.ts` — typed getters
- `src/data/validation.ts` — Zod schemas (mirrored in `scripts/validate-data.cjs`)

### Content rules

- preserve top-level keys
- preserve nested object shape
- preserve required arrays and item shapes
- keep each file’s `_instructions` block
- do not remove a key just because current copy looks optional
- after scaffold, treat leftover masonry/hardscape services, blog, assets, and section copy as rewritable seed content (see §2.1)

### Variant fields

Sections select visuals via optional `variant` keys (section JSON) or `header_variant` / `footer_variant` in `site.json`. Unknown variants must fall back to defaults without failing the build.

### Images

Content images live in `src/assets/images/` and are referenced from JSON as `./images/...`.
Untransformed public assets (logo, favicon, OG default) live in `public/`.

Optional provenance tooling (`images:*`) produces **consumable candidates** under `<image-root>/_out/`. `.img-ia/` is internal state, not the consumable output directory. The active coding agent autonomously selects a compliant candidate, copies it from `<image-root>/_out/` into `src/assets/images/`, and updates only values + alt text in the relevant 12 JSON files — it does not wait for human promotion approval, does not persist attribution metadata, and does not render public credits. See §8.

### Why this matters

UI expects contract-defined keys. Changing wording is easy; changing shape is risky.

Before editing JSON, verify consumers (pages/components) and run:

```bash
pnpm run validate:data
```

## 4. Required workflow for AI agents

### Before changes

Read:

- `package.json`
- `.npmrc`
- `pnpm-workspace.yaml`
- the relevant page/component
- the relevant `src/data/*.json` file
- `src/data/types.ts` when touching data shape
- `.agents/skills/smart-image-cli/SKILL.md` **before any** `images:*` command (mandatory gate)

### During changes

- keep pnpm enforcement files untouched
- keep template neutral unless the task explicitly converts this into a client build
- prefer additive contract changes over shape-breaking ones
- update Zod/validation when shapes change
- do not hardcode phones, emails, addresses, or service copy in components — read loaders
- do not hook `images:*` into install, build, `validate:data`, or CI
- do not promote candidates from `.img-ia/` (internal state); the agent copies from `<image-root>/_out/` and updates JSON values + alt text only

### Before finishing

```bash
pnpm run validate:data
pnpm run build
```

`pnpm run build` already runs the package-manager guard, data validation, `astro check`, and `astro build`. It never runs image tooling.

## 5. Security obligations

### 5.1 No npm fallback

Even if the environment has npm installed, this repo must not fall back to npm.

### 5.2 No blind dependency upgrades

Preferred sequence:

1. inspect why the upgrade matters
2. review lockfile diff
3. run `pnpm run build`
4. verify no unexpected scripts/subdeps

### 5.3 Lockfile hygiene

- commit `pnpm-lock.yaml` when dependencies change
- do not regenerate it unnecessarily
- use `--frozen-lockfile` in CI / Netlify

### 5.4 Restricted install build scripts

`pnpm-workspace.yaml` allowlist is intentional. Do not loosen it without review.

### 5.5 Template content safety

Template content must remain placeholder/lorem-style. Real client data belongs in a client repo.

### 5.6 Image-tooling secrets and state

- Provider credentials live **outside the repo** only (`~/.config/smart-image-cli/` / platform equivalent, or env). Never commit keys, caches, or CLI config into Git, `dist/`, or scaffold output.
- Ignore and scaffold-deny root `CUSTOMER-IMAGES/` (working originals) and `.img-ia/` (state, caches, `_out` candidates). Capsule `tools/smart-image/node_modules/` is also ignored.
- Capsule sources under `tools/smart-image/` stay checked in; root lockfile / workspace / `.npmrc` stay separate from the capsule graph.

## 6. High-risk anti-patterns

Do not:

- add `npm install` / `npx` instructions
- delete the package-manager guard
- restore `package-lock.json`
- reintroduce v1 monolith files (`content.json`, `blogs.json`) as the contract
- rename/remove structured JSON fields because they “look unused”
- hardcode client business data into `.astro` components
- call the upstream `smart-img` bin, or invoke `images:*` from install/build/`validate:data`/CI
- silently fall back to another provider/source/copy path when image tooling fails
- promote a poor match when no candidate satisfies a slot — refine constraints/query or explicitly report the slot blocked
- auto-promote from `.img-ia/` (internal state) into `src/assets/images/`; the agent copies from `<image-root>/_out/` and updates JSON values + alt text only

## 7. Short checklist

Before submitting changes, confirm:

- [ ] pnpm is still the only allowed package manager
- [ ] `package-lock.json` is not reintroduced
- [ ] guard docs/scripts remain intact
- [ ] only the 12 contract JSON files are the data source
- [ ] after scaffold, `business.json` + `site.json` are treated as authoritative identity
- [ ] leftover masonry/hardscape seed content was rewritten (not flagged as a conflict)
- [ ] JSON shape and `_instructions` blocks were preserved while replacing values/copy/assets
- [ ] no real client PII was added to the shared template base
- [ ] variants still fall back safely
- [ ] `pnpm run validate:data` passes
- [ ] `pnpm run build` passes
- [ ] if `images:*` was used: skill was read first; no auto-promotion; credentials/state stay out of Git/`dist`/scaffold

If any fail, fix them before finishing.

## 8. Optional image tooling (explicit only)

**Answer first:** `images:*` is optional, human/agent-invoked tooling. Install, `validate:data`, build, and CI **never** run it. Root dependency graph stays separate from the capsule at `tools/smart-image/`.

### Mandatory skill gate

Before **every** `images:check`, `images:setup`, or `images:run` invocation, read:

`.agents/skills/smart-image-cli/SKILL.md`

That skill is the runtime contract (wrapper-only path, readiness, no silent fallback, promotion rules). Do not invent alternate entry points.

### Quick path

```bash
pnpm run images:check          # exit 0 ready | 1 + remediation (never downloads)
pnpm run images:setup          # frozen capsule install; may need network; no fallback
pnpm run images:run -- doctor --json   # wrapper → real CLI; truthful exit codes
```

| Topic | Rule |
|-------|------|
| Entry points | Only the three root scripts above (via pnpm) |
| Capsule | `tools/smart-image/` — own manifest, workspace, lock; not in root workspace globs |
| Setup / network | `images:setup` may require network; failure is explicit non-zero + remediation |
| Provider missing | Readiness **warning** only; provider-required work fails explicitly (no silent skip) |
| Credentials | Outside repo only — never in Git, `dist/`, or scaffold |
| State boundaries | `.img-ia/`, root `CUSTOMER-IMAGES/` — not versioned, not scaffolded, not in `dist/` |
| Promotion | Active agent copies from `<image-root>/_out/` into `src/assets/images/` and updates JSON values + alt text; never waits for human approval |
| Out of scope | Persisting attribution metadata or rendering public credits |

Detailed decision gates and output contract: `.agents/skills/smart-image-cli/SKILL.md`.
