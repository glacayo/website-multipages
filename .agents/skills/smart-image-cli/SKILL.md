---
name: smart-image-cli
description: "Trigger: images:*, smart-image, image pickup, slot fulfillment. Analyze with the CLI; integrate selected images through the active coding agent."
license: MIT
metadata:
  author: glacayo
  version: "1.1"
---

## Activation Contract

Load this skill before any `images:*` command and when fulfilling website image slots during content writing. The CLI produces image intelligence and outputs; the active coding agent integrates them into the website.

## Hard Rules

- Read this skill before every `images:*` invocation.
- Use only the three root scripts: `images:check`, `images:setup`, `images:run`.
- Never call the upstream `smart-img` bin; the checked-in wrapper is the sole path.
- Never hook `images:*` into install, build, `validate:data`, or CI.
- Never silently fall back to another provider, source, or copy path on failure.
- Keep provider credentials outside the repo (`~/.config/smart-image-cli/` or env only).
- Never commit `.img-ia/`, root `CUSTOMER-IMAGES/`, or capsule `node_modules/`.
- Define image slots from the website content before invoking the CLI; slot fulfillment belongs to content writing, not tool setup.
- Treat `.img-ia/` as internal state and `<image-root>/_out/` as consumable output.
- The active coding agent MUST autonomously select compliant outputs, copy them into `src/assets/images/`, and update the relevant contract JSON values.
- Preserve all 12 JSON files' shape, keys, `_instructions`, and item structures; never hardcode image paths or content in components.
- Do not persist attribution metadata or render public image credits.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Capsule not ready | Run `pnpm run images:check`; if exit 1, run `pnpm run images:setup` |
| Local images not indexed | Preview `analyze <image-root> --dry-run`, then run real analysis |
| Need a local image | Use `pick <image-root> --source local` with slot constraints and content intent |
| Need semantic ranking | Use `--semantic ai` only with a verified vision provider; never silently downgrade |
| Provider missing | Treat as readiness warning; provider-required commands fail explicitly |
| Output satisfies the slot | Agent copies from `<image-root>/_out/`, updates JSON and `alt`, then verifies the site |
| Failure / non-zero exit | Surface remediation; do not source or copy images as fallback |

## Execution Steps

1. During content writing, inventory every required image slot, including page/section, intent, orientation, dimensions, crop, category, and alt-text goal.
2. Read this skill end-to-end; run `pnpm run images:check` and, if needed, `pnpm run images:setup`, then check again.
3. Analyze the narrow local root (normally `./CUSTOMER-IMAGES`) with `--dry-run` first; run the real analysis only after the preview is coherent.
4. Run `pnpm run images:run -- <literal argv>` to pick or optimize against the slot requirements. Use local ranking by default; request AI ranking explicitly when useful.
5. Select the best compliant result and copy it from `<image-root>/_out/` into the appropriate `src/assets/images/` subdirectory. Do not wait for human promotion approval.
6. Update only the corresponding values in the relevant `src/data/*.json` files, including the final `./images/...` path and accurate alt text. Do not add attribution fields or UI.
7. Run `pnpm run validate:data` and `pnpm run build`; fix contract/path failures without changing JSON shape.

## Output Contract

Return:

- Command(s) run and exit codes
- Readiness result (ready / remediation)
- Any provider warning (warning only, not a silent skip)
- Slot-to-image mapping: slot, selected `_out` source, production destination, and JSON values changed
- Confirmation that JSON shape was preserved and no attribution data or UI was added
- `validate:data` and build results

## References

- `tools/smart-image/run.mjs` — wrapper entry
- `tools/smart-image/check.mjs` — readiness probe
- `tools/smart-image/package.json` — capsule manifest
- `AGENTS.md` — template non-negotiables (pnpm, JSON contract)
