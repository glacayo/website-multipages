/**
 * Gallery variant map. Unknown keys fall back to `grid` in the dispatcher.
 */
import GalleryMasonry from './GalleryMasonry.astro';
import GalleryGrid from './GalleryGrid.astro';
import GalleryCarousel from './GalleryCarousel.astro';
import GalleryBeforeAfter from './GalleryBeforeAfter.astro';

export const galleryVariants = {
  masonry: GalleryMasonry,
  grid: GalleryGrid,
  carousel: GalleryCarousel,
  'before-after': GalleryBeforeAfter,
  beforeafter: GalleryBeforeAfter,
  before_after: GalleryBeforeAfter,
} as const;

export type GalleryVariantKey = keyof typeof galleryVariants;

export const GALLERY_DEFAULT_VARIANT = 'grid' as const;
