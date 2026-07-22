# Spec: Contractor Theme Template

## 1. Purpose and Scope

The system is a buildable Astro 7 static contractor theme. Client customization happens exclusively through a stable, typed, Zod-validated JSON contract and JSON-selectable section variants — never through component edits.

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

**Requirement: Generated Service Landing Pages.** When the selected website type publishes service detail pages (SEO **and** subordinate `enable_landings` is true), the system MUST generate a static route at `/services/{slug}` for each entry in `business.json.services_offered`, combining `services.json` and, when present, `landings.json`; services without a `landings.json` entry MUST fall back to a generic landing built from `services.json` + `business.json`. When service detail is NOT published (One page, Multipage, or SEO with `enable_landings: false`), the system MUST NOT emit `/services/{slug}` routes to `dist/`, and the corresponding `src/pages/services/[slug]` files MUST remain in the repository.

**Implementation note:** `src/pages/services/[slug].astro` MUST be gated by the shared route policy (`site_type` authority + `enable_landings` subordinate toggle), matching the blog publication gate.

(Previously: service landing pages were generated unconditionally for every service, with no website-type gating.)

#### Scenario: Service landing page is generated under SEO type with landings enabled
- GIVEN the selected website type is SEO
- AND `site.features.enable_landings` is `true`
- AND `business.json.services_offered` includes `{ "name": "Masonry", "slug": "masonry" }` with a matching `services.json` entry
- WHEN `pnpm run build` runs
- THEN `/services/masonry/index.html` MUST exist in `dist/`
- AND it MUST include `Service` and `BreadcrumbList` JSON-LD

#### Scenario: Service detail files preserved when gated
- GIVEN the selected website type is Multipage or One page, OR SEO with `enable_landings: false`
- WHEN `pnpm run build` runs
- THEN no `/services/{slug}/` route is emitted to `dist/`
- AND the `src/pages/services/[slug]` source files still exist in the repository

**Requirement: Generated SEO and Schema Output.** The system MUST generate `sitemap.xml`, `robots.txt`, and per-page JSON-LD (`LocalBusiness`/`HomeAndConstructionBusiness`, `WebSite`, `BreadcrumbList`, plus `Service`/`BlogPosting`/`FAQPage` where applicable) from `business.json` and `site.json` — no per-page manual duplication. `sitemap.xml` MUST list ONLY **indexable** routes actually published for the selected website type (and subordinate feature flags), and `robots.txt` MUST reference that same sitemap; gated (unpublished) routes MUST NOT appear in `sitemap.xml`. `llm.txt` MUST use the same **indexable** published-route policy.

**Route classification (SEO-safe):**
- **Indexable published routes** — content and legal pages eligible for `sitemap.xml` / `llm.txt` (home, type-scoped internals such as about/services/gallery/contact when published, privacy/terms, and SEO blog/service-detail when published).
- **Always-published non-indexable / technical routes** — still emitted to `dist/` for correct site behavior but MUST NOT appear in `sitemap.xml` or `llm.txt`. At minimum: `/404` (error document) and `/thank-you` (post-form utility). Meta artifacts (`robots.txt`, `sitemap.xml`, `llm.txt`) are not content routes.

After build (including post-build prune), a **parity audit** MUST compare the **indexable published route set** from sitemap/llm (or a shared manifest generated from one policy source) against the corresponding HTML routes in `dist/`. The audit MUST NOT require every file under `dist/` to appear in sitemap/llm. Presence of classified non-indexable always-kept routes (e.g. `/404`, `/thank-you`) in `dist/` without sitemap/llm entries is expected and MUST NOT fail the audit. Mismatch on the indexable set MUST fail the build.

(Previously: sitemap listed all static, service, and published blog routes regardless of website scope.)

**Requirement: Service JSON-LD with Image.** Each service landing page at `/services/[slug]/` MUST emit Schema.org `Service` JSON-LD that includes an `image` property when the service has an image. The image URL MUST be absolute (processed via `imageToAbsolute()`). When the service has no image, the `image` property MUST be omitted.

