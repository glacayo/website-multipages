/**
 * Lightweight llm.txt summary for AI crawlers (static text from v2 JSON).
 */
import { getBusiness, getSite } from '../data/loaders';

export async function GET() {
  const business = getBusiness();
  const site = getSite();
  const base = site.url.replace(/\/+$/, '');
  const services = business.services_offered.map((s) => s.name).join(', ');

  const body = `# ${business.name}

> ${business.tagline}

## Summary
${site.seo.default_description}

## Contact
- Phone: ${business.phones[0] ?? 'N/A'}
- Email: ${business.emails[0] ?? 'N/A'}
- Address: ${business.address.full}
- Service area: ${business.service_area}

## Services
${services}

## Key pages
- Home: ${base}/
- About: ${base}/about-us
- Services: ${base}/services
- Gallery: ${base}/gallery
- Blog: ${base}/blog
- Contact: ${base}/contact-us
- Sitemap: ${base}/sitemap.xml

## Notes
This is a contractor multipage website template. Content is placeholder/lorem for reuse.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
