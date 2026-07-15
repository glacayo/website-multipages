/**
 * Footer variant map. Unknown keys fall back to `default` in the dispatcher.
 */
import FooterDefault from './FooterDefault.astro';
import FooterDark from './FooterDark.astro';
import FooterCompact from './FooterCompact.astro';
import FooterMultiColumn from './FooterMultiColumn.astro';

export const footerVariants = {
  default: FooterDefault,
  dark: FooterDark,
  compact: FooterCompact,
  'multi-column': FooterMultiColumn,
  multicolumn: FooterMultiColumn,
} as const;

export type FooterVariantKey = keyof typeof footerVariants;

export const FOOTER_DEFAULT_VARIANT = 'default' as const;
