#!/usr/bin/env node
/** Post-build prune + indexable parity + link/anchor audit. Mirrors src/utils/routes.ts. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const NON_INDEXABLE = Object.freeze(['/404', '/thank-you']);
const LEGAL = Object.freeze(['/privacy-policy', '/terms-of-service']);
const STATIC_INTERNAL = Object.freeze(['/about-us', '/services', '/gallery', '/contact-us']);
const POSTS_PER_PAGE = 10;
const META = new Set(['sitemap.xml', 'robots.txt', 'llm.txt']);
const readJson = (r) => JSON.parse(fs.readFileSync(path.join(ROOT, r), 'utf8'));
const stripBase = (u) => String(u || '').replace(/\/+$/, '');
const normPath = (p) => {
  if (!p || p === '/') return '/';
  const s = String(p).replace(/\\/g, '/').replace(/\/+$/, '');
  return s.startsWith('/') ? s : `/${s}`;
};
const uniq = (a) => [...new Set(a.map(normPath))].sort();
const rm = (t) => (fs.existsSync(t) ? (fs.rmSync(t, { recursive: true, force: true }), true) : false);

function getEffectiveSiteType(site) {
  if (!site || site.site_type == null) return 'seo';
  const n = String(site.site_type).trim().toLowerCase();
  return n === '' ? 'seo' : n;
}
const publishesBlog = (s) => getEffectiveSiteType(s) === 'seo' && s.features.enable_blog === true;
const publishesServiceDetail = (s) => getEffectiveSiteType(s) === 'seo' && s.features.enable_landings === true;
const publishesStaticInternals = (s) => getEffectiveSiteType(s) !== 'one-page';

function getIndexablePaths({ site, serviceSlugs = [], blogPosts = [], postsPerPage = POSTS_PER_PAGE }) {
  const paths = [{ path: '/' }];
  if (publishesStaticInternals(site)) for (const p of STATIC_INTERNAL) paths.push({ path: p });
  for (const p of LEGAL) paths.push({ path: p });
  if (publishesServiceDetail(site)) for (const s of serviceSlugs) paths.push({ path: `/services/${s}` });
  if (publishesBlog(site)) {
    paths.push({ path: '/blog' });
    for (const post of blogPosts) paths.push({ path: `/blog/${post.slug}`, lastmod: post.updated || post.date });
    for (let p = 2; p <= Math.ceil(blogPosts.length / postsPerPage); p += 1) paths.push({ path: `/blog/${p}` });
  }
  return paths;
}

function getPrunePlan(site) {
  const trees = [];
  if (!publishesStaticInternals(site)) trees.push(...STATIC_INTERNAL);
  if (!publishesBlog(site)) trees.push('/blog');
  return { trees: [...new Set(trees)], servicesChildren: publishesStaticInternals(site) && !publishesServiceDetail(site) };
}

function loadPublicationContext() {
  const siteJson = readJson('src/data/site.json');
  const business = readJson('src/data/business.json');
  const blog = readJson('src/data/blog.json');
  return {
    site: { site_type: siteJson.site_type, features: siteJson.features, url: siteJson.url },
    serviceSlugs: (business.services_offered || []).map((s) => s.slug),
    blogPosts: (blog.posts || []).filter((p) => p.published).map((p) => ({ slug: p.slug, date: p.date, updated: p.updated })),
    baseUrl: stripBase(siteJson.url),
  };
}

function pruneDist(distDir, site) {
  const plan = getPrunePlan(site), removed = [];
  for (const t of plan.trees) {
    const rel = normPath(t).replace(/^\//, '');
    if (rel && (rm(path.join(distDir, rel)) || rm(path.join(distDir, `${rel}.html`)))) removed.push(t);
  }
  if (plan.servicesChildren) {
    const dir = path.join(distDir, 'services');
    let n = 0;
    if (fs.existsSync(dir)) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'index.html') continue;
        if (ent.isDirectory() || ent.name.endsWith('.html')) { rm(path.join(dir, ent.name)); n += 1; }
      }
    }
    if (n) removed.push(`/services/*(${n})`);
  }
  return { plan, removed };
}

function listHtmlRoutes(distDir) {
  const routes = new Set();
  if (!fs.existsSync(distDir)) return routes;
  (function walk(dir, parts) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === '_astro' || ent.name === 'assets') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { walk(full, parts.concat(ent.name)); continue; }
      if (!ent.name.endsWith('.html') || META.has(ent.name)) continue;
      routes.add(ent.name === 'index.html'
        ? (parts.length ? normPath(`/${parts.join('/')}`) : '/')
        : normPath(`/${[...parts, ent.name.replace(/\.html$/i, '')].join('/')}`));
    }
  })(distDir, []);
  return routes;
}

function htmlFileForRoute(distDir, routePath) {
  const p = normPath(routePath);
  if (p === '/404') { const f = path.join(distDir, '404.html'); return fs.existsSync(f) ? f : null; }
  const rel = p.replace(/^\//, '');
  const cands = p === '/'
    ? [path.join(distDir, 'index.html')]
    : [path.join(distDir, rel, 'index.html'), path.join(distDir, `${rel}.html`)];
  return cands.find((c) => fs.existsSync(c)) || null;
}

function locToPath(loc, baseUrl) {
  const base = stripBase(baseUrl);
  if (base && (loc === base || loc === `${base}/`)) return '/';
  if (base && loc.startsWith(base)) return normPath(loc.slice(base.length) || '/');
  try { return normPath(new URL(loc).pathname); } catch { return normPath(loc); }
}
const pathsFromSitemap = (xml, base) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => locToPath(m[1].trim(), base));
function pathsFromLlm(text, base) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (/sitemap\.xml/i.test(line)) continue;
    const m = line.match(/^\s*-\s+[^:]+:\s+(https?:\/\/\S+)\s*$/i);
    if (m) out.push(locToPath(m[1], base));
  }
  return out;
}

function auditIndexableParity(distDir, ctx) {
  const expected = uniq(getIndexablePaths({ site: ctx.site, serviceSlugs: ctx.serviceSlugs, blogPosts: ctx.blogPosts }).map((x) => x.path));
  const htmlRoutes = listHtmlRoutes(distDir);
  const indexableInDist = uniq([...htmlRoutes].filter((r) => !NON_INDEXABLE.includes(r)));
  const errors = [];
  const smFile = path.join(distDir, 'sitemap.xml'), llmFile = path.join(distDir, 'llm.txt');
  if (!fs.existsSync(smFile)) errors.push('missing dist/sitemap.xml');
  if (!fs.existsSync(llmFile)) errors.push('missing dist/llm.txt');
  const sitemapPaths = fs.existsSync(smFile) ? uniq(pathsFromSitemap(fs.readFileSync(smFile, 'utf8'), ctx.baseUrl)) : [];
  const llmPaths = fs.existsSync(llmFile) ? uniq(pathsFromLlm(fs.readFileSync(llmFile, 'utf8'), ctx.baseUrl)) : [];
  const diff = (label, a, b) => {
    const missing = a.filter((p) => !b.includes(p)), extra = b.filter((p) => !a.includes(p));
    if (missing.length) errors.push(`${label} missing: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} extra: ${extra.join(', ')}`);
  };
  // Indexable set only; /404 + /thank-you asserted present but never in sitemap/llm.
  diff('dist', expected, indexableInDist);
  diff('sitemap', expected, sitemapPaths);
  diff('llm', expected, llmPaths);
  for (const t of NON_INDEXABLE) {
    if (!htmlRoutes.has(t) && !htmlFileForRoute(distDir, t)) errors.push(`missing always-published ${t}`);
    if (sitemapPaths.includes(t)) errors.push(`sitemap must omit non-indexable ${t}`);
    if (llmPaths.includes(t)) errors.push(`llm must omit non-indexable ${t}`);
  }
  for (const name of META) if (!fs.existsSync(path.join(distDir, name))) errors.push(`missing meta ${name}`);
  return { expected, indexableInDist, sitemapPaths, llmPaths, htmlRoutes, errors };
}

function pageHasId(html, id) {
  if (!id) return true;
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\s(?:id|name)\\s*=\\s*(?:("${esc}")|('${esc}')|(${esc})(?=[\\s>]))`, 'i').test(html);
}

/** Relative + same-origin absolute → internal; cross-origin http(s) → external. */
function resolveInternalHref(href, fromRoute, baseUrl) {
  const raw = String(href || '').trim();
  if (!raw || raw === '#') return null;
  if (/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
    const base = stripBase(baseUrl);
    if (base) {
      try {
        const u = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
        if (u.origin === new URL(base).origin) {
          return { path: normPath(u.pathname), hash: u.hash ? decodeURIComponent(u.hash.slice(1)) : '' };
        }
      } catch { /* external */ }
    }
    return { external: true };
  }
  if (raw.startsWith('#')) return { path: normPath(fromRoute), hash: decodeURIComponent(raw.slice(1).split('?')[0]) };
  try {
    const pageBase = fromRoute === '/' ? '/' : `${normPath(fromRoute)}/`;
    const u = new URL(raw, `http://site.local${pageBase}`);
    return { path: normPath(u.pathname), hash: u.hash ? decodeURIComponent(u.hash.slice(1)) : '' };
  } catch { return null; }
}

