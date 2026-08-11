# image-tooling Specification

## Purpose

`smart-image-cli` is opt-in, explicitly-invoked tooling for provenance-tracked image sourcing, run via a checked-in, isolated pnpm capsule. It MUST stay decoupled from root `install`, `validate:data`, `build`, and CI, executing the real CLI on capable hosts. Scope: safe tooling only, not autonomous fulfillment.

## Requirements

### Requirement: Isolated Capsule Workspace, Build Policy, and Root Lifecycle Isolation

The system MUST ship a checked-in nested pnpm workspace at `tools/smart-image/` (own `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`), pinning `smart-image-cli@0.3.0` exactly, outside root `packages` globs. Capsule `pnpm-workspace.yaml` MUST set `allowBuilds.better-sqlite3: false`; root `pnpm-workspace.yaml` MUST NOT declare that entry. `images:check`/`images:setup`/`images:run` MUST be the only entry points; none MAY run from `preinstall`, `postinstall`, `build`, `validate:data`, or CI.

#### Scenario: Capsule installs in isolation with a working native binding

- GIVEN `tools/smart-image/` has its own `pnpm-workspace.yaml` and lockfile
- WHEN the capsule installs its dependencies
- THEN only `tools/smart-image/node_modules/` is written, and root `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` stay unchanged
- AND the resolved `better-sqlite3` prebuild loads with no Python or C++ toolchain invoked

#### Scenario: Root lifecycle stays green and script-free

- GIVEN the capsule is absent, partially installed, or fully installed
- WHEN lifecycle scripts are checked for `images:` references and `install --frozen-lockfile`/`validate:data`/`build` run
- THEN no lifecycle script references `images:`, and each command exits 0 without importing capsule code

### Requirement: Explicit Setup and Truthful Wrapper Invocation

`images:setup` MUST run a frozen-lockfile install scoped to the capsule, MAY require network, and on failure MUST exit non-zero with remediation without affecting root lifecycle. `images:run` MUST invoke a checked-in wrapper importing `runCli` from the capsule's own `smart-image-cli`, never the upstream `smart-img` bin, passing arguments as an array with no shell interpolation. Exit codes MUST propagate truthfully with no fallback to sourcing or copying images on failure.

#### Scenario: Setup succeeds without redundant reinstall

- GIVEN network access is available
- WHEN `images:setup` runs, then runs again
- THEN both exit 0; the rerun performs no redundant fetch

#### Scenario: Setup fails explicitly without network

- GIVEN network access is unavailable
- WHEN `images:setup` runs
- THEN it exits non-zero with remediation, and `build`/`validate:data` stay unaffected

#### Scenario: Wrapper runs correctly where the bin is silent

- GIVEN the capsule is installed on Windows under pnpm's isolated layout
- WHEN a developer runs `images:run -- doctor --json`
- THEN the wrapper's `runCli` call returns the CLI's JSON output; the upstream `smart-img` bin invoked directly returns none

#### Scenario: Arguments never reach a shell, and failure has no silent fallback

- GIVEN an argument contains shell metacharacters, or the capsule is not set up
- WHEN `images:run` executes
- THEN metacharacters reach `runCli` literally, with no subshell interpretation
- AND if not ready, only that command fails with remediation, and no image is silently sourced or copied

### Requirement: State, Secret, and Production Output Isolation

`.img-ia/` (capsule state, credential cache, `_out` candidates) and root `CUSTOMER-IMAGES/` (working originals) MUST stay outside version control, `dist/`, and scaffold output. Root `sharp`/`zod` MUST NOT change to match the capsule's transitive ranges; `dist/` MUST hold zero references to `smart-image-cli`, `better-sqlite3`, or `tools/smart-image/`.

#### Scenario: No leakage into dist or scaffold output, dependencies stay capsule-scoped

- GIVEN `.img-ia/`, `CUSTOMER-IMAGES/` exist, and the capsule resolves its own `sharp`/`zod` versions
- WHEN `build` runs and `create-contractor-site` scaffolds, with dependencies installed at both scopes
- THEN neither `dist/` nor the scaffold target contains bytes from either path
- AND root `package.json` ranges stay unchanged with no forcing `overrides`, and `dist/` holds zero capsule references

### Requirement: Scope Limited to Safe Tooling

This delivery MUST NOT implement autonomous slot fulfillment, asset promotion, a slot registry, JSON rewriting, or attribution rendering. Promoting a sourced master into `src/assets/images/` MUST remain a manual, human-triggered step.

#### Scenario: No automatic promotion

- GIVEN an image candidate exists under `.img-ia/_out/`
- WHEN any `images:*` or build command runs
- THEN no file is copied into `src/assets/images/` or referenced in JSON automatically
