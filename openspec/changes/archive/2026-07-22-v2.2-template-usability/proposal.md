# Proposal: v2.2 Template Usability

## Intent

The v2.0 CLI scaffolds a client site but leaves real usability gaps: agents mistake normal masonry/hardscape seed content for a conflict, the intake prompt skips business-critical fields (payment, hours, license, social, directories), theme colors are not enforced against a palette, and every clone ships all route types regardless of the client's actual website scope. This change closes those gaps so a fresh scaffold is usable, on-brand, and correctly scoped without component edits.

> **Scope note (intentional):** `openspec/specs/contractor-theme/spec.md` §5 currently lists "the v2.1 client CLI" as **out of scope**. This change **intentionally brings CLI usability into scope** and will supersede that exclusion when archived.

## Goals

- Give agents a clear rule for what is authoritative client identity vs. rewritable seed content.
- Expand CLI intake to capture the full business-critical field set while preserving JSON shape.
- Make `site.json.theme` the single visual source of truth, enforced at build time.
- Let the operator pick website type (One page / Multipage / SEO) and gate **publication** by config — dynamic routes via empty `getStaticPaths`, static internal pages via **post-build prune of `dist/`** — never by deleting source files.

## Scope

### In Scope
- **Agent guidance** (decision 1): document that `business.json` + `site.json` are authoritative client identity; remaining masonry/hardscape placeholder content, assets, blog, and services after scaffold are normal seed content to rewrite — not a conflict.
- **CLI contractor intake** (decision 2): prompt/replace payment methods, hours, free-estimate wording, years of experience, license, insurance, social links, and directory links; `founded_year` stays optional/secondary; JSON shape preserved (keys never removed).
- **Theme palette enforcement** (decision 3): treat `site.json.theme` as the true visual source; allow additive keys; load Google Fonts from configured `body_font`/`heading_font`; require all template colors to resolve from palette tokens; fail the build when out-of-palette colors are used (validation/lint guard). Color audit + tokenization of known offenders is a required pre-step before enabling the lint.
- **Website type gating** (decision 4): CLI asks One page / Multipage / SEO and writes config; gating disables route **publication** without deleting source files. `site_type` is the publication authority; `site.features.*` are subordinate UI/content toggles within that scope. All internal links/CTAs must resolve to published routes or anchors; build-time route/link audit per type.

### Out of Scope
- Implementing source code, running builds beyond planning, or committing (planning-only change).
- Weakening pnpm-only guards, `.npmrc`, `pnpm-workspace.yaml`, or the enforce-package-manager script.
- Changing the 12-file contract's top-level keys, nested shapes, required arrays, or `_instructions` blocks (only additive keys allowed). Empty `directories[]` is **not** allowed (`min(1)` stays).
- CRM/deploy provisioning, AI content generation, i18n/PWA/RSS.
- Storing real client data in the template base.

## Website type contract

`site_type` is the **publication authority**. Feature flags (`enable_blog`, `enable_landings`, etc.) may only narrow content/UI **within** the routes that `site_type` already allows. They MUST NOT publish routes outside `site_type` scope. UI links and CTAs MUST NOT point at unpublished routes.

### Publish / prune matrix (source files always kept)

| Route / artifact | One page | Multipage | SEO | Mechanism |
|------------------|----------|-----------|-----|-----------|
| `/` (`index`) | publish | publish | publish | always built |
| `/about-us` | prune from `dist/` | publish | publish | post-build prune |
| `/services` | prune | publish | publish | post-build prune |
| `/gallery` | prune | publish | publish | post-build prune |
| `/contact-us` | prune | publish | publish | post-build prune |
| `/blog`, `/blog/*` | prune / empty paths | prune / empty paths | publish iff `enable_blog` | dynamic `getStaticPaths` + prune static index |
| `/services/{slug}` | empty paths | empty paths | publish iff `enable_landings` | dynamic `getStaticPaths` (**was ungated before v2.2 — this change adds the gate**) |
| `/thank-you` | publish (non-indexable) | publish (non-indexable) | publish (non-indexable) | always kept; omit from sitemap/llm |
| `/privacy-policy`, `/terms-of-service` | publish | publish | publish | always kept; indexable legal |
| `/404` | publish (technical) | publish (technical) | publish (technical) | always kept; omit from sitemap/llm |
| `sitemap.xml`, `robots.txt`, `llm.txt` | publish (scoped lists) | publish (scoped lists) | publish (scoped lists) | always kept; lists only **indexable** published routes |

**Always kept regardless of type:** `thank-you`, `sitemap.xml`, `robots.txt`, `llm.txt`, `404`, `privacy-policy`, `terms-of-service`.

