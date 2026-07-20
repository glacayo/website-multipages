# Archive Report: v2.0.0-pending-fixes

**Change**: `v2.0.0-pending-fixes`
**Archived**: 2026-07-20
**Archive path**: `openspec/changes/archive/2026-07-20-v2.0.0-pending-fixes/`
**Mode**: openspec

## Summary

Closed deferred v2.0.0 release hygiene and SEO/schema gaps. The change added `coordinates` to the JSON data contract, enriched JSON-LD schema output (Service image, AggregateRating, GeoCoordinates), fixed blog meta title separator deduplication, and removed obsolete `docs_trash/` planning files. All 17 tasks completed, build passes, no CRITICAL issues.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Additive `coordinates` field only | Preserves backward compatibility with the 12-file JSON contract; no keys removed or renamed |
| `imageToAbsolute()` for Service image | Reuses existing image pipeline helper; consistent with how other images are processed |
| Separator regex detection in `composeTitle()` | Lightweight approach; no new dependencies; handles common separators (`|`, `-`, `—`, `–`, `:`, `›`, `»`) |
| `aggregateRating` from testimonials stars | Derives from existing data; no new JSON fields needed; `avg.toFixed(2)` per design |
| `isValidCoordinatePair()` guard | Prevents emitting invalid `geo` when coordinates are missing or malformed |
| `docs_trash/` deletion only | Already in `.gitignore`; no source changes needed beyond removal |

## Files Changed (during implementation)

| File | Action |
|------|--------|
| `src/data/business.json` | Added optional `coordinates` with placeholder values |
| `src/data/types.ts` | Added `Coordinates` interface, optional field on `BusinessData` |
| `src/data/validation.ts` | Added Zod schema for optional coordinates |
| `scripts/validate-data.cjs` | Mirrored coordinates validation |
| `src/utils/schema.ts` | Added Service `image`, `aggregateRating`, `geo` to JSON-LD builders |
| `src/utils/seo.ts` | Added `titleHasSeparator()` and `composeTitle()` for deduplication |
| `src/utils/images.ts` | Added `imageToAbsolute()` helper |
| `docs_trash/` | Deleted from working tree |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `contractor-theme` | Updated | Added 4 new requirements under §2.2 (Optional Coordinates) and §2.5 (Service Image, AggregateRating, GeoCoordinates) |

## Archive Contents

- `proposal.md` ✅
- `spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (17/17 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅

## Verification Status

**PASS** — No CRITICAL or WARNING issues. Two SUGGESTION items recorded (untested fallback paths, no test runner) — neither blocks archive.

## Source of Truth Updated

- `openspec/specs/contractor-theme/spec.md` — now reflects the new schema/SEO/coordinates behavior

## Next Steps

- Ready for the next SDD change cycle.
- Consider adding a lightweight Vitest setup for pure utils (`seo.ts`, `images.ts`, `schema.ts` builders) to convert source-inspected fallback paths into runtime-verified scenarios (per verify-report SUGGESTION).
