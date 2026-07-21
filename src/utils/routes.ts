/** Shared route publication policy. site_type authority; flags only narrow within SEO. */
import type { SiteType } from '../data/types';

export type { SiteType };

export const SITE_TYPE_VALUES = ['one-page', 'multipage', 'seo'] as const satisfies readonly SiteType[];
export const NON_INDEXABLE_TECHNICAL_PATHS = ['/404', '/thank-you'] as const;
export const LEGAL_PATHS = ['/privacy-policy', '/terms-of-service'] as const;
export const STATIC_INTERNAL_PATHS = ['/about-us', '/services', '/gallery', '/contact-us'] as const;

export type SiteFeaturesLike = { enable_blog: boolean; enable_landings: boolean };
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

/** External/tel/mailto allowed. PR 4a gates /blog(+/*) and /services/{slug} only. */
export function isPublishedNavHref(href: string, site: SiteLike): boolean {
  const path = String(href).split(/[?#]/)[0] || '';
  if (!path.startsWith('/')) return true;
  if (path === '/blog' || path.startsWith('/blog/')) return publishesBlog(site);
  if (/^\/services\/.+/u.test(path)) return publishesServiceDetail(site);
  return true;
}

/** Clone nav; drop unpublished blog/service-detail links. Never mutates source. */
export function filterNavigationForSite<T extends NavigationLike>(nav: T, site: SiteLike): T {
  const ok = (href: string) => isPublishedNavHref(href, site);
  return {
    ...nav,
    header: nav.header.filter((i) => ok(i.href)).map((i) => {
      if (!i.children) return { ...i };
      const children = i.children.filter((c) => ok(c.href)).map((c) => ({ ...c }));
      const next = { ...i };
      if (children.length) next.children = children;
      else delete next.children;
      return next;
    }),
    footer: nav.footer
      .map((c) => ({ ...c, links: c.links.filter((l) => ok(l.href)).map((l) => ({ ...l })) }))
      .filter((c) => c.links.length > 0),
    mobile: { ...nav.mobile },
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
