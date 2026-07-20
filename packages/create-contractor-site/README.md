# create-contractor-site

Scaffold a client contractor website from the [website-multipages](https://github.com/glacayo/website-multipages) Astro template.

The CLI validates the target, copies the template, replaces placeholder values in `src/data/*.json`, installs with **pnpm**, validates data, builds, and initializes git **only after** success.

## Requirements

- **Node.js** 22+
- **pnpm** 11.1.2+
- **git**

## Quick start

```bash
pnpm create contractor-site my-client-site
```

This downloads and runs `create-contractor-site` from npm. It is equivalent to the explicit `pnpm dlx` form below.

### Explicit command

```bash
pnpm dlx create-contractor-site my-client-site
```

### Local / monorepo development

From a checkout of this repository:

```bash
node ./packages/create-contractor-site/bin/create-contractor-site.mjs ../my-client-site
```

By default, the CLI prompts for client details. For a non-interactive smoke run, add `--yes`:

```bash
node ./packages/create-contractor-site/bin/create-contractor-site.mjs --yes ../my-client-site
```

Or use the published CLI while pointing it at a local template checkout:

```bash
CREATE_CONTRACTOR_TEMPLATE_ROOT=/path/to/website-multipages \
  pnpm dlx create-contractor-site my-client-site
```

## What the CLI does

1. Checks that **pnpm** and **git** are available
2. Resolves the template source (see env vars below)
3. Validates the target directory and refuses targets equal to or inside the template root
4. Copies the template into the target directory (denylist excludes `node_modules`, `dist`, `.astro`, `.git`, `.codegraph`, `docs_trash`, `openspec`, `.atl`, logs, `.env*`, `package-lock.json`, and `packages/`)
5. Replaces **values only** in target `src/data/*.json` (schema/shape preserved)
6. Runs `pnpm install`
7. Runs `pnpm run validate:data`
8. Runs `pnpm run build`
9. Runs `git init` + initial commit **only after** validate and build succeed

If install, validate, or build fails, git init is skipped so a broken scaffold is never committed.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` | JSON object with client answers for scripted/non-interactive scaffolds |
| `CREATE_CONTRACTOR_TEMPLATE_ROOT` | Path to a local template checkout (preferred for monorepo/dev) |
| `CREATE_CONTRACTOR_TEMPLATE_REPO` | Git URL for the published fallback clone (default: this template repo) |
| `CREATE_CONTRACTOR_TEMPLATE_REF` | Git branch/tag/ref to clone (default: `v2.1.2`) |

Template source precedence: `CREATE_CONTRACTOR_TEMPLATE_ROOT` → local monorepo discovery → temporary clone of repo @ ref.

### Scripted answers example

```bash
CREATE_CONTRACTOR_SITE_ANSWERS_JSON='{"businessName":"Acme Masonry","phone":"(757) 555-0199","email":"info@example.com","address":"123 Main St","city":"Virginia Beach","state":"VA","zip":"23451","serviceArea":"Virginia Beach, Norfolk, Chesapeake","primaryServices":["Masonry","Patios"]}' \
  pnpm dlx create-contractor-site my-client-site
```

## pnpm only

This project and the scaffolded client sites use **pnpm only**.

- Do **not** use `npm install` or `npx` for project setup
- Package runners (`pnpm create`, `pnpm dlx`) may start the binary; install/build inside the scaffold always use pnpm

## Options

```text
create-contractor-site [options] <target-dir>

  -y, --yes     Non-interactive mode with built-in sample answers
  -h, --help    Show help
```

## License

ISC. See the [repository](https://github.com/glacayo/website-multipages) for full template documentation.