**Requirement: AggregateRating from Testimonials.** The business schema markup MUST include an `aggregateRating` object derived from `testimonials.json` when testimonials with valid `stars` (1–5) exist. `ratingValue` MUST be the average rounded to two decimals, `reviewCount` MUST be the count of valid testimonials. When no valid testimonials exist, the `aggregateRating` property MUST be omitted.

**Requirement: GeoCoordinates from Coordinates.** The business schema MUST emit `GeoCoordinates` when `business.json.coordinates` contains valid `latitude` and `longitude` strings. When coordinates are absent or invalid, the `geo` property MUST be omitted.

#### Scenario: Sitemap reflects the indexable published route set
- GIVEN the selected website type is Multipage
- WHEN `pnpm run build` runs
- THEN `sitemap.xml` MUST omit `services/{slug}` detail and blog routes
- AND `sitemap.xml` and `llm.txt` MUST omit non-indexable technical routes such as `/404` and `/thank-you`
- AND `robots.txt` MUST reference the emitted `sitemap.xml`
- AND the parity audit MUST report no extra or missing **indexable** routes between policy/sitemap/llm and `dist/`
- AND `/404` and `/thank-you` MAY still exist in `dist/` without failing parity

#### Scenario: Parity ignores non-indexable always-kept routes
- GIVEN any valid `site_type`
- WHEN the post-build parity audit runs
- THEN it MUST compare only the indexable published route set
- AND it MUST NOT fail solely because `/404` or `/thank-you` exist in `dist/` but are absent from `sitemap.xml` / `llm.txt`

**Requirement: Netlify Forms Submission Capture.** The contact form MUST use Netlify Forms markup only (`data-netlify="true"`, unique `name="contact"`, named inputs) with no backend or client JS required for submission capture.

#### Scenario: Contact form captures submissions
- GIVEN the contact page is built and deployed to Netlify
- WHEN a visitor submits the form with name, email, and message
- THEN Netlify MUST record the submission under the `contact` form
- AND no custom serverless function is required

### 2.6 Capability: `agent-developer-docs`

**Requirement: Accurate Reuse Documentation.** `README.md`, `AGENTS.md`, and `SKILL.md` MUST document the pnpm-only rule, the 12-file JSON contract, the variant system, and `pnpm run build` as the pre-finish check, with no npm/npx instructions. They MUST additionally state that `business.json` and `site.json` are the authoritative client identity, and that any remaining masonry/hardscape placeholder content, assets, blog posts, and services present after a scaffold are normal seed content to rewrite — NOT a conflict or an error.

#### Scenario: Agent treats leftover seed content as rewritable
- GIVEN an agent has scaffolded a client site whose trade is not masonry
- WHEN it reads `AGENTS.md`/`SKILL.md` and finds masonry/hardscape services, blog posts, and images
- THEN the docs MUST instruct it to rewrite that seed content rather than flag it as a conflict
- AND the docs MUST identify `business.json` and `site.json` as the authoritative identity source

#### Scenario: Agent follows SKILL.md without violating contract
- GIVEN an AI agent reads `SKILL.md` to add a new service
- WHEN it follows the documented steps
- THEN it edits only `business.json.services_offered`, `services.json`, and optionally `landings.json`
- AND it runs `pnpm run build` before finishing, using only pnpm commands

### 2.7 Capability: `cli-scaffold`

**Requirement: Expanded CLI Contractor Intake.** The `create-contractor-site` CLI MUST prompt for and apply value-only replacement of the full business-critical field set: payment methods, business hours, free-estimate wording, years of experience, license text, insurance statement, social links, and directory links. `founded_year` MUST remain optional and secondary (never a required prompt). When the operator skips `founded_year`, the CLI MUST **preserve the top-level `founded_year` key** and write an empty string `""` — it MUST NOT remove the key.

