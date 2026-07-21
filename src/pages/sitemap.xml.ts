/**
 * Dynamic sitemap from the v2 data contract (static pages, services, published blog posts).
 */
import {
  getBusiness,
  getPublishedBlogPosts,
  getSite,
} from '../data/loaders';
import {
  LEGAL_PATHS,
  publishesBlog,
  publishesServiceDetail,
  publishesStaticInternals,
  STATIC_INTERNAL_PATHS,
  toAbsoluteUrl,
} from '../utils/routes';

function urlEntry(loc: string, lastmod?: string): string {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`;
}

export async function GET() {
  const site = getSite();
  const business = getBusiness();
  const urls: string[] = [];

  const staticPaths = ['/'];
  if (publishesStaticInternals(site)) {
    staticPaths.push(...STATIC_INTERNAL_PATHS);
  }
  staticPaths.push(...LEGAL_PATHS);

  if (publishesBlog(site)) {
    staticPaths.push('/blog');
  }

  for (const path of staticPaths) {
    urls.push(urlEntry(toAbsoluteUrl(site.url, path)));
  }

  // Service landing routes (generated in PR 8; listed for SEO readiness)
  if (publishesServiceDetail(site)) {
    for (const service of business.services_offered) {
      urls.push(urlEntry(toAbsoluteUrl(site.url, `/services/${service.slug}`)));
    }
  }

  if (publishesBlog(site)) {
    const posts = getPublishedBlogPosts();
    for (const post of posts) {
      urls.push(urlEntry(toAbsoluteUrl(site.url, `/blog/${post.slug}`), post.updated || post.date));
    }

    const postsPerPage = 10;
    const totalPages = Math.ceil(posts.length / postsPerPage);
    for (let page = 2; page <= totalPages; page += 1) {
      urls.push(urlEntry(toAbsoluteUrl(site.url, `/blog/${page}`)));
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
