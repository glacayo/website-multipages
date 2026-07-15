# Proposal: v2.0.0 Contractor Theme Rebuild

## Intent

Rebuild the broken v1 template as a buildable Astro 7 static contractor theme where client customization happens through stable, typed JSON and selectable section variants.

## Scope

### In Scope
- Astro 7.x, Tailwind CSS 4, pnpm, Alpine.js, Swiper, Sharp, `@lucide/astro`.
- 12 focused JSON files with `_instructions`, TypeScript types, and Zod build validation.
- 4-8 JSON-selectable variants for header, hero, services, gallery, testimonials, FAQ, areas, directories, and footer.
- `astro:assets` image pipeline from `src/assets/images/`: WebP default, AVIF opt-in for LCP.
- Generated SEO/schema files, Netlify Forms, README, AGENTS.md, SKILL.md, `netlify.toml`.

### Out of Scope
- i18n, PWA, RSS, and v2.1 client CLI.
- Real client data.
- npm/npx workflows or weakened package-manager guards.

## Capabilities

### New Capabilities
- `contractor-template-platform`: Astro 7 static theme with pnpm-only deployment.
- `json-data-contract`: typed, Zod-validated JSON customization layer with embedded guidance.
- `section-variant-system`: visual section/layout variants selected from JSON.
- `asset-image-pipeline`: optimized local images via `astro:assets`, Sharp, WebP, and selective AVIF.
- `seo-schema-automation`: generated SEO files and schema.org data from JSON.
- `agent-developer-docs`: reuse rules and workflows in README, AGENTS.md, and SKILL.md.

### Modified Capabilities
- None. No existing OpenSpec capability specs are present.

## Approach

Create a fresh Astro 7 static app with data loaders, validation, section dispatchers, variant components, shared UI primitives, and SEO/image utilities so components consume the contract instead of hardcoded client copy.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/data/` | New | JSON contract, types, loaders, validation |
| `src/components/` | New | Layout, sections, variants, UI, SEO |
| `src/assets/images/` | New | Replaceable optimized content images |
| `src/pages/` | Modified | Static, dynamic, and generated routes |
| Root docs/config | Modified | Docs, Netlify, package stack |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JSON contract churn | High | Lock schemas with TS + Zod and `_instructions` |
| Astro 7/Tailwind 4 friction | Med | Validate early with `pnpm run build` |
| Oversized review | High | Chain work under the 400-line budget |
| JSON image paths fail | Med | Resolve via `import.meta.glob()` and validation |

## Rollback Plan

Keep work isolated on `v2.0.0`; revert the branch or reset to tag `v1.0.0` if build/spec validation fails.

## Dependencies

- Node.js 22+, pnpm 11+, Astro 7.x, Tailwind CSS 4, Sharp, Alpine.js, Swiper, `@lucide/astro`, Zod.

## Success Criteria

- [ ] Fresh clone installs with pnpm and `pnpm run build` succeeds.
- [ ] Customization works through JSON without component edits.
- [ ] Core sections expose documented variants.
- [ ] SEO/schema and Netlify Forms output are correct.
