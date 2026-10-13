import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { stripTypeScriptTypes } from 'node:module';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('early inline bootstrap preserves an existing queue and initializes an absent one', () => {
  const layout = read('src/layouts/BaseLayout.astro');
  const bootstrap = layout.match(/<script is:inline>\s*(window\.dataLayer[\s\S]*?)<\/script>/)?.[1];
  assert.ok(bootstrap, 'missing inline dataLayer bootstrap');
  assert.ok(layout.indexOf(bootstrap) < layout.indexOf('<SeoHead'));
  const queue = [{ event: 'queued_before_layout' }];
  const window = { dataLayer: queue };
  runInNewContext(bootstrap, { window });
  assert.equal(window.dataLayer, queue);
  const emptyWindow = {};
  runInNewContext(bootstrap, { window: emptyWindow });
  assert.equal(Array.isArray(emptyWindow.dataLayer), true);
  assert.equal(emptyWindow.dataLayer.length, 0);
});

test('telephone destinations preserve international prefixes and separate extensions', async () => {
  const { toPhoneHref } = await import('../src/utils/phone.ts');
  for (const [input, expected] of [
    ['+44 (20) 7946-0958', 'tel:+442079460958'],
    ['(757) 555-0100', 'tel:7575550100'],
    ['tel:+49 30 123456', 'tel:+4930123456'],
    ['757-555-0100 ext. 123', 'tel:7575550100;ext=123'],
    ['757-555-0100 x123', 'tel:7575550100;ext=123'],
    ['tel:+442079460958;ext=42', 'tel:+442079460958;ext=42'],
    ['', undefined], [undefined, undefined], ['not a phone', undefined],
    ['tel:', undefined], ['++44 12345678', undefined], ['123', undefined],
    ['555-0100 garbage 123', undefined], ['tel:5550100?secret=123', undefined],
  ]) assert.equal(toPhoneHref(input), expected, String(input));
});

test('Button forwards only explicit analytics attributes, never classifies by visual variant', () => {
  const button = read('src/components/ui/Button.astro');
  assert.match(button, /'data-raven-cta'\?: 'primary'/);
  assert.match(button, /'data-raven-call'\?: 'true'/);
  assert.equal((button.match(/data-raven-cta=\{cta\}/g) || []).length, 2);
  assert.match(button, /data-raven-call=\{call && phoneHref \? 'true' : undefined\}/);
  assert.doesNotMatch(button, /data-(?:cta|call)\b/);
  assert.doesNotMatch(button, /variant === 'primary'/);
});

test('Button call opt-in only applies to normalized tel links, independently of CTA styling', async () => {
  const { toPhoneHref } = await import('../src/utils/phone.ts');
  const frontmatter = read('src/components/ui/Button.astro').split('---')[1]
    .replace(/^import .*;$/m, '');
  const code = stripTypeScriptTypes(frontmatter) + '\n({ resolvedHref, phoneHref, cta, call });';
  for (const [props, expectedHref, expectedCall, expectedCta] of [
    [{ href: 'tel:+44 (20) 7946-0958', 'data-raven-call': 'true', 'data-raven-cta': 'primary' }, 'tel:+442079460958', true, 'primary'],
    [{ href: '/gallery', 'data-raven-call': 'true' }, '/gallery', false, undefined],
    [{ href: '1234567', 'data-raven-call': 'true' }, '1234567', false, undefined],
    [{ href: 'tel:garbage', 'data-raven-call': 'true' }, undefined, false, undefined],
    [{ href: '/contact-us', variant: 'primary' }, '/contact-us', false, undefined],
    [{ type: 'submit', 'data-raven-cta': 'primary' }, undefined, false, 'primary'],
    [{ href: 'tel:7575550100', 'data-call': 'true', 'data-cta': 'primary' }, 'tel:7575550100', false, undefined],
    [{ href: 'tel:7575550100' }, 'tel:7575550100', false, undefined],
  ]) {
    const result = runInNewContext(code, { Astro: { props }, toPhoneHref });
    assert.equal(result.resolvedHref, expectedHref);
    assert.equal(Boolean(result.call && result.phoneHref), expectedCall);
    assert.equal(result.cta, expectedCta);
  }
});

test('documentation reserves exact selectors and demonstrates a bootstrapped safe success payload', () => {
  const docs = read('docs/analytics-hooks.md');
  for (const selector of ['[data-raven-cta="primary"]', 'a[data-raven-call="true"]', '[data-raven-share]', '[data-related]']) {
    assert.ok(docs.includes(selector), selector);
  }
  assert.match(docs, /\[data-raven-share\].*N\/A/);
  assert.match(docs, /\[data-related\].*N\/A/);
  assert.doesNotMatch(docs, /data-(?:cta|call)\b/);
  const example = docs.match(/```js\n([\s\S]*?)```/)?.[1];
  assert.ok(example, 'missing success example');
  assert.ok(example.indexOf('window.dataLayer = window.dataLayer || []') >= 0);
  assert.ok(example.indexOf('window.dataLayer =') < example.indexOf('window.dataLayer.push'));
  const window = {};
  runInNewContext(example, { window });
  assert.equal(window.dataLayer.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(window.dataLayer[0])), {
    event: 'form_success', form_id: 'contact', form_name: 'contact',
  });
  const queue = [{ event: 'existing' }];
  runInNewContext(example, { window: { dataLayer: queue } });
  assert.equal(queue.length, 2);
  assert.equal(queue[0].event, 'existing');
});
