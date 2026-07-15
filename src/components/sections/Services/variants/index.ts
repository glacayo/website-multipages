/**
 * Services variant map. Unknown keys fall back to `grid` in the dispatcher.
 */
import ServicesGrid from './ServicesGrid.astro';
import ServicesList from './ServicesList.astro';
import ServicesCards from './ServicesCards.astro';
import ServicesTabs from './ServicesTabs.astro';
import ServicesFeatured from './ServicesFeatured.astro';

export const servicesVariants = {
  grid: ServicesGrid,
  list: ServicesList,
  cards: ServicesCards,
  tabs: ServicesTabs,
  featured: ServicesFeatured,
} as const;

export type ServicesVariantKey = keyof typeof servicesVariants;

export const SERVICES_DEFAULT_VARIANT = 'grid' as const;
