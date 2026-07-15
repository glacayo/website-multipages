/**
 * Dynamic robots.txt referencing the production sitemap from site.json.
 */
import { getSite } from '../data/loaders';

export async function GET() {
  const site = getSite();
  const base = site.url.replace(/\/+$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
