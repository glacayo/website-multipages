# Tasks: v2.0.0 CLI Scaffold

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550-750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 CLI shell/copy → PR 2 prompts/JSON → PR 3 commands/git/docs/verification |
| Delivery strategy | feature-branch-chain (conceptual; apply does not open PRs) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Resolved (orchestrator: feature-branch-chain, no PRs in apply)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Workspace package, binary, target validation, copy denylist | PR 1 | Base: main; verify copied guard files and denied paths. |
| 2 | Prompt flow and value-only JSON replacement | PR 2 | Depends on PR 1; validate 12-file contract. |
| 3 | pnpm commands, git init, docs, temp-target verification | PR 3 | Depends on PR 2; run final manual E2E. |

## Phase 1: Workspace and CLI Foundation

- [x] 1.1 Update `pnpm-workspace.yaml` to include `packages/*` while preserving root package and guard allowlist.
- [x] 1.2 Create `packages/create-contractor-site/package.json` with module type, engines, package metadata, and `bin.create-contractor-site`.
- [x] 1.3 Create `packages/create-contractor-site/bin/create-contractor-site.mjs` to parse `<target-dir>`, print welcome/usage, and exit `1` when missing.
- [x] 1.4 Add `packages/create-contractor-site/src/validate-target.mjs` to resolve target path and reject existing non-empty directories.

## Phase 2: Copy and Prompt Collection

- [x] 2.1 Add `packages/create-contractor-site/src/copy-template.mjs` with recursive denylist for `node_modules`, `dist`, `.astro`, `.git`, `.codegraph`, `docs_trash`, `openspec`, logs, `.env*`, and `package-lock.json`.
- [x] 2.2 Verify copy keeps `src`, `public`, `scripts`, guard files, config files, `README.md`, `AGENTS.md`, `SKILL.md`, and assets.
- [x] 2.3 Add `packages/create-contractor-site/src/prompts.mjs` using `readline/promises` for required business/site/service/area fields.
- [x] 2.4 Re-prompt empty required values; allow optional fields to keep placeholders.

## Phase 3: JSON and Command Execution

- [x] 3.1 Add `packages/create-contractor-site/src/replace-data.mjs` to update target-only values in `business.json`, `site.json`, `services.json`, and `areas.json`.
- [x] 3.2 Preserve all JSON keys, arrays, slugs, variants, and `_instructions`; never edit source `src/data/*.json`.
- [x] 3.3 Add `packages/create-contractor-site/src/run-command.mjs` for `pnpm install`, `pnpm run validate:data`, and `pnpm run build` with fail-fast errors.
- [x] 3.4 Check `pnpm` availability and never invoke `npm`, `npm ci`, or `npx`.

## Phase 4: Git and Documentation

- [x] 4.1 Wire CLI flow: validate → prompts → copy → JSON replace → pnpm commands → git commands → success message.
- [x] 4.2 Run `git init`, `git add -A`, and commit `chore: initial client scaffold from contractor template` only after build success.
- [x] 4.3 Update `README.md` with `pnpm create contractor-site <target-dir>`, required tools, denylist, and validation/build behavior.
- [x] 4.4 Update `SKILL.md` with scaffold workflow plus pnpm-only and placeholder-only guard reminders.

## Phase 5: End-to-End Verification

- [x] 5.1 Scaffold into a system temp target; confirm denied paths are absent and guard files are intact.
- [x] 5.2 In the temp target, run `pnpm install`, `pnpm run validate:data`, and `pnpm run build`; confirm `dist/` exists.
- [x] 5.3 Confirm source template data stays placeholder-only and target git history contains the initial commit.
