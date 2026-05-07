# Initial Astro Scaffold Specification

## Purpose

Define behavioral requirements for scaffolding a complete Astro 6.3.0 + Tailwind CSS 4.2.4 static website for Home Improvement Contractors. The system is JSON-driven, SEO-optimized, and fully reusable as a template.

---

## Requirements

### Requirement: Project Configuration Files

The scaffold MUST include `astro.config.mjs`, `tsconfig.json`, and `tailwind.config.mjs`. `astro.config.mjs` MUST register `@astrojs/tailwind` and `@astrojs/sitemap` integrations with output set to `static`. `tsconfig.json` MUST extend `astro/tsconfigs/strict`. `.gitignore` MUST exclude `dist/`, `node_modules/`, `.env*`, and `.DS_Store`.

#### Scenario: Astro config registers integrations

- GIVEN the project root contains `astro.config.mjs`
- WHEN the file is parsed
- THEN it exports a config with `integrations: [tailwind(), sitemap()]` and `output: 'static'`

#### Scenario: Missing env files are ignored by git

- GIVEN a `.env.local` file exists
- WHEN `git status` is checked
- THEN the file is listed as ignored

---

### Requirement: Source Directory Structure

The scaffold MUST create the `src/` directory with subdirectories: `pages/`, `layouts/`, `components/`, `data/`, `styles/`, `utils/`. `pages/` MUST contain: `index.astro`, `about.astro`, `services.astro`, `blog/index.astro`, `blog/[slug].astro`, `landing/[slug].astro`.

#### Scenario: All required pages exist

- GIVEN the scaffold is applied
- WHEN `src/pages/` is listed
- THEN all six page files are present with correct names

---

### Requirement: Data Layer — JSON Import Utilities

`src/data/` MUST export typed loader functions for each content file. `getContent()` MUST return the full `CONTENT.json` object. `getLandings()` MUST return an array of landing objects. `getBlogs()` MUST return an array of blog objects. All functions MUST be typed via TypeScript interfaces matching the JSON schema.

#### Scenario: getContent returns company info

- GIVEN `CONTENT.json` exists at project root
- WHEN `getContent()` is called
- THEN it returns an object with `company`, `services`, `phrases`, `home`, and `about` keys

#### Scenario: getLandings returns all landing entries

- GIVEN `LANDINGS.json` contains 16 entries
- WHEN `getLandings()` is called
- THEN it returns an array of length 16, each with `slug`, `hero`, and `sections` keys

#### Scenario: getBlogs returns all blog entries

- GIVEN `BLOGS.json` contains 16 posts
- WHEN `getBlogs()` is called
- THEN it returns an array of length 16, each with `slug`, `title`, `excerpt`, `date`, and `body` keys

---

### Requirement: BaseLayout — Global Shell

`BaseLayout.astro` MUST accept props: `title`, `description`, `ogImage?`, `canonicalURL?`. It MUST render: `<SEOHead>` in `<head>`, a `<Navbar>` above the slot, a `<Footer>` below the slot, and a JSON-LD `LocalBusiness` structured data script. It MUST NOT hardcode any client-specific values — all company data MUST be sourced from `getContent()`.

#### Scenario: BaseLayout renders SEO head

- GIVEN `BaseLayout` is used with `title="Test"` and `description="Desc"`
- WHEN the page HTML is rendered
- THEN `<title>Test</title>` and `<meta name="description" content="Desc">` are present in `<head>`

#### Scenario: JSON-LD LocalBusiness is injected

- GIVEN `BaseLayout` renders any page
- WHEN the page HTML is parsed
- THEN a `<script type="application/ld+json">` block with `@type: "LocalBusiness"` is present

---

### Requirement: SEOHead Component

`SEOHead.astro` MUST render: `<title>`, `<meta name="description">`, canonical `<link>`, Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`), and Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`). All values MUST come from props — no hardcoded defaults beyond fallback strings sourced from `getContent()`.

#### Scenario: Open Graph tags are present

- GIVEN `SEOHead` receives `title`, `description`, and `ogImage`
- WHEN rendered
- THEN `<meta property="og:title">`, `<meta property="og:image">` are in `<head>`

---

### Requirement: Navbar Component

`Navbar.astro` MUST render the company logo/name, navigation links (Home, About, Services, Blog), and a phone number CTA button. It MUST be responsive: collapsed hamburger menu on screens < 768px, horizontal links on ≥ 768px. All text and the phone number MUST come from `getContent()` props — nothing hardcoded.

