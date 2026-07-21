# Design: v2.2 Template Usability

## Approach

Everything is additive: optional `site.json` keys, new build scripts, CLI value-only replacement into existing `business.json` keys. No contract shape changes; gating never deletes **source** files (post-build prune may delete gated paths from `dist/` only). Guards follow the existing Zod + CJS mirror pattern.

## Architecture Decisions

| # | Topic | Choice | Rejected | Rationale |
|---|-------|--------|----------|-----------|
| 1 | Type config | Additive `site.json.site_type`: `one-page \| multipage \| seo`. **Read default when key missing → `seo`** (old clients). **CLI new scaffolds write `multipage`**. Invalid → `validate:data` FAILS | 13th config file; silent invalid fallback | Missing-key `seo` = current full-route behavior. New projects start multipage (operator intent). Publication scope is SEO-critical → typos fail loudly |
| 2 | Static-page gating | Dynamic routes: `getStaticPaths` returns `[]`. Static internal pages: **post-build prune** `scripts/gate-routes.cjs` deletes gated dirs from `dist/` only | `injectRoute` integration (moves ~7 pages); catch-all dispatcher (breaks one-file-per-page) | Astro cannot skip building static named pages. Prune is small, version-agnostic, zero source moves |
| 3 | Route policy + precedence | New `src/utils/routes.ts` is publication authority API. **`site_type` wins**; `enable_blog` / `enable_landings` are subordinate toggles that may only narrow within allowed scope. Blog publishes iff `site_type === seo` AND `enable_blog`. Service detail publishes iff `site_type === seo` AND `enable_landings`. **`services/[slug]` currently has NO gate — must add one.** Helpers used by page guards, sitemap, llm.txt, nav/CTA resolver, Services cards. `gate-routes.cjs` re-reads `site.json` (CJS mirror) | Per-page ad-hoc logic; flags overriding type upward | One policy table; mirror risk equals existing Zod/CJS pattern |
| 4 | Dual-source drift | After prune, **mandatory parity audit on the indexable published route set only**: compare sitemap + llm lists (or a shared manifest from one writer) against matching HTML routes in `dist/`. **Do not** require every `dist/` file to appear in sitemap/llm. Classify `/404` and `/thank-you` as always-published **non-indexable/technical** (plus meta artifacts). Fail build only on indexable-set mismatch | Trust TS and CJS to stay hand-synced forever; naive full-`dist/` ↔ sitemap equality | Prevents sitemap listing pruned routes; avoids false failures on intentional non-indexable pages |
| 5 | Link/CTA policy (beyond nav) | All internal hrefs (nav JSON, hero/service CTAs, mobile CTA, footer, component links) resolve via shared helpers to **published routes or rendered on-page anchors**. Build-time broken-link / unpublished-route audit per `site_type` MUST also verify **hash target existence** on the destination page — route publication alone is insufficient for `#anchors` | Nav-only rewriting; route-only link checks | One-page and multipage otherwise leak CTAs to pruned routes or missing section ids |
| 6 | One-page + multipage nav | **Repurpose** existing `src/utils/navigation.ts` (file already exists; **dead code — zero importers today**). After re-verify zero importers at apply time: replace body with site-type-aware **and feature-aware** resolver (do **not** create a parallel file blindly). One-page maps only when the section is rendered: `/about-us`→`/#about`, `/services`→`/#services` (children dropped), `/gallery`→`/#gallery` **iff `enable_gallery`**, `/contact-us`→`/#contact`; drops `/blog` + detail links; keeps legal/external. If a feature flag disables the section, **do not** emit the missing anchor — omit or fall back to a safe published target. Multipage drops blog + detail links only. Add missing `id="about"` / `id="contact"` — other section ids exist when those sections render | Rewriting `navigation.json` at scaffold only; unconditional one-page anchor map | Schema-stable; adapts if `site_type` or `enable_*` edited later |
| 7 | Theme runtime | `src/utils/theme.ts` builds an **unlayered** `:root {--color-*; --font-*}` override from **current `site.json.theme` values**, inlined in `BaseLayout` head. **No silent value drift:** keep `light: #f8fafc` (and other committed theme hexes); align `global.css` `@theme` fallbacks **to** `site.json`, not the reverse, unless a value change is explicitly tasked | Build-time `@theme` codegen; rewriting `site.json` to match CSS drift | Tailwind v4 `@theme` is layered; unlayered wins. Existing clients keep their JSON colors |
| 8 | Palette keys | Additive optional `theme` keys `primary_dark`, `muted`, `surface`, `border`; hex validation. `@theme` stays synced fallback using the same hexes as `site.json` (plus additive tokens) | Required keys; changing `light` to `#ffffff` without docs | Existing client files keep validating; missing additive keys fall back |
| 9 | Google Fonts | `buildGoogleFontsUrl()` → 2 preconnects + one `css2` link in `BaseLayout`; weights 400;600;700;800 | Self-hosting | No font loading exists today — `site.json` fonts are dead config |
| 10 | Color lint + offender pre-step | **Required pre-step:** full color audit + tokenize offenders, then enable lint. New `scripts/lint-theme.cjs` scans `src/**/*.{astro,css,ts,js,mjs}` minus `src/assets/**`. Flags hex, `rgb()/hsl()/oklch()`, Tailwind stock-palette utilities (`text-gray-500`, `bg-[#…]`). Strips comments + `@theme` block; allows token utilities + `white/black/transparent/current/inherit`; `theme-lint-ignore` escape. **Lint MUST NOT merge while source still fails it.** Default PR split: **3a** tokens+fonts+Zod+audit inventory / **3b** tokenize offenders + wire lint | Landing lint first; scanning only `dist/` | Runs before `astro build` → no `dist/` on failure |
| 11 | CLI intake | Extend `ScaffoldAnswers` + prompts (Enter = default): payment methods (CSV), hours (3 prompts → existing 3-row shape), free-estimate, years experience, license, insurance, social (blank = key omitted), directories (URL per row; if none provided → keep ≥1 placeholder/default row + `enable_directories: false` — **never empty `directories[]`**), website type (**write `multipage` by default** on all answer paths). **`founded_year` skip → preserve key as `""`** (do not remove top-level key). All paths funnel through `buildAnswers` → parity by construction; defaults in `--help` + README | Empty directories array; removing `founded_year`; new JSON keys | `business.json` already has every field — value-only replacement; Zod `directories.min(1)` and key stability stay |