function targetExistsOnDisk(distDir, pathname) {
  if (htmlFileForRoute(distDir, pathname)) return true;
  const rel = normPath(pathname).replace(/^\//, '');
  return rel ? fs.existsSync(path.join(distDir, rel)) : fs.existsSync(path.join(distDir, 'index.html'));
}

function collectHtmlFiles(distDir) {
  const files = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === '_astro') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.html')) files.push(full);
    }
  })(distDir);
  return files;
}

function routeFromHtmlFile(distDir, file) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404';
  if (rel.endsWith('/index.html')) return normPath(`/${rel.slice(0, -'/index.html'.length)}`);
  if (rel.endsWith('.html')) return normPath(`/${rel.slice(0, -'.html'.length)}`);
  return normPath(`/${rel}`);
}

function auditLinks(distDir, htmlRoutes, baseUrl) {
  const errors = [], cache = new Map();
  const htmlOf = (route) => {
    if (cache.has(route)) return cache.get(route);
    const f = htmlFileForRoute(distDir, route);
    const html = f ? fs.readFileSync(f, 'utf8') : null;
    cache.set(route, html);
    return html;
  };
  const hrefRe = /\bhref\s*=\s*(["'])(.*?)\1/gi;
  for (const file of collectHtmlFiles(distDir)) {
    const from = routeFromHtmlFile(distDir, file), src = fs.readFileSync(file, 'utf8');
    let m; hrefRe.lastIndex = 0;
    while ((m = hrefRe.exec(src)) !== null) {
      const resolved = resolveInternalHref(m[2], from, baseUrl);
      if (!resolved || resolved.external) continue;
      const { path: target, hash } = resolved;
      if (!(htmlRoutes.has(target) || NON_INDEXABLE.includes(target) || targetExistsOnDisk(distDir, target))) {
        errors.push(`${from}: dead href "${m[2]}" → ${target}`);
        continue;
      }
      if (!hash) continue;
      const html = htmlOf(target);
      if (!html) errors.push(`${from}: href "${m[2]}" missing page for #${hash}`);
      else if (!pageHasId(html, hash)) errors.push(`${from}: missing anchor #${hash} on ${target}`);
    }
  }
  return errors;
}

function runGate(distDir = DIST) {
  if (!fs.existsSync(distDir)) { console.error('[gate-routes] dist/ missing — run astro build first'); process.exit(1); }
  const ctx = loadPublicationContext();
  const { plan, removed } = pruneDist(distDir, ctx.site);
  console.log(`[gate-routes] site_type=${getEffectiveSiteType(ctx.site)} prune=[${plan.trees.join(',') || '—'}] servicesChildren=${plan.servicesChildren}`);
  console.log(removed.length ? `[gate-routes] removed: ${removed.join(', ')}` : '[gate-routes] nothing pruned');
  const parity = auditIndexableParity(distDir, ctx);
  const errors = [...parity.errors, ...auditLinks(distDir, parity.htmlRoutes, ctx.baseUrl)];
  if (errors.length) {
    console.error('\n[gate-routes] FAILED:\n');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\n[gate-routes] ${errors.length} issue(s).\n`);
    process.exit(1);
  }
  console.log(`[gate-routes] OK — ${parity.expected.length} indexable; tech ${NON_INDEXABLE.join(', ')} present; links clean.`);
  return { ctx, parity, plan, removed };
}

function writeFakeDist(dir, routes, opts = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const base = opts.baseUrl || 'https://example.com';
  for (const r of routes) {
    const p = normPath(r);
    const file = p === '/404' ? path.join(dir, '404.html') : p === '/' ? path.join(dir, 'index.html') : path.join(dir, p.slice(1), 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `<html><body>${((opts.ids && opts.ids[p]) || []).map((id) => `<i id="${id}"></i>`).join('')}${(opts.hrefs && opts.hrefs[p]) || ''}</body></html>\n`);
  }
  const listed = opts.indexable ? opts.indexable.map(normPath) : routes.map(normPath).filter((r) => !NON_INDEXABLE.includes(r));
  const sm = listed.map((r) => `  <url><loc>${r === '/' ? `${base}/` : `${base}${r}`}</loc></url>`).join('\n');
  const llm = listed.map((r) => `- ${r === '/' ? 'Home' : r.slice(1)}: ${r === '/' ? `${base}/` : `${base}${r}`}`).join('\n');
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
  fs.writeFileSync(path.join(dir, 'llm.txt'), `## Key pages\n${llm}\n- Sitemap: ${base}/sitemap.xml\n`);
  fs.writeFileSync(path.join(dir, 'robots.txt'), `Sitemap: ${base}/sitemap.xml\n`);
}

function selfTest() {
  let failed = 0;
  const check = (n, ok, d) => (ok ? console.log(`  ✓ ${n}`) : (failed++, console.error(`  ✗ ${n}${d ? ` — ${d}` : ''}`)));
  const feat = { enable_blog: true, enable_landings: true };
  const multi = { site_type: 'multipage', features: feat }, one = { site_type: 'one-page', features: feat };
  const input = { serviceSlugs: ['patio'], blogPosts: [{ slug: 'hello', date: '2026-01-01' }] };
  const base = 'https://example.com', ctxOne = { site: one, serviceSlugs: [], blogPosts: [], baseUrl: base };
  const tech = [...LEGAL, '/404', '/thank-you'];
  check('missing→seo', getEffectiveSiteType({}) === 'seo');
  check('one shape', getIndexablePaths({ site: one, ...input }).map((p) => p.path).join() === ['/', ...LEGAL].join());
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-routes-'));
  try {
    const d1 = path.join(tmp, 'm');
    writeFakeDist(d1, ['/', '/about-us', '/services', '/services/patio', '/gallery', '/contact-us', '/blog', '/blog/hello', ...tech], {
      baseUrl: base, indexable: ['/', '/about-us', '/services', '/gallery', '/contact-us', ...LEGAL],
      ids: { '/': ['contact'] }, hrefs: { '/': `<a href="/about-us">A</a><a href="/#contact">C</a><a href="${base}/services">S</a><a href="tel:+1">T</a>` },
    });
    pruneDist(d1, multi);
    const r1 = listHtmlRoutes(d1);
    check('multi prune', !r1.has('/blog') && !r1.has('/services/patio') && r1.has('/services') && r1.has('/404'));
    const p1 = auditIndexableParity(d1, { site: multi, ...input, baseUrl: base });
    check('multi parity+links', !p1.errors.length && !auditLinks(d1, p1.htmlRoutes, base).length, p1.errors.join('; '));

    const d2 = path.join(tmp, 'o');
    writeFakeDist(d2, ['/', '/about-us', '/services', '/gallery', '/contact-us', '/blog', ...tech], {
      baseUrl: base, indexable: ['/', ...LEGAL], ids: { '/': ['about'] }, hrefs: { '/': '<a href="/#about">A</a><a href="/#x">B</a>' },
    });
    pruneDist(d2, one);
    const p2 = auditIndexableParity(d2, ctxOne);
    check('one prune+anchor', !listHtmlRoutes(d2).has('/about-us') && !p2.errors.length && auditLinks(d2, p2.htmlRoutes, base).some((e) => e.includes('#x')));

    const d3 = path.join(tmp, 'd');
    writeFakeDist(d3, ['/', ...tech], { baseUrl: base, hrefs: { '/': '<a href="/blog">X</a>' } });
    check('dead href', auditLinks(d3, listHtmlRoutes(d3), base).some((e) => e.includes('/blog')));

    const d4 = path.join(tmp, 's');
    writeFakeDist(d4, ['/', ...tech], { baseUrl: base, indexable: ['/', ...LEGAL, '/404'] });
    check('non-indexable sitemap', auditIndexableParity(d4, ctxOne).errors.some((e) => e.includes('/404')));

    const d5 = path.join(tmp, 'miss');
    writeFakeDist(d5, ['/', ...LEGAL], { baseUrl: base, indexable: ['/', ...LEGAL] });
    const miss = auditIndexableParity(d5, ctxOne).errors.join(' ');
    check('missing tech fails', miss.includes('/404') && miss.includes('/thank-you'));

    const d6 = path.join(tmp, 'abs');
    writeFakeDist(d6, ['/', '/about-us', ...tech], {
      baseUrl: base, indexable: ['/', '/about-us', ...LEGAL], ids: { '/about-us': ['x'] },
      hrefs: { '/': `<a href="${base}/about-us">ok</a><a href="${base}/gone">bad</a><a href="https://other.test/x">ext</a><a href="//example.com/about-us#x">pr</a>` },
    });
    const absErr = auditLinks(d6, listHtmlRoutes(d6), base);
    check('same-origin abs', !absErr.some((e) => e.includes('/about-us') && e.includes('dead')) && absErr.some((e) => e.includes('/gone')) && !absErr.some((e) => e.includes('other.test')));
    check('seo prune empty', !getPrunePlan({ site_type: 'seo', features: feat }).trees.length);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  console.log(`\ngate-routes self-test: ${failed === 0 ? 'passed' : 'FAILED'}`);
  process.exit(failed === 0 ? 0 : 1);
}

function main() {
  if (process.argv.includes('--self-test')) { console.log('gate-routes self-test'); return selfTest(); }
  runGate(DIST);
}

module.exports = {
  NON_INDEXABLE, LEGAL, getEffectiveSiteType, publishesBlog, publishesServiceDetail,
  publishesStaticInternals, getIndexablePaths, getPrunePlan, pruneDist, listHtmlRoutes,
  auditIndexableParity, auditLinks, resolveInternalHref, runGate,
};
if (require.main === module) main();
