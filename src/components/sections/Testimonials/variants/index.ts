/**
 * Testimonials variant map. Unknown keys fall back to `slider` in the dispatcher.
 */
import TestimonialsSlider from './TestimonialsSlider.astro';
import TestimonialsCards from './TestimonialsCards.astro';
import TestimonialsList from './TestimonialsList.astro';
import TestimonialsGrid from './TestimonialsGrid.astro';

export const testimonialsVariants = {
  slider: TestimonialsSlider,
  cards: TestimonialsCards,
  list: TestimonialsList,
  grid: TestimonialsGrid,
} as const;

export type TestimonialsVariantKey = keyof typeof testimonialsVariants;

export const TESTIMONIALS_DEFAULT_VARIANT = 'slider' as const;
