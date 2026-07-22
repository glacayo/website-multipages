#!/usr/bin/env node
/**
 * Committed CLI smoke tests — Node built-ins only (no test framework).
 *
 * Covers:
 * 1. Missing target argument
 * 2. Existing non-empty target
 * 3. Target equal to / inside template root
 * 4. Published DEFAULT_TEMPLATE_REF / CREATE_CONTRACTOR_TEMPLATE_REF contract (v2.2.0)
 * 5. Duplicate service input normalization + slug uniqueness + business/services alignment
 * 6. Service-area name parse/dedupe (Chesapeake duplicate-slug case) + areas rebuild
 *    without leaking stale template county/ZIP metadata into new areas
 * 7. CREATE_CONTRACTOR_SITE_ANSWERS_JSON real CLI spawn (copy+replace, skip setup)
 * 8. Temp-target --yes scaffold (install/validate/build) unless SKIP_CLI_E2E=1
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAlignedAreas,
  buildAlignedServices,
  normalizePrimaryServices,
  normalizeServiceAreaNames,
  parseServiceAreaNames,
  replaceTargetData,
  slugify,
} from '../src/replace-data.mjs';
import {
  buildAnswers,
  DEFAULT_FREE_ESTIMATE,
  DEFAULT_HOURS,
  DEFAULT_INSURANCE,
  DEFAULT_LICENSE,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SITE_TYPE,
  DEFAULT_YEARS_EXPERIENCE,
  normalizeDirectories,
  normalizeHours,
  normalizePaymentMethods,
  normalizeSiteType,
  normalizeSocial,
  optionalText,
  requiredText,
  SITE_TYPES,
  SOCIAL_NETWORK_KEYS,
} from '../src/prompts.mjs';
import { isSameOrInside, validateTarget, TargetValidationError } from '../src/validate-target.mjs';
import {
  DEFAULT_TEMPLATE_REF,
  findLocalTemplateRoot,
} from '../src/copy-template.mjs';
import { isVersionAtLeast, resolveCommandPath } from '../src/run-command.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '../bin/create-contractor-site.mjs');
const PKG_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = findLocalTemplateRoot(PKG_ROOT);

let passed = 0;
let failed = 0;

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** @param {string} file */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Seed template data files into a temp target. @param {string} prefix */
function seedDataDir(prefix) {
  assert(REPO_ROOT, 'expected local template root');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const dataSrc = path.join(REPO_ROOT, 'src', 'data');
  const dataDst = path.join(tmp, 'src', 'data');
  fs.mkdirSync(dataDst, { recursive: true });
  for (const f of [
    'business.json',
    'site.json',
    'services.json',
    'areas.json',
    'navigation.json',
    'landings.json',
    'directories.json',
  ]) {
    fs.copyFileSync(path.join(dataSrc, f), path.join(dataDst, f));
  }
  return { tmp, dataDst };
}

/**
 * @param {string[]} args
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string }} [opts]
 */
function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd || process.cwd(),
    env: { ...process.env, ...(opts.env || {}) },
    shell: false,
    windowsHide: true,
  });
}

