/** Shared route publication policy. site_type authority; flags only narrow within SEO. */
import type { SiteType } from '../data/types';

export type { SiteType };

export const SITE_TYPE_VALUES = ['one-page', 'multipage', 'seo'] as const satisfies readonly SiteType[];
export const NON_INDEXABLE_TECHNICAL_PATHS = ['/404', '/thank-you'] as const;
export const LEGAL_PATHS = ['/privacy-policy', '/terms-of-service'] as const;
export const STATIC_INTERNAL_PATHS = ['/about-us', '/services', '/gallery', '/contact-us'] as const;

export type SiteFeaturesLike = {
  enable_blog: boolean; enable_landings: boolean; enable_gallery?: boolean;
  enable_testimonials?: boolean; enable_faq?: boolean; enable_areas?: boolean; enable_directories?: boolean;
};

/** one-page path → home hash; optional `feature` must not be false. */
export const ONE_PAGE_ANCHORS: Readonly<Record<string, { hash: string; feature?: keyof SiteFeaturesLike }>> = {
  '/about-us': { hash: 'about' }, '/services': { hash: 'services' },
  '/gallery': { hash: 'gallery', feature: 'enable_gallery' }, '/contact-us': { hash: 'contact' },
};

export type SiteLike = { site_type?: SiteType | string; features: SiteFeaturesLike };
export type IndexablePath = { path: string; lastmod?: string };
export type BlogPostPathInput = { slug: string; date: string; updated?: string };
export type IndexableRouteInput = {
  site: SiteLike;
  serviceSlugs?: string[];
  blogPosts?: BlogPostPathInput[];
  postsPerPage?: number;
};
export type NavLinkLike = { label: string; href: string; description?: string };
export type NavigationLike = {
  header: Array<NavLinkLike & { children?: NavLinkLike[] }>;
  footer: Array<{ title: string; links: NavLinkLike[] }>;
  mobile: { cta_label: string; cta_href: string };
  legal: NavLinkLike[];
  _instructions?: Record<string, string>;
};

/** Missing/blank → seo. Trim+lowercase so whitespace/case cannot silently misclassify. */
export function getEffectiveSiteType(site: Pick<SiteLike, 'site_type'>): SiteType {
  const raw = site.site_type;
  if (raw == null) return 'seo';
  const normalized = String(raw).trim().toLowerCase();
  return (normalized === '' ? 'seo' : normalized) as SiteType;
}

export function publishesBlog(site: SiteLike): boolean {
  return getEffectiveSiteType(site) === 'seo' && site.features.enable_blog === true;
}

export function publishesServiceDetail(site: SiteLike): boolean {
  return getEffectiveSiteType(site) === 'seo' && site.features.enable_landings === true;
}

export function publishesStaticInternals(site: SiteLike): boolean {
  return getEffectiveSiteType(site) !== 'one-page';
}

function featureEnabled(site: SiteLike, key: keyof SiteFeaturesLike | undefined): boolean {
  return !key || site.features[key] !== false;
}

/** Resolve internal href for site_type/features; null = drop. External/tel/mailto pass through. */
export function resolveInternalHref(href: string, site: SiteLike): string | null {
  const raw = String(href || '').trim();
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return raw;

  const u = new URL(raw, 'http://_');
  const path = u.pathname || '/';
  const qh = `${u.search}${u.hash}`;
  const type = getEffectiveSiteType(site);

  if (path === '/blog' || path.startsWith('/blog/')) return publishesBlog(site) ? `${path}${qh}` : null;
  if (/^\/services\/.+/u.test(path)) return publishesServiceDetail(site) ? `${path}${qh}` : null;

  if (type === 'one-page' && path !== '/') {
    const map = ONE_PAGE_ANCHORS[path];
    // Mapped anchor wins over original hash; keep ?query before #hash.
    if (map) return featureEnabled(site, map.feature) ? `/${u.search}#${map.hash}` : null;
    if ((STATIC_INTERNAL_PATHS as readonly string[]).includes(path)) return null;
  }

  if (!publishesStaticInternals(site) && (STATIC_INTERNAL_PATHS as readonly string[]).includes(path)) return null;
  return `${path}${qh}`;
}

