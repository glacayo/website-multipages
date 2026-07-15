/**
 * FAQ variant map. Unknown keys fall back to `accordion` in the dispatcher.
 * Documented variants: accordion, columns, compact (strategy v2).
 */
import FAQAccordion from './FAQAccordion.astro';
import FAQColumns from './FAQColumns.astro';
import FAQCompact from './FAQCompact.astro';

export const faqVariants = {
  accordion: FAQAccordion,
  columns: FAQColumns,
  compact: FAQCompact,
} as const;

export type FAQVariantKey = keyof typeof faqVariants;

export const FAQ_DEFAULT_VARIANT = 'accordion' as const;
