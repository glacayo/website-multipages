# Spec: v2.0.0 Contractor Theme Rebuild

## 1. Purpose and Scope

Rebuild the broken v1 template as a buildable Astro 7 static contractor theme. Client customization happens exclusively through a stable, typed, Zod-validated JSON contract and JSON-selectable section variants — never through component edits.

**In scope**: Astro 7.x + Tailwind CSS 4 + pnpm + Alpine.js + Swiper + Sharp + `@lucide/astro`; a 12-file JSON contract with `_instructions`, TS types, and Zod build validation; 4–8 variants per major section; `astro:assets` image pipeline (WebP default, AVIF opt-in); generated SEO/schema, Netlify Forms, and refreshed README/AGENTS.md/SKILL.md/`netlify.toml`.

**Out of scope**: see §6.

## 2. Functional Requirements

### 2.1 Capability: `contractor-template-platform`

**Requirement: Buildable Static Site.** The system MUST allow a fresh clone to install with `pnpm install --frozen-lockfile` and complete `pnpm run build` with zero errors, using only pnpm-enforced tooling (`scripts/enforce-package-manager.cjs`, `.npmrc`, `devEngines`).

#### Scenario: Fresh clone builds successfully
- GIVEN a fresh clone of the repository with no `node_modules`
- WHEN a developer runs `pnpm install --frozen-lockfile` then `pnpm run build`
- THEN both commands exit with status 0
- AND `dist/` contains the generated static site

#### Scenario: npm workflow is rejected
- GIVEN a fresh clone of the repository
- WHEN a developer runs `npm install`
- THEN the package-manager guard MUST fail the command
- AND no `package-lock.json` is generated

### 2.2 Capability: `json-data-contract`

**Requirement: JSON-Only Customization.** The system MUST let a developer replace placeholder values in `src/data/*.json` and rebuild the site with the new data without editing any `.astro` component.

#### Scenario: Business data customization
- GIVEN `src/data/business.json` is edited with new client name, phone, and address
- WHEN `pnpm run build` runs
- THEN the built site reflects the new business name, phone, and address in header, footer, and schema
- AND no component file was modified

**Requirement: Typed, Validated Contract Files.** The system MUST ship exactly these 12 files under `src/data/`: `business.json`, `site.json`, `navigation.json`, `hero.json`, `services.json`, `gallery.json`, `testimonials.json`, `faq.json`, `areas.json`, `directories.json`, `blog.json`, `landings.json`. Each file MUST include an `_instructions` object and a matching interface in `src/data/types.ts`. The build SHOULD run Zod validation before compiling pages.

**Requirement: Optional Coordinates Field.** `business.json` MAY expose an optional `coordinates` object with `latitude` and `longitude` strings. When present, `src/data/types.ts` MUST define a `Coordinates` interface, `src/data/validation.ts` MUST validate it via Zod, and `scripts/validate-data.cjs` MUST mirror the validation. The coordinates MUST be clearly fake/example placeholder values in the template base, never a real client location.

#### Scenario: Invalid JSON fails the build
- GIVEN `services.json` has a service entry missing the required `slug` field
- WHEN `pnpm run build` runs
- THEN the Zod validation step MUST fail with a descriptive error
- AND the build MUST NOT produce `dist/`

### 2.3 Capability: `section-variant-system`

**Requirement: JSON-Selected Section Variants.** Each major section component (Header, Footer, HeroSlider, Services, Gallery, Testimonials, FAQ, CoveredAreas, DirectoryBadges) MUST act as a dispatcher that renders one of 4–8 documented variants selected via an optional `variant` field in that section's own JSON (or `site.json` for Header/Footer), defaulting to a documented variant when omitted.

#### Scenario: Section variant renders correctly
- GIVEN `services.json` sets `"variant": "tabs"`
- WHEN the services section renders
- THEN the `ServicesTabs` sub-component MUST render
- AND the section data (title, services list) MUST match `services.json`

#### Scenario: Unknown variant falls back to default
- GIVEN `gallery.json` sets `"variant": "nonexistent"`
- WHEN the gallery section renders
- THEN the dispatcher MUST render the documented default variant
- AND the build MUST NOT fail

### 2.4 Capability: `asset-image-pipeline`

**Requirement: Optimized Local Images.** All content images MUST live in `src/assets/images/` and be served via `astro:assets`. The system MUST default to WebP output and MAY use AVIF for LCP-critical images (hero, first gallery image). Every referenced image path MUST be resolvable at build time; unresolved paths MUST fail the build.

#### Scenario: Content images served as WebP
- GIVEN `services.json` references `"image": "./images/services/masonry.jpg"`
- WHEN the service card renders
- THEN the emitted `<img>`/`<source>` markup MUST reference a WebP asset
- AND explicit `width`/`height` MUST be present to prevent layout shift

#### Scenario: Missing image path fails validation
- GIVEN a JSON file references an image path with no matching file in `src/assets/images/`
- WHEN `pnpm run build` runs
- THEN the build MUST fail with the offending path in the error message

### 2.5 Capability: `seo-schema-automation`

**Requirement: Generated Service Landing Pages.** For each entry in `business.json.services_offered`, the system MUST generate a static route at `/services/{slug}` combining `services.json` and, when present, `landings.json`; services without a `landings.json` entry MUST fall back to a generic landing built from `services.json` + `business.json`.

#### Scenario: Service landing page is generated
- GIVEN `business.json.services_offered` includes `{ "name": "Masonry", "slug": "masonry" }`
- AND `services.json` has a matching `masonry` entry
- WHEN `pnpm run build` runs
- THEN `/services/masonry/index.html` MUST exist in `dist/`
- AND it MUST include `Service` and `BreadcrumbList` JSON-LD

