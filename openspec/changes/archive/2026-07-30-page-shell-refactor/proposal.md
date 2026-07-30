# Proposal: Page Shell Refactor

## Intent

Interior pages duplicate page-hero/breadcrumb markup and embed one-off blocks (about story/stats, contact info grid), making every future section/page variant expensive and brittle. Refactor page shells into reusable components now — preserving current visual output and the 12-file JSON contract — so dynamic section/page variants can land later without duplicating page markup.

## Scope

### In Scope
- Shared page header/shell component (page hero + breadcrumb) consumed by `about-us`, `contact-us`, `services`, `gallery`, and blog pages
- Move page-embedded blocks into loader-driven `sections/` components; pages become thin composers
- Responsibility cleanup for single-implementation sections (`About`, `Welcome`, `MissionVision`, `ContactForm`, `CTABar`) — structure only
- Route-aware links keep using the existing resolver; all build gates stay green

### Out of Scope
- New visual variants; CLI presets/rotation
- Route policy / `site_type` behavior (`src/utils/routes.ts`, `scripts/gate-routes.cjs`)
- JSON top-level shapes, required keys, or `_instructions` changes; content redesign

## Capabilities

### New Capabilities
- `page-shell-composition`: interior pages compose a shared page shell (header/breadcrumb) plus JSON-driven section components; no duplicated page markup; visual output and JSON contract preserved.

### Modified Capabilities
- None — spec-level behavior of existing capabilities is unchanged (structural refactor only).

## Approach

Extract the repeated page-hero/breadcrumb into a reusable component built on `ui/Breadcrumb` / `ui/SectionWrapper`. Convert each interior page to shell + sections composition; absorb page-specific blocks into `sections/` components fed by loaders. `pageType` keeps feeding schema/breadcrumb behavior only — it does not select visual layout. No changes to loader signatures, Zod schemas, or JSON files.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/components/layout/PageHeader.astro` | New | Shared page hero + breadcrumb shell |
| `src/pages/{about-us,contact-us,services,gallery}.astro`, `src/pages/blog/*` | Modified | Compose shell + sections; drop duplicated markup |
| `src/components/sections/{About,Welcome,MissionVision,CTABar,ContactForm}` | Modified | Absorb page-embedded blocks; loader-driven |
| `src/layouts/BaseLayout.astro` | Unchanged behavior | `pageType` schema/breadcrumb semantics preserved |
| `src/data/*`, `src/utils/routes.ts`, `scripts/gate-routes.cjs` | Unchanged | Contract and route policy stable |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Visual regression on refactored pages | Med | Compare built `dist/` HTML before/after per page; small slices |
| Out-of-palette colors while moving markup | Low | Reuse palette tokens; `lint-theme` fails the build otherwise |
| Link/route drift | Low | `test:routes` + gate/link audits inside `pnpm run build` |
| Scope creep into new variants | Med | Hard out-of-scope; reject variant additions in review |

## Rollback Plan

Source-only refactor — no data or schema migration. `git revert` the PR slice(s); JSON files untouched, so no data rollback needed.

## Dependencies

- None external. Builds on `ui/Breadcrumb`, `ui/SectionWrapper`, and the existing route resolver. `pnpm run test:cli` applies only if `packages/create-contractor-site` is touched (expected: no).

## Success Criteria

- [ ] Interior pages render headers via the shared shell; duplicated hero/breadcrumb markup removed
- [ ] `about-us` / `contact-us` one-off blocks moved into loader-driven components
- [ ] `pnpm run validate:data` passes with unchanged JSON shapes
- [ ] `pnpm run test:routes` passes — route/`site_type` behavior identical
- [ ] `pnpm run build` passes (includes `test:theme`, `astro check`, `gate-routes`); pages visually equivalent
- [ ] Each PR slice ≤ 400 changed lines; otherwise auto-chain: (1) shell + two pages, (2) remaining pages, (3) section absorption
