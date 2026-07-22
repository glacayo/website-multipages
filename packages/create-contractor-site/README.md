# create-contractor-site

Scaffold a client contractor website from the [website-multipages](https://github.com/glacayo/website-multipages) Astro template.

**Package version:** `2.2.0` · **Default template ref:** `v2.2.0` (`CREATE_CONTRACTOR_TEMPLATE_REF`)

The CLI validates the target, copies the template, replaces placeholder values in `src/data/*.json`, installs with **pnpm**, validates data, builds, and initializes git **only after** success.

## What's new in 2.2.0

- **`siteType`** — choose `one-page`, `multipage`, or `seo` (aliases accepted). Written to `site.json.site_type`. Default for new scaffolds: `multipage`.
- **Expanded intake** — payment methods, hours, free-estimate wording, years of experience, license, insurance, social links, and directories (interactive, `--yes` defaults, or `CREATE_CONTRACTOR_SITE_ANSWERS_JSON`).
- **Template clone default** — published fallback uses git ref **`v2.2.0`** unless you set `CREATE_CONTRACTOR_TEMPLATE_ROOT` or `CREATE_CONTRACTOR_TEMPLATE_REF`.
- After scaffold, treat `business.json` + `site.json` as authoritative identity; leftover demo trade content is expected seed material to rewrite.

Full release notes: repository root [`CHANGELOG.md`](../../CHANGELOG.md).

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
4. Copies the template into the target directory (denylist excludes `node_modules`, `dist`, `.astro`, `.git`, `.codegraph`, `docs_trash`, `openspec`, `.atl`, `logs`, `*.log`, `.env*`, `package-lock.json`, and `packages/`)
5. Replaces **values only** in target `src/data/*.json` (schema/shape preserved)
6. Runs `pnpm install`
7. Runs `pnpm run validate:data`
8. Runs `pnpm run build`
9. Runs `git init` + initial commit **only after** validate and build succeed

If install, validate, or build fails, git init is skipped so a broken scaffold is never committed.

### After scaffold

In the generated client repo:

- Treat `src/data/business.json` and `src/data/site.json` as **authoritative client identity**
- Leftover masonry/hardscape services, blog posts, section copy, and demo assets are **expected seed content** — rewrite them for the real trade; do not treat them as a conflict
- Keep replacing **values/copy/assets only**; preserve JSON shape and `_instructions`
- Keep real client PII out of the shared template base (this repo)

See the template root `AGENTS.md`, `SKILL.md`, and `README.md` for the full agent/developer workflow. Finish client customization with `pnpm run validate:data` and `pnpm run build`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` | JSON object with client answers for scripted/non-interactive scaffolds |
| `CREATE_CONTRACTOR_TEMPLATE_ROOT` | Path to a local template checkout (preferred for monorepo/dev) |
| `CREATE_CONTRACTOR_TEMPLATE_REPO` | Git URL for the published fallback clone (default: this template repo) |
| `CREATE_CONTRACTOR_TEMPLATE_REF` | Git branch/tag/ref to clone (default: `v2.2.0`) |

Template source precedence: `CREATE_CONTRACTOR_TEMPLATE_ROOT` → local monorepo discovery → temporary clone of repo @ ref.

### Scripted answers example

Trust, payment, hours, social, directory, and website-type fields may be omitted/blank — `buildAnswers` fills defaults. `--yes` omits them for the same parity (including `site_type: multipage`).

```bash
CREATE_CONTRACTOR_SITE_ANSWERS_JSON='{"businessName":"Acme Masonry","phone":"(757) 555-0199","email":"info@example.com","street":"123 Main St","city":"Virginia Beach","state":"VA","zip":"23451","serviceArea":"Virginia Beach, Norfolk, Chesapeake","primaryServices":["Masonry","Patios"]}' \
  pnpm dlx create-contractor-site my-client-site
```

Compact payment/hours/social/directories + website type:

```bash
CREATE_CONTRACTOR_SITE_ANSWERS_JSON='{"businessName":"Acme Masonry","primaryServices":["Masonry"],"paymentMethods":"Cash, Credit Card","hoursWeekday":"8:00 AM - 5:00 PM","hoursSaturday":"Closed","hoursSunday":"Closed","social":"facebook=https://facebook.com/acme,instagram=https://instagram.com/acme","directories":"Google Business|https://g.co/acme,BBB|https://bbb.org/acme","siteType":"one-page"}' \
  pnpm dlx create-contractor-site my-client-site
```

All answer paths (`CREATE_CONTRACTOR_SITE_ANSWERS_JSON`, `--yes`, interactive) go through `buildAnswers`:

| Field | JSON key | Blank / omitted |
|-------|----------|-----------------|
| Free-estimate wording | `freeEstimate` | `Free On-Site Estimate` |
| Years of experience | `yearsExperience` | `10+` |
| License | `license` | `Licensed & Insured` |
| Insurance | `insurance` | Fully insured with general liability and workers' compensation. |
| Founded year (optional) | `foundedYear` | `""` — key always written; never removed |
| Payment methods | `paymentMethods` (CSV string or `string[]`) | `Cash`, `Check`, `Credit Card`, `Financing Available` — never `[]` |
| Business hours | `hours` (`[{days,time}]` ×3) or compact `hoursWeekday` / `hoursSaturday` / `hoursSunday` | Mon–Fri `7:00 AM - 6:00 PM`, Sat `8:00 AM - 2:00 PM`, Sun `Closed` |
| Social links | `social` (object or `network=url` CSV) | `{}`; blank keys omitted (`facebook`…`x`) |
| Directories | `directories` (`[{name,url}]` or `Name\|url` CSV) | none → ≥1 placeholder + `enable_directories: false` (never `[]`) |
| Website type | `siteType` (`one-page` \| `multipage` \| `seo`; aliases like `one page` / `single-page` / `multi page` / `multi` accepted) | `multipage` — always written to `site.json.site_type` as a canonical value |

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