**Requirement: Generated SEO and Schema Output.** The system MUST generate `sitemap.xml`, `robots.txt`, and per-page JSON-LD (`LocalBusiness`/`HomeAndConstructionBusiness`, `WebSite`, `BreadcrumbList`, plus `Service`/`BlogPosting`/`FAQPage` where applicable) from `business.json` and `site.json` — no per-page manual duplication.

**Requirement: Service JSON-LD with Image.** Each service landing page at `/services/[slug]/` MUST emit Schema.org `Service` JSON-LD that includes an `image` property when the service has an image. The image URL MUST be absolute (processed via `imageToAbsolute()`). When the service has no image, the `image` property MUST be omitted.

**Requirement: AggregateRating from Testimonials.** The business schema markup MUST include an `aggregateRating` object derived from `testimonials.json` when testimonials with valid `stars` (1–5) exist. `ratingValue` MUST be the average rounded to two decimals, `reviewCount` MUST be the count of valid testimonials. When no valid testimonials exist, the `aggregateRating` property MUST be omitted.

**Requirement: GeoCoordinates from Coordinates.** The business schema MUST emit `GeoCoordinates` when `business.json.coordinates` contains valid `latitude` and `longitude` strings. When coordinates are absent or invalid, the `geo` property MUST be omitted.

#### Scenario: SEO/schema files reflect JSON data
- GIVEN `site.json.url` is `https://examplecontractor.com`
- WHEN `pnpm run build` runs
- THEN `sitemap.xml` MUST list all static, service, and published blog routes
- AND `robots.txt` MUST reference the sitemap at that URL
- AND the home page MUST embed valid `LocalBusiness` JSON-LD sourced from `business.json`

**Requirement: Netlify Forms Submission Capture.** The contact form MUST use Netlify Forms markup only (`data-netlify="true"`, unique `name="contact"`, named inputs) with no backend or client JS required for submission capture.

#### Scenario: Contact form captures submissions
- GIVEN the contact page is built and deployed to Netlify
- WHEN a visitor submits the form with name, email, and message
- THEN Netlify MUST record the submission under the `contact` form
- AND no custom serverless function is required

### 2.6 Capability: `agent-developer-docs`

**Requirement: Accurate Reuse Documentation.** `README.md`, `AGENTS.md`, and `SKILL.md` MUST document the pnpm-only rule, the 12-file JSON contract, the variant system, and `pnpm run build` as the pre-finish check, with no npm/npx instructions (correcting the v1 `SKILL.md` contradiction).

#### Scenario: Agent follows SKILL.md without violating contract
- GIVEN an AI agent reads `SKILL.md` to add a new service
- WHEN it follows the documented steps
- THEN it edits only `business.json.services_offered`, `services.json`, and optionally `landings.json`
- AND it runs `pnpm run build` before finishing, using only pnpm commands

## 3. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | LCP image (hero) SHOULD use `loading="eager"` + `fetchpriority="high"`; AVIF MAY be used for LCP only. Non-critical images MUST lazy-load. |
| Accessibility | Motion MUST respect `prefers-reduced-motion`. Skeletons MUST use `aria-busy`, `aria-live="polite"`. All content images MUST carry descriptive `alt` from JSON. |
| SEO | Every page MUST emit unique `<title>`, meta description (≤160 chars), canonical URL, OG, and Twitter Card tags. |
| Maintainability | Each JSON file MUST own exactly one domain (no mixed business/marketing data). Each section component MUST remain a pure JSON-driven dispatcher with no hardcoded client copy. |

## 4. JSON Contract Rules

| File | Required top-level keys | Notes |
|---|---|---|
| `business.json` | `name`, `tagline`, `phones[]`, `emails[]`, `address`, `hours[]`, `license`, `insurance`, `payment_methods[]`, `free_estimate`, `years_experience`, `service_area`, `type_of_services`, `social`, `services_offered[]` | `legal_name`, `founded_year` optional |
| `site.json` | `url`, `lang`, `region`, `logo`, `favicon`, `seo`, `theme`, `features` | `timezone`, `analytics`, `header_variant`, `footer_variant` optional |
| `navigation.json` | `header[]`, `footer[]`, `mobile`, `legal[]` | — |
| `hero.json` | `slides[]` | `variant` optional (default `one`) |
| `services.json` | `section_title`, `section_subtitle`, `services[]` (each: `id`, `name`, `slug`, `short_description`, `full_description`, `image`) | `variant`, `icon`, `highlights[]`, `faq[]` optional |
| `gallery.json` | `section_title`, `categories[]`, `items[]` | `variant` optional |
| `testimonials.json` | `section_title`, `testimonials[]` (`name`, `location`, `service`, `stars`, `quote`) | `variant` optional |
| `faq.json` | `section_title`, `faqs[]` (`q`, `a`) | `variant` optional |
| `areas.json` | `section_title`, `primary_city`, `areas[]` | `variant` optional |
| `directories.json` | `section_title`, `directories[]` (`name`, `url`) | `variant` optional |
| `blog.json` | `default_author`, `default_category`, `posts[]` (`slug`, `headline`, `content`, `date`, `published`) | — |
| `landings.json` | `landing_pages[]` (`name`, `slug`, `service_id`, `hero`, `sections[]`, `cta`) | Optional per-service; falls back to generic landing when absent |

Rules: top-level keys and nested shapes MUST NOT change between clients; only values change. Every file MUST retain its `_instructions` block. Slugs MUST be unique within their collection. Image paths MUST resolve under `src/assets/images/`.

## 5. Out of Scope

- i18n, PWA, RSS, and the v2.1 client CLI.
- Real client data anywhere in the template base.
- npm/npx workflows or any weakening of pnpm-only guards.
