# AGENTS.md

This repository is a reusable contractor website template (v2.1.2).
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

### Variant fields

Sections select visuals via optional `variant` keys (section JSON) or `header_variant` / `footer_variant` in `site.json`. Unknown variants must fall back to defaults without failing the build.

### Images

Content images live in `src/assets/images/` and are referenced from JSON as `./images/...`.
Untransformed public assets (logo, favicon, OG default) live in `public/`.

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

### During changes

- keep pnpm enforcement files untouched
- keep template neutral unless the task explicitly converts this into a client build
- prefer additive contract changes over shape-breaking ones
- update Zod/validation when shapes change
- do not hardcode phones, emails, addresses, or service copy in components — read loaders

### Before finishing

```bash
pnpm run validate:data
pnpm run build
```

`pnpm run build` already runs the package-manager guard, data validation, `astro check`, and `astro build`.

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

## 6. High-risk anti-patterns

Do not:

- add `npm install` / `npx` instructions
- delete the package-manager guard
- restore `package-lock.json`
- reintroduce v1 monolith files (`content.json`, `blogs.json`) as the contract
- rename/remove structured JSON fields because they “look unused”
- hardcode client business data into `.astro` components

## 7. Short checklist

Before submitting changes, confirm:

- [ ] pnpm is still the only allowed package manager
- [ ] `package-lock.json` is not reintroduced
- [ ] guard docs/scripts remain intact
- [ ] only the 12 contract JSON files are the data source
- [ ] variants still fall back safely
- [ ] `pnpm run validate:data` passes
- [ ] `pnpm run build` passes

If any fail, fix them before finishing.
