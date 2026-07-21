#!/usr/bin/env node
/**
 * create-contractor-site — scaffold a client contractor site from the template.
 * Uses pnpm only for install/validate/build. Never invokes npm or npx.
 */

import path from 'node:path';
import {
  assertRequiredCopied,
  copyTemplate,
  resolveTemplateRoot,
} from '../src/copy-template.mjs';
import { collectClientAnswers, buildAnswers } from '../src/prompts.mjs';
import { replaceTargetData } from '../src/replace-data.mjs';
import {
  assertGitAvailable,
  assertPnpmAvailable,
  runGitInit,
  runPnpmSetup,
} from '../src/run-command.mjs';
import {
  TargetValidationError,
  validateTarget,
} from '../src/validate-target.mjs';

const USAGE = `Usage: create-contractor-site [options] <target-dir>

Scaffold a client contractor website from the placeholder multipage template.

Options:
  -y, --yes     Non-interactive mode using built-in sample answers
  -h, --help    Show this help

Environment:
  CREATE_CONTRACTOR_SITE_ANSWERS_JSON
      JSON object with at least businessName and primaryServices[].
      When set, skips prompts (and overrides --yes sample answers).
      All paths funnel through buildAnswers (trim + blank defaults).

  CREATE_CONTRACTOR_TEMPLATE_ROOT
      Absolute/relative path to a local template checkout (preferred for
      local/dev and monorepo use).

  CREATE_CONTRACTOR_TEMPLATE_REPO
      Git URL used when the CLI is published and no local template is found.
      Default: https://github.com/glacayo/website-multipages.git

  CREATE_CONTRACTOR_TEMPLATE_REF
      Git branch/tag/ref to clone for the published fallback. Default: v2.1.2

  Answer defaults (buildAnswers — blank/whitespace uses these; --yes omits trust/payment/hours):
  freeEstimate      Free On-Site Estimate
  yearsExperience   10+
  license           Licensed & Insured
  insurance         Fully insured with general liability and workers' compensation.
  foundedYear       "" (optional; key always written; skip/blank → empty string)
  paymentMethods    Cash, Check, Credit Card, Financing Available (CSV or string[]; blank/[] → defaults, never [])
  hours             3-row [{days,time}] Mon–Fri / Sat / Sun (or compact hoursWeekday/hoursSaturday/hoursSunday)

Answer precedence (highest first):
  1. CREATE_CONTRACTOR_SITE_ANSWERS_JSON
  2. --yes / -y sample answers
  3. Interactive prompts (default)

Template source precedence (highest first):
  1. CREATE_CONTRACTOR_TEMPLATE_ROOT
  2. Local monorepo root discovered from this package
  3. Temporary git clone of CREATE_CONTRACTOR_TEMPLATE_REPO @ REF

Requirements:
  - Node.js 22+
  - pnpm >= 11.1.2
  - git

The CLI copies the template (denylist excludes node_modules, dist, .git, openspec,
packages/, etc.), applies client values only in src/data/*.json, then runs:
  pnpm install
  pnpm run validate:data
  pnpm run build
  git init && git add -A && git commit   (only after validate + build succeed)

If install, validate:data, or build fails, git init/add/commit are intentionally
skipped so a broken scaffold is never committed.

Package-runner note: you may invoke this binary via pnpm create / compatible runners,
but the CLI itself always uses pnpm internally — never npm install or npx for project setup.
`;

/**
 * Parse CLI args. Supports:
 *   create-contractor-site <target-dir>
 *   create-contractor-site --yes <target-dir>   (non-interactive defaults; testing)
 *   CREATE_CONTRACTOR_SITE_ANSWERS_JSON env for scripted answers
 */
