# page-shell-composition Specification

## Purpose

Interior pages compose a shared page shell (page hero + breadcrumb) plus JSON-driven sections instead of duplicating header markup. Structural refactor only: visual output, the 12-file JSON contract, route policy, and the variant system are preserved invariants (`contractor-theme` unchanged).

> From change `page-shell-refactor`; archives to `openspec/specs/page-shell-composition/spec.md` as a full spec.

## Requirements

### Requirement: Shared Page Shell

The system MUST provide one reusable page-shell component rendering the interior-page header (hero title + breadcrumb nav, `aria-label="Breadcrumb"`), accepting per-page title and trail. `about-us`, `contact-us`, `services`, `gallery`, and blog pages MUST render headers through it and MUST NOT retain duplicated inline hero/breadcrumb markup.

#### Scenario: Services page header via shell

- GIVEN the refactored `/services` page
- WHEN `pnpm run build` emits the page
- THEN the header renders `services.json.section_title` as the `h1` and a `Home / Services` breadcrumb
- AND the page source composes the shell with no inline hero/breadcrumb block

#### Scenario: Blog post custom trail

- GIVEN `site_type` publishes the blog AND a published post renders
- WHEN the shell receives a custom trail
- THEN the breadcrumb renders `Home / Blog / {post headline}` with the current item non-linked

### Requirement: Thin Page Composition

Refactored pages MUST be thin composers where practical: frontmatter reads typed loaders; the template composes shell + sections. Page-embedded one-off blocks (about story/stats, contact info grid) MUST move into loader-driven `sections/` components. Pages and sections MUST NOT hardcode business data.

#### Scenario: About one-off blocks absorbed

- GIVEN the refactored `about-us` page
- WHEN it renders
- THEN story/stats content comes from `sections/` components fed by loaders
- AND the page template contains only shell + section composition

#### Scenario: Section reused across pages

- GIVEN a section component consumed by home and an interior page
- WHEN both pages render
- THEN both use the same component API and JSON data, without page-local copies

### Requirement: Contract and Route Policy Preservation

The refactor MUST NOT add required JSON keys nor remove/rename top-level keys; nested shapes, required arrays, and `_instructions` blocks of the 12 `src/data/*.json` files MUST be preserved, with loader signatures and Zod schemas unchanged. Route/publication behavior MUST stay identical: `site_type` authority, feature-flag subordination, sitemap/`llm.txt` indexable set, gate-routes and link/anchor audits. The CLI package MUST NOT change.

#### Scenario: Data contract unchanged

- GIVEN the refactor is complete
- WHEN `pnpm run validate:data` runs
- THEN it exits `0` with `src/data/*.json` unmodified

#### Scenario: Route policy identical per site_type

- GIVEN each supported `site_type`
- WHEN `pnpm run test:routes` and `pnpm run build` (gate-routes, parity, link audits) run
- THEN the published route set and sitemap/`llm.txt` entries match pre-refactor behavior
- AND all audits pass

### Requirement: Variant Dispatcher Compatibility

Existing section variant dispatchers MUST work unchanged: JSON `variant` selection and unknown-variant fallback behave per `contractor-theme`. `pageType` MUST remain a schema/breadcrumb semantic input to `BaseLayout`/`buildSchemas` and MUST NOT select visual shell or section layout.

#### Scenario: Variant dispatch through composed page

- GIVEN `services.json` sets a documented `variant`
- WHEN the composed `/services` page renders
- THEN the matching sub-component renders
- AND an unknown `variant` still falls back to the default without failing the build

#### Scenario: pageType stays semantic

- GIVEN a page passes `pageType`
- WHEN it renders
- THEN `pageType` affects JSON-LD/breadcrumb semantics only
- AND shell visuals are controlled by shell props, not `pageType`

### Requirement: Visual Equivalence

Refactored pages MUST render visually equivalent output — no intentional redesign. Moved markup MUST use theme palette tokens.

#### Scenario: DOM spot check

- GIVEN pre- and post-refactor `dist/` HTML for a refactored page
- WHEN headings, breadcrumb links, section order, and visible copy are compared
- THEN they are equivalent; formatting/attribute-order diffs MAY differ

#### Scenario: Palette guard

- GIVEN moved markup introduces an out-of-palette color literal
- WHEN `pnpm run build` runs
- THEN the theme lint MUST fail the build
