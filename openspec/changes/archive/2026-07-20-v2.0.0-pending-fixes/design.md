# Design: v2.0.0 Pending Fixes

## Change

`v2.0.0-pending-fixes`

## References

- Proposal: `openspec/changes/v2.0.0-pending-fixes/proposal.md`
- Spec: `openspec/changes/v2.0.0-pending-fixes/spec.md`

## 1. Service JSON-LD image (S1)

### Decision

Use the existing `imageToAbsolute()` helper in `src/utils/images.ts` to normalize the service `image` path before passing it to Schema.org `Service` markup.

### Approach

- In `src/utils/schema.ts`, locate the function that builds `Service` schema for service landing pages.
- Read `service.image` from the service object.
- If present, call `imageToAbsolute(service.image)` (or equivalent `absoluteUrl` if the helper returns an absolute public URL).
- Assign the resulting string to the `image` property of the `Service` object.
- If `service.image` is missing/empty, omit the `image` property entirely.

### Files

- `src/utils/schema.ts`

## 2. `docs_trash/` cleanup (S3)

### Decision

Delete the directory from disk. It is already ignored in `.gitignore`, so no further source changes are needed.

### Approach

- `Remove-Item -Recurse -Force docs_trash/`
- Verify `git status` no longer shows `docs_trash/` as untracked.

### Files

- `docs_trash/` (deleted from working tree)

## 3. Blog meta title separator deduplication (S4)

### Decision

Add a separator-detection helper in `src/utils/seo.ts` that checks whether a candidate title already contains a common separator before appending the site suffix.

### Approach

- Add a regex or array of separators: `|`, `-`, `—`, `–`, `:`, `›`, `»`.
- In `buildSeo()` or the blog-specific title builder, before composing `meta_title + separator + site_name`, test if `meta_title` matches `/\s*[\|\-—–:›»]\s*/`.
- If it already contains a separator, use `meta_title` directly as the `<title>` value.
- If not, compose as before.
- For fallback (no `meta_title`), compose from `title + separator + site_name`.

### Files

- `src/utils/seo.ts`

## 4. AggregateRating auto-derivation

### Decision

Compute `ratingValue` and `reviewCount` from `testimonials.json` at build time and inject them into the business schema when testimonials exist.

### Approach

- In `src/utils/schema.ts`, read `testimonials.json` via the existing loader or import.
- Filter entries with a valid numeric `stars` value (1–5).
- Compute `reviewCount` = number of valid testimonials.
- Compute `ratingValue` = average of `stars`, rounded to two decimals.
- If `reviewCount > 0`, add `aggregateRating` to the `HomeAndConstructionBusiness` / `LocalBusiness` object:
  ```ts
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: average.toFixed(2),
    reviewCount,
  }
  ```
- If no valid testimonials, omit the property.

### Files

- `src/utils/schema.ts`
- `src/data/testimonials.json` (no changes; read-only)

## 5. GeoCoordinates

### Decision

Add optional `coordinates` to `business.json`, type it in `src/data/types.ts`, validate it with Zod and the mirror script, and emit `GeoCoordinates` in `src/utils/schema.ts` when valid.

### Approach

- Add to `business.json`:
  ```json
  "coordinates": {
    "latitude": "36.8529",
    "longitude": "-75.9780"
  }
  ```
- Add `Coordinates` interface and optional `coordinates?: Coordinates` field in `src/data/types.ts`.
- Add Zod validation for optional coordinates in `src/data/validation.ts`.
- Mirror the validation in `scripts/validate-data.cjs`.
- In `src/utils/schema.ts`, when building the business schema, if `business.coordinates?.latitude` and `business.coordinates?.longitude` are present, add:
  ```ts
  geo: {
    '@type': 'GeoCoordinates',
    latitude: business.coordinates.latitude,
    longitude: business.coordinates.longitude,
  }
  ```
- Values must be clearly placeholder (e.g. Virginia Beach example coords).

### Files

- `src/data/business.json`
- `src/data/types.ts`
- `src/data/validation.ts`
- `scripts/validate-data.cjs`
- `src/utils/schema.ts`

## 6. Verification plan

1. `pnpm run validate:data` must pass after contract changes.
2. `pnpm run build` must pass and produce 16 pages.
3. Inspect `/services/masonry/index.html` for absolute `image` URL in `Service` JSON-LD.
4. Inspect blog post `<title>` tags for correct separator behavior.
5. Inspect home page JSON-LD for `aggregateRating` and `geo`.
6. Confirm `docs_trash/` does not exist.

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| JSON contract drift | Coordinates added as optional only; no keys removed. |
| SEO title regressions | Test both with-separator and without-separator blog posts. |
| Schema output invalid | Validate built HTML JSON-LD and run `pnpm run build`. |
| Placeholder coordinates mistaken for real data | Use clearly fake/example coordinates and document in `_instructions`. |

## 8. Next phase

Break this design into implementation tasks via `sdd-tasks-omni`.