/** CTA fallback when preferred href is unpublished. */
export function resolveInternalHrefOr(href: string, site: SiteLike, fallback = '/'): string {
  return resolveInternalHref(href, site) ?? resolveInternalHref(fallback, site) ?? '/';
}

export function serviceDetailHref(slug: string, site: SiteLike): string | null {
  const s = String(slug || '').trim();
  return s ? resolveInternalHref(`/services/${s}`, site) : null;
}

export function isPublishedNavHref(href: string, site: SiteLike): boolean {
  return resolveInternalHref(href, site) != null;
}

/** Clone nav; rewrite/drop unpublished links. Never mutates source. */
export function filterNavigationForSite<T extends NavigationLike>(nav: T, site: SiteLike): T {
  const mapLink = (item: NavLinkLike): NavLinkLike | null => {
    const href = resolveInternalHref(item.href, site);
    return href ? { ...item, href } : null;
  };

  const header = nav.header
    .map((i) => {
      const href = resolveInternalHref(i.href, site);
      if (!href) return null;
      const next: NavLinkLike & { children?: NavLinkLike[] } = { ...i, href };
      if (i.children) {
        const children = i.children.map(mapLink).filter((c): c is NavLinkLike => c != null);
        if (children.length) next.children = children;
        else delete next.children;
      }
      return next;
    })
    .filter((i): i is NavLinkLike & { children?: NavLinkLike[] } => i != null);

  const footer = nav.footer
    .map((c) => ({ ...c, links: c.links.map(mapLink).filter((l): l is NavLinkLike => l != null) }))
    .filter((c) => c.links.length > 0);

  return {
    ...nav, header, footer,
    mobile: { ...nav.mobile, cta_href: resolveInternalHrefOr(nav.mobile.cta_href, site, '/contact-us') },
    legal: nav.legal.map((l) => ({ ...l })),
  };
}

/** Indexable paths for sitemap/llm. Omits /404 and /thank-you. */
export function getIndexablePaths(input: IndexableRouteInput): IndexablePath[] {
  const { site, serviceSlugs = [], blogPosts = [], postsPerPage = 10 } = input;
  const paths: IndexablePath[] = [{ path: '/' }];
  if (publishesStaticInternals(site)) for (const p of STATIC_INTERNAL_PATHS) paths.push({ path: p });
  for (const p of LEGAL_PATHS) paths.push({ path: p });
  if (publishesServiceDetail(site)) for (const s of serviceSlugs) paths.push({ path: `/services/${s}` });
  if (publishesBlog(site)) {
    paths.push({ path: '/blog' });
    for (const post of blogPosts) paths.push({ path: `/blog/${post.slug}`, lastmod: post.updated || post.date });
    for (let p = 2; p <= Math.ceil(blogPosts.length / postsPerPage); p += 1) paths.push({ path: `/blog/${p}` });
  }
  return paths;
}

export function toAbsoluteUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return path === '/' ? `${base}/` : `${base}${path}`;
}

export function buildSitemapXml(baseUrl: string, paths: IndexablePath[]): string {
  const urls = paths.map(({ path, lastmod }) => {
    const tag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${toAbsoluteUrl(baseUrl, path)}</loc>${tag}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function buildLlmKeyPages(baseUrl: string, paths: IndexablePath[]): string {
  return paths
    .map(({ path }) => {
      const label =
        path === '/'
          ? 'Home'
          : path.replace(/^\//, '').split('/').map((p) => p.replace(/-/g, ' ')).join(' / ');
      return `- ${label}: ${toAbsoluteUrl(baseUrl, path)}`;
    })
    .join('\n');
}
