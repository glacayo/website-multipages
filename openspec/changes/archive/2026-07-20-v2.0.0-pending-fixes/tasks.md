# Tasks: v2.0.0 Pending Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contract foundation: add `coordinates` to business.json + TS/Zod/script mirror | PR 1 | base: main; additive only |
| 2 | Schema enrichments: Service image, AggregateRating, GeoCoordinates in `schema.ts` | PR 1 | depends on Unit 1 |
| 3 | SEO fix: separator-aware blog meta title in `seo.ts` | PR 1 | independent of Units 1–2 |
| 4 | Cleanup: remove `docs_trash/` | PR 1 | independent |
| 5 | Verification: validate:data + build + HTML inspection | PR 1 | final gate |

## Phase 1: Foundation (Contract / Types)

- [x] 1.1 Add `coordinates` object to `src/data/business.json` with placeholder `latitude: "36.8529"`, `longitude: "-75.9780"` plus `_instructions` note marking them as fake/example.
- [x] 1.2 Add `Coordinates` interface and optional `coordinates?: Coordinates` to `BusinessData` in `src/data/types.ts`.
- [x] 1.3 Add Zod schema for optional coordinates (string latitude/longitude) in `src/data/validation.ts`.
- [x] 1.4 Mirror the coordinates validation in `scripts/validate-data.cjs`.

## Phase 2: Core Implementation (Schema + SEO)

- [x] 2.1 In `src/utils/schema.ts`, add `image` to `Service` JSON-LD via `imageToAbsolute(service.image)` when present; omit when missing/empty (S1.1–S1.3).
- [x] 2.2 In `src/utils/schema.ts`, compute `aggregateRating` from valid `testimonials.json.testimonials[].stars` (1–5) and inject into business schema when `reviewCount > 0`; omit otherwise (AR.1–AR.2).
- [x] 2.3 In `src/utils/schema.ts`, emit `geo` `GeoCoordinates` when `business.coordinates.latitude`/`longitude` are valid; omit when absent/invalid (GEO.1–GEO.2).
- [x] 2.4 In `src/utils/seo.ts`, add separator-detection helper and apply in blog title builder: if `meta_title` already contains `|` `-` `—` `–` `:` `›` `»`, use it verbatim; otherwise compose `meta_title + " | " + site_name` (S4.1–S4.2).
- [x] 2.5 In `src/utils/seo.ts`, keep fallback path for posts without `meta_title`: compose `title + " | " + site_name` (S4.3).

## Phase 3: Cleanup

- [x] 3.1 Remove `docs_trash/` from the working tree (`Remove-Item -Recurse -Force docs_trash/`).
- [x] 3.2 Verify `docs_trash/` remains listed in `.gitignore` and `git status` no longer flags it.

## Phase 4: Verification

- [x] 4.1 Run `pnpm run validate:data`; confirm coordinates accepted and no contract drift.
- [x] 4.2 Run `pnpm run build`; confirm it passes and produces all pages.
- [x] 4.3 Inspect built `/services/masonry/index.html`: `Service` JSON-LD contains absolute `image` URL (S1.1).
- [x] 4.4 Inspect built blog post `<title>` tags for S4.1 (no double separator), S4.2 (composed), S4.3 (fallback).
- [x] 4.5 Inspect built home page JSON-LD for `aggregateRating` (ratingValue/reviewCount) and `geo` (latitude/longitude).
- [x] 4.6 Confirm `docs_trash/` does not exist on disk (S3.1) and build never reads it (S3.2).
