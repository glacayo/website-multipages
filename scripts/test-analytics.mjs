import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import './test-analytics-core.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('explicit CTA coverage includes desktop/mobile headers, all heroes and landing CTAs', () => {
  const headers = 'src/components/layout/Header/variants';
  for (const file of readdirSync(new URL(`../${headers}`, import.meta.url)).filter((file) => file.endsWith('.astro'))) {
    const source = read(`${headers}/${file}`);
    assert.equal((source.match(/data-raven-cta="primary"/g) || []).length, 2, file);
    assert.doesNotMatch(source, /data-(?:cta|call)\b/, file);
  }
  const heroes = 'src/components/sections/HeroSlider/variants';
  for (const file of readdirSync(new URL(`../${heroes}`, import.meta.url)).filter((file) => file.endsWith('.astro'))) {
    const source = read(`${heroes}/${file}`);
    assert.ok(source.includes('data-raven-cta="primary"'), file);
    assert.doesNotMatch(source, /data-(?:cta|call)\b/, file);
    for (const tag of source.matchAll(/<Button\b[\s\S]*?>/g)) {
      if (tag[0].includes('cta_primary.href')) assert.match(tag[0], /data-raven-cta="primary"/, file);
      assert.match(tag[0], /data-raven-call="true"/, file);
    }
  }
  assert.equal((read('src/layouts/LandingLayout.astro').match(/data-raven-cta="primary"/g) || []).length, 2);
  assert.match(read('src/components/sections/CTABar.astro'), /data-raven-cta="primary"/);
  assert.doesNotMatch(read('src/components/sections/CTABar.astro'), /data-(?:cta|call)\b/);
  assert.match(read('src/components/layout/MobileStickyBar.astro'), /data-raven-cta="primary"/);
});

test('AboutStory estimate CTA explicitly opts into primary analytics coverage', () => {
  const source = read('src/components/sections/AboutStory.astro');
  assert.match(source, /<Button\b(?=[^>]*href=\{contactHref\})(?=[^>]*data-raven-cta="primary")[^>]*>\s*Request an estimate\s*<\/Button>/);
});

test('phone surfaces use shared normalization and explicit call hooks', () => {
  for (const path of [
    'src/components/layout/TopBar.astro',
    'src/components/layout/MobileStickyBar.astro',
    'src/components/layout/Header/variants/HeaderMinimal.astro',
    ...['Default', 'Dark', 'MultiColumn'].map((name) => `src/components/layout/Footer/variants/Footer${name}.astro`),
    'src/components/sections/ContactDetails.astro',
    'src/components/sections/ContactForm/ContactForm.astro',
    'src/layouts/LandingLayout.astro',
    'src/pages/thank-you.astro',
    'src/pages/privacy-policy.astro',
    'src/pages/terms-of-service.astro',
  ]) {
    const source = read(path);
    assert.match(source, /toPhoneHref/, path);
    assert.match(source, /data-raven-call=/, path);
    assert.doesNotMatch(source, /data-(?:cta|call)\b/, path);
    assert.doesNotMatch(source, /replace\(\/\\D\/g/, path);
  }
});

test('sticky CTA preserves route/anchor destinations and uses a non-call fallback for invalid phones', async () => {
  const { toPhoneHref } = await import('../src/utils/phone.ts');
  const code = read('src/components/layout/MobileStickyBar.astro').split('---')[1]
    .replace(/^import .*;$/gm, '') + '\n({ ctaHref, phoneHref, ctaLabel });';
  for (const [configuredHref, phone, contactPath, expectedHref, expectedCall] of [
    ['tel:+44 (20) 7946-0958', '', '/contact-us', 'tel:+442079460958', true],
    ['tel:bad', '+442079460958', '/#contact', '/#contact', false],
    ['', '', '/contact-us', '/contact-us', false],
    ['', 'invalid', '/#contact', '/#contact', false],
    ['', '+442079460958', '/contact-us', 'tel:+442079460958', true],
    ['/services', '', '/contact-us', '/services', false],
    ['/#gallery', '', '/contact-us', '/#gallery', false],
  ]) {
    const result = runInNewContext(code, {
      getBusiness: () => ({ phones: [phone] }),
      getNavigation: () => ({ mobile: { cta_href: configuredHref, cta_label: 'Call Now' } }),
      getContactPath: () => contactPath,
      toPhoneHref,
    });
    assert.equal(result.ctaHref, expectedHref);
    assert.equal(Boolean(result.phoneHref), expectedCall);
    if (configuredHref === 'tel:bad' || (!configuredHref && !expectedCall)) {
      assert.equal(result.ctaLabel, 'Contact Us');
    }
  }
  assert.match(read('src/components/layout/Header/variants/index.ts'), /solid: HeaderDefault/);
});

test('native Netlify POST remains unchanged and no form runtime event is emitted', () => {
  const form = read('src/components/sections/ContactForm/ContactForm.astro');
  assert.match(form, /method="POST"/);
  assert.match(form, /action="\/thank-you"/);
  assert.match(form, /data-netlify="true"/);
  assert.doesNotMatch(form, /<script|fetch\(|form_success|form_start|preventDefault/);
  assert.doesNotMatch(read('src/pages/thank-you.astro'), /form_success|dataLayer\.push/);
});

if (process.argv.includes('--rendered')) {
  test('generated HTML preserves bootstrap, semantic links and native form navigation', () => {
    const root = new URL('../dist/', import.meta.url);
    let pages = 0;
    let forms = 0;
    const walk = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.html')) {
          pages++;
          const html = readFileSync(path, 'utf8');
          assert.match(html, /window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/, path.pathname);
          assert.ok(html.indexOf('window.dataLayer') < html.indexOf('</head>'));
          assert.match(html, /data-raven-cta="primary"/, path.pathname);
          assert.doesNotMatch(html, /data-(?:cta|call)\b/, path.pathname);
          assert.doesNotMatch(html, /form_success|form_start/);
          for (const tag of html.matchAll(/<a\b[^>]*>/g)) {
            const href = tag[0].match(/href="([^"]*)"/)?.[1];
            const call = tag[0].includes('data-raven-call="true"');
            if (href?.startsWith('tel:')) {
              assert.match(href, /^tel:\+?\d{7,15}(?:;ext=\d+)?$/);
              assert.equal(call, true, tag[0]);
            }
            if (call) assert.ok(href?.startsWith('tel:'), tag[0]);
          }
          for (const tag of html.matchAll(/<form\b[^>]*>/g)) {
            forms++;
            assert.match(tag[0], /method="POST"/);
            assert.match(tag[0], /action="\/thank-you"/);
            assert.match(tag[0], /data-netlify="true"/);
          }
        }
      }
    };
    walk(root);
    assert.ok(pages > 0, 'no built pages');
    assert.ok(forms > 0, 'no rendered Netlify form');
    const home = readFileSync(new URL('index.html', root), 'utf8');
    assert.match(home, /href="\/contact-us"/);
    assert.match(home, /href="\/services"/);
    assert.match(home, /href="\/gallery"/);
    assert.match(home, /href="tel:\+17575550100"[^>]*data-raven-call="true"/);
    console.log(`Rendered checks: ${pages} pages, ${forms} native forms`);
  });
}
