/**
 * Header variant map. Unknown keys fall back to `default` in the dispatcher.
 */
import HeaderDefault from './HeaderDefault.astro';
import HeaderCentered from './HeaderCentered.astro';
import HeaderTransparent from './HeaderTransparent.astro';
import HeaderMinimal from './HeaderMinimal.astro';

export const headerVariants = {
  default: HeaderDefault,
  solid: HeaderDefault,
  centered: HeaderCentered,
  transparent: HeaderTransparent,
  minimal: HeaderMinimal,
} as const;

export type HeaderVariantKey = keyof typeof headerVariants;

export const HEADER_DEFAULT_VARIANT = 'default' as const;
