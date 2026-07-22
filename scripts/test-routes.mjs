#!/usr/bin/env node
/** Route policy smoke tests (Node + --experimental-strip-types). */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLlmKeyPages,
  buildSitemapXml,
  filterNavigationForSite,
  getEffectiveSiteType,
  getIndexablePaths,
  LEGAL_PATHS,
  NON_INDEXABLE_TECHNICAL_PATHS,
  publishesBlog,
  publishesServiceDetail,
  publishesStaticInternals,
  resolveInternalHref,
  serviceDetailHref,
} from '../src/utils/routes.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const gate = createRequire(import.meta.url)('./gate-routes.cjs');
const BASE = 'https://example.com';
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err instanceof Error ? err.message : err}`);
  }
}

function site(o = {}) {
  return {
    features: { enable_blog: true, enable_landings: true, enable_gallery: true, ...(o.features ?? {}) },
    ...('site_type' in o ? { site_type: o.site_type } : {}),
  };
}

function idx(s) {
  return getIndexablePaths({
    site: s,
    serviceSlugs: ['patio'],
    blogPosts: [{ slug: 'hello', date: '2026-01-01', updated: '2026-02-01' }],
  });
}

const navSrc = {
  header: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services', children: [{ label: 'Patio', href: '/services/patio' }] },
    { label: 'About', href: '/about-us' },
    { label: 'Blog', href: '/blog' },
    { label: 'Ext', href: 'https://ex.com' },
  ],
  footer: [
    { title: 'S', links: [{ label: 'Patio', href: '/services/patio' }] },
    { title: 'C', links: [{ label: 'Blog', href: '/blog' }, { label: 'About', href: '/about-us' }] },
  ],
  mobile: { cta_label: 'Call', cta_href: 'tel:+1' },
  legal: [{ label: 'Privacy', href: '/privacy-policy' }],
};

const hrefs = (n) => [
  ...n.header.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
  ...n.footer.flatMap((c) => c.links.map((l) => l.href)),
  ...n.legal.map((l) => l.href),
  n.mobile.cta_href,
];

console.log('route policy smoke tests');

test('site_type + indexable/sitemap/llm gates', () => {
  assert.equal(getEffectiveSiteType({}), 'seo');
  assert.equal(getEffectiveSiteType({ site_type: ' SEO ' }), 'seo');
  assert.equal(getEffectiveSiteType({ site_type: 'MultiPage' }), 'multipage');
  for (const t of ['one-page', 'multipage']) {
    assert.equal(publishesBlog(site({ site_type: t })), false);
    assert.equal(publishesServiceDetail(site({ site_type: t })), false);
  }
  assert.equal(publishesStaticInternals(site({ site_type: 'one-page' })), false);
  assert.equal(publishesBlog(site({ site_type: 'seo', features: { enable_blog: false } })), false);
  assert.equal(publishesServiceDetail(site({ site_type: 'seo', features: { enable_landings: false } })), false);

  const multi = idx(site({ site_type: 'multipage' }));
  const seo = idx(site({ site_type: 'seo' }));
  const one = idx(site({ site_type: 'one-page' }));
  const multiP = multi.map((p) => p.path);
  const seoP = new Set(seo.map((p) => p.path));
  for (const list of [multiP, [...seoP], one.map((p) => p.path)]) {
    for (const t of NON_INDEXABLE_TECHNICAL_PATHS) assert.equal(list.includes(t), false);
    for (const l of LEGAL_PATHS) assert.ok(list.includes(l));
  }
  assert.equal(multiP.includes('/blog') || multiP.includes('/services/patio'), false);
  assert.ok(seoP.has('/blog') && seoP.has('/blog/hello') && seoP.has('/services/patio'));
  assert.equal(seo.find((p) => p.path === '/blog/hello')?.lastmod, '2026-02-01');
  assert.deepEqual(one.map((p) => p.path), ['/', ...LEGAL_PATHS]);
  const off = getIndexablePaths({
    site: site({ site_type: 'seo', features: { enable_blog: false, enable_landings: false } }),
    serviceSlugs: ['patio'],
    blogPosts: [{ slug: 'a', date: '2026-01-01' }],
  }).map((p) => p.path);
  assert.equal(off.includes('/blog') || off.includes('/services/patio'), false);
  const xml = buildSitemapXml(BASE, seo);
  assert.ok(xml.includes(`${BASE}/blog/hello`) && xml.includes('<lastmod>2026-02-01</lastmod>'));
  assert.equal(buildSitemapXml(BASE, multi).includes('/blog'), false);
  assert.equal(buildLlmKeyPages(BASE, one).includes('/about-us'), false);
  for (const t of NON_INDEXABLE_TECHNICAL_PATHS) assert.equal(xml.includes(t), false);
});

test('nav filter + resolveInternalHref (one-page anchors, mobile CTA, no source mutation)', () => {
  const frozen = structuredClone(navSrc);
  const multi = hrefs(filterNavigationForSite(navSrc, site({ site_type: 'multipage' })));
  assert.equal(multi.includes('/blog') || multi.includes('/services/patio'), false);
  assert.ok(multi.includes('/services') && multi.includes('/about-us') && multi.includes('https://ex.com'));
  assert.ok(multi.includes('/privacy-policy') && multi.includes('tel:+1'));

  const oneSite = site({ site_type: 'one-page' });
  const one = hrefs(filterNavigationForSite(navSrc, oneSite));
  assert.equal(one.includes('/blog') || one.includes('/about-us') || one.includes('/services'), false);
  assert.ok(one.includes('/#about') && one.includes('/#services'));
  assert.ok(one.includes('https://ex.com') && one.includes('/privacy-policy'));
  assert.equal(resolveInternalHref('/contact-us', oneSite), '/#contact');
  assert.equal(resolveInternalHref('/gallery', oneSite), '/#gallery');
  assert.equal(resolveInternalHref('/gallery', site({ site_type: 'one-page', features: { enable_gallery: false } })), null);
  assert.equal(resolveInternalHref('tel:+1', oneSite), 'tel:+1');
  const seoS = site({ site_type: 'seo' });
  // Keep ?query+#hash; one-page mapped anchor beats original hash.
  for (const [h, s, e] of [
    ['/contact-us?utm=1#x', seoS, '/contact-us?utm=1#x'],
    ['/contact-us?utm=1#x', oneSite, '/?utm=1#contact'],
    ['/about-us?src=nav', oneSite, '/?src=nav#about'],
  ]) assert.equal(resolveInternalHref(h, s), e);
  assert.equal(serviceDetailHref('patio', site({ site_type: 'multipage' })), null);
  assert.equal(serviceDetailHref('patio', site({ site_type: 'seo' })), '/services/patio');

  const leaky = { ...navSrc, mobile: { cta_label: 'Blog', cta_href: '/blog' } };
  assert.equal(filterNavigationForSite(leaky, site({ site_type: 'multipage' })).mobile.cta_href, '/contact-us');
  assert.equal(filterNavigationForSite(leaky, oneSite).mobile.cta_href, '/#contact');
  assert.equal(filterNavigationForSite(navSrc, oneSite).mobile.cta_href, 'tel:+1');
  assert.deepEqual(navSrc, frozen);
  const sourceNav = JSON.parse(fs.readFileSync(path.join(root, 'src/data/navigation.json'), 'utf8'));
  assert.ok(sourceNav.header.some((i) => i.href === '/about-us'));
  assert.equal(sourceNav.header.some((i) => String(i.href).startsWith('/#')), false);
});

test('fixtures wire nav resolver + path helpers + CTAs', () => {
  const checks = [
    ['src/data/loaders.ts', /getServicesPath|getContactPath|getAboutPath|filterNavigationForSite/],
    ['src/utils/navigation.ts', /resolveInternalHref/],
    ['src/components/sections/About.astro', /id="about"/],
    ['src/components/sections/ContactForm/ContactForm.astro', /id="contact"/],
    ['src/components/sections/CTABar.astro', /getContactPath/],
    ['src/components/layout/Header/variants/HeaderDefault.astro', /getContactPath/],
    ['src/components/sections/Welcome.astro', /getAboutPath/],
    ['src/components/sections/Services/variants/ServicesGrid.astro', /getServicesPath/],
    ['src/pages/services/[slug].astro', /publishesServiceDetail/],
    ['scripts/gate-routes.cjs', /getPrunePlan|auditIndexableParity|missing always-published/],
    ['package.json', /gate-routes\.cjs/],
  ];
  for (const [rel, re] of checks) assert.match(fs.readFileSync(path.join(root, rel), 'utf8'), re);
  assert.equal(fs.readFileSync(path.join(root, 'src/utils/navigation.ts'), 'utf8').includes('import.meta.glob'), false);
  for (const f of ['Cards', 'Featured', 'Grid', 'List', 'Tabs']) {
    assert.match(fs.readFileSync(path.join(root, `src/components/sections/Services/variants/Services${f}.astro`), 'utf8'), /publishesServiceDetail/);
  }
});

test('CJS gate-routes mirrors TS + same-origin abs', () => {
  const input = { serviceSlugs: ['patio', 'masonry'], blogPosts: [{ slug: 'a', date: '2026-01-01' }, { slug: 'b', date: '2026-02-01' }], postsPerPage: 1 };
  for (const o of [{}, { site_type: 'multipage' }, { site_type: 'one-page' }, { site_type: 'seo', features: { enable_blog: false, enable_landings: false } }, { site_type: ' SEO ' }]) {
    const s = site(o);
    assert.equal(gate.getEffectiveSiteType(s), getEffectiveSiteType(s));
    assert.equal(gate.publishesBlog(s), publishesBlog(s));
    assert.equal(gate.publishesServiceDetail(s), publishesServiceDetail(s));
    assert.equal(gate.publishesStaticInternals(s), publishesStaticInternals(s));
    assert.deepEqual(gate.getIndexablePaths({ site: s, ...input }).map((p) => p.path), getIndexablePaths({ site: s, ...input }).map((p) => p.path));
  }
  assert.deepEqual([...gate.NON_INDEXABLE], [...NON_INDEXABLE_TECHNICAL_PATHS]);
  assert.deepEqual([...gate.LEGAL], [...LEGAL_PATHS]);
  assert.equal(gate.getPrunePlan(site({ site_type: 'multipage' })).servicesChildren, true);
  assert.ok(gate.getPrunePlan(site({ site_type: 'one-page' })).trees.includes('/about-us'));
  assert.equal(gate.getPrunePlan(site({ site_type: 'seo' })).trees.length, 0);
  assert.deepEqual(gate.resolveInternalHref(`${BASE}/services`, '/', BASE), { path: '/services', hash: '' });
  assert.deepEqual(gate.resolveInternalHref('https://other.test/x', '/', BASE), { external: true });
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