## Precedence matrix (`site_type` vs `site.features.*`)

| `site_type` | Blog routes | `services/[slug]` | Static internals (about/services/gallery/contact) | `enable_blog` / `enable_landings` effect |
|-------------|-------------|-------------------|-----------------------------------------------------|------------------------------------------|
| `one-page` | unpublished | unpublished | unpublished (prune `dist/`) | ignored for publication (cannot enable) |
| `multipage` | unpublished | unpublished | published | ignored for publication (cannot enable) |
| `seo` | published iff `enable_blog` | published iff `enable_landings` | published | subordinate on/off within SEO only |

Other `enable_*` flags (`gallery`, `testimonials`, `faq`, `areas`, `directories`) control **section/UI rendering** on pages that are already published — they never publish a new route class. On **one-page**, those same flags also gate whether multipage→anchor rewrites are legal (no `/#gallery` when gallery is off).

UI links/CTAs MUST follow the same matrix: never href to an unpublished route, and never href to a feature-disabled / missing in-page anchor.

## Publish / prune table (source always retained)

| Path | one-page | multipage | seo | How unpublished |
|------|----------|-----------|-----|-----------------|
| `/` | keep | keep | keep | — |
| `/about-us` | prune dist | keep | keep | `gate-routes.cjs` |
| `/services` | prune dist | keep | keep | `gate-routes.cjs` |
| `/gallery` | prune dist | keep | keep | `gate-routes.cjs` |
| `/contact-us` | prune dist | keep | keep | `gate-routes.cjs` |
| `/blog`, `/blog/[slug]`, `/blog/[page]` | off | off | iff `enable_blog` | empty `getStaticPaths` + prune static index if needed |
| `/services/[slug]` | off | off | iff `enable_landings` | empty `getStaticPaths` (**new gate**) |
| `/privacy-policy`, `/terms-of-service` | keep (indexable) | keep (indexable) | keep (indexable) | always; include in sitemap/llm |
| `/thank-you` | keep (non-indexable) | keep (non-indexable) | keep (non-indexable) | always in `dist/`; **omit** from sitemap/llm |
| `/404` | keep (technical) | keep (technical) | keep (technical) | always in `dist/`; **omit** from sitemap/llm |
| `sitemap.xml`, `robots.txt`, `llm.txt` | keep (scoped) | keep (scoped) | keep (scoped) | always; lists **indexable** routes only |

### Parity audit scope (indexable set, not full `dist/`)

| Class | Examples | In `dist/`? | In sitemap/llm? | Parity role |
|-------|----------|-------------|-----------------|-------------|
| Indexable published | `/`, type-scoped internals, legal, SEO blog/landings when on | yes | yes | Must match policy ↔ `dist/` ↔ sitemap/llm |
| Always-published non-indexable / technical | `/404`, `/thank-you` | yes | **no** | Classified exclude; presence without sitemap entry is OK |
| Meta artifacts | `robots.txt`, `sitemap.xml`, `llm.txt` | yes | n/a | Not HTML content routes; out of content parity |
| Gated / unpublished | blog on multipage, internals on one-page, etc. | no | no | Must be absent from both |

## Known theme lint offender inventory (expand during 3a audit; tokenize in 3b)

Minimum known set (not exhaustive — 3a audit MUST expand):

