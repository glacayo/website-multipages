# Color Audit Inventory (PR 3a)

Expanded offender list for **PR 3b** tokenization + `lint-theme.cjs`.
Do **not** enable build-failing theme lint until these are tokenized or explicitly ignored.

Scan scope: `src/**/*.{astro,css,ts,js,mjs}` minus `src/assets/**`.
Allowed later: palette token utilities, `white`/`black`/`transparent`/`current`/`inherit`, `@theme` block, `theme-lint-ignore`.

## Inventory

| File | Literal / utility | Suggested token |
|------|-------------------|-----------------|
| `src/pages/blog/[slug].astro` `<style is:global>` | `#374151` | `muted` / dark-muted |
| `src/pages/blog/[slug].astro` | `#1f2937` | `dark` or near-dark muted |
| `src/pages/blog/[slug].astro` | `#962e20` | `accent` |
| `src/pages/blog/[slug].astro` | `#003060` | `primary` |
| `src/styles/animations.css` | skeleton `#e5e7eb`, `#f3f4f6` | `border` / `surface` |
| `src/components/layout/NavMenu.astro` | `hover:bg-gray-50` | `surface` |
| `src/components/layout/NavMenu.astro` | `text-gray-700` | `muted` / `dark` |
| `src/components/layout/Header/variants/HeaderDefault.astro` | `hover:bg-gray-100` | `surface` |
| `src/components/layout/Header/variants/HeaderCentered.astro` | `hover:bg-gray-100` | `surface` |
| `src/components/layout/Header/variants/HeaderMinimal.astro` | `hover:bg-gray-100` | `surface` |
| `src/components/layout/Header/variants/HeaderTransparent.astro` | `hover:bg-gray-100` | `surface` |
| `src/components/layout/Footer/variants/FooterDark.astro` | `via-[#011a35]`, `to-[#00162e]` | `primary_dark` (+ stop variants) |
| `src/components/layout/Footer/variants/FooterDark.astro` | `text-gray-300/400/500` | `muted` / light-on-dark |
| `src/components/layout/Footer/variants/FooterMultiColumn.astro` | `via-[#011a35]`, `to-[#00162e]` | `primary_dark` |
| `src/components/layout/Footer/variants/FooterMultiColumn.astro` | `text-gray-300/400/500` | `muted` / light-on-dark |
| `src/components/sections/DirectoryBadges/variants/LogosGrid.astro` | `text-gray-400` | `muted` |
| `src/components/sections/DirectoryBadges/variants/BadgesRow.astro` | `text-gray-400` | `muted` |
| `src/components/sections/HeroSlider/variants/HeroSliderOne.astro` | fallback `#962e20` in `var(--color-accent, #962e20)` | drop hex fallback or use token only |

## Aligned in 3a (not 3b offenders)

| File | Change | Notes |
|------|--------|-------|
| `src/styles/global.css` `@theme` | `light` → `#f8fafc`; fonts → Source Sans 3 / Montserrat | Matches committed `site.json.theme` |
| `src/styles/global.css` body | `color: var(--color-dark)` | No hard-coded `#1a1a1a` |
| `src/utils/theme.ts` + `BaseLayout.astro` | runtime `:root` + Google Fonts | Source of truth path |

## Explicitly out of 3a

- No `scripts/lint-theme.cjs`
- No `package.json` build wiring for theme lint
- No component tokenization of the inventory rows above
