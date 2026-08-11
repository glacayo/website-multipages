---
name: smart-image-cli
description: "Trigger: images:check, images:setup, images:run, smart-image, smart-img, image tooling. Mandatory contract before any images:* command."
license: MIT
metadata:
  author: glacayo
  version: "1.0"
---

## Activation Contract

Load this skill before running any `images:check`, `images:setup`, or `images:run` command. Do not invoke image tooling without reading this file first.

## Hard Rules

- Read this skill before every `images:*` invocation.
- Use only the three root scripts: `images:check`, `images:setup`, `images:run`.
- Never call the upstream `smart-img` bin; the checked-in wrapper is the sole path.
- Never hook `images:*` into install, build, `validate:data`, or CI.
- Never silently fall back to another provider, source, or copy path on failure.
- Keep provider credentials outside the repo (`~/.config/smart-image-cli/` or env only).
- Never commit `.img-ia/`, root `CUSTOMER-IMAGES/`, or capsule `node_modules/`.
- Promoting candidates into `src/assets/images/` is always a manual human step.
- Do not implement autonomous fulfillment, JSON rewriting, or attribution rendering here.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Capsule not ready | Run `pnpm run images:check`; if exit 1, run `pnpm run images:setup` |
| Need CLI work | `pnpm run images:run -- <args>` only after check is ready |
| Provider missing | Treat as readiness warning; provider-required commands fail explicitly |
| Candidate under `.img-ia/_out/` | Stop; ask human to promote manually into `src/assets/images/` |
| Failure / non-zero exit | Surface remediation; do not source or copy images as fallback |

## Execution Steps

1. Read this skill end-to-end.
2. Run `pnpm run images:check`.
3. If not ready, run `pnpm run images:setup`, then check again.
4. Run `pnpm run images:run -- <literal argv>` with no shell interpolation.
5. Leave workspace boundaries intact: capsule under `tools/smart-image/`; state under `.img-ia/` and root `CUSTOMER-IMAGES/` only.
6. On success that produces candidates, report paths and wait for manual promotion.

## Output Contract

Return:

- Command(s) run and exit codes
- Readiness result (ready / remediation)
- Any provider warning (warning only, not a silent skip)
- Candidate paths if produced, with explicit “manual promotion required”
- Confirmation that no automatic copy into `src/assets/` or JSON edits occurred

## References

- `tools/smart-image/run.mjs` — wrapper entry
- `tools/smart-image/check.mjs` — readiness probe
- `tools/smart-image/package.json` — capsule manifest
- `AGENTS.md` — template non-negotiables (pnpm, JSON contract)
