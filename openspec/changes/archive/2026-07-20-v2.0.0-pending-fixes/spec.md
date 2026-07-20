# Spec: v2.0.0 Pending Fixes

## Change

`v2.0.0-pending-fixes`

## References

- Proposal: `openspec/changes/v2.0.0-pending-fixes/proposal.md`
- Archived parent change: `openspec/changes/archive/2026-07-15-v2.0.0-contractor-theme-rebuild/`

## 1. Service JSON-LD image (S1)

### Requirement

Each service landing page at `/services/[slug]/` MUST emit Schema.org `Service` JSON-LD that includes an `image` property.

### Scenarios

**S1.1 — Service with image**

- **Given** `services.json.services[].image` is `"./images/services/masonry.jpg"`
- **When** the `/services/masonry/` page is rendered
- **Then** the emitted `Service` schema contains `"image": "https://example.com/_astro/masonry.<hash>.webp"` or an equivalent absolute/processed URL.

**S1.2 — Absolute image passthrough**

- **Given** a service image is already an absolute URL
- **When** the landing page is rendered
- **Then** the schema uses that absolute URL unchanged.

**S1.3 — Missing image fallback**

- **Given** a service has no `image` value
- **When** the landing page is rendered
- **Then** the schema omits the `image` property (SHALL NOT emit empty/relative strings).

## 2. `docs_trash/` cleanup (S3)

### Requirement

The `docs_trash/` directory MUST be removed from the working tree and remain ignored.

### Scenarios

**S3.1 — Directory removed**

- **Given** `docs_trash/` contains obsolete planning files
- **When** cleanup is performed
- **Then** `docs_trash/` no longer exists on disk and is listed in `.gitignore`.

**S3.2 — Build independent**

- **Given** `docs_trash/` is removed
- **When** `pnpm run build` runs
- **Then** the build completes successfully without reading any file under `docs_trash/`.

## 3. Blog meta title separator deduplication (S4)

### Requirement

Blog post page titles MUST NOT contain duplicate separators when `blog.json.posts[].meta_title` already includes one.

### Scenarios

**S4.1 — Meta title with separator**

- **Given** a post has `"meta_title": "How to Plan a Paver Patio | Site Name"`
- **When** the blog post page is rendered
- **Then** the `<title>` is exactly `"How to Plan a Paver Patio | Site Name"` and no second separator/business suffix is appended.

**S4.2 — Meta title without separator**

- **Given** a post has `"meta_title": "How to Plan a Paver Patio"`
- **When** the blog post page is rendered
- **Then** the `<title>` is `"How to Plan a Paver Patio | Example Masonry & Hardscape"` using the configured separator.

**S4.3 — Fallback title**

- **Given** a post has no `meta_title`
- **When** the blog post page is rendered
- **Then** the `<title>` falls back to `"{title} | Example Masonry & Hardscape"`.

## 4. AggregateRating auto-derivation

### Requirement

The business schema markup MUST include an `aggregateRating` object derived from `testimonials.json` when testimonials exist.

### Scenarios

**AR.1 — Testimonials present**

- **Given** `testimonials.json.testimonials` has three entries with `stars` of 5, 5, and 4
- **When** the home page is rendered
- **Then** the `LocalBusiness`/`HomeAndConstructionBusiness` schema contains:
  ```json
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.67",
    "reviewCount": 3
  }
  ```

**AR.2 — No testimonials**

- **Given** `testimonials.json.testimonials` is empty or missing
- **When** the home page is rendered
- **Then** the schema MUST NOT contain an `aggregateRating` property.

## 5. GeoCoordinates

### Requirement

`business.json` MAY expose `coordinates`, and the schema MUST emit `GeoCoordinates` when the data is valid.

### Scenarios

**GEO.1 — Valid coordinates**

- **Given** `business.json.coordinates` is `{ "latitude": "36.8529", "longitude": "-75.9780" }`
- **When** business schema is built
- **Then** the markup contains:
  ```json
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "36.8529",
    "longitude": "-75.9780"
  }
  ```

**GEO.2 — Missing coordinates**

- **Given** `business.json.coordinates` is absent or invalid
- **When** business schema is built
- **Then** the schema MUST omit the `geo` property.

**GEO.3 — Placeholder values only**

- **Given** coordinates are added to the template
- **Then** they MUST be clearly fake/example values (e.g. near a well-known landmark or 0,0 with a comment), never a real client location.

## 6. JSON contract changes

The following changes to the 12-file data contract are additive and SHALL NOT remove existing keys:

- `business.json`: add optional `coordinates` object with `latitude` and `longitude` strings.
- `src/data/types.ts`: add `Coordinates` interface and optional `coordinates` field to `BusinessData`.
- `src/data/validation.ts`: add Zod schema for optional coordinates.
- `scripts/validate-data.cjs`: mirror the coordinates validation.

## 7. Verification

After implementation:

1. `pnpm run validate:data` MUST pass.
2. `pnpm run build` MUST pass.
3. Built `/services/masonry/index.html` MUST contain a valid `Service` JSON-LD `image` URL.
4. Built blog post pages MUST contain `<title>` tags matching S4 scenarios.
5. Built home page MUST contain correct `aggregateRating` and `geo` JSON-LD when data is present.
6. `docs_trash/` MUST NOT exist on disk.