function parseArgs(argv) {
  /** @type {string[]} */
  const positionals = [];
  let nonInteractive = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      return { help: true, positionals, nonInteractive };
    }
    if (arg === '--yes' || arg === '-y') {
      nonInteractive = true;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n\n${USAGE}`);
    }
    positionals.push(arg);
  }

  return { help: false, positionals, nonInteractive };
}

/**
 * @returns {Promise<import('../src/prompts.mjs').ScaffoldAnswers>}
 */
async function resolveAnswers(nonInteractive) {
  const fromEnv = process.env.CREATE_CONTRACTOR_SITE_ANSWERS_JSON;
  if (fromEnv) {
    const parsed = JSON.parse(fromEnv);
    if (!parsed.businessName || !Array.isArray(parsed.primaryServices)) {
      throw new Error(
        'CREATE_CONTRACTOR_SITE_ANSWERS_JSON must include businessName and primaryServices[]',
      );
    }
    return buildAnswers(parsed);
  }

  if (nonInteractive) {
    // Trust/payment/hours omitted on purpose — buildAnswers supplies defaults
    // (text trust + foundedYear "" + paymentMethods + 3-row hours).
    return buildAnswers({
      businessName: 'Acme Masonry',
      legalName: 'Acme Masonry LLC',
      tagline: 'Stonework that lasts.',
      phone: '(757) 555-0199',
      email: 'hello@acmemasonry.example',
      street: '100 Scaffold Ave',
      city: 'Virginia Beach',
      state: 'VA',
      zip: '23451',
      serviceArea: 'Virginia Beach and Hampton Roads',
      primaryServices: ['Masonry', 'Patios', 'Retaining Walls'],
      siteUrl: 'https://acmemasonry.example',
    });
  }

  return collectClientAnswers();
}

/**
 * @param {string} stage
 * @param {string} targetDir
 * @param {unknown} err
 */
function printRecoveryGuidance(stage, targetDir, err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nScaffold failed during: ${stage}`);
  console.error(message);
  console.error(`
Recovery guidance:
  Target path: ${targetDir || '(not created yet)'}

  1. Inspect the target directory. Partial files may remain after a failed
     copy, JSON replace, install, build, or git step.
  2. Fix the underlying issue (pnpm/git install, network, disk space, data).
  3. Remove the incomplete target directory if you want a clean retry:
       rm -rf "${targetDir || '<target-dir>'}"   # or Delete on Windows
  4. Re-run create-contractor-site with the same arguments.

  Notes:
  - The source template is never modified (writes are target-only).
  - Install/build always use pnpm — never npm install / npx.
  - git init / git add / git commit run ONLY after validate:data and build succeed.
    If this failure was during install, validate:data, or build, those git steps
    were intentionally skipped (a broken scaffold is never committed).
  - If a temp template clone was used, it is cleaned up automatically when possible.
`);
}

async function main() {
  const { help, positionals, nonInteractive } = parseArgs(
    process.argv.slice(2),
  );

  if (help) {
    console.log(USAGE);
    process.exit(0);
  }

  const targetArg = positionals[0];
  if (!targetArg) {
    console.error('Missing target directory.\n');
    console.error(USAGE);
    process.exit(1);
  }

  console.log('create-contractor-site — Contractor multipage template scaffold');
  console.log('pnpm-only installs. Placeholder template → client project.\n');

  // Preconditions before any filesystem writes.
  try {
    assertPnpmAvailable();
    assertGitAvailable();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  /** @type {(() => void) | null} */
  let cleanupTemplate = null;
  /** @type {string} */
  let targetDir = '';
  /** @type {string} */
  let stage = 'init';

  try {
    stage = 'resolve-template';
    const template = resolveTemplateRoot();
    cleanupTemplate = template.cleanup;
    const templateRoot = template.root;

    stage = 'validate-target';
    try {
      targetDir = validateTarget(targetArg, { templateRoot });
    } catch (err) {
      if (err instanceof TargetValidationError) {
        console.error(err.message);
        process.exitCode = 1;
        return;
      }
      throw err;
    }

    console.log(
      `Template root: ${templateRoot} (${template.source}${template.source === 'clone' ? ', temp' : ''})`,
    );
    console.log(`Target:        ${targetDir}`);

    stage = 'collect-answers';
    const answers = await resolveAnswers(nonInteractive);

    stage = 'copy-template';
    console.log('\n→ Copying template files…');
    const { copiedFiles, skipped } = copyTemplate(templateRoot, targetDir);
    console.log(
      `  Copied ${copiedFiles} files (skipped ${skipped.length} denied paths).`,
    );

    stage = 'assert-copy';
    const missing = assertRequiredCopied(targetDir);
    if (missing.length > 0) {
      throw new Error(
        `Copy incomplete. Missing required paths:\n${missing.map((m) => `  - ${m}`).join('\n')}`,
      );
    }

    stage = 'replace-data';
    console.log('→ Replacing JSON values in src/data (shape preserved)…');
    replaceTargetData(targetDir, answers);

    const skipSetupForTests = process.env.CREATE_CONTRACTOR_SITE_SKIP_SETUP === '1';
    if (skipSetupForTests && process.env.NODE_ENV !== 'test') {
      throw new Error('CREATE_CONTRACTOR_SITE_SKIP_SETUP is test-only and requires NODE_ENV=test.');
    }

    if (skipSetupForTests) {
      console.log(`
✓ Data replace complete (setup skipped)

  Path: ${targetDir}
  CREATE_CONTRACTOR_SITE_SKIP_SETUP=1 — pnpm install/validate/build and git init were skipped.
`);
      return;
    }

    stage = 'pnpm-setup';
    runPnpmSetup(targetDir);

    stage = 'git-init';
    runGitInit(targetDir);

    console.log(`
✓ Scaffold complete

  Path: ${targetDir}

Next steps:
  cd ${path.relative(process.cwd(), targetDir) || '.'}
  pnpm run dev

Remember:
  - Customize remaining copy in src/data/*.json
  - Keep pnpm only (never npm install / npx for this project)
  - Run pnpm run validate:data and pnpm run build before deploy
`);
  } catch (err) {
    printRecoveryGuidance(stage, targetDir, err);
    process.exitCode = 1;
  } finally {
    if (cleanupTemplate) {
      try {
        cleanupTemplate();
      } catch {
        console.error(
          'Warning: could not remove temporary template clone. You may delete it manually from your system temp directory.',
        );
      }
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
