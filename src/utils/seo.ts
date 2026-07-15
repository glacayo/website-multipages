/**
 * Compose page SEO metadata from site.json defaults + per-page overrides.
 */
import { getBusiness, getSite } from '../data/loaders';

export interface BuildSeoOptions {
  /** Full document title, or a short page title (business name is appended when missing). */
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: string;
  noindex: boolean;
  siteName: string;
  locale: string;
  lang: string;
  twitterHandle?: string;
  faviconSrc: string;
  appleTouchIcon?: string;
}

const DESCRIPTION_MAX = 160;

function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function siteBaseUrl(): string {
  const site = getSite();
  return site.url.replace(/\/+$/, '');
}

/**
 * Resolve a site-relative or absolute path to an absolute URL.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = siteBaseUrl();
  const clean = pathOrUrl.replace(/^\.?\//, '/').replace(/^([^/])/, '/$1');
  const path = clean.startsWith('/') ? clean : `/${clean}`;
  if (path === '/') return `${base}/`;
  return `${base}${path}`;
}

function truncateDescription(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= DESCRIPTION_MAX) return normalized;
  return `${normalized.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

function composeTitle(pageTitle: string | undefined, defaultTitle: string, separator: string, businessName: string): string {
  const raw = (pageTitle ?? defaultTitle).trim();
  if (!raw) return defaultTitle;
  if (raw.includes(businessName) || raw === defaultTitle) return raw;
  // Already composed with separator (e.g. "About Us | …")
  if (pageTitle && pageTitle.includes(separator.trim())) return raw;
  return `${raw}${separator}${businessName}`;
}

/**
 * Build title, description, canonical, Open Graph, and Twitter Card fields.
 */
export function buildSeo(options: BuildSeoOptions = {}): SeoMetadata {
  const site = getSite();
  const business = getBusiness();
  const seo = site.seo;

  const path = normalizePath(options.path ?? '/');
  const title = composeTitle(options.title, seo.default_title, seo.title_separator, business.name);
  const description = truncateDescription(options.description ?? seo.default_description);
  const imagePath = options.image ?? seo.default_image;
  const type = options.type ?? seo.og_type ?? 'website';
  const noindex = options.noindex ?? false;

  const canonical = absoluteUrl(path);
  const image = absoluteUrl(imagePath);

  return {
    title,
    description,
    canonical,
    image,
    type,
    noindex,
    siteName: business.name,
    locale: site.lang.replace('-', '_'),
    lang: site.lang || 'en-US',
    twitterHandle: seo.twitter_handle,
    faviconSrc: site.favicon.src,
    appleTouchIcon: site.favicon.apple_touch_icon,
  };
}
