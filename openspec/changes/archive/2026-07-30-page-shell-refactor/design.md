# Design: Page Shell Refactor

## Technical Approach

Extract the duplicated dark-gradient hero + breadcrumb into `layout/PageHeader.astro`, built on an extended `ui/Breadcrumb`. Pages become thin composers: `BaseLayout` (schema, unchanged) → `PageHeader` → existing `sections/*`. The `about-us`/`contact-us` one-off blocks move into two new loader-driven sections. No JSON, loader-signature, Zod, or route-policy changes.

Header inventory today:

| Pages | Hero sizing | h1 scale | Breadcrumb impl | Reveal | Gradient |
|---|---|---|---|---|---|
| services, gallery | `h-[40vh] min-h-[300px] md:min-h-[380px]` | 3xl/5xl/6xl | hand-rolled `<nav>` | h1 + crumb | `to-accent/70` |
| about-us, contact-us, blog index | `min-h-[280px] md:min-h-[340px] py-16` | 3xl/5xl | `ui/Breadcrumb` + class hack | h1 only | `/70` |
| blog/[page] | `min-h-[280px] py-16` (drifted) | 3xl/5xl | hack | none | `/70` |
| blog/[slug] | `min-h-[320px] md:min-h-[400px] py-16` | 2xl/4xl/5xl `max-w-3xl` | hack | none | `/60` |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Component shape | `PageHeader` inside `BaseLayout` slot | `PageShell` layout wrapping `BaseLayout` | Per-page schema props stay visible; smaller diffs |
| Breadcrumb on dark | Additive `tone` prop on `ui/Breadcrumb` (default `light` = today) | Centralized selector hack | Removes coupling to Breadcrumb internals; other consumers unaffected |
| Sizing | `size` prop codifying the three existing treatments (default `standard`) | One normalized size; className props | Preserves current visuals; codification, NOT a new variant |
| Section absorption | New flat `sections/AboutStory.astro` + `sections/ContactDetails.astro` | Variant-folder structure | Single-implementation sections are flat files here; folders would invite variant scope creep |
| `PageIntro` | Not extracted | — | Only 2 structurally different blocks; YAGNI until a third consumer |
| pageType/schema | `PageHeader` takes NO `pageType`; pages keep identical `BaseLayout` props | Shell-owned pageType | Visual shell decoupled from JSON-LD; `buildSchemas()` inputs byte-identical |
| Existing 5 sections | `About`, `Welcome`, `MissionVision`, `CTABar`, `ContactForm` internally unchanged | Restructure now | Already loader-driven; pages stop duplicating wrapper markup |

## Data Flow

    src/data/*.json ──► loaders.ts (typed getters — signatures unchanged)
          │
          ▼
    page.astro ──► BaseLayout(title, path, pageType…) ──► buildSchemas → JSON-LD   [unchanged]
          │
          ├──► PageHeader(title, crumbs, size) ──► Breadcrumb(tone="dark")         [visual only]
          └──► sections/* (AboutStory, ContactDetails, Services, …) ◄── loaders

Crumb hrefs stay caller-provided literals (`/`, `/blog`) — safe: these pages only publish under `multipage`/`seo`. Nav/CTA links keep `resolveInternalHref*` untouched.

## File Changes

| File | Action | PR | Description |
|---|---|---|---|
| `src/components/layout/PageHeader.astro` | Create | 1 | Hero + breadcrumb shell, 3 size treatments |
| `src/components/ui/Breadcrumb.astro` | Modify | 1 | Export `Crumb`; add `tone` prop |
| `src/pages/services.astro`, `src/pages/gallery.astro` | Modify | 1 | Replace hand-rolled hero with `PageHeader size="tall"` |
| `src/pages/about-us.astro`, `contact-us.astro`, `blog/index.astro`, `blog/[page].astro`, `blog/[slug].astro` | Modify | 2 | Replace hero + class hack (`size="post"` and `reveal={false}` on [slug]) |
| `src/components/sections/AboutStory.astro` | Create | 3 | Story + stats + image + CTA (business loaders) |
| `src/components/sections/ContactDetails.astro` | Create | 3 | Info grid + compact `ContactForm` |
| `src/pages/about-us.astro`, `contact-us.astro` | Modify | 3 | Thin composers |

Untouched: `src/data/*` (12 JSON, types, loaders, validation), `src/utils/routes.ts`, `scripts/gate-routes.cjs`, `BaseLayout`, `LandingLayout`, pnpm enforcement files. **JSON contract impact: none.** `privacy-policy`/`terms-of-service`/`404`/`thank-you` stay as-is — compatible future adopters (`/60` gradient).

## Interfaces / Contracts

```ts
// layout/PageHeader.astro
interface Props {
  title: string;
  crumbs: Crumb[];                       // from ui/Breadcrumb
  size?: 'standard' | 'tall' | 'post';   // existing treatments only
  reveal?: boolean;                      // default true; [slug] passes false (LCP)
  class?: string;
}
// ui/Breadcrumb.astro — additive
tone?: 'light' | 'dark';                 // default 'light' (current output)
```

Accepted drift — the ONLY allowed `dist/` HTML diffs:

| Page | Change | Why accepted |
|---|---|---|
| services, gallery | flat nav → `nav>ol>li`; `gap-2`→`gap-1.5`; separator → border token | 5-page majority treatment; semantic upgrade; JSON-LD unaffected |
| blog/[page] | gains `md:min-h-[340px]` + reveal attrs | Fixes drift vs sibling `blog/index` |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Data contract | JSON untouched | `pnpm run validate:data` |
| Routes/`site_type` | Policy identical | `pnpm run test:routes` |
| Types/build | Props, palette, links | `pnpm run build` (full gate chain: guard, validate, lint-theme, test:theme, test:routes, astro check, gate-routes) |
| Visual equivalence | Per refactored page | Build before/after each slice; diff `dist/**/*.html`; only accepted-drift rows may differ |

No template unit framework; `test:cli` n/a (no `packages/` changes).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Route policy files are explicitly untouched.

## Migration / Rollout

No data migration. Feature Branch Chain; slices ≤ 400 changed lines (est. PR1 ~170, PR2 ~150, PR3 ~300; split PR3 per page if over). Each slice green via `pnpm run build`, revertable with `git revert`.

## Open Questions

- [ ] None blocking. Reviewer sign-off on the two accepted-drift rows requested in PR descriptions.
