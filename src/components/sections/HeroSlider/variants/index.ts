/**
 * HeroSlider variant map. Unknown keys fall back to `one` in the dispatcher.
 */
import HeroSliderOne from './HeroSliderOne.astro';
import HeroSliderTwo from './HeroSliderTwo.astro';
import HeroSliderThree from './HeroSliderThree.astro';
import HeroSliderFour from './HeroSliderFour.astro';
import HeroSliderFive from './HeroSliderFive.astro';

export const heroVariants = {
  one: HeroSliderOne,
  two: HeroSliderTwo,
  three: HeroSliderThree,
  four: HeroSliderFour,
  five: HeroSliderFive,
} as const;

export type HeroVariantKey = keyof typeof heroVariants;

export const HERO_DEFAULT_VARIANT = 'one' as const;