Directory intake MUST preserve the `directories.json` contract: `directories` array remains `.min(1)`. If the operator provides no directory URLs, the CLI MUST keep at least one placeholder/disabled/default row (or the existing template row) and MAY set `site.features.enable_directories: false` to gate rendering — it MUST NOT write an empty `directories` array.

The interactive prompts, the `--yes` sample-answer path, and the `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` path MUST cover the same field set; the non-interactive paths MUST supply documented defaults for any omitted field so all three paths produce an equivalent JSON shape. All replacement MUST preserve the 12-file JSON contract: top-level keys, nested shapes, required arrays, slugs, `variant` keys, and `_instructions` blocks.

#### Scenario: Business-critical fields captured and replaced
- GIVEN the operator runs the CLI and supplies payment methods, hours, free-estimate text, years of experience, license, insurance, social links, and directory links
- WHEN JSON replacement runs
- THEN `business.json` and `directories.json` reflect those values
- AND every top-level key, array shape, and `_instructions` block is preserved
- AND when `founded_year` is skipped, the key remains present with value `""`

#### Scenario: Intake keeps schema stable
- GIVEN intake replacement completes
- WHEN `pnpm run validate:data` runs in the target
- THEN it exits with code `0`
- AND no top-level key was removed, renamed, or flattened
- AND `directories.json.directories` still has at least one item

#### Scenario: Non-interactive paths reach field parity
- GIVEN the operator runs the CLI with `--yes`, OR with `CREATE_CONTRACTOR_SITE_ANSWERS_JSON` that omits some business-critical fields
- WHEN JSON replacement runs
- THEN the CLI MUST apply documented defaults for the omitted fields
- AND both non-interactive paths MUST produce the same field set and JSON shape as interactive mode

#### Scenario: No directories still validates
- GIVEN the operator provides no directory URLs
- WHEN JSON replacement runs
- THEN `directories` still contains ≥ 1 row (placeholder/default)
- AND `enable_directories` MAY be `false` so UI does not render badges
- AND `pnpm run validate:data` exits `0`

### 2.8 Capability: `theme-palette-enforcement`

**Requirement: Theme Palette as Visual Source of Truth.** `site.json.theme` MUST be the single source of truth for the template's visual palette. Additive theme keys MAY be introduced. Google Fonts MUST be loaded from the configured `body_font` and `heading_font`. Every color used by template components MUST resolve from a palette token. A build-time guard MUST fail the build when an out-of-palette color literal is used, and the guard MUST be reachable through `pnpm run build`.

Runtime CSS variable injection MUST align to the **existing committed** `site.json.theme` values (e.g. preserve `light: #f8fafc`). Implementations MUST NOT silently change existing `site.json.theme` values to match drifted CSS defaults unless that value change is explicitly documented in the change tasks/PR. Prefer updating runtime/`@theme` fallback CSS to match `site.json.theme`.

A full color-audit inventory of offenders MUST complete **before** the lint is enabled in the build chain. The lint MUST NOT land in a PR while source still fails the lint.

#### Scenario: Fonts derive from theme configuration
- GIVEN `site.json.theme.body_font` is `Source Sans 3` and `heading_font` is `Montserrat`
- WHEN the site builds
- THEN the emitted Google Fonts request references exactly those font families

#### Scenario: Out-of-palette color fails the build
- GIVEN a template component or stylesheet introduces a hard-coded color that is not a palette token
- WHEN `pnpm run build` runs
- THEN the theme/color lint guard MUST fail the build with the offending color and location
- AND `dist/` MUST NOT be produced

#### Scenario: Additive palette keys are allowed
- GIVEN `site.json.theme` adds a new token key (e.g. `muted`) alongside existing keys
- WHEN `pnpm run validate:data` runs
- THEN validation passes and existing required theme keys remain intact

#### Scenario: No silent theme value drift
- GIVEN `site.json.theme.light` is `#f8fafc`
- WHEN theme runtime wiring lands
- THEN emitted CSS variables MUST use `#f8fafc` for light (or the then-current `site.json` value)
- AND `site.json.theme.light` MUST NOT be rewritten to a different hex solely to match prior CSS drift

