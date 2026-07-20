# Proposal: v2.0.0 CLI Scaffold

## Intent

Manual cloning is error-prone: users can miss guard files, weaken pnpm enforcement, edit component copy, or break the 12-file JSON contract. Add a publishable CLI that creates client projects from this placeholder-only template safely.

## Scope

### In Scope
- Add `packages/create-contractor-site/` as a publishable CLI package.
- Support `pnpm create contractor-site <target-dir>` and published package-runner compatibility.
- Copy template files, excluding `node_modules`, `dist`, `.git`, `.codegraph`, `docs_trash`, `openspec/`, etc.
- Prompt for client data and replace `src/data/*.json` values only; keep keys, shapes, arrays, and `_instructions`.
- Run `pnpm install` only, initialize git, and create the initial commit.
- Keep `AGENTS.md`, `.npmrc`, `scripts/enforce-package-manager.cjs`, `pnpm-workspace.yaml`, and package-manager guards intact.

### Out of Scope
- Storing real client data in this template repository.
- Component rewrites, JSON schema changes, or package-manager guard weakening.
- Deployment provisioning, CRM integrations, or AI content generation.

## Capabilities

### New Capabilities
- `cli-scaffold`: publishable create-contractor-site CLI for copy, prompt replacement, pnpm install, git init, and initial commit.

### Modified Capabilities
- `contractor-template-platform`: monorepo must include the CLI package while preserving pnpm-only build/install behavior.
- `json-data-contract`: CLI replacement preserves the 12-file schema and `_instructions`.
- `agent-developer-docs`: README/SKILL guidance should document scaffold usage without encouraging npm-based project workflows.

## Approach

Create a workspace package with a `bin` entry. The CLI resolves the template root, copies through a denylist, prompts for required fields, applies JSON value-only transforms, runs `pnpm install`, then initializes git and commits.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/create-contractor-site/` | New | CLI package logic. |
| `pnpm-workspace.yaml` | Modified | Include `packages/*` workspace package. |
| `README.md`, `SKILL.md` | Modified | Scaffold usage and guard expectations. |
| `src/data/*.json` | Generated | Placeholders mapped to client values in target only. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| npm/npx confusion weakens pnpm-only rule | Med | CLI never runs npm; docs make pnpm primary. |
| JSON shape changes | Med | Value-only transformer plus validation/build. |
| Client data enters template repo | Low | Prompt writes only to target; template stays placeholders. |
| Copy leaks internal artifacts | Med | Explicit denylist and scaffold fixture verification. |

## Rollback Plan

Remove `packages/create-contractor-site/` and revert workspace/docs changes; existing clone workflow remains.

## Dependencies

- Node 22+, pnpm >= 11.1.2, local `git` binary.
- Prompt/copy dependency may be added with pnpm if justified.

## Success Criteria

- [ ] CLI creates a target with guards intact and no excluded folders.
- [ ] Generated `src/data/*.json` keeps the 12-file contract while replacing client values.
- [ ] Target `pnpm install`, `pnpm run validate:data`, and git initial commit succeed.
