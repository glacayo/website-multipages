/**
 * DirectoryBadges variant map. Unknown keys fall back to `logos` in the dispatcher.
 * Keys: badges (BadgesRow), logos (LogosGrid), list (DirectoryList), grid (BadgesGrid).
 */
import BadgesRow from './BadgesRow.astro';
import LogosGrid from './LogosGrid.astro';
import DirectoryList from './DirectoryList.astro';
import BadgesGrid from './BadgesGrid.astro';

export const directoryVariants = {
  badges: BadgesRow,
  logos: LogosGrid,
  list: DirectoryList,
  grid: BadgesGrid,
} as const;

export type DirectoryVariantKey = keyof typeof directoryVariants;

export const DIRECTORY_DEFAULT_VARIANT = 'logos' as const;
