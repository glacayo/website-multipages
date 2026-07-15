/**
 * Dynamic sitemap from the v2 data contract (static pages, services, published blog posts).
 */
import {
  getBusiness,
  getPublishedBlogPosts,
  getSite,
} from '../data/loaders';

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

function urlEntry(loc: string, lastmod?: string): string {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`;
}

export async function GET() {
  const site = getSite();
  const business = getBusiness();
  const base = normalizeBase(site.url);
  const urls: string[] = [];

  const staticPaths = [
    '/',
    '/about-us',
    '/services',
    '/gallery',
    '/contact-us',
    '/privacy-policy',
  ];

  if (site.features.enable_blog) {
    staticPaths.push('/blog');
  }

  for (const path of staticPaths) {
    const loc = path === '/' ? `${base}/` : `${base}${path}`;
    urls.push(urlEntry(loc));
  }

  // Service landing routes (generated in PR 8; listed for SEO readiness)
  for (const service of business.services_offered) {
    urls.push(urlEntry(`${base}/services/${service.slug}`));
  }

  if (site.features.enable_blog) {
    const posts = getPublishedBlogPosts();
    for (const post of posts) {
      urls.push(urlEntry(`${base}/blog/${post.slug}`, post.updated || post.date));
    }

    const postsPerPage = 10;
    const totalPages = Math.ceil(posts.length / postsPerPage);
    for (let page = 2; page <= totalPages; page += 1) {
      urls.push(urlEntry(`${base}/blog/${page}`));
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
