/**
 * SEO Utilities
 * Helper functions for generating SEO metadata
 */
import { getSiteContent } from '../data/loaders';

/**
 * Generate full page title with site name
 */
export function generatePageTitle(pageTitle: string, siteName?: string): string {
  const site = siteName || getSiteContent().company_name;
  return pageTitle === site ? pageTitle : `${pageTitle} | ${site}`;
}

/**
 * Generate canonical URL from path
 */
export function generateCanonicalUrl(path: string, baseUrl?: string): string {
  // Use the configured site URL from astro.config.mjs as canonical base
  const siteUrl = import.meta.env.SITE || 'https://wgmasonryhardscape757.com';
  const base = baseUrl || siteUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Generate meta description with fallback
 */
export function generateMetaDescription(description: string, fallback?: string): string {
  if (description && description.length > 0) {
    return description.length > 160 ? description.substring(0, 157) + '...' : description;
  }
  return fallback || getSiteContent().company_estimate;
}

/**
 * Generate OG image URL
 */
export function generateOgImage(imagePath?: string, baseUrl?: string): string {
  const siteUrl = import.meta.env.SITE || 'https://wgmasonryhardscape757.com';
  const base = baseUrl || siteUrl;
  if (imagePath) {
    return imagePath.startsWith('http') ? imagePath : `${base}${imagePath}`;
  }
  return `${base}/images/og-default.jpg`;
}

/**
 * Generate Twitter card image URL
 */
export function generateTwitterImage(imagePath?: string, baseUrl?: string): string {
  return generateOgImage(imagePath, baseUrl);
}

/**
 * SEO Input interface
 */
export interface SeoInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  siteName?: string;
  baseUrl?: string;
}

/**
 * Generate full SEO metadata object
 */
export function buildSeoMeta(input: SeoInput): {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
} {
  const title = generatePageTitle(input.title, input.siteName);
  const description = generateMetaDescription(input.description);
  const canonical = generateCanonicalUrl(input.path, input.baseUrl);
  const ogImage = generateOgImage(input.image, input.baseUrl);

  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType: input.type || 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage,
  };
}