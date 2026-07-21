#!/usr/bin/env node
/** Route policy smoke tests (Node + --experimental-strip-types). */
import assert from 'node:assert/strict';
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
} from '../src/utils/routes.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
    features: { enable_blog: true, enable_landings: true, ...(o.features ?? {}) },
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

test('nav filter drops unpublished dynamic links; no mutation', () => {
  const frozen = structuredClone(navSrc);
  for (const type of ['multipage', 'one-page']) {
    const h = hrefs(filterNavigationForSite(navSrc, site({ site_type: type })));
    assert.equal(h.includes('/blog') || h.includes('/services/patio'), false);
    assert.ok(h.includes('/services') && h.includes('/about-us') && h.includes('https://ex.com'));
    assert.ok(h.includes('/privacy-policy') && h.includes('tel:+1'));
  }
  const flagsOff = { enable_blog: false, enable_landings: false };
  const off = hrefs(filterNavigationForSite(navSrc, site({ site_type: 'seo', features: flagsOff })));
  assert.equal(off.includes('/blog') || off.includes('/services/patio'), false);
  const on = hrefs(filterNavigationForSite(navSrc, site({ site_type: 'seo' })));
  assert.ok(on.includes('/blog') && on.includes('/services/patio'));
  assert.deepEqual(navSrc, frozen);
});

test('fixtures wire shared gates + services variants', () => {
  const checks = [
    ['src/pages/blog/[slug].astro', /publishesBlog/],
    ['src/pages/services/[slug].astro', /publishesServiceDetail/],
    ['src/pages/sitemap.xml.ts', /publishesBlog/],
    ['src/pages/llm.txt.ts', /buildLlmKeyPages/],
    ['src/data/loaders.ts', /filterNavigationForSite/],
  ];
  for (const [rel, re] of checks) assert.match(fs.readFileSync(path.join(root, rel), 'utf8'), re);
  for (const f of ['Cards', 'Featured', 'Grid', 'List', 'Tabs']) {
    const src = fs.readFileSync(path.join(root, `src/components/sections/Services/variants/Services${f}.astro`), 'utf8');
    assert.match(src, /publishesServiceDetail/);
    assert.equal(/enable_landings\s*!==\s*false/.test(src), false);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
