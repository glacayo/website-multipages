#!/usr/bin/env node
/**
 * Theme runtime smoke — Node built-ins + --experimental-strip-types (no new framework).
 * Proves font sanitization/fallback, CSS var safety, Google Fonts URL shape, primary_dark default.
 */
import assert from 'node:assert/strict';
import {
  THEME_FALLBACKS,
  sanitizeFontName,
  sanitizeCssColor,
  resolveTheme,
  buildThemeCssVars,
  buildGoogleFontsUrl,
} from '../src/utils/theme.ts';

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
  }
}

/** @param {Record<string, string>} [o] */
function baseTheme(o = {}) {
  return {
    primary: '#003060',
    accent: '#962e20',
    dark: '#012141',
    light: '#f8fafc',
    body_font: 'Source Sans 3',
    heading_font: 'Montserrat',
    ...o,
  };
}

console.log('theme runtime smoke tests');

test('font sanitization strips breakout chars', () => {
  const clean = sanitizeFontName(`Montserrat</style><script>alert(1)</script>`);
  assert.ok(clean);
  assert.equal(/[<>"'`]|script/i.test(clean), false);
  assert.equal(sanitizeFontName('</style>'), '');
  assert.equal(sanitizeFontName('<<<>>>'), '');
  assert.equal(sanitizeFontName('Source Sans 3'), 'Source Sans 3');
  assert.equal(sanitizeFontName('/* x */').includes('/*'), false);
});

test('unsafe/empty fonts fall back in resolve + CSS vars', () => {
  const t = resolveTheme(baseTheme({ body_font: '</style>', heading_font: '"""<<<>>>' }));
  assert.equal(t.body_font, THEME_FALLBACKS.body_font);
  assert.equal(t.heading_font, THEME_FALLBACKS.heading_font);

  const css = buildThemeCssVars(baseTheme({ body_font: 'x"; } </style><script>', heading_font: '<>' }));
  assert.ok(css.includes(THEME_FALLBACKS.heading_font));
  assert.equal(css.includes('</style>'), false);
  assert.equal(css.includes('<script>'), false);
  assert.equal(css.includes('"; }'), false);
  assert.match(css, /--color-primary:\s*#003060/);
  assert.match(css, /--font-sans:/);
});

test('primary_dark missing uses template default, not custom dark', () => {
  const customDark = '#112233';
  const t = resolveTheme(baseTheme({ dark: customDark }));
  assert.equal(t.dark, customDark);
  assert.equal(t.primary_dark, THEME_FALLBACKS.primary_dark);
  assert.notEqual(t.primary_dark, customDark);
  assert.equal(resolveTheme(baseTheme({ primary_dark: '#0a1b2c' })).primary_dark, '#0a1b2c');
});

test('Google Fonts URL never emits empty family=:wght', () => {
  const url = buildGoogleFontsUrl(baseTheme({ body_font: '</style>', heading_font: '<<<>>>' }));
  assert.ok(url);
  assert.equal(/family=:/.test(url), false);
  assert.match(url, /family=Source\+Sans\+3:wght/);
  assert.match(url, /family=Montserrat:wght/);

  const dup = buildGoogleFontsUrl(baseTheme({ body_font: 'Montserrat', heading_font: 'Montserrat' }));
  assert.equal((dup.match(/family=Montserrat/g) || []).length, 1);
});

test('sanitizeCssColor rejects breakout, keeps hex/named', () => {
  assert.equal(sanitizeCssColor('#003060', '#000'), '#003060');
  assert.equal(sanitizeCssColor('red; } </style>', '#000'), '#000');
  assert.equal(sanitizeCssColor('navy', '#000'), 'navy');
});

console.log(`\ntheme smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