#### Scenario: Desktop nav shows all links

- GIVEN viewport width ≥ 768px
- WHEN Navbar is rendered
- THEN Home, About, Services, and Blog links are visible in a horizontal row

#### Scenario: Mobile nav uses hamburger toggle

- GIVEN viewport width < 768px
- WHEN the page loads
- THEN nav links are hidden and a hamburger button is visible
- AND clicking the button toggles link visibility

---

### Requirement: Homepage (index.astro)

`index.astro` MUST render in order: HeroSection, phrases strip, service cards grid (all 13 services), home content block, and CTASection. All data MUST come from `getContent()`. The page MUST use `BaseLayout` with homepage-specific title and description.

#### Scenario: Service cards render all 13 services

- GIVEN `CONTENT.json` has 13 services
- WHEN `index.astro` is rendered
- THEN 13 `ServiceCard` components are rendered, each with a name and description

---

### Requirement: Blog Slug Page (blog/[slug].astro)

`blog/[slug].astro` MUST use `getStaticPaths()` to generate one route per blog entry. It MUST render the full `body` field as raw HTML via `set:html`. It MUST use `BaseLayout` with each post's `title` and `description` as SEO props.

#### Scenario: Static paths are generated for all posts

- GIVEN `BLOGS.json` has 16 posts
- WHEN `getStaticPaths()` runs at build time
- THEN 16 routes under `/blog/` are generated

#### Scenario: Blog body renders as HTML

- GIVEN a post with HTML `body` containing `<h2>` and `<p>` tags
- WHEN the page renders
- THEN those tags appear in the DOM unescaped

---

### Requirement: Landing Slug Page (landing/[slug].astro)

`landing/[slug].astro` MUST use `getStaticPaths()` to generate one route per landing entry. Each page MUST render: a HeroSection with landing-specific headline and CTA, followed by exactly 3 content Sections. All data sourced from `getLandings()`.

#### Scenario: Static paths generated for all landings

- GIVEN `LANDINGS.json` has 16 entries
- WHEN `getStaticPaths()` runs
- THEN 16 routes under `/landing/` are generated

#### Scenario: Landing page renders 3 content sections

- GIVEN a landing entry with `sections` array of length 3
- WHEN the page renders
- THEN exactly 3 Section components are present after the hero

---

### Requirement: Accessibility Compliance

All pages and components MUST meet these requirements: minimum text contrast ratio of 4.5:1 (WCAG AA), visible focus rings on all interactive elements, `prefers-reduced-motion` respected for transitions, light mode only (no dark mode styles), responsive at 375px / 768px / 1024px / 1440px breakpoints. All interactive elements MUST have `cursor-pointer`.

#### Scenario: Focus ring visible on nav links

- GIVEN keyboard navigation is active
- WHEN a nav link receives focus
- THEN a visible focus ring is rendered around the element

#### Scenario: Reduced motion respected

- GIVEN `prefers-reduced-motion: reduce` is active in the OS
- WHEN any animated component renders
- THEN transitions and animations are disabled or reduced

---

### Requirement: Static Site Generation and Sitemap

All pages MUST be pre-rendered at build time (SSG). `@astrojs/sitemap` MUST generate a `sitemap-index.xml` at the root. The sitemap MUST include all static routes: `/`, `/about`, `/services`, `/blog`, all blog slugs, and all landing slugs.

#### Scenario: Build produces static HTML files

- GIVEN `astro build` runs successfully
- WHEN `dist/` is inspected
- THEN `index.html`, `about/index.html`, `services/index.html` are present

#### Scenario: Sitemap includes all landing pages

- GIVEN 16 landing entries in `LANDINGS.json`
- WHEN `dist/sitemap-0.xml` is parsed
- THEN 16 `/landing/{slug}` URLs are present

---

### Requirement: Font Loading Strategy

Global styles MUST load Google Fonts using `<link rel="preconnect">` and `<link rel="preload">` for the critical font file. Font declarations MUST use `font-display: swap`. No more than 2 font families MUST be loaded. Font imports MUST be in `BaseLayout.astro` `<head>`, not in CSS files.

#### Scenario: Font preconnect is in head

- GIVEN `BaseLayout` renders any page
- WHEN `<head>` is inspected
- THEN `<link rel="preconnect" href="https://fonts.googleapis.com">` is present