### 2.9 Capability: `website-type-gating`

**Requirement: Website Type Selection and Route Gating.** The CLI MUST ask the operator to choose a website type: One page, Multipage, or SEO. The selection MUST be persisted as additive `site.json.site_type` (`one-page` | `multipage` | `seo`) and MUST gate route publication WITHOUT deleting page source files.

**CLI / runtime defaults (distinct):**
- **New CLI scaffolds** MUST write `site_type: multipage`.
- **Missing `site_type` key** in existing/old client configs MUST default to `seo` at read time (backward-compatible full-route behavior).
- **Invalid `site_type` values** MUST fail `pnpm run validate:data` (no silent fallback).

**Publication authority vs feature flags (precedence matrix):**

| Concern | Authority | Subordinate |
|---------|-----------|-------------|
| Which route classes may be published | `site_type` | — |
| Blog on/off within SEO | `site_type === seo` first | then `enable_blog` |
| Service detail landings on/off within SEO | `site_type === seo` first | then `enable_landings` |
| Section UI (gallery, FAQ, testimonials, areas, directories) | may render only on published pages | `enable_*` toggles content/sections |
| Links / CTAs / nav hrefs | must target published routes or **rendered** in-page anchors only | feature flags cannot invent destinations outside `site_type`; disabled sections must not receive anchor hrefs |

Rules:
- `enable_blog` / `enable_landings` MUST NOT expand publication beyond `site_type`.
- When `site_type` does not allow blog or landings, those routes MUST stay unpublished even if the flags are `true`.
- When `site_type` allows them, flags MAY further disable publication/UI.

**Type publication scope:**
- **One page** MUST disable publication of internal multi-page routes (about, services index, gallery, contact, blog, service detail) via config/gating (dynamic empty paths and/or post-build `dist/` prune). Nav and in-page links MUST use on-page anchors only where the corresponding home sections are actually rendered (feature-aware: e.g. no `/#gallery` when `enable_gallery` is false).
- **Multipage** MUST publish home, about, services, gallery, and contact plus technical/legal pages, and MUST NOT publish the blog or service-detail (`services/[slug]`) pages.
- **SEO** MUST publish everything Multipage publishes PLUS per-service landing pages (`services/[slug]`) when `enable_landings` and the blog when `enable_blog`.

Regardless of type, the build MUST always publish `thank-you`, `sitemap.xml`, `robots.txt`, `llm.txt`, `404`, `privacy-policy`, and `terms-of-service`.

**Mechanics:** Dynamic routes use `getStaticPaths → []` when unpublished. Static named pages that Astro always emits MUST be removed from `dist/` only by a post-build prune script — never by deleting `src/pages/**` source.

#### Scenario: One page gates internal routes without deleting files
- GIVEN the operator selects One page
- WHEN `pnpm run build` runs
- THEN internal routes (about/services/gallery/contact/blog/service detail) are NOT published to `dist/`
- AND the corresponding `src/pages/**` files still exist in the repository
- AND `thank-you`, `sitemap.xml`, `robots.txt`, `llm.txt`, `404`, `privacy-policy`, and `terms-of-service` are still published

#### Scenario: Multipage excludes blog and service detail
- GIVEN the operator selects Multipage
- WHEN `pnpm run build` runs
- THEN home, about, services, gallery, contact, and technical/legal pages are published
- AND blog routes and `services/[slug]` detail pages are NOT published
- AND `sitemap.xml` MUST NOT list the gated routes

#### Scenario: SEO publishes landings and blog when flags allow
- GIVEN the operator selects SEO
- AND `enable_landings` and `enable_blog` are `true`
- WHEN `pnpm run build` runs
- THEN all Multipage routes plus per-service `services/[slug]` landing pages and blog routes are published
- AND `sitemap.xml` lists the published service and blog routes

