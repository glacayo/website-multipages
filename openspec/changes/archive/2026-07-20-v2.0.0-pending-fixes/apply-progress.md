# Apply Progress: v2.0.0-pending-fixes

**Mode**: Standard (strict_tdd: false, no test runner)  
**Delivery**: single PR (~220–300 lines, under 400-line budget)  
**Status**: 17/17 tasks complete — Ready for verify

## Completed Tasks

### Phase 1 — Foundation
- [x] 1.1 `business.json` optional `coordinates` + `_instructions` fake/example note
- [x] 1.2 `Coordinates` interface + optional field on `Business` in `types.ts`
- [x] 1.3 Zod optional coordinates in `validation.ts`
- [x] 1.4 Mirror validation in `scripts/validate-data.cjs`

### Phase 2 — Schema + SEO
- [x] 2.1 Service JSON-LD `image` via `imageToAbsolute()`
- [x] 2.2 `aggregateRating` from testimonials stars 1–5 (`ratingValue` string 2dp)
- [x] 2.3 `geo` GeoCoordinates when coordinates valid
- [x] 2.4 Separator-aware title helper + composeTitle
- [x] 2.5 Fallback title path (headline → compose with site name)

### Phase 3 — Cleanup
- [x] 3.1 Removed `docs_trash/` from disk
- [x] 3.2 `.gitignore` still lists `docs_trash/`; directory gone

### Phase 4 — Verification
- [x] 4.1–4.6 validate:data, build, HTML inspection

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/data/business.json` | Modified | Optional placeholder `coordinates` + instructions |
| `src/data/types.ts` | Modified | `Coordinates` interface; optional on `Business` |
| `src/data/validation.ts` | Modified | Zod optional coordinates |
| `scripts/validate-data.cjs` | Modified | Mirror coordinates schema |
| `src/utils/images.ts` | Modified | Added `imageToAbsolute()` helper |
| `src/utils/schema.ts` | Modified | Service image, AggregateRating, GeoCoordinates |
| `src/utils/seo.ts` | Modified | `titleHasSeparator()` + composeTitle update |
| `src/pages/blog/[slug].astro` | Modified | Pass raw meta_title/headline; let buildSeo compose |
| `docs_trash/` | Deleted | Removed obsolete planning files from disk |

## Deviations from Design

1. **`imageToAbsolute` did not exist** — design referenced it in `images.ts`; implemented it there using `ImageMetadata.src` when resolvable, else `absoluteUrl` path normalization. Absolute http(s) URLs pass through (S1.2).
2. **Blog page caller fix** — design/tasks focus on `seo.ts`, but `blog/[slug].astro` was pre-appending separator + business name before `buildSeo`, which made double-separator inevitable. Caller now passes `meta_title || headline` only.
3. **Type name** — tasks say `BusinessData`; codebase uses `Business`. Coordinates added to `Business`.
4. **AggregateRating** — removed prior `bestRating`/`worstRating` and numeric 1-decimal average to match design (`ratingValue: average.toFixed(2)` string, stars filtered 1–5).

## Issues Found

None blocking. Built Service `image` resolves to absolute `/_astro/masonry.<hash>.jpg` (processed asset path; satisfies S1.1 “absolute/processed URL”).

## Verification Evidence

```
pnpm run validate:data → OK — 12 contract files valid.
pnpm run build → 0 errors/warnings; 16 page(s) built.
```

| Scenario | Evidence |
|----------|----------|
| S1.1 Service image | `dist/services/masonry/index.html`: `"image":"https://examplecontractor.com/_astro/masonry.BJdSwUx6.jpg"` |
| S4.1 separator present | `<title>How to Plan a Paver Patio \| Example Contractor</title>` (no second suffix) |
| S4.3 fallback (no meta_title) | `<title>Retaining Wall Drainage Basics \| Example Masonry &amp; Hardscape</title>` |
| AR.1 aggregateRating | `"aggregateRating":{"@type":"AggregateRating","ratingValue":"5.00","reviewCount":3}` |
| GEO.1 geo | `"geo":{"@type":"GeoCoordinates","latitude":"36.8529","longitude":"-75.9780"}` |
| S3.1 docs_trash | Does not exist on disk; still in `.gitignore` |

## Remaining Tasks

None.

## Workload / PR Boundary

- Mode: single PR
- Current work unit: full change (Units 1–5)
- Boundary: contract + schema/SEO + cleanup + verification
- Estimated review budget impact: within ~220–300 lines (Low risk)

## Status

17/17 tasks complete. Ready for verify.
