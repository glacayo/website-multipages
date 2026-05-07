# Proposal: Initial Astro Scaffold

## Intent

Bootstrap the complete Astro frontend for a JSON-driven contractor site. Only JSON content, package.json, and images exist — no src/ or config.

## Scope

### In Scope
- Astro config with Tailwind v4 + Sitemap
- Directory scaffold: src/pages, layouts, components, styles, utils
- BaseLayout → LandingLayout/BlogLayout (Navbar, Footer, SEO)
- JSON data loader for all 3 content files
- Page routes: /, /about, /services, /blog/, /landing/
- Components: Navbar, HeroSection, ServiceCard, CTA, Footer, BlogCard, LandingHero, LandingSection
- Tailwind v4 brand tokens from company_colors
- Design system via ui-ux-pro-max (Home Services → Masonry & Hardscape)

### Out of Scope
- Image optimization, contact forms, dark mode, animations, testing, deployment
- Client-specific repo (template stays generic)

## Capabilities

### New
- `astro-project-config`: Config, Tailwind v4, sitemap, dirs
- `layout-system`: BaseLayout, LandingLayout, BlogLayout
- `data-loading`: JSON import with TS interfaces
- `component-library`: 8 reusable components
- `page-routing`: 6 page files with dynamic routes
- `design-tokens`: Tailwind v4 theme from ui-ux-pro-max

### Modified
- None (greenfield)

## Approach

1. Run ui-ux-pro-max for design system
2. Init Astro in-place (config, Tailwind v4 CSS, tsconfig)
3. Build layout hierarchy
4. Create JSON data loader with TS interfaces
5. Build components atomic → composite
6. Wire pages to JSON via Astro.props — zero hardcoded client info
7. Apply design tokens

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| astro.config.mjs | New | Tailwind + Sitemap |
| src/styles/global.css | New | Tailwind directives, fonts |
| src/layouts/ | New | 3 layout files |
| src/components/ | New | 8+ components |
| src/utils/ | New | Data loader, SEO |
| src/pages/ | New | 6+ page files |
| tsconfig.json | New | Astro TS config |
| package.json | Modified | Add scripts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tailwind v4 + Astro v6 edge cases | Med | Pin versions, test early |
| ui-ux-pro-max needs adaptation | Med | Reference only, adapt to v4 |
| JSON structure mismatches | Low | Validate against real files |

## Rollback

Delete src/, astro.config.mjs, tsconfig.json, revert package.json. JSON + images untouched.

## Dependencies

- ui-ux-pro-max skill
- JSON files + 66 images

## Success Criteria

- [ ] npm run dev starts without errors
- [ ] All routes render with real JSON content
- [ ] Navbar/Footer on every page
- [ ] 16 landing pages at /landing/[slug]
- [ ] 16 blog posts at /blog/[slug]
- [ ] Brand colors via Tailwind tokens
- [ ] Zero hardcoded client info in .astro files
- [ ] npm run build produces static dist/
