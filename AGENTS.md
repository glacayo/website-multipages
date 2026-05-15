# AGENTS.md

This repository is a reusable contractor template.
Its two non-negotiable rules are:

1. **pnpm is the only allowed package manager**
2. **the JSON data contract must stay schema-stable**

Every AI coding agent, automation script, or contributor working in this repo must follow those rules.

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
This repo is meant to be cloned into many future contractor sites.
If any agent or contributor introduces npm, the template loses consistency across projects.

### Enforcement details
This repo is enforced at multiple levels:

- `AGENTS.md`
- `README.md`
- `scripts/enforce-package-manager.cjs`
- `package.json` script guards
- `.npmrc`
- `devEngines.packageManager`
- `package-lock=false`
- `engine-strict=true`

Do not remove, weaken, or bypass these safeguards.

### Required checks before finishing dependency work
If you change dependencies or lockfile behavior, verify:

- `pnpm run build`
- `pnpm-lock.yaml` is updated when dependencies actually changed
- no new unnecessary install/build scripts were introduced

For reproducible environments, use:

```bash
pnpm install --frozen-lockfile
```

## 2. Template reuse rules

This repo is not a client project.
It is a reusable template for future contractor websites.

### Do
- clone it into a new client repository
- keep the repo guard files intact
- keep the JSON contract stable
- replace only business-specific content

### Do not
- add real client data back into the template base
- copy schema-breaking changes from a client repo into the shared template
- rename keys without updating every consumer
- flatten structured JSON without code changes

## 3. JSON data contract rules

The canonical data layer is:

- `src/data/content.json`
- `src/data/blogs.json`
- `src/data/landings.json`

Those files must remain compatible with the frontend components that consume them.

### Content rules
- preserve top-level keys
- preserve nested object shape
- preserve required arrays
- preserve expected item shapes inside arrays
- do not remove a key just because the current copy looks optional

### Why this matters
The UI expects contract-defined keys, not flexible freeform text.
Changing wording is easy.
Changing shape is risky.

Before editing JSON, verify the component contract:
- headings
- navigation
- sections
- testimonials
- faq
- hero slides
- directories
- social links
- SEO
- landing pages
- blog metadata

## 4. Required workflow for AI agents modifying this repo

### Before changes
Inspect the current structure first.
Do not assume the schema.
Read:
- `package.json`
- `.npmrc`
- `pnpm-workspace.yaml`
- the relevant page/component
- the relevant `src/data/*.json` file

### During changes
- keep pnpm enforcement files untouched
- keep the template neutral unless the task explicitly asks to convert it into a client build
- prefer additive changes over shape-breaking changes
- avoid destructive refactors unless both frontend and data contract are updated together

### Before finishing
Every nontrivial change should end with:

```bash
pnpm run build
```

If the change touches dependency policy, also check:
- `pnpm outdated`
- lockfile changes
- new install-script packages

## 5. Security obligations

### 5.1 No npm fallback
Even if the runtime environment has npm installed, this repo must not fall back to npm.
pnpm is mandatory.

### 5.2 No blind dependency upgrades
Do not run mass upgrades without review.

Preferred sequence:
- inspect why the upgrade matters
- review lockfile diff
- run `pnpm run build`
- verify no unexpected scripts or subdependencies were introduced

### 5.3 Preserve lockfile hygiene
- commit `pnpm-lock.yaml` when dependencies change
- do not regenerate it unnecessarily
- use `--frozen-lockfile` in CI or deterministic environments

### 5.4 Preserve restricted build scripts
`pnpm-workspace.yaml` currently allows install-time build scripts only for:
- `esbuild`
- `sharp`
- `fsevents`

Do not loosen that allowlist without intentional review.

### 5.5 Keep template content safe
This template must remain lorem/placeholder only.
If you are preparing a new client project, create that work in a client repo, not here.

## 6. High-risk anti-patterns

Do not do any of the following:

- add `npm install` instructions
- replace pnpm docs with npm docs
- delete the package-manager guard script
- restore legacy `package-lock.json`
- copy client JSON schemas from a production repo without diffing
- rename or remove structured JSON fields because “they look unused”
- add real phone numbers, addresses, or client names into the shared template base

## 7. Short checklist for AI coding agents

Before submitting changes, confirm:

- pnpm is still the only allowed package manager
- `package-lock.json` is not reintroduced
- `AGENTS.md`, `README.md`, and guard scripts remain intact
- `src/data/*.json` still follows the same contract
- `pnpm run build` passes

If any of those fail, fix it before finishing.
