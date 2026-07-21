/**
 * Runtime theme helpers: CSS custom properties + Google Fonts URL from site.json.theme.
 * Unlayered :root overrides win over Tailwind v4 @theme fallbacks.
 */
import type { SiteTheme } from '../data/types';

/** Safe defaults aligned to the template's committed site.json.theme + CSS token fallbacks. */
export const THEME_FALLBACKS = {
  primary: '#003060',
  primary_dark: '#012141',
  accent: '#962e20',
  dark: '#012141',
  light: '#f8fafc',
  muted: '#6b7280',
  surface: '#f9fafb',
  border: '#e5e7eb',
  body_font: 'Source Sans 3',
  heading_font: 'Montserrat',
} as const;

export interface ResolvedTheme {
  primary: string;
  primary_dark: string;
  accent: string;
  dark: string;
  light: string;
  muted: string;
  surface: string;
  border: string;
  body_font: string;
  heading_font: string;
}

/**
 * Sanitize a font family name for safe use inside inline <style> and Google Fonts URLs.
 * Strips HTML/CSS metacharacters that could break out of style context.
 * Returns '' when nothing usable remains (caller must fall back).
 */
export function sanitizeFontName(name: string | undefined | null): string {
  if (name == null) return '';
  let s = String(name).trim();
  if (!s) return '';

  // Strip tags, comment markers, and other breakout sequences first.
  s = s.replace(/<\/?[^>]*>/g, '');
  s = s.replace(/\/\*|\*\//g, '');
  s = s.replace(/[<>"'`;{}\\]/g, '');
  // Keep only a conservative font-name charset (letters, digits, spaces, . + -).
  s = s.replace(/[^\w\s.+-]/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  if (!s || !/[A-Za-z]/.test(s)) return '';
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s;
}

/**
 * Sanitize a CSS color value for emission into :root custom properties.
 * Rejects breakout characters; allows hex, rgb/hsl functions, and simple named colors.
 */
export function sanitizeCssColor(value: string | undefined | null, fallback: string): string {
  const t = value == null ? '' : String(value).trim();
  if (!t) return fallback;
  if (/[;{}<>`'"\\]|\/\*|\*\//.test(t)) return fallback;
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) return t;
  if (/^(?:rgb|rgba|hsl|hsla)\([0-9a-zA-Z.%\s,/+-]+\)$/i.test(t)) return t;
  if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(t) && t.length <= 40) return t;
  return fallback;
}

function resolveFont(value: string | undefined, fallback: string): string {
  return sanitizeFontName(value) || fallback;
}

/** Escape a (already sanitized) font family for use inside a CSS double-quoted string. */
function cssFontFamily(name: string): string {
  return name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Resolve theme colors/fonts with safe fallbacks for missing additive keys.
 * Missing primary_dark uses the template token default (NOT custom dark) so old
 * clients that only set dark do not silently change primary_dark gradients.
 */
export function resolveTheme(theme: SiteTheme): ResolvedTheme {
  return {
    primary: sanitizeCssColor(theme.primary, THEME_FALLBACKS.primary),
    primary_dark: sanitizeCssColor(theme.primary_dark, THEME_FALLBACKS.primary_dark),
    accent: sanitizeCssColor(theme.accent, THEME_FALLBACKS.accent),
    dark: sanitizeCssColor(theme.dark, THEME_FALLBACKS.dark),
    light: sanitizeCssColor(theme.light, THEME_FALLBACKS.light),
    muted: sanitizeCssColor(theme.muted, THEME_FALLBACKS.muted),
    surface: sanitizeCssColor(theme.surface, THEME_FALLBACKS.surface),
    border: sanitizeCssColor(theme.border, THEME_FALLBACKS.border),
    body_font: resolveFont(theme.body_font, THEME_FALLBACKS.body_font),
    heading_font: resolveFont(theme.heading_font, THEME_FALLBACKS.heading_font),
  };
}

/** Build unlayered :root CSS variable overrides from site.json.theme. */
export function buildThemeCssVars(theme: SiteTheme): string {
  const t = resolveTheme(theme);
  const body = cssFontFamily(t.body_font);
  const heading = cssFontFamily(t.heading_font);
  return [
    ':root {',
    `  --color-primary: ${t.primary};`,
    `  --color-primary-dark: ${t.primary_dark};`,
    `  --color-accent: ${t.accent};`,
    `  --color-dark: ${t.dark};`,
    `  --color-light: ${t.light};`,
    `  --color-muted: ${t.muted};`,
    `  --color-surface: ${t.surface};`,
    `  --color-border: ${t.border};`,
    `  --font-sans: "${body}", system-ui, sans-serif;`,
    `  --font-heading: "${heading}", system-ui, sans-serif;`,
    '}',
  ].join('\n');
}

/** Google Fonts css2 family segment: spaces → +. Returns null if empty after sanitize. */
function googleFontsFamilyParam(family: string): string | null {
  const safe = sanitizeFontName(family).replace(/\s+/g, '+');
  if (!safe || !/[A-Za-z]/.test(safe)) return null;
  return `family=${safe}:wght@400;600;700;800`;
}

/**
 * Build a Google Fonts css2 URL from body_font / heading_font.
 * Dedupes when both resolve to the same family.
 * Returns null when no valid family remains (caller should skip the link).
 */
export function buildGoogleFontsUrl(theme: SiteTheme): string | null {
  const t = resolveTheme(theme);
  const families = [...new Set([t.body_font, t.heading_font])];
  const params = families
    .map(googleFontsFamilyParam)
    .filter((p): p is string => Boolean(p));
  if (params.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}