| Location | Offenders | Notes |
|----------|-----------|-------|
| `src/pages/blog/[slug].astro` `<style is:global>` | `#374151`, `#1f2937`, `#962e20`, `#003060` | map to muted/dark/accent/primary tokens |
| `src/styles/global.css` | body `#1a1a1a`; `@theme` hexes | align fallbacks to `site.json.theme` (`light` stays `#f8fafc`) |
| `src/styles/animations.css` | skeleton `#e5e7eb`, `#f3f4f6` | border/surface tokens |
| `src/components/layout/NavMenu.astro` | `gray-50`, `gray-700` | surface/muted tokens |
| `src/components/layout/Header/variants/*` | `gray-100` | surface token |
| `src/components/layout/Footer/variants/FooterDark.astro` | `via-[#011a35]`, `to-[#00162e]`, `gray-*` | primary_dark / muted |
| `src/components/layout/Footer/variants/FooterMultiColumn.astro` | same as FooterDark | same |
| `src/components/sections/DirectoryBadges/**` | `text-gray-400` | muted |
| `src/components/sections/HeroSlider/variants/HeroSliderOne.astro` | fallback `#962e20` | accent token only |

Lint lands only in **3b** after these (and any audit additions) are tokenized or explicitly ignored with documented `theme-lint-ignore`.

## Data Flow

```
site.json.site_type ─┬→ utils/routes.ts ─→ getStaticPaths guards (blog/*, services/[slug])
                     │                  ─→ sitemap.xml.ts / llm.txt.ts (indexable published set)
                     │                  ─→ navigation resolver (repurposed navigation.ts; feature-aware anchors)
                     │                  ─→ CTA/service card href helpers
site.features.* ─────┘                  ─→ one-page anchor eligibility (enable_gallery, etc.)
                     └ mirror → scripts/gate-routes.cjs ─→ prune dist/ ─→ indexable parity + link/anchor audit

site.json.theme ─→ utils/theme.ts ─→ BaseLayout :root override + fonts link
src/** source   ─→ scripts/lint-theme.cjs ─→ fails build on stray colors (after 3b)
```

Build chain: `guard:pm → validate-data → lint-theme → astro check → astro build → gate-routes (prune + parity/link audit)`.

## File Changes

| File | Action | PR |
|------|--------|----|
| `AGENTS.md`, `SKILL.md`, `README.md` | Modify — identity vs seed guidance | 1 |
| `packages/create-contractor-site/` (`prompts.mjs`, `replace-data.mjs`, `bin`, `smoke-test.mjs`, README) | Modify — intake/parity; `founded_year` → `""`; directories min(1); default `site_type` write deferred to 4b | 2 (type write in 4b) |
| `src/utils/theme.ts`, color-audit notes in PR; `BaseLayout.astro`, `global.css` align to `site.json.theme` | Create/Modify | 3a |
| `scripts/lint-theme.cjs`; tokenize offenders across layout/sections/blog | Create/Modify | 3b |
| `src/data/{validation.ts,types.ts,site.json}`, `scripts/validate-data.cjs`, `package.json` | Modify (additive) — theme keys (3a), `site_type` + build chain (4a/4b) | 3a–4b |
| `src/utils/routes.ts` | Create | 4a |
| `src/pages/services/[slug].astro`, blog `getStaticPaths`, `sitemap.xml.ts`, `llm.txt.ts` | Modify — shared policy gates | 4a |
| `scripts/gate-routes.cjs` (prune + parity/link audit) | Create | 4b |
| `src/utils/navigation.ts` | **Repurpose** (verify zero importers first) | 4b |
| Services card links, About/ContactForm ids, Header/Footer consumers | Modify | 4b |
| CLI website-type prompt + smoke | Modify | 4b |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| CLI smoke | New fields; shape/`_instructions` preserved; `founded_year` skip → `""`; directories still min(1); `--yes`/env parity; scaffold writes `site_type: multipage` | `pnpm run test:cli` |
| Data guard | Additive theme keys, hex format, `site_type` enum; invalid fails | `pnpm run validate:data` |
| Build guard | Stray color fails before dist; per-type `dist/` + **indexable** sitemap set; fonts link; indexable parity + feature-aware link/anchor audit | `pnpm run build` per type |
| Missing-key compat | Fixture without `site_type` behaves as `seo` | unit or build fixture |

## Migration / Rollout

No data migration. Missing `site_type` → effective `seo` (current behavior). New scaffolds write `multipage`.

**Default chain (not optional fallbacks):**

1. PR 1 — docs
2. PR 2 — CLI intake
3. **PR 3a** — theme tokens + fonts + Zod + color-audit inventory; CSS aligned to existing `site.json.theme`
4. **PR 3b** — tokenize all offenders, then enable `lint-theme` in build (must pass)
5. **PR 4a** — `site_type` + `routes.ts` + dynamic gates (incl. **new** `services/[slug]` gate) + sitemap/llm
6. **PR 4b** — post-build prune + parity/link audit + repurpose `navigation.ts` + anchors + CLI type prompt + smoke

Each PR < 400 changed lines. If a default slice still exceeds 400, split further before open — do not land oversized PRs.

## Open Questions

- [ ] None blocking. Font weight set (400;600;700;800) may shrink in PR 3a after auditing `font-*` usage.
- [ ] Shared manifest file vs. post-hoc `dist/` walk for parity — choose at apply time; audit is mandatory either way and MUST scope to the **indexable** published route set (exclude `/404`, `/thank-you`, meta artifacts).
