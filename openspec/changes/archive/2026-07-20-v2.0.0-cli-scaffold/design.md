# Design: v2.0.0 CLI Scaffold

## Change

`v2.0.0-cli-scaffold`

## Goal

Add a publishable monorepo package, `packages/create-contractor-site/`, that scaffolds a client contractor site from this placeholder-only template with full setup: copy files, replace JSON values, install dependencies with pnpm, validate/build, initialize git, and create the initial commit.

## Decisions

### 1. Package layout

Create a workspace package:

```text
packages/create-contractor-site/
  package.json
  bin/create-contractor-site.mjs
  src/copy-template.mjs
  src/prompts.mjs
  src/replace-data.mjs
  src/run-command.mjs
  src/validate-target.mjs
```

The package exposes a `bin` named `create-contractor-site`. It remains dependency-light and uses Node built-ins where practical.

### 2. CLI flow

Command:

```bash
create-contractor-site <target-dir>
```

Flow:

1. Validate target argument.
2. Refuse existing non-empty target directories.
3. Prompt for client business data.
4. Copy template files into target using denylist filters.
5. Replace JSON values only in `src/data/*.json`.
6. Run `pnpm install` in target.
7. Run `pnpm run validate:data` and `pnpm run build` in target.
8. Run `git init`, `git add -A`, and `git commit -m "chore: initial client scaffold from contractor template"`.
9. Print success message and next steps.

### 3. Copy strategy

Use a recursive copy with a denylist. Denylisted paths:

- `node_modules/`
- `dist/`
- `.astro/`
- `.git/`
- `.codegraph/`
- `docs_trash/`
- `openspec/`
- `*.log`
- `.env`, `.env.*`, `.env.local`, `.env.*.local`
- `package-lock.json`

This avoids copying generated, local-only, secret, and SDD/internal artifacts while preserving guard files such as `AGENTS.md`, `.npmrc`, `pnpm-workspace.yaml`, and `scripts/enforce-package-manager.cjs`.

### 4. Prompt strategy

Use Node's `readline/promises` first to avoid adding prompt dependencies. Required fields re-prompt on empty values.

Required fields:

- business name
- legal business name
- tagline
- primary phone
- primary email
- street address
- city
- state
- zip
- service area
- founded year
- primary services

Optional values default to placeholders.

### 5. JSON replacement strategy

Replacement is value-only. It must never rename keys, remove keys, flatten arrays, or remove `_instructions` blocks.

Initial replacements:

- `business.json`: name, legal name, tagline, phone, email, address, service area, founded year, services offered.
- `site.json`: site title/description can derive from business name and tagline.
- `services.json`: service labels can be updated from the primary services list while preserving item shape.
- `areas.json`: service area/city values updated while preserving structure.

The source template repo is not modified; all writes happen inside the target directory.

### 6. pnpm-only execution

The CLI must run:

```bash
pnpm install
pnpm run validate:data
pnpm run build
```

It must never call `npm install`, `npm ci`, or `npx`. If pnpm is unavailable, the CLI fails with an actionable message.

### 7. Git initialization

After install/build success:

```bash
git init
git add -A
git commit -m "chore: initial client scaffold from contractor template"
```

If `git` is unavailable, the CLI reports the failure and leaves the generated target intact.

### 8. Workspace updates

Update `pnpm-workspace.yaml` to include `packages/*` if it does not already. Root `pnpm run build` must continue to validate/build the template without accidentally publishing or executing the CLI package.

### 9. Verification

Manual CLI verification is acceptable because the repo has no test runner. Verification creates a temporary target under the system temp directory, runs the CLI, and confirms:

- excluded folders are absent
- guard files are present
- `src/data/*.json` remains schema-valid
- `pnpm run validate:data` passes in the target
- `pnpm run build` passes in the target
- target has a git repository with an initial commit

### 10. Risks

| Risk | Mitigation |
|------|------------|
| npm/npx confusion | CLI internally uses pnpm only; docs make pnpm primary. |
| JSON contract drift | Value-only JSON transforms; run `pnpm run validate:data`. |
| Client data accidentally written to template | Writes target only; source paths are read-only. |
| Copying internal artifacts | Denylist includes SDD, generated, local, and secret files. |
| Git/pnpm unavailable | Fail with actionable messages and non-zero exit code. |

## Files expected to change

- `packages/create-contractor-site/package.json`
- `packages/create-contractor-site/bin/create-contractor-site.mjs`
- `packages/create-contractor-site/src/*.mjs`
- `pnpm-workspace.yaml`
- `README.md`
- `SKILL.md`
- `openspec/changes/v2.0.0-cli-scaffold/*`

## Next phase

Create implementation tasks with `sdd-tasks`.
