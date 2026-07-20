import type { ImageMetadata } from 'astro';
import { absoluteUrl } from './seo';

/**
 * Eager map of every content image under src/assets/images.
 * JSON stores path strings; this helper resolves them to ImageMetadata for astro:assets.
 */
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

function normalizeToAssetKey(path: string): string {
  const cleaned = path.replace(/\\/g, '/').trim();

  // ./images/services/masonry.jpg → /src/assets/images/services/masonry.jpg
  if (cleaned.startsWith('./images/')) {
    return `/src/assets/${cleaned.slice(2)}`;
  }

  // images/services/masonry.jpg
  if (cleaned.startsWith('images/')) {
    return `/src/assets/${cleaned}`;
  }

  // /images/services/masonry.jpg (legacy public-style path)
  if (cleaned.startsWith('/images/')) {
    return `/src/assets${cleaned}`;
  }

  // Already an absolute src path
  if (cleaned.startsWith('/src/assets/images/')) {
    return cleaned;
  }

  // Bare relative under assets
  return `/src/assets/images/${cleaned.replace(/^\//, '')}`;
}

/**
 * Resolve a JSON image path string to an Astro ImageMetadata module default.
 * Throws when the path does not match any file under src/assets/images.
 */
export function getImageByPath(path: string): ImageMetadata {
  const key = normalizeToAssetKey(path);
  const mod = imageModules[key];

  if (!mod?.default) {
    const available = Object.keys(imageModules).sort().join('\n  ');
    throw new Error(
      `Image not found: ${path} (resolved key: ${key})\nAvailable:\n  ${available}`,
    );
  }

  return mod.default;
}

/** True when the path resolves to a known asset image. */
export function hasImagePath(path: string): boolean {
  const key = normalizeToAssetKey(path);
  return Boolean(imageModules[key]?.default);
}

/**
 * Normalize a JSON image path (or absolute URL) to an absolute public URL for schema/SEO.
 * - Absolute http(s) URLs pass through unchanged.
 * - Known asset paths use the Astro-processed `ImageMetadata.src` (e.g. `/_astro/...webp`).
 * - Other relative paths are joined to the site base URL.
 */
export function imageToAbsolute(path: string): string {
  const cleaned = path.trim();
  if (!cleaned) return cleaned;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  if (hasImagePath(cleaned)) {
    const meta = getImageByPath(cleaned);
    return absoluteUrl(meta.src);
  }

  const normalized = cleaned
    .replace(/^\.\//, '/')
    .replace(/^images\//, '/images/')
    .replace(/^([^/])/, '/$1');
  return absoluteUrl(normalized);
}
