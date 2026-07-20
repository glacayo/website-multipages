import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from './run-command.mjs';

/** Directory / file basenames that must never be copied into a client scaffold. */
const DENY_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.astro',
  '.git',
  '.codegraph',
  'docs_trash',
  'openspec',
  'logs',
  // CLI package + internal agent tooling — not part of a client site
  'packages',
  '.atl',
]);

const DENY_FILE_NAMES = new Set(['package-lock.json']);

/** Default remote template when the CLI is published outside the monorepo. */
export const DEFAULT_TEMPLATE_REPO =
  process.env.CREATE_CONTRACTOR_TEMPLATE_REPO ||
  'https://github.com/glacayo/website-multipages.git';

export const DEFAULT_TEMPLATE_REF =
  process.env.CREATE_CONTRACTOR_TEMPLATE_REF || 'v2.1.2';

/**
 * @param {string} name basename
 * @returns {boolean}
 */
export function isDeniedName(name) {
  if (DENY_DIR_NAMES.has(name)) return true;
  if (DENY_FILE_NAMES.has(name)) return true;
  if (name.endsWith('.log')) return true;
  if (name.startsWith('.env')) return true;
  return false;
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
export function looksLikeTemplateRoot(dir) {
  return (
    fs.existsSync(path.join(dir, 'AGENTS.md')) &&
    fs.existsSync(path.join(dir, 'package.json')) &&
    fs.existsSync(path.join(dir, 'src', 'data', 'business.json')) &&
    fs.existsSync(path.join(dir, 'scripts', 'enforce-package-manager.cjs'))
  );
}

/**
 * @param {string} dir
 */
function assertTemplateRoot(dir) {
  if (!looksLikeTemplateRoot(dir)) {
    throw new Error(
      `Template path does not look like the contractor template: ${dir}\n` +
        'Expected AGENTS.md, package.json, src/data/business.json, and scripts/enforce-package-manager.cjs.',
    );
  }
}

/**
 * Walk parents looking for the monorepo template root.
 *
 * @param {string} [startDir]
 * @returns {string | null}
 */
export function findLocalTemplateRoot(
  startDir = path.dirname(fileURLToPath(import.meta.url)),
) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i += 1) {
    if (looksLikeTemplateRoot(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Clone the template repository into a temp directory (argv-based git only).
 *
 * @param {{ repo?: string, ref?: string }} [opts]
 * @returns {{ root: string, cleanup: () => void }}
 */
export function cloneTemplateToTemp(opts = {}) {
  const repo = opts.repo || DEFAULT_TEMPLATE_REPO;
  const ref = opts.ref || DEFAULT_TEMPLATE_REF;
  const tempBase = fs.mkdtempSync(
    path.join(os.tmpdir(), 'create-contractor-site-'),
  );
  const root = path.join(tempBase, 'template');

  try {
    console.log(`→ Cloning template ${repo} @ ${ref} …`);
    runCommand(
      'git',
      [
        'clone',
        '--depth',
        '1',
        '--branch',
        ref,
        '--single-branch',
        repo,
        root,
      ],
      { stdio: 'pipe' },
    );
    assertTemplateRoot(root);
  } catch (err) {
    // Retry without --branch if the ref is a commit or default branch differs.
    try {
      if (fs.existsSync(root)) {
        fs.rmSync(root, { recursive: true, force: true });
      }
      runCommand('git', ['clone', '--depth', '1', repo, root], {
        stdio: 'pipe',
      });
      if (ref && ref !== 'HEAD') {
        runCommand('git', ['checkout', ref], { cwd: root, stdio: 'pipe' });
      }
      assertTemplateRoot(root);
    } catch (inner) {
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
      throw new Error(
        `Failed to clone template repository.\n` +
          `  Repo: ${repo}\n` +
          `  Ref:  ${ref}\n` +
          `${inner instanceof Error ? inner.message : String(inner)}\n\n` +
          `Recovery:\n` +
          `  - Set CREATE_CONTRACTOR_TEMPLATE_ROOT to a local checkout of the template, or\n` +
          `  - Set CREATE_CONTRACTOR_TEMPLATE_REPO / CREATE_CONTRACTOR_TEMPLATE_REF, or\n` +
          `  - Run the CLI from inside the monorepo workspace.`,
      );
    }
  }

  return {
    root,
    cleanup: () => {
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; leave a note if it fails later in the CLI.
      }
    },
  };
}

/**
 * Resolve the contractor template root for copy.
 *
 * Priority:
 * 1. CREATE_CONTRACTOR_TEMPLATE_ROOT (local/dev override)
 * 2. Walk parents from this package (monorepo / linked workspace)
 * 3. Clone DEFAULT_TEMPLATE_REPO @ DEFAULT_TEMPLATE_REF into a temp dir
 *
 * @param {string} [startDir]
 * @returns {{ root: string, cleanup: (() => void) | null, source: 'env' | 'local' | 'clone' }}
 */
export function resolveTemplateRoot(
  startDir = path.dirname(fileURLToPath(import.meta.url)),
) {
  if (process.env.CREATE_CONTRACTOR_TEMPLATE_ROOT) {
    const fromEnv = path.resolve(process.env.CREATE_CONTRACTOR_TEMPLATE_ROOT);
    assertTemplateRoot(fromEnv);
    return { root: fromEnv, cleanup: null, source: 'env' };
  }

  const local = findLocalTemplateRoot(startDir);
  if (local) {
    return { root: local, cleanup: null, source: 'local' };
  }

  const cloned = cloneTemplateToTemp();
  return { root: cloned.root, cleanup: cloned.cleanup, source: 'clone' };
}

/**
 * Recursively copy template files into target using the denylist.
 *
 * @param {string} templateRoot
 * @param {string} targetDir
 * @returns {{ copiedFiles: number, skipped: string[] }}
 */
export function copyTemplate(templateRoot, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  /** @type {string[]} */
  const skipped = [];
  let copiedFiles = 0;

  /**
   * @param {string} srcDir
   * @param {string} destDir
   * @param {string} relBase
   */
  function walk(srcDir, destDir, relBase) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const name = entry.name;
      const relPath = relBase ? path.join(relBase, name) : name;

      if (isDeniedName(name)) {
        skipped.push(relPath.replaceAll('\\', '/'));
        continue;
      }

      const srcPath = path.join(srcDir, name);
      const destPath = path.join(destDir, name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        walk(srcPath, destPath, relPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        skipped.push(relPath.replaceAll('\\', '/'));
        continue;
      }

      if (entry.isFile()) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        copiedFiles += 1;
      }
    }
  }

  walk(templateRoot, targetDir, '');

  return { copiedFiles, skipped };
}

/** Required paths that must exist after copy (relative, posix-style). */
export const REQUIRED_AFTER_COPY = [
  'src',
  'public',
  'scripts',
  'package.json',
  'pnpm-lock.yaml',
  '.npmrc',
  'pnpm-workspace.yaml',
  'astro.config.mjs',
  'tsconfig.json',
  'netlify.toml',
  'README.md',
  'AGENTS.md',
  'SKILL.md',
  'scripts/enforce-package-manager.cjs',
  'src/assets/images',
  'src/data/business.json',
];

/**
 * @param {string} targetDir
 * @returns {string[]} missing relative paths
 */
export function assertRequiredCopied(targetDir) {
  /** @type {string[]} */
  const missing = [];
  for (const rel of REQUIRED_AFTER_COPY) {
    const full = path.join(targetDir, ...rel.split('/'));
    if (!fs.existsSync(full)) {
      missing.push(rel);
    }
  }
  return missing;
}
