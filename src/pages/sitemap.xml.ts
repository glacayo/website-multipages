import blogsData from '../data/blogs.json';
import landingsData from '../data/landings.json';

const BASE = 'https://example.com';

const mainPages = ['', 'about-us', 'services', 'gallery', 'blog', 'contact-us'];

export async function GET() {
  const urls: string[] = [];

  for (const p of mainPages) {
    urls.push(`  <url><loc>${BASE}/${p}</loc></url>`);
  }

  const posts = (blogsData as any).posts || [];
  for (const post of posts) {
    urls.push(`  <url><loc>${BASE}/blog/${post.slug}</loc></url>`);
  }

  const totalPages = Math.ceil(posts.length / 10);
  for (let i = 2; i <= totalPages; i++) {
    urls.push(`  <url><loc>${BASE}/blog/${i}</loc></url>`);
  }

  const landings = (landingsData as any).landing_pages || [];
  for (const lp of landings) {
    const slug = lp.slug;
    if (slug.includes('masonry')) urls.push(`  <url><loc>${BASE}/services/masonry/${slug}</loc></url>`);
    else if (slug.includes('hardscaping')) urls.push(`  <url><loc>${BASE}/services/hardscape/${slug}</loc></url>`);
    else if (slug.includes('concrete')) urls.push(`  <url><loc>${BASE}/services/concrete/${slug}</loc></url>`);
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  );
}