#### Scenario: Feature flags cannot override site_type upward
- GIVEN the selected website type is Multipage
- AND `enable_blog` and `enable_landings` are both `true`
- WHEN `pnpm run build` runs
- THEN blog and `services/[slug]` routes MUST still NOT be published
- AND no nav, CTA, or component link MAY point to those routes

#### Scenario: New scaffold vs missing-key defaults
- GIVEN a brand-new CLI scaffold completes
- THEN `site.json.site_type` MUST equal `multipage`
- GIVEN an older client `site.json` with no `site_type` key
- WHEN route policy is evaluated
- THEN the effective type MUST be `seo`

### 2.10 Capability: `link-cta-safety`

**Requirement: Internal Link and CTA Publication Safety.** All internal links and CTAs — including but not limited to `navigation.json` header/footer/mobile/legal entries, hero primary/secondary CTAs, service card detail links, section buttons, and component-hardcoded internal hrefs — MUST resolve to a route that is published for the active `site_type` (and subordinate flags), or to an in-page anchor on a published page **whose target element/section is actually present in the emitted HTML**.

**Feature-aware one-page anchors:** When rewriting multipage paths to home anchors (e.g. `/gallery` → `/#gallery`), the resolver MUST consult the same section feature flags that control rendering (`enable_gallery`, `enable_faq`, `enable_testimonials`, `enable_areas`, `enable_directories`, and any equivalent section gates). If the optional section is disabled, the resolver MUST NOT emit a href to that missing anchor — drop the item, fall back to a safe published target (e.g. `/` or `/#contact` when that section exists), or otherwise omit the dead link. Fixed home sections that always render (when applicable) may keep stable anchors such as `/#about`, `/#services`, `/#contact` only if those ids are present in the built page.

The build MUST run a broken-link / unpublished-route audit per `site_type` and MUST fail when an internal href targets a non-published path **or** an in-page anchor that does not exist on the published target page. The audit MUST verify actual anchor existence or published target availability — not only that the host route is published.

#### Scenario: One-page CTAs do not point at pruned routes
- GIVEN `site_type` is `one-page`
- AND the corresponding home sections are enabled/rendered
- WHEN `pnpm run build` runs
- THEN internal hrefs that would have targeted `/about-us`, `/services`, `/gallery`, `/contact-us`, `/blog`, or `/services/{slug}` MUST be rewritten to published anchors that exist (e.g. `/#about`, `/#services`) or removed
- AND the link audit MUST pass

#### Scenario: One-page does not map to disabled section anchors
- GIVEN `site_type` is `one-page`
- AND `site.features.enable_gallery` is `false` (section not rendered; no `id="gallery"` on home)
- WHEN nav/CTA resolution runs
- THEN no href to `/#gallery` (or `/gallery`) MUST be emitted
- AND the link audit MUST fail the build if any internal href still targets that missing anchor

#### Scenario: Link audit verifies anchors, not only routes
- GIVEN any `site_type` with internal hrefs that include hash fragments
- WHEN the post-build link audit runs
- THEN each hash target MUST resolve to an element id present on the published destination page (or the audit MUST fail)
- AND route publication alone MUST NOT be treated as sufficient for hash hrefs

#### Scenario: Multipage does not link to blog or service detail
- GIVEN `site_type` is `multipage`
- WHEN components render service cards and nav
- THEN no href to `/blog` or `/services/{slug}` is emitted
- AND the link audit MUST pass

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
| `site.json` | `url`, `lang`, `region`, `logo`, `favicon`, `seo`, `theme`, `features` | `timezone`, `analytics`, `header_variant`, `footer_variant`, `site_type` optional; additive `theme` keys (`primary_dark`, `muted`, `surface`, `border`) optional |
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

- i18n, PWA, RSS.
- Real client data anywhere in the template base.
- npm/npx workflows or any weakening of pnpm-only guards.

> **Note:** The v2.1 client CLI was previously listed as out of scope. As of v2.2, CLI usability (intake expansion, website-type selection) is **in scope** — see §2.7 and §2.9.