async function main() {
  console.log('create-contractor-site smoke tests\n');

  await test('resolveCommandPath finds pnpm and git without shell', () => {
    const pnpm = resolveCommandPath('pnpm');
    const git = resolveCommandPath('git');
    assert(Boolean(pnpm), 'expected pnpm on PATH');
    assert(Boolean(git), 'expected git on PATH');
  });

  await test('pnpm version comparator enforces minimum version', () => {
    assert(isVersionAtLeast('11.1.2', '11.1.2'), 'same version should pass');
    assert(isVersionAtLeast('11.2.0', '11.1.2'), 'newer minor should pass');
    assert(isVersionAtLeast('12.0.0', '11.1.2'), 'newer major should pass');
    assert(!isVersionAtLeast('11.1.1', '11.1.2'), 'older patch should fail');
    assert(!isVersionAtLeast('10.9.9', '11.1.2'), 'older major should fail');
  });

  await test(
    'DEFAULT_TEMPLATE_REF / CREATE_CONTRACTOR_TEMPLATE_REF published contract is v2.2.0',
    () => {
      const copySrcPath = path.join(PKG_ROOT, 'src', 'copy-template.mjs');
      const copySrc = fs.readFileSync(copySrcPath, 'utf8');
      // Pin the source fallback so a silent ref bump cannot ship without updating this test.
      assert(
        /CREATE_CONTRACTOR_TEMPLATE_REF\s*\|\|\s*['"]v2\.2\.0['"]/.test(copySrc),
        'copy-template.mjs DEFAULT_TEMPLATE_REF fallback must be v2.2.0',
      );
      const expected =
        process.env.CREATE_CONTRACTOR_TEMPLATE_REF || 'v2.2.0';
      assert(
        DEFAULT_TEMPLATE_REF === expected,
        `DEFAULT_TEMPLATE_REF must equal CREATE_CONTRACTOR_TEMPLATE_REF or v2.2.0 (got ${DEFAULT_TEMPLATE_REF})`,
      );
      if (!process.env.CREATE_CONTRACTOR_TEMPLATE_REF) {
        assert(
          DEFAULT_TEMPLATE_REF === 'v2.2.0',
          `published default template ref must be v2.2.0 (got ${DEFAULT_TEMPLATE_REF})`,
        );
      }

      const help = runCli(['--help']);
      assert(help.status === 0, `help exit 0, got ${help.status}`);
      const helpOut = `${help.stdout}\n${help.stderr}`;
      assert(
        /CREATE_CONTRACTOR_TEMPLATE_REF/i.test(helpOut),
        'help must document CREATE_CONTRACTOR_TEMPLATE_REF',
      );
      assert(
        /v2\.2\.0/.test(helpOut),
        'help must document default template ref v2.2.0',
      );
    },
  );

  await test('missing target argument exits 1 with usage', () => {
    const result = runCli([]);
    assert(result.status === 1, `expected exit 1, got ${result.status}`);
    const out = `${result.stdout}\n${result.stderr}`;
    assert(/Usage: create-contractor-site/i.test(out), 'expected usage text');
    assert(/Missing target directory/i.test(out), 'expected missing-target message');
  });

  await test('existing non-empty target exits 1', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-nonempty-'));
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'x');
    try {
      const result = runCli(['--yes', dir], {
        env: REPO_ROOT
          ? { CREATE_CONTRACTOR_TEMPLATE_ROOT: REPO_ROOT }
          : {},
      });
      assert(result.status === 1, `expected exit 1, got ${result.status}`);
      const out = `${result.stdout}\n${result.stderr}`;
      assert(/not empty/i.test(out), `expected non-empty message, got:\n${out}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test('rejects target equal to or inside template root', () => {
    assert(REPO_ROOT, 'expected local template root for this check');
    let threw = false;
    try {
      validateTarget(REPO_ROOT, { templateRoot: REPO_ROOT });
    } catch (err) {
      threw = err instanceof TargetValidationError;
      assert(threw, 'expected TargetValidationError for template root');
      assert(
        /must not be the template root or inside it/i.test(
          /** @type {Error} */ (err).message,
        ),
        'expected inside-template message',
      );
    }
    assert(threw, 'validateTarget should throw for template root');

    const inside = path.join(REPO_ROOT, 'src');
    assert(isSameOrInside(inside, REPO_ROOT), 'src should be inside template');
    threw = false;
    try {
      validateTarget(inside, { templateRoot: REPO_ROOT });
    } catch (err) {
      threw = err instanceof TargetValidationError;
    }
    assert(threw, 'validateTarget should throw for path inside template');
  });

  await test('normalizePrimaryServices drops name and slug duplicates', () => {
    const input = [
      'Masonry',
      'masonry',
      'Patios',
      'Patio Work',
      'Patios',
      '  ',
      'Retaining Walls',
      'retaining-walls', // slug collision with Retaining Walls
    ];
    const normalized = normalizePrimaryServices(input);
    assert(
      JSON.stringify(normalized) ===
        JSON.stringify(['Masonry', 'Patios', 'Patio Work', 'Retaining Walls']),
      `unexpected normalized list: ${JSON.stringify(normalized)}`,
    );
    const slugs = normalized.map(slugify);
    assert(new Set(slugs).size === slugs.length, 'normalized slugs must be unique');
  });

  await test('buildAlignedServices keeps unique names/slugs and business alignment', () => {
    const existing = [
      { id: 'masonry', name: 'Masonry', slug: 'masonry', short_description: 'a' },
      { id: 'hardscape', name: 'Hardscape', slug: 'hardscape', short_description: 'b' },
      { id: 'patios', name: 'Patios', slug: 'patios', short_description: 'c' },
      {
        id: 'retaining-walls',
        name: 'Retaining Walls',
        slug: 'retaining-walls',
        short_description: 'd',
      },
    ];

    const { services, offered } = buildAlignedServices(
      existing,
      ['Masonry', 'Masonry', 'Patios', 'Retaining Walls', 'Custom Stone', 'custom stone'],
      { businessName: 'Acme', serviceArea: 'VA Beach' },
    );

    const names = services.map((s) => String(s.name));
    const slugs = services.map((s) => String(s.slug));
    assert(new Set(names.map((n) => n.toLowerCase())).size === names.length, `duplicate names: ${names}`);
    assert(new Set(slugs).size === slugs.length, `duplicate slugs: ${slugs}`);

    assert(offered.length === services.length, 'offered length must match services');
    for (let i = 0; i < services.length; i += 1) {
      assert(offered[i].name === services[i].name, `name mismatch at ${i}`);
      assert(offered[i].slug === services[i].slug, `slug mismatch at ${i}`);
    }

    // Template leading slugs preserved for first slots after input dedupe
    assert(services[0].slug === 'masonry', 'first slug should stay masonry');
    assert(services[1].slug === 'hardscape' || services[1].name === 'Patios', 'slot mapping still shape-stable');
  });

  await test('parse/normalize service areas keep city first and drop slug dups', () => {
    const parsed = parseServiceAreaNames(
      'Chesapeake, Virginia Beach; Norfolk / Newport News & Hampton\nPortsmouth, Suffolk, Williamsburg and Poquoson',
    );
    assert(parsed.includes('Williamsburg'), 'expected Williamsburg from "and" split');
    assert(parsed.includes('Poquoson'), 'expected Poquoson from "and" split');
    assert(parsed.includes('Virginia Beach'), 'expected Virginia Beach');
    assert(parsed.includes('Newport News'), 'expected Newport News from slash split');
    assert(parsed.includes('Hampton'), 'expected Hampton from ampersand split');
    assert(parsed.includes('Portsmouth'), 'expected Portsmouth from newline split');

    const normalized = normalizeServiceAreaNames(
      'Chesapeake',
      'Chesapeake, Virginia Beach, Norfolk, Newport News, Hampton, Portsmouth, Suffolk, Williamsburg and Poquoson',
    );
    assert(normalized[0] === 'Chesapeake', `city must be first: ${normalized[0]}`);
    assert(
      normalized.filter((n) => n.toLowerCase() === 'chesapeake').length === 1,
      'Chesapeake must appear once',
    );
    const slugs = normalized.map(slugify);
    assert(new Set(slugs).size === slugs.length, `duplicate area slugs: ${slugs}`);
  });

  await test('buildAlignedAreas reuses rows and never emits duplicate slugs', () => {
    const existing = [
      {
        name: 'Virginia Beach',
        slug: 'virginia-beach',
        county: 'Virginia Beach',
        state: 'VA',
        zip_codes: ['23451'],
      },
      { name: 'Norfolk', slug: 'norfolk', county: 'Norfolk', state: 'VA', zip_codes: ['23502'] },
      {
        name: 'Chesapeake',
        slug: 'chesapeake',
        county: 'Chesapeake',
        state: 'VA',
        zip_codes: ['23320'],
      },
      { name: 'Suffolk', slug: 'suffolk', county: 'Suffolk', state: 'VA', zip_codes: ['23434'] },
    ];

    const names = normalizeServiceAreaNames(
      'Chesapeake',
      'Chesapeake, Virginia Beach, Norfolk, Newport News, Hampton, Portsmouth, Suffolk, Williamsburg and Poquoson',
    );
    const areas = buildAlignedAreas(existing, names, {
      city: 'Chesapeake',
      state: 'VA',
      zip: '23320',
    });

    assert(areas[0].name === 'Chesapeake', 'primary area name');
    assert(areas[0].slug === 'chesapeake', 'primary area slug');
    assert(
      JSON.stringify(areas[0].zip_codes) === JSON.stringify(['23320']),
      'primary zip from answers',
    );

    const slugs = areas.map((a) => String(a.slug));
    assert(new Set(slugs).size === slugs.length, `duplicate slugs in aligned areas: ${slugs}`);

    const norfolk = areas.find((a) => a.slug === 'norfolk');
    assert(norfolk, 'expected reused Norfolk row');
    assert(
      JSON.stringify(norfolk.zip_codes) === JSON.stringify(['23502']),
      'matched rows keep prior zip_codes',
    );

    for (const slug of ['newport-news', 'hampton', 'portsmouth', 'williamsburg', 'poquoson']) {
      const area = areas.find((a) => a.slug === slug);
      assert(area, `expected generated ${slug} area`);
      assert(area.county === area.name, `${slug} must not inherit stale county: ${area.county}`);
      assert(
        JSON.stringify(area.zip_codes) === JSON.stringify([]),
        `${slug} must not inherit stale zip_codes: ${JSON.stringify(area.zip_codes)}`,
      );
    }
  });

  await test('replaceTargetData writes aligned services into temp data files', () => {
    assert(REPO_ROOT, 'expected local template root');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-replace-'));
    const dataSrc = path.join(REPO_ROOT, 'src', 'data');
    const dataDst = path.join(tmp, 'src', 'data');
    fs.mkdirSync(dataDst, { recursive: true });
    for (const file of [
      'business.json',
      'site.json',
      'services.json',
      'areas.json',
      'navigation.json',
      'landings.json',
      'directories.json',
    ]) {
      fs.copyFileSync(path.join(dataSrc, file), path.join(dataDst, file));
    }

    const answers = buildAnswers({
      businessName: 'Acme Masonry',
      primaryServices: [
        'Masonry',
        'Masonry',
        'Patios',
        'Retaining Walls',
        'Custom Fabrication',
        'custom-fabrication',
      ],
      city: 'Virginia Beach',
      state: 'VA',
      serviceArea: 'Hampton Roads',
    });

    replaceTargetData(tmp, answers);

    const business = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'business.json'), 'utf8'),
    );
    const services = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'services.json'), 'utf8'),
    );
    const navigation = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'navigation.json'), 'utf8'),
    );
    const landings = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'landings.json'), 'utf8'),
    );

    const offered = business.services_offered;
    const catalog = services.services;
    assert(Array.isArray(offered) && Array.isArray(catalog), 'expected service arrays');
    assert(offered.length === catalog.length, 'services_offered must align with services.json length');

    const names = catalog.map((s) => s.name);
    const slugs = catalog.map((s) => s.slug);
    assert(new Set(names.map((n) => n.toLowerCase())).size === names.length, `dup names ${names}`);
    assert(new Set(slugs).size === slugs.length, `dup slugs ${slugs}`);

    for (let i = 0; i < catalog.length; i += 1) {
      assert(offered[i].name === catalog[i].name, `aligned name ${i}`);
      assert(offered[i].slug === catalog[i].slug, `aligned slug ${i}`);
    }

    const expectedLinks = catalog.map((service) => ({
      label: service.name,
      href: `/services/${service.slug}`,
    }));
    const serviceNav = navigation.header.find((item) => item.href === '/services');
    assert(serviceNav, 'expected Services nav item');
    assert(
      JSON.stringify(serviceNav.children) === JSON.stringify(expectedLinks),
      `navigation service links not aligned: ${JSON.stringify(serviceNav.children)}`,
    );

    const footerServices = navigation.footer.find((column) => column.title === 'Services');
    assert(footerServices, 'expected Services footer column');
    assert(
      JSON.stringify(footerServices.links) === JSON.stringify(expectedLinks),
      `footer service links not aligned: ${JSON.stringify(footerServices.links)}`,
    );

    const landingPages = landings.landing_pages;
    assert(
      landingPages.every((page) => catalog.some((service) => service.slug === page.slug && service.name === page.name)),
      `landing pages must align to generated services: ${JSON.stringify(landingPages)}`,
    );

    assert(business.name === 'Acme Masonry', 'business name replaced');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('buildAnswers normalizes blank text trust fields and foundedYear', () => {
    const answers = buildAnswers({
      businessName: 'Trust Co',
      primaryServices: ['Masonry'],
      freeEstimate: '   ',
      yearsExperience: '\t',
      license: '',
      insurance: null,
      foundedYear: '  ',
    });
    assert(answers.freeEstimate === DEFAULT_FREE_ESTIMATE, 'freeEstimate default');
    assert(answers.yearsExperience === DEFAULT_YEARS_EXPERIENCE, 'yearsExperience default');
    assert(answers.license === DEFAULT_LICENSE, 'license default');
    assert(answers.insurance === DEFAULT_INSURANCE, 'insurance default');
    assert(answers.foundedYear === '', 'foundedYear blank → ""');
    assert(requiredText('  x  ', 'y') === 'x', 'requiredText trims');
    assert(optionalText('  2012 ') === '2012', 'optionalText trims');
    assert(optionalText(undefined) === '', 'optionalText missing → ""');
  });

  await test('normalizePaymentMethods CSV/array blank → defaults never []', () => {
    assert(
      JSON.stringify(normalizePaymentMethods('Cash,  Check , ,Credit Card')) ===
        JSON.stringify(['Cash', 'Check', 'Credit Card']),
      'CSV trims and drops blanks',
    );
    assert(
      JSON.stringify(normalizePaymentMethods(['  Visa ', '', 'Cash'])) ===
        JSON.stringify(['Visa', 'Cash']),
      'array trims and drops blanks',
    );
    assert(
      JSON.stringify(normalizePaymentMethods('   ')) ===
        JSON.stringify(DEFAULT_PAYMENT_METHODS),
      'whitespace CSV → defaults',
    );
    assert(
      JSON.stringify(normalizePaymentMethods([])) ===
        JSON.stringify(DEFAULT_PAYMENT_METHODS),
      'empty array → defaults',
    );
    assert(
      JSON.stringify(normalizePaymentMethods(null)) ===
        JSON.stringify(DEFAULT_PAYMENT_METHODS),
      'null → defaults',
    );
    assert(normalizePaymentMethods('').length > 0, 'never empty list');
  });

  await test('normalizeHours keeps 3-row {days,time} shape with safe defaults', () => {
    const fromBlank = normalizeHours(undefined);
    assert(fromBlank.length === 3, 'default length 3');
    assert(
      JSON.stringify(fromBlank) === JSON.stringify(DEFAULT_HOURS),
      'missing → DEFAULT_HOURS',
    );
    assert(
      JSON.stringify(normalizeHours([])) === JSON.stringify(DEFAULT_HOURS),
      'empty array → defaults',
    );

    const partial = normalizeHours([
      { days: '  ', time: '9:00 AM - 5:00 PM' },
      '  10:00 AM - 1:00 PM ',
      { days: 'Sunday', time: '  ' },
    ]);
    assert(partial.length === 3, 'partial still length 3');
    assert(partial[0].days === DEFAULT_HOURS[0].days, 'blank days → default days');
    assert(partial[0].time === '9:00 AM - 5:00 PM', 'weekday time kept');
    assert(partial[1].days === DEFAULT_HOURS[1].days, 'string row uses default days');
    assert(partial[1].time === '10:00 AM - 1:00 PM', 'string row trims time');
    assert(partial[2].days === 'Sunday', 'sunday days kept');
    assert(partial[2].time === DEFAULT_HOURS[2].time, 'blank time → default');

    const compact = buildAnswers({
      businessName: 'Hours Co',
      primaryServices: ['Masonry'],
      hoursWeekday: '8-5',
      hoursSaturday: '  ',
      hoursSunday: 'Closed',
    });
    assert(compact.hours.length === 3, 'compact → 3 rows');
    assert(compact.hours[0].time === '8-5', 'compact weekday');
    assert(compact.hours[1].time === DEFAULT_HOURS[1].time, 'blank sat → default');
    assert(compact.hours[2].time === 'Closed', 'compact sunday');
    assert(
      JSON.stringify(compact.paymentMethods) === JSON.stringify(DEFAULT_PAYMENT_METHODS),
      'omitted payments → defaults',
    );
  });

  await test('replaceTargetData writes trust + payment + hours + empty social', () => {
    assert(REPO_ROOT, 'expected local template root');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-trust-'));
    const dataSrc = path.join(REPO_ROOT, 'src', 'data');
    const dataDst = path.join(tmp, 'src', 'data');
    fs.mkdirSync(dataDst, { recursive: true });
    for (const file of [
      'business.json',
      'site.json',
      'services.json',
      'areas.json',
      'navigation.json',
      'landings.json',
      'directories.json',
    ]) {
      fs.copyFileSync(path.join(dataSrc, file), path.join(dataDst, file));
    }

    const original = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'business.json'), 'utf8'),
    );
    const originalDirs = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'directories.json'), 'utf8'),
    );

    const answers = buildAnswers({
      businessName: 'Trust Builders',
      primaryServices: ['Masonry'],
      freeEstimate: 'Free Quote Today',
      yearsExperience: '20+',
      license: 'VA Class A #12345',
      insurance: 'Bonded and insured.',
      foundedYear: '',
      paymentMethods: 'Cash, Zelle',
      hours: [
        { days: 'Monday - Friday', time: '8:00 AM - 4:00 PM' },
        { days: 'Saturday', time: 'Closed' },
        { days: 'Sunday', time: 'Closed' },
      ],
    });
    replaceTargetData(tmp, answers);

    const business = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'business.json'), 'utf8'),
    );
    const site = JSON.parse(fs.readFileSync(path.join(dataDst, 'site.json'), 'utf8'));
    const directories = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'directories.json'), 'utf8'),
    );
    assert(business._instructions, '_instructions preserved');
    assert(
      JSON.stringify(Object.keys(business._instructions)) ===
        JSON.stringify(Object.keys(original._instructions)),
      '_instructions keys stable',
    );
    assert(business.free_estimate === 'Free Quote Today', 'free_estimate written');
    assert(business.years_experience === '20+', 'years_experience written');
    assert(business.license === 'VA Class A #12345', 'license written');
    assert(business.insurance === 'Bonded and insured.', 'insurance written');
    assert(
      Object.prototype.hasOwnProperty.call(business, 'founded_year'),
      'founded_year key must remain',
    );
    assert(business.founded_year === '', 'founded_year skip → ""');
    assert(
      JSON.stringify(business.payment_methods) === JSON.stringify(['Cash', 'Zelle']),
      'payment_methods written',
    );
    assert(Array.isArray(business.hours) && business.hours.length === 3, 'hours length 3');
    assert(business.hours[0].days === 'Monday - Friday', 'hours days shape');
    assert(business.hours[0].time === '8:00 AM - 4:00 PM', 'hours time written');
    assert(business.hours[1].time === 'Closed', 'saturday closed');
    assert(JSON.stringify(business.social) === '{}', 'omitted social → {}');
    assert(site.features.enable_directories === false, 'no dirs → enable false');
    assert(directories.directories.length >= 1, 'directories min(1) when none');
    assert(directories.directories.length === originalDirs.directories.length);
    assert(directories._instructions && directories.variant === originalDirs.variant);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('normalizeSocial/directories + replace populate/none parity', () => {
    // Social blank omission + population (object + compact CSV)
    assert(JSON.stringify(normalizeSocial(undefined)) === '{}', 'missing social → {}');
    assert(
      JSON.stringify(normalizeSocial({ facebook: '  ', instagram: null, x: '' })) === '{}',
      'blank social keys omitted',
    );
    const populated = normalizeSocial({
      facebook: ' https://facebook.com/acme ',
      instagram: '',
      youtube: 'https://youtube.com/@acme',
      unknown: 'https://nope.example',
    });
    assert(
      JSON.stringify(populated) ===
        JSON.stringify({
          facebook: 'https://facebook.com/acme',
          youtube: 'https://youtube.com/@acme',
        }),
    );
    const compact = normalizeSocial(
      'facebook=https://facebook.com/a, google-business=https://g.co/a, ,tiktok=',
    );
    assert(compact.facebook === 'https://facebook.com/a' && compact.google_business === 'https://g.co/a');
    assert(!Object.prototype.hasOwnProperty.call(compact, 'tiktok'));
    assert(SOCIAL_NETWORK_KEYS.includes('linkedin'));

    // Directories provided vs none
    assert(normalizeDirectories(undefined).length === 0);
    assert(normalizeDirectories([]).length === 0);
    const fromCsv = normalizeDirectories(
      'Google Business|https://g.co/acme,  BBB|https://bbb.org/acme ,badrow',
    );
    assert(fromCsv.length === 2 && fromCsv[0].url === 'https://g.co/acme' && fromCsv[0].initials);
    const fromRows = normalizeDirectories([
      { name: 'Angi', url: 'https://angi.com/x', initials: 'A' },
      { name: '  ', url: 'https://skip.example' },
      { name: 'Houzz', url: '  ' },
    ]);
    assert(fromRows.length === 1 && fromRows[0].initials === 'A');

    const none = buildAnswers({ businessName: 'No Social', primaryServices: ['Masonry'] });
    assert(JSON.stringify(none.social) === '{}' && none.directories.length === 0);
    assert(none.enableDirectories === false);
    const withDirs = buildAnswers({
      businessName: 'With Dirs',
      primaryServices: ['Masonry'],
      social: { facebook: 'https://facebook.com/x', instagram: '  ' },
      directories: 'Google|https://g.co/x',
    });
    assert(withDirs.social.facebook === 'https://facebook.com/x');
    assert(!Object.prototype.hasOwnProperty.call(withDirs.social, 'instagram'));
    assert(withDirs.directories.length === 1 && withDirs.enableDirectories === true);

    // directories:[] + enableDirectories:true → feature false
    const forcedEmpty = buildAnswers({
      businessName: 'Forced Empty Dirs',
      primaryServices: ['Masonry'],
      directories: [],
      enableDirectories: true,
    });
    assert(forcedEmpty.directories.length === 0 && forcedEmpty.enableDirectories === false);

    // replace: populated social + directories
    const seeded = seedDataDir('ccs-social-');
    replaceTargetData(
      seeded.tmp,
      buildAnswers({
        businessName: 'Social Co',
        primaryServices: ['Patios'],
        social: {
          facebook: 'https://facebook.com/socialco',
          instagram: '',
          youtube: 'https://youtube.com/@socialco',
        },
        directories: [
          { name: 'Google Business', url: 'https://g.co/socialco', initials: 'G' },
          { name: 'Angi', url: 'https://angi.com/socialco' },
        ],
      }),
    );
    const business = readJson(path.join(seeded.dataDst, 'business.json'));
    const site = readJson(path.join(seeded.dataDst, 'site.json'));
    const directories = readJson(path.join(seeded.dataDst, 'directories.json'));
    assert(
      JSON.stringify(business.social) ===
        JSON.stringify({
          facebook: 'https://facebook.com/socialco',
          youtube: 'https://youtube.com/@socialco',
        }),
    );
    assert(site.features.enable_directories === true);
    assert(directories.directories.length === 2 && directories.directories[0].initials === 'G');
    assert(directories.directories[1].initials && directories._instructions);

    // replace: directories:[] + enable true → flag false + min(1) placeholder rows
    const forced = seedDataDir('ccs-dirs-force-');
    const origLen = readJson(path.join(forced.dataDst, 'directories.json')).directories.length;
    replaceTargetData(
      forced.tmp,
      buildAnswers({
        businessName: 'Force Enable Empty',
        primaryServices: ['Masonry'],
        directories: [],
        enableDirectories: true,
      }),
    );
    const siteForced = readJson(path.join(forced.dataDst, 'site.json'));
    const dirsForced = readJson(path.join(forced.dataDst, 'directories.json'));
    assert(siteForced.features.enable_directories === false, 'empty+force → enable false');
    assert(dirsForced.directories.length >= 1 && dirsForced.directories.length === origLen);
    fs.rmSync(forced.tmp, { recursive: true, force: true });
    fs.rmSync(seeded.tmp, { recursive: true, force: true });
  });

  await test('normalizeSiteType canonical + human-ish aliases; invalid → multipage', () => {
    assert(DEFAULT_SITE_TYPE === 'multipage', 'default site type is multipage');
    assert(JSON.stringify(SITE_TYPES) === JSON.stringify(['one-page', 'multipage', 'seo']));
    assert(normalizeSiteType(undefined) === 'multipage', 'missing → multipage');
    assert(normalizeSiteType('') === 'multipage', 'blank → multipage');
    assert(normalizeSiteType('  ') === 'multipage', 'whitespace → multipage');
    assert(normalizeSiteType('one-page') === 'one-page');
    assert(normalizeSiteType('multipage') === 'multipage');
    assert(normalizeSiteType('seo') === 'seo');
    assert(normalizeSiteType('one page') === 'one-page', 'one page alias');
    assert(normalizeSiteType('onepage') === 'one-page', 'onepage alias');
    assert(normalizeSiteType('multi page') === 'multipage', 'multi page alias');
    assert(normalizeSiteType('multi-page') === 'multipage', 'multi-page alias');
    assert(normalizeSiteType('SEO') === 'seo', 'case fold');
    assert(normalizeSiteType('not-a-type') === 'multipage', 'invalid → multipage');
    assert(normalizeSiteType('blog') === 'multipage', 'unknown → multipage');

    const omitted = buildAnswers({ businessName: 'Type Co', primaryServices: ['Masonry'] });
    assert(omitted.siteType === 'multipage', 'buildAnswers omits → multipage');
    assert(buildAnswers({
      businessName: 'One Page Co',
      primaryServices: ['Masonry'],
      siteType: 'one page',
    }).siteType === 'one-page');
    assert(buildAnswers({
      businessName: 'SEO Co',
      primaryServices: ['Masonry'],
      siteType: 'seo',
    }).siteType === 'seo');
  });

  await test('replaceTargetData writes site_type from answers (default multipage)', () => {
    assert(REPO_ROOT, 'expected local template root');
    const seeded = seedDataDir('ccs-sitetype-');
    try {
      const originalSite = readJson(path.join(seeded.dataDst, 'site.json'));
      replaceTargetData(
        seeded.tmp,
        buildAnswers({ businessName: 'Type Default Co', primaryServices: ['Masonry'] }),
      );
      const siteDefault = readJson(path.join(seeded.dataDst, 'site.json'));
      assert(siteDefault.site_type === 'multipage', `default write multipage, got ${siteDefault.site_type}`);
      assert(siteDefault._instructions, '_instructions preserved');
      assert(
        JSON.stringify(Object.keys(siteDefault._instructions)) ===
          JSON.stringify(Object.keys(originalSite._instructions)),
        '_instructions keys stable',
      );

      // one-page
      const one = seedDataDir('ccs-sitetype-one-');
      replaceTargetData(
        one.tmp,
        buildAnswers({
          businessName: 'One Page Site',
          primaryServices: ['Patios'],
          siteType: 'one-page',
        }),
      );
      assert(readJson(path.join(one.dataDst, 'site.json')).site_type === 'one-page');
      fs.rmSync(one.tmp, { recursive: true, force: true });

      // seo
      const seo = seedDataDir('ccs-sitetype-seo-');
      replaceTargetData(
        seo.tmp,
        buildAnswers({
          businessName: 'SEO Site',
          primaryServices: ['Patios'],
          siteType: 'seo',
        }),
      );
      assert(readJson(path.join(seo.dataDst, 'site.json')).site_type === 'seo');
      fs.rmSync(seo.tmp, { recursive: true, force: true });
    } finally {
      fs.rmSync(seeded.tmp, { recursive: true, force: true });
    }
  });

  await test('--help documents trust/payment/hours/social/directories/siteType defaults', () => {
    const help = runCli(['--help']);
    assert(help.status === 0, `help exit 0, got ${help.status}`);
    const helpOut = `${help.stdout}\n${help.stderr}`;
    assert(/freeEstimate/i.test(helpOut), 'help lists freeEstimate');
    assert(/foundedYear/i.test(helpOut), 'help lists foundedYear');
    assert(/empty string/i.test(helpOut), 'help documents foundedYear empty string');
    assert(/paymentMethods/i.test(helpOut), 'help lists paymentMethods');
    assert(/hoursWeekday/i.test(helpOut), 'help lists compact hours keys');
    assert(/social/i.test(helpOut), 'help lists social');
    assert(/directories/i.test(helpOut), 'help lists directories');
    assert(/enable_directories/i.test(helpOut), 'help mentions enable_directories');
    assert(/siteType/i.test(helpOut), 'help lists siteType');
    assert(/multipage/i.test(helpOut), 'help documents multipage default');
    assert(/one-page/i.test(helpOut), 'help lists one-page');
    assert(/CREATE_CONTRACTOR_SITE_ANSWERS_JSON/i.test(helpOut), 'help lists JSON env');
  });

  await test('CREATE_CONTRACTOR_SITE_ANSWERS_JSON CLI path defaults intake and siteType', () => {
    assert(REPO_ROOT, 'expected local template root');
    // Fresh non-existent target (CLI rejects existing dirs that are non-empty).
    const targetDir = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-jsonenv-parent-')),
      'site',
    );

    const payload = {
      businessName: 'JSON Env Masonry',
      primaryServices: ['Patios'],
      // Blank/whitespace trust fields → buildAnswers defaults; foundedYear → ""
      freeEstimate: '   ',
      yearsExperience: '\t',
      license: '',
      insurance: null,
      foundedYear: '   ',
      // Blank payments + empty hours → defaults (never [])
      paymentMethods: '  ,  ',
      hours: [],
      social: { facebook: '  ', instagram: '' }, // blank → {}
      directories: [], // none → enable false + min(1)
    };

    const result = runCli([targetDir], {
      env: {
        CREATE_CONTRACTOR_TEMPLATE_ROOT: REPO_ROOT,
        CREATE_CONTRACTOR_SITE_ANSWERS_JSON: JSON.stringify(payload),
        NODE_ENV: 'test',
        CREATE_CONTRACTOR_SITE_SKIP_SETUP: '1',
      },
    });

    const out = `${result.stdout}\n${result.stderr}`;
    try {
      assert(result.status === 0, `CLI exit 0, got ${result.status}:\n${out.slice(-2000)}`);
      assert(/Data replace complete/i.test(out), 'expected skip-setup success banner');

      const businessPath = path.join(targetDir, 'src/data/business.json');
      assert(fs.existsSync(businessPath), 'expected generated business.json');
      const business = JSON.parse(fs.readFileSync(businessPath, 'utf8'));
      const site = readJson(path.join(targetDir, 'src/data/site.json'));
      const directories = readJson(path.join(targetDir, 'src/data/directories.json'));

      assert(business.name === 'JSON Env Masonry', 'env business name via CLI');
      assert(
        business.free_estimate === DEFAULT_FREE_ESTIMATE,
        `free_estimate default via CLI, got ${business.free_estimate}`,
      );
      assert(
        business.years_experience === DEFAULT_YEARS_EXPERIENCE,
        `years_experience default via CLI, got ${business.years_experience}`,
      );
      assert(
        business.license === DEFAULT_LICENSE,
        `license default via CLI, got ${business.license}`,
      );
      assert(
        business.insurance === DEFAULT_INSURANCE,
        `insurance default via CLI, got ${business.insurance}`,
      );
      assert(
        Object.prototype.hasOwnProperty.call(business, 'founded_year'),
        'founded_year key must remain',
      );
      assert(business.founded_year === '', 'CLI founded_year blank → ""');
      assert(
        JSON.stringify(business.payment_methods) === JSON.stringify(DEFAULT_PAYMENT_METHODS),
        'CLI blank payments → defaults',
      );
      assert(business.payment_methods.length > 0, 'payment_methods never []');
      assert(
        JSON.stringify(business.hours) === JSON.stringify(DEFAULT_HOURS),
        'CLI empty hours → DEFAULT_HOURS',
      );
      assert(business.hours.every((h) => h.days && h.time), 'hours rows shaped');
      assert(JSON.stringify(business.social) === '{}', 'CLI blank social → {}');
      assert(site.features.enable_directories === false, 'CLI no dirs → enable false');
      assert(directories.directories.length >= 1, 'CLI directories min(1)');
      assert(site.site_type === 'multipage', `CLI omitted siteType → multipage, got ${site.site_type}`);
    } finally {
      const parent = path.dirname(targetDir);
      try {
        fs.rmSync(parent, { recursive: true, force: true });
      } catch {
        console.warn(`    (could not fully remove ${parent})`);
      }
    }
  });

  await test('CREATE_CONTRACTOR_SITE_ANSWERS_JSON can set siteType one-page and seo', () => {
    assert(REPO_ROOT, 'expected local template root');

    for (const { label, siteType, expected } of [
      { label: 'one-page', siteType: 'one page', expected: 'one-page' },
      { label: 'seo', siteType: 'seo', expected: 'seo' },
    ]) {
      const targetDir = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), `ccs-sitetype-${label}-`)),
        'site',
      );
      const result = runCli([targetDir], {
        env: {
          CREATE_CONTRACTOR_TEMPLATE_ROOT: REPO_ROOT,
          CREATE_CONTRACTOR_SITE_ANSWERS_JSON: JSON.stringify({
            businessName: `JSON ${label}`,
            primaryServices: ['Patios'],
            siteType,
          }),
          NODE_ENV: 'test',
          CREATE_CONTRACTOR_SITE_SKIP_SETUP: '1',
        },
      });
      const out = `${result.stdout}\n${result.stderr}`;
      try {
        assert(result.status === 0, `CLI ${label} exit 0, got ${result.status}:\n${out.slice(-1500)}`);
        const site = readJson(path.join(targetDir, 'src/data/site.json'));
        assert(site.site_type === expected, `CLI ${label} site_type, got ${site.site_type}`);
      } finally {
        try {
          fs.rmSync(path.dirname(targetDir), { recursive: true, force: true });
        } catch {
          console.warn(`    (could not fully remove ${path.dirname(targetDir)})`);
        }
      }
    }
  });

  await test('CREATE_CONTRACTOR_SITE_ANSWERS_JSON compact payment/hours/social/dirs path', () => {
    assert(REPO_ROOT, 'expected local template root');
    const targetDir = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-jsoncompact-parent-')),
      'site',
    );

    const payload = {
      businessName: 'Compact Hours Co',
      primaryServices: ['Patios'],
      paymentMethods: ['Cash', '  ', 'ACH'],
      hoursWeekday: '9:00 AM - 5:00 PM',
      hoursSaturday: 'Closed',
      hoursSunday: 'Closed',
      social: 'facebook=https://facebook.com/compact,instagram=https://instagram.com/compact',
      directories: 'Google Business|https://g.co/compact,BBB|https://bbb.org/compact',
    };

    const result = runCli([targetDir], {
      env: {
        CREATE_CONTRACTOR_TEMPLATE_ROOT: REPO_ROOT,
        CREATE_CONTRACTOR_SITE_ANSWERS_JSON: JSON.stringify(payload),
        NODE_ENV: 'test',
        CREATE_CONTRACTOR_SITE_SKIP_SETUP: '1',
      },
    });

    const out = `${result.stdout}\n${result.stderr}`;
    try {
      assert(result.status === 0, `CLI exit 0, got ${result.status}:\n${out.slice(-2000)}`);
      const business = JSON.parse(
        fs.readFileSync(path.join(targetDir, 'src/data/business.json'), 'utf8'),
      );
      const site = readJson(path.join(targetDir, 'src/data/site.json'));
      const directories = readJson(path.join(targetDir, 'src/data/directories.json'));
      assert(
        JSON.stringify(business.payment_methods) === JSON.stringify(['Cash', 'ACH']),
        `compact payments, got ${JSON.stringify(business.payment_methods)}`,
      );
      assert(business.hours.length === 3, 'compact hours length');
      assert(business.hours[0].days === 'Monday - Friday', 'weekday days label');
      assert(business.hours[0].time === '9:00 AM - 5:00 PM', 'compact weekday time');
      assert(business.hours[1].time === 'Closed', 'compact saturday');
      assert(business.hours[2].time === 'Closed', 'compact sunday');
      // Trust defaults still apply when omitted
      assert(business.free_estimate === DEFAULT_FREE_ESTIMATE, 'trust default still works');
      assert(business.founded_year === '', 'founded_year still ""');
      assert(business.social.facebook === 'https://facebook.com/compact');
      assert(business.social.instagram === 'https://instagram.com/compact');
      assert(site.features.enable_directories === true, 'compact dirs → enable true');
      assert(directories.directories.length === 2);
      assert(directories.directories[0].url === 'https://g.co/compact');
    } finally {
      const parent = path.dirname(targetDir);
      try {
        fs.rmSync(parent, { recursive: true, force: true });
      } catch {
        console.warn(`    (could not fully remove ${parent})`);
      }
    }
  });

  await test('skip setup guard requires NODE_ENV test', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-skip-guard-'));
    const targetDir = path.join(parent, 'site');
    try {
      const result = runCli(['--yes', targetDir], {
        env: { CREATE_CONTRACTOR_TEMPLATE_ROOT: REPO_ROOT || '', CREATE_CONTRACTOR_SITE_SKIP_SETUP: '1', NODE_ENV: '' },
      });
      const out = `${result.stdout}\n${result.stderr}`;
      assert(result.status === 1, `expected guard failure, got ${result.status}`);
      assert(/requires NODE_ENV=test/i.test(out), `expected guard message:\n${out}`);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  await test('replaceTargetData Chesapeake case keeps unique area slugs', () => {
    assert(REPO_ROOT, 'expected local template root');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-areas-'));
    const dataSrc = path.join(REPO_ROOT, 'src', 'data');
    const dataDst = path.join(tmp, 'src', 'data');
    fs.mkdirSync(dataDst, { recursive: true });
    for (const file of [
      'business.json',
      'site.json',
      'services.json',
      'areas.json',
      'navigation.json',
      'landings.json',
      'directories.json',
    ]) {
      fs.copyFileSync(path.join(dataSrc, file), path.join(dataDst, file));
    }

    const originalAreas = JSON.parse(
      fs.readFileSync(path.join(dataDst, 'areas.json'), 'utf8'),
    );

    const answers = buildAnswers({
      businessName: 'Chesapeake Stoneworks',
      city: 'Chesapeake',
      state: 'VA',
      zip: '23320',
      serviceArea:
        'Chesapeake, Virginia Beach, Norfolk, Newport News, Hampton, Portsmouth, Suffolk, Williamsburg and Poquoson',
      primaryServices: ['Masonry', 'Patios'],
    });

    replaceTargetData(tmp, answers);

    const areas = JSON.parse(fs.readFileSync(path.join(dataDst, 'areas.json'), 'utf8'));
    assert(areas.primary_city === 'Chesapeake', 'primary_city must be Chesapeake');
    assert(areas.variant === originalAreas.variant, 'variant preserved');
    assert(areas.section_title === originalAreas.section_title, 'section_title preserved');
    assert(areas._instructions, '_instructions preserved');

    assert(Array.isArray(areas.areas) && areas.areas.length > 0, 'areas array required');
    assert(areas.areas[0].name === 'Chesapeake', `first area name: ${areas.areas[0].name}`);
    assert(areas.areas[0].slug === 'chesapeake', `first area slug: ${areas.areas[0].slug}`);

    const slugs = areas.areas.map((a) => a.slug);
    assert(new Set(slugs).size === slugs.length, `duplicate area slugs after replace: ${slugs}`);
    assert(
      slugs.filter((s) => s === 'chesapeake').length === 1,
      'chesapeake slug must appear exactly once',
    );

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const skipE2E = process.env.SKIP_CLI_E2E === '1';
  if (skipE2E) {
    console.log('\n  ↷ SKIP_CLI_E2E=1 — skipping temp-target full scaffold');
  } else {
    await test('temp-target --yes scaffold install/validate/build/git', () => {
      assert(REPO_ROOT, 'expected local template root for E2E');
      const target = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-e2e-'));
      // mkdtemp creates the dir; CLI rejects non-empty — use a child path that does not exist.
      fs.rmSync(target, { recursive: true, force: true });
      const targetDir = target;

      const result = runCli(['--yes', targetDir], {
        env: {
          CREATE_CONTRACTOR_TEMPLATE_ROOT: REPO_ROOT,
        },
      });

      const out = `${result.stdout}\n${result.stderr}`;
      if (result.status !== 0) {
        throw new Error(`scaffold failed (exit ${result.status}):\n${out.slice(-4000)}`);
      }

      assert(/Scaffold complete/i.test(out), 'expected success banner');
      assert(fs.existsSync(path.join(targetDir, 'dist')), 'expected dist/ after build');
      assert(fs.existsSync(path.join(targetDir, 'AGENTS.md')), 'expected AGENTS.md guard');
      assert(
        !fs.existsSync(path.join(targetDir, 'openspec')),
        'openspec must not be copied',
      );
      assert(
        !fs.existsSync(path.join(targetDir, 'packages')),
        'packages/ must not be copied',
      );

      const business = JSON.parse(
        fs.readFileSync(path.join(targetDir, 'src/data/business.json'), 'utf8'),
      );
      assert(business.name === 'Acme Masonry', 'expected replaced business name');
      // --yes omits trust/payment/hours → buildAnswers defaults (not sample-specific facts)
      assert(business.free_estimate === DEFAULT_FREE_ESTIMATE, 'E2E free_estimate default');
      assert(
        business.years_experience === DEFAULT_YEARS_EXPERIENCE,
        'E2E years_experience default',
      );
      assert(business.license === DEFAULT_LICENSE, 'E2E license default');
      assert(business.insurance === DEFAULT_INSURANCE, 'E2E insurance default');
      assert(business.founded_year === '', 'E2E founded_year omitted → ""');
      assert(
        JSON.stringify(business.payment_methods) === JSON.stringify(DEFAULT_PAYMENT_METHODS),
        'E2E payment_methods defaults',
      );
      assert(business.payment_methods.length > 0, 'E2E payment_methods never []');
      assert(
        JSON.stringify(business.hours) === JSON.stringify(DEFAULT_HOURS),
        'E2E hours defaults',
      );
      assert(
        business.hours.every((h) => typeof h.days === 'string' && typeof h.time === 'string'),
        'E2E hours shape',
      );
      assert(JSON.stringify(business.social) === '{}', 'E2E omitted social → {}');
      const siteE2E = readJson(path.join(targetDir, 'src/data/site.json'));
      const dirsE2E = readJson(path.join(targetDir, 'src/data/directories.json'));
      assert(siteE2E.features.enable_directories === false, 'E2E no dirs → enable false');
      assert(dirsE2E.directories.length >= 1, 'E2E directories min(1)');
      assert(
        siteE2E.site_type === 'multipage',
        `E2E --yes site_type multipage, got ${siteE2E.site_type}`,
      );
      // Full scaffold already ran validate:data + build (includes route gate) successfully.

      const services = JSON.parse(
        fs.readFileSync(path.join(targetDir, 'src/data/services.json'), 'utf8'),
      );
      const names = services.services.map((s) => s.name);
      assert(
        new Set(names.map((n) => n.toLowerCase())).size === names.length,
        `duplicate service names in E2E: ${names}`,
      );

      const offeredNames = business.services_offered.map((s) => s.name);
      assert(
        JSON.stringify(offeredNames) === JSON.stringify(names),
        'business.services_offered names must match services.json',
      );

      // Best-effort cleanup of large scaffold output.
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch {
        console.warn(`    (could not fully remove ${targetDir})`);
      }
    });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
