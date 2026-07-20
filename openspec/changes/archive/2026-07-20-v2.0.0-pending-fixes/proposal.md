# Proposal: v2.0.0 Pending Fixes

## Intent

Close deferred v2.0.0 release hygiene and SEO/schema gaps so the reusable contractor template ships cleaner structured data, safer meta titles, and no obsolete local docs. Business value: improve rich-result eligibility, reduce SEO regressions, and keep the template easy to clone without carrying stale artifacts. Template content remains placeholder/fake; no real client data is introduced.

## Scope

### In Scope
- Add `image` to Service JSON-LD using existing `services.json.services[].image` with safe absolute URL handling.
- Remove `docs_trash/` and its obsolete planning files from disk.
- Fix blog title composition so `meta_title` values already containing a separator are not double-appended.
- Confirm/harden `AggregateRating` derivation from valid `testimonials.json.testimonials[].stars`.
- Add `business.json.coordinates` placeholder data and emit `GeoCoordinates` when valid.

### Out of Scope
- Real client business data or PII in the template base.
- New JSON contract files, data flattening, or removing existing keys/_instructions.
- New test framework, dependency upgrades, or pnpm guard changes.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `seo-schema-automation`: enrich JSON-LD for services, ratings, and geo data; prevent duplicate title separators.
- `json-data-contract`: add coordinates as an additive `business.json` field with TS/Zod/script validation parity.
- `contractor-template-platform`: remove local `docs_trash/` release debris without changing build behavior.

## Approach

Use current loaders and schema helpers. Keep changes additive: update `business.json`, `src/data/types.ts`, `src/data/validation.ts`, mirrored `scripts/validate-data.cjs`, `src/utils/schema.ts`, and `src/utils/seo.ts`. Verify with `pnpm run validate:data` and `pnpm run build`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/utils/schema.ts` | Modified | Service `image`, `geo`, AggregateRating behavior |
| `src/utils/seo.ts` | Modified | Separator-aware blog/meta title handling |
| `src/data/business.json` | Modified | Placeholder coordinates + instructions |
| `src/data/types.ts`, `src/data/validation.ts`, `scripts/validate-data.cjs` | Modified | Contract/type/validation parity |
| `docs_trash/` | Removed | Delete obsolete ignored planning docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JSON contract drift | Med | Additive field only; update TS, Zod, script mirror together |
| SEO/schema regression | Med | Validate built JSON-LD and meta titles after build |
| Placeholder data mistaken for client data | Low | Keep fake/example coordinates and content clearly generic |

## Rollback Plan

Revert this change folder and implementation commit(s); restore `docs_trash/` from git/history if needed. Remove `coordinates` and schema/title changes together to keep the contract consistent.

## Dependencies

- Existing `schema-dts`, Astro build pipeline, and pnpm-only workflow.

## Success Criteria

- [ ] Service JSON-LD includes an absolute `image` URL.
- [ ] Blog titles with existing separators do not get a second separator/business suffix.
- [ ] LocalBusiness JSON-LD emits derived rating and valid `geo` when data exists.
- [ ] `docs_trash/` is absent.
- [ ] `pnpm run validate:data` and `pnpm run build` pass.
