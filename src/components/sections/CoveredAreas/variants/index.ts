/**
 * CoveredAreas variant map. Unknown keys fall back to `list` in the dispatcher.
 */
import AreasList from './AreasList.astro';
import AreasMap from './AreasMap.astro';
import AreasCards from './AreasCards.astro';
import AreasColumns from './AreasColumns.astro';

export const areasVariants = {
  list: AreasList,
  map: AreasMap,
  cards: AreasCards,
  columns: AreasColumns,
} as const;

export type AreasVariantKey = keyof typeof areasVariants;

export const AREAS_DEFAULT_VARIANT = 'list' as const;
