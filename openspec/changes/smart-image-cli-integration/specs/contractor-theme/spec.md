# Delta for contractor-theme

## ADDED Requirements

### Requirement: Scaffold Excludes Image-Tooling State While Retaining the Capsule and Skill

`DENY_DIR_NAMES` in `copy-template.mjs` MUST include `CUSTOMER-IMAGES` and `.img-ia` (basename match, any depth), MUST NOT add a bare `_out` (already excluded via the `.img-ia` parent, since `walk` never recurses into denied entries), and MUST NOT deny `tools` or `tools/smart-image`. `REQUIRED_AFTER_COPY` MUST include the `tools/smart-image/` manifest, workspace config, and lockfile, the checked-in wrapper path, and `.agents/skills/smart-image-cli/SKILL.md`; `assertRequiredCopied` MUST report any missing path. The scaffolded `package.json` MUST expose `images:check`, `images:setup`, and `images:run`. `isDeniedName` MUST carry direct unit coverage for every deny entry plus the `*.log`/`.env*` rules.

#### Scenario: Image-tooling state excluded, capsule and skill retained

- GIVEN a working copy has `CUSTOMER-IMAGES/`, `.img-ia/` (nested `_out/`), and `tools/smart-image/` with its manifest, workspace config, and lockfile
- WHEN `create-contractor-site` scaffolds a target
- THEN `CUSTOMER-IMAGES` and `.img-ia` are skipped with no byte copied, while `tools/smart-image/`, the wrapper, and `.agents/skills/smart-image-cli/SKILL.md` are present
- AND the target's `package.json` exposes all three `images:*` scripts

#### Scenario: Unrelated _out still copies; a missing required path fails loudly

- GIVEN a client-added `_out` exists outside `.img-ia/`, or a required capsule/skill path is absent from the source tree
- WHEN `copyTemplate` and `assertRequiredCopied` run
- THEN the unrelated `_out` IS copied, since no bare `_out` entry exists in `DENY_DIR_NAMES`
- AND a missing required path is reported, and the scaffold command MUST NOT report success

#### Scenario: Direct denylist unit coverage exists

- GIVEN a unit test imports `isDeniedName` directly
- WHEN it asserts every `DENY_DIR_NAMES`/`DENY_FILE_NAMES` entry plus a `*.log` and a `.env*`-prefixed name
- THEN every assertion is `true`, and `tools` asserts `false`

#### Scenario: E2E smoke path covers deny and retention together

- GIVEN the existing `temp-target --yes scaffold` E2E test already asserts `openspec`/`packages` absent from scaffold output
- WHEN the smoke test is updated for this change
- THEN it MUST also assert `CUSTOMER-IMAGES` and `.img-ia` are absent
- AND it MUST assert `tools/smart-image/`, the wrapper, and skill file are present too

## MODIFIED Requirements

### Requirement: Accurate Reuse Documentation

`README.md`, `AGENTS.md`, and `SKILL.md` MUST document the pnpm-only rule, the 12-file JSON contract, the variant system, and `pnpm run build` as the pre-finish check, with no npm/npx instructions. They MUST additionally state that `business.json` and `site.json` are the authoritative client identity, and that remaining masonry/hardscape placeholder content, assets, blog posts, and services after a scaffold are normal seed content to rewrite — NOT a conflict. They MUST also document that `images:*` commands are optional, explicit-invocation-only tooling that install/build/validate/CI never run, and that an agent MUST read `.agents/skills/smart-image-cli/SKILL.md` before running any `images:*` command.
(Previously: silent on the image-tooling invocation boundary and the mandatory agent skill gate.)

#### Scenario: Agent treats leftover seed content as rewritable

- GIVEN an agent has scaffolded a client site whose trade is not masonry
- WHEN it reads `AGENTS.md`/`SKILL.md` and finds masonry/hardscape services, blog posts, and images
- THEN the docs MUST instruct it to rewrite that seed content rather than flag it as a conflict
- AND the docs MUST identify `business.json` and `site.json` as the authoritative identity source

#### Scenario: Agent follows SKILL.md without violating contract

- GIVEN an AI agent reads `SKILL.md` to add a new service
- WHEN it follows the documented steps
- THEN it edits only `business.json.services_offered`, `services.json`, and optionally `landings.json`
- AND it runs `pnpm run build` before finishing, using only pnpm commands

#### Scenario: Agent reads the image-tooling skill before invoking images:*

- GIVEN a scaffold includes the capsule and `.agents/skills/smart-image-cli/SKILL.md`
- WHEN an agent needs to source images
- THEN it MUST read that skill file before running any `images:*` command
- AND it MUST NOT invoke `images:*` from install/build/validate/CI
