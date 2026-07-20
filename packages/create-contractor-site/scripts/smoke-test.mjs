#!/usr/bin/env node
/**
 * Committed CLI smoke tests — Node built-ins only (no test framework).
 *
 * Covers:
 * 1. Missing target argument
 * 2. Existing non-empty target
 * 3. Target equal to / inside template root
 * 4. Duplicate service input normalization + slug uniqueness + business/services alignment
 * 5. Service-area name parse/dedupe (Chesapeake duplicate-slug case) + areas rebuild
 *    without leaking stale template county/ZIP metadata into new areas
 * 6. Temp-target --yes scaffold (install/validate/build) unless SKIP_CLI_E2E=1
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
import { buildAnswers } from '../src/prompts.mjs';
import { isSameOrInside, validateTarget, TargetValidationError } from '../src/validate-target.mjs';
import { findLocalTemplateRoot } from '../src/copy-template.mjs';
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
