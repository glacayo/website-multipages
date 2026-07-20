# Spec: v2.0.0 CLI Scaffold

## Change

`v2.0.0-cli-scaffold`

## References

- Proposal: `openspec/changes/v2.0.0-cli-scaffold/proposal.md`

## 1. CLI invocation

### Requirements

The package `create-contractor-site` MUST expose a single executable binary with the same name.

### Scenarios

**CLI.1 — Binary invocation**

- **Given** the package is installed globally or via `pnpm create`
- **When** the user runs `create-contractor-site ./acme-contractor`
- **Then** the CLI starts and prints a welcome message.

**CLI.2 — Missing argument**

- **Given** the user runs `create-contractor-site` without a target directory
- **Then** the CLI prints usage instructions and exits with code `1`.

**CLI.3 — Existing non-empty directory**

- **Given** the target directory already exists and contains files
- **When** the CLI starts
- **Then** it refuses to overwrite and exits with code `1`, suggesting a different directory.

## 2. Template copy

### Requirements

The CLI MUST copy the minimum set of template files required to build and run the contractor website. It MUST exclude generated, dependency, and internal-only artifacts.

### Scenarios

**COPY.1 — Denylist**

- **When** the CLI copies the template
- **Then** it MUST NOT copy the following:
  - `node_modules/`
  - `dist/`
  - `.astro/`
  - `.git/`
  - `.codegraph/`
  - `docs_trash/`
  - `openspec/`
  - `*.log`
  - `.env*`
  - `package-lock.json`

**COPY.2 — Required files copied**

- **When** the CLI copies the template
- **Then** it MUST copy:
  - `src/`
  - `public/`
  - `scripts/`
  - `package.json`
  - `pnpm-lock.yaml`
  - `.npmrc`
  - `pnpm-workspace.yaml`
  - `astro.config.mjs`
  - `tsconfig.json`
  - `tailwind.config.*` or equivalent
  - `netlify.toml`
  - `README.md`
  - `AGENTS.md`
  - `SKILL.md`
  - `src/assets/images/`

**COPY.3 — Guard files intact**

- **Given** the target is scaffolded
- **Then** `AGENTS.md`, `.npmrc`, `scripts/enforce-package-manager.cjs`, and `pnpm-workspace.yaml` MUST be present and unmodified in shape.

## 3. Interactive prompts

### Requirements

The CLI MUST collect client-specific values through an interactive prompt flow.

### Scenarios

**PROMPT.1 — Required fields**

- **When** the CLI prompts the user
- **Then** it MUST ask for:
  - Business name
  - Legal business name
  - Tagline
  - Primary phone
  - Primary email
  - City
  - State
  - ZIP
  - Street address
  - Service area description
  - Founded year
  - Primary services (comma-separated or multi-select)

**PROMPT.2 — Optional fields**

- **When** the user skips optional fields
- **Then** the CLI leaves the corresponding placeholder values in place and continues.

**PROMPT.3 — Validation**

- **Given** the user provides an empty required field
- **Then** the CLI re-prompts until a non-empty value is given or the user aborts.

## 4. JSON value replacement

### Requirements

The CLI MUST replace placeholder values in the 12-file JSON contract while preserving schema shape.

### Scenarios

**JSON.1 — business.json replacement**

- **Given** the user enters business name `Acme Masonry`
- **When** replacement runs
- **Then** `src/data/business.json` contains `"name": "Acme Masonry"` and all other keys remain intact.

**JSON.2 — services.json replacement**

- **Given** the user enters primary services `Masonry, Patios, Retaining Walls`
- **When** replacement runs
- **Then** `src/data/services.json` service names and descriptions are updated while the array shape, slugs, and `variant` keys are preserved.

**JSON.3 — Schema preservation**

- **Given** replacement completes
- **Then** no top-level key is removed, no key is renamed, and no array is flattened.

**JSON.4 — Placeholder-only template unchanged**

- **Given** the CLI runs against the template
- **Then** the source template repository is not modified.

## 5. pnpm install

### Requirements

The CLI MUST install dependencies in the target directory using pnpm only.

### Scenarios

**INSTALL.1 — pnpm required**

- **Given** the target directory has been copied and JSON replaced
- **When** the CLI runs the install step
- **Then** it executes `pnpm install` in the target directory.

**INSTALL.2 — npm forbidden**

- **When** the install step runs
- **Then** the CLI MUST NOT invoke `npm install`, `npm ci`, or `npx`.

**INSTALL.3 — Failure handling**

- **Given** `pnpm install` fails
- **Then** the CLI prints the error, stops, and exits with a non-zero code without creating a git commit.

## 6. Git init + commit

### Requirements

The CLI MUST initialize a git repository in the target directory and create an initial commit.

### Scenarios

**GIT.1 — Init**

- **Given** install succeeded
- **When** the git step runs
- **Then** it executes `git init` in the target directory.

**GIT.2 — Initial commit**

- **Given** git is initialized
- **When** the CLI commits
- **Then** the initial commit message is `chore: initial client scaffold from contractor template`.

## 7. Verification

### Requirements

After scaffolding, the generated project MUST pass validation and build.

### Scenarios

**VERIFY.1 — Validation passes**

- **Given** scaffolding finished
- **When** the CLI runs `pnpm run validate:data`
- **Then** it exits with code `0`.

**VERIFY.2 — Build passes**

- **Given** validation passed
- **When** the CLI runs `pnpm run build`
- **Then** it exits with code `0` and produces `dist/`.

**VERIFY.3 — Final success message**

- **Given** build passed
- **Then** the CLI prints the target directory path and next steps.

## 8. Dependencies and environment

- Node.js 22 or later.
- pnpm 11.1.2 or later installed globally.
- `git` binary available in PATH.
- Optional prompt library MAY be added with pnpm if justified in design/tasks.
