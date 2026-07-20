import fs from 'node:fs';
import path from 'node:path';

/**
 * Normalize a path for stable prefix comparisons on Windows and POSIX.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizePathForCompare(value) {
  const resolved = path.resolve(value);
  // path.resolve already drops trailing separators except root; lower-case on win32.
  const normalized =
    process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  // Ensure directory prefix checks use a trailing separator boundary.
  return normalized;
}

/**
 * True when `candidate` is the same path as `root` or a path inside `root`.
 *
 * @param {string} candidate
 * @param {string} root
 * @returns {boolean}
 */
export function isSameOrInside(candidate, root) {
  const child = normalizePathForCompare(candidate);
  const parent = normalizePathForCompare(root);

  if (child === parent) return true;

  const prefix = parent.endsWith(path.sep) ? parent : parent + path.sep;
  return child.startsWith(prefix);
}

/**
 * Resolve and validate the scaffold target directory.
 * Refuses existing non-empty directories.
 * When `templateRoot` is provided, refuses targets equal to or inside the template.
 *
 * @param {string} rawTarget
 * @param {{ templateRoot?: string }} [opts]
 * @returns {string} absolute target path
 */
export function validateTarget(rawTarget, opts = {}) {
  if (!rawTarget || !String(rawTarget).trim()) {
    throw new TargetValidationError(
      'Missing target directory.\n\nUsage: create-contractor-site <target-dir>',
    );
  }

  const targetDir = path.resolve(process.cwd(), String(rawTarget).trim());
  const { templateRoot } = opts;

  if (templateRoot) {
    const root = path.resolve(templateRoot);
    if (isSameOrInside(targetDir, root)) {
      throw new TargetValidationError(
        `Target directory must not be the template root or inside it.\n` +
          `  Template: ${root}\n` +
          `  Target:   ${targetDir}\n` +
          `Choose a directory outside the template repository.`,
      );
    }
  }

  if (!fs.existsSync(targetDir)) {
    return targetDir;
  }

  const stat = fs.statSync(targetDir);
  if (!stat.isDirectory()) {
    throw new TargetValidationError(
      `Target path exists and is not a directory: ${targetDir}`,
    );
  }

  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0) {
    throw new TargetValidationError(
      `Target directory is not empty: ${targetDir}\nChoose a different directory or remove existing files first.`,
    );
  }

  return targetDir;
}

export class TargetValidationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'TargetValidationError';
  }
}