**Route classification for parity / SEO lists:**
- **Indexable published routes** — public content/legal pages that belong in `sitemap.xml` and `llm.txt` (home, type-scoped internals, legal pages, and SEO blog/landings when published).
- **Always-published non-indexable / technical** — still emitted to `dist/` but MUST NOT be treated as sitemap/llm parity targets: at minimum `/404` (error document) and `/thank-you` (post-submit utility). Other technical artifacts (`robots.txt`, `sitemap.xml`, `llm.txt` themselves) are not HTML content routes.
- Parity audit compares the **indexable published route set** (policy + sitemap/llm) against the corresponding HTML routes in `dist/` — NOT every file under `dist/`. Non-indexable always-kept routes may exist in `dist/` without appearing in sitemap/llm; that is SEO-safe and MUST NOT fail the audit.

### Link / CTA policy (beyond nav)

Every internal href from JSON (`navigation.json`, hero/service CTAs, mobile CTA, footer, component hardcodes) MUST resolve to a route published for the active `site_type`, or to an on-page `#anchor` on a published page **whose target section is actually rendered**. For One page, multipage→anchor rewrites MUST be **feature-aware**: if a section is disabled (e.g. `enable_gallery: false`), resolvers MUST NOT emit `/#gallery` (or any missing anchor). Build MUST include a broken-link / unpublished-route audit per `site_type`, and that audit MUST verify anchor existence / published target availability — not only that the host route is published.

## Capabilities

### New Capabilities
- `theme-palette-enforcement`: `site.json.theme` is the single visual source; out-of-palette colors fail the build; Google Fonts derived from configured fonts.
- `website-type-gating`: config-driven One page / Multipage / SEO route publication without deleting source files (dynamic empty paths + post-build `dist/` prune).

### Modified Capabilities
- `cli-scaffold`: intake expands to the full business-critical field set and asks website type; value-only replacement preserves the 12-file contract.
- `agent-developer-docs`: docs must define authoritative identity (`business.json`/`site.json`) vs. rewritable seed content.
- `seo-schema-automation`: service-landing and blog route generation becomes conditional on `site_type` (authority) plus subordinate feature flags.

## Approach

Deliver as chained, independently reviewable slices, each under the 400-line review budget. Prefer additive JSON keys and config flags over shape changes.

**Publication mechanics (aligned with design):**
- Dynamic routes (`blog/*`, `services/[slug]`): `getStaticPaths` returns `[]` when unpublished.
- Static internal pages (`about-us`, `services`, `gallery`, `contact-us`, and static blog index when gated): **post-build prune** via `scripts/gate-routes.cjs` removes gated dirs from `dist/` only — source under `src/pages/**` stays.
- Shared route policy in `src/utils/routes.ts`; CJS mirror in gate/audit scripts. Post-build **parity audit** compares the **indexable** published route set (sitemap/llm policy or shared manifest) vs matching HTML routes in `dist/` — excluding always-published non-indexable/technical routes (`/404`, `/thank-you`, feed/meta artifacts). Link audit is feature-aware for one-page anchors.

**Theme:** extend validate-data + dedicated `lint-theme.cjs`. Runtime CSS vars align to **existing** `site.json.theme` values (e.g. preserve `light: #f8fafc`) — do not silently change committed theme values to match CSS drift unless explicitly documented. Color audit + offender tokenization is a required pre-step; lint MUST NOT land while source still fails it.

**CLI defaults:** new scaffolds write `site_type: multipage`. Missing `site_type` in existing/old clients defaults to `seo` at read time (backward-compatible current full-route behavior). Invalid values fail `validate:data`.

## Chained PR plan (each < 400 changed lines)

| PR | Work unit | Base | Est. lines | Budget risk |
|----|-----------|------|-----------|-------------|
| 1 | Agent guidance: authoritative-identity vs seed-content rules in AGENTS.md / SKILL.md / README | feature branch | 80–150 | Low |
| 2 | CLI intake expansion: prompts + value-only replacement for payment/hours/estimate/experience/license/insurance/social/directories + smoke coverage | PR 1 | 250–380 | Medium |
| 3a | Theme tokens + fonts + Zod/CJS additive keys; runtime CSS aligned to existing `site.json.theme`; color-audit inventory | PR 2 | 150–280 | Medium |
| 3b | Tokenize all inventoried offenders, then land `lint-theme.cjs` wired into build (lint must pass on the same PR) | PR 3a | 150–300 | Medium |
| 4a | `site_type` config + `routes.ts` policy + gate `services/[slug]` + blog dynamic guards + sitemap/llm | PR 3b | 200–350 | Medium |
| 4b | Post-build prune + parity audit + nav/link resolver (repurpose dead `navigation.ts`) + anchors + CLI type prompt + smoke | PR 4a | 200–350 | Medium |

Chain order is strict: **1 → 2 → 3a → 3b → 4a → 4b**. PR 3 and PR 4 are **split by default** (not “split only if over budget”). Further splits only if a slice still exceeds 400 lines.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `AGENTS.md`, `SKILL.md`, `README.md` | Modified | Authoritative identity vs. seed-content guidance. |
| `packages/create-contractor-site/src/prompts.mjs` | Modified | New intake fields + website-type question. |
| `packages/create-contractor-site/src/replace-data.mjs` | Modified | Value-only replacement for new fields; write type config; preserve keys. |
| `packages/create-contractor-site/scripts/smoke-test.mjs` | Modified | Cover new fields and type gating. |
| `src/data/site.json` | Modified (additive) | Palette tokens + `site_type` + `_instructions`. |
| `scripts/validate-data.cjs`, `src/data/validation.ts` | Modified | Palette/`site_type` guards mirrored in Zod. |
| `scripts/lint-theme.cjs`, `scripts/gate-routes.cjs` | Created | Theme lint; post-build prune + route/link parity audit. |
| `src/utils/routes.ts` | Created | Shared publication policy. |
| `src/utils/navigation.ts` | Modified (repurpose) | Exists today as dead code (zero importers) — replace/repurpose after verifying still unused; do not create a second file blindly. |
| `src/pages/**` (blog, `services/[slug]`, static internals) | Modified | Config-gated publication; files preserved. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Intake changes break the 12-file JSON shape | Med | Value-only transforms; keep `directories` min(1); preserve `founded_year` key as `""` when skipped; `pnpm run validate:data` + `pnpm run build`. |
| Color lint produces false positives and blocks build | Med | Required pre-audit + tokenize offenders before enabling lint; allowlist + `theme-lint-ignore` escape. |
| Route gating orphans SEO output (sitemap lists gated routes) | Med | sitemap/robots/llm share `routes.ts` policy; post-build parity on **indexable** set only (`/404`/`/thank-you` classified non-indexable). |
| Dual policy sources drift (TS vs CJS prune) | Med | Shared manifest or explicit parity audit after every build (indexable routes, not full `dist/` walk). |
| One-page maps to missing section anchors when `enable_*` is false | Med | Feature-aware anchor resolver; link audit checks real anchor/target availability. |
| Website-type gating deletes source instead of pruning `dist/` | Low | Contract requires publication guards only; source files stay. |
| `site_type` vs `enable_*` conflict confuses operators | Med | Documented precedence matrix; features cannot expand beyond `site_type`. |
| pnpm-only guard weakened by CLI/docs edits | Low | Guards untouched; verification runs pnpm-only. |

## Open Questions

- Should the theme color lint scan `.astro`/CSS source only, or also generated CSS? (Assumed: source Tailwind/CSS/component tokens before `astro build`.)
- Exact shared-manifest format vs. post-hoc `dist/` walk for parity audit? (Assumed: either is acceptable if audit is mandatory, scoped to the **indexable** published route set, and fails the build on mismatch.)

## Verification strategy (pnpm-only)

- `pnpm run validate:data` — 12-file contract + additive-key integrity + `site_type` enum.
- `pnpm run build` — enforce-package-manager guard, data validation, theme lint, `astro check`, `astro build`, post-build prune, route/link parity audit (blocks out-of-palette colors and unpublished-route leaks).
- `pnpm run test:cli` — CLI smoke coverage for expanded intake and website-type gating (new scaffolds write `multipage`).
- **No npm/npx anywhere.**

## Rollback Plan

Each PR is independently revertable. Revert per slice: restore prior `prompts.mjs`/`replace-data.mjs` (PR 2), remove palette lint + revert theme wiring (PR 3a/3b), drop type config / route guards / prune (PR 4a/4b), revert doc edits (PR 1). No 12-file shape change means rollback needs no data migration.

## Dependencies

- v2.0 `create-contractor-site` CLI package (present under `packages/`).
- Existing `scripts/validate-data.cjs` guard and Zod schemas.
- Node 22+, pnpm ≥ 11.1.2 (per repo enforcement).

## Success Criteria

- [ ] Docs state `business.json` + `site.json` are authoritative and remaining seed content is rewritable, not a conflict.
- [ ] CLI prompts for and replaces all decision-2 fields with `founded_year` optional (key preserved as `""` when skipped); `directories` stays min(1); `pnpm run validate:data` passes.
- [ ] `site.json.theme` drives every template color and Google Fonts without silent value drift; an out-of-palette color fails `pnpm run build`; lint lands only after offenders are fixed.
- [ ] CLI asks website type (new scaffolds → `multipage`); missing key in old clients → `seo` at runtime; One page / Multipage / SEO publish the correct routes via empty paths + post-build prune; always-kept pages remain; no source files deleted.
- [ ] `site_type` beats `enable_*` for publication; links/CTAs never point at unpublished routes or missing feature-disabled anchors; parity audit passes on the indexable route set (not raw full `dist/`).
- [ ] Each chained PR (including default 3a/3b and 4a/4b) stays under 400 changed lines (or records accepted `size:exception`).
