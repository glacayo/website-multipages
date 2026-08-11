#!/usr/bin/env node
/**
 * Capsule readiness probe. Exit 0 = core runtime ready (provider gaps = warnings).
 * Exit 1 = missing prerequisite + remediation. Never writes or downloads.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const setup = 'pnpm run images:setup';
/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];

const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
if (major < 22) errors.push(`Node.js >= 22 required (found ${process.version})`);

for (const rel of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml']) {
  if (!fs.existsSync(path.join(dir, rel))) errors.push(`missing ${rel}`);
}
const lockPath = path.join(dir, 'pnpm-lock.yaml');
if (fs.existsSync(lockPath)) {
  const lockText = fs.readFileSync(lockPath, 'utf8');
  if (!/lockfileVersion/i.test(lockText)) errors.push('capsule lockfile appears corrupt (no lockfileVersion)');
  if (!/smart-image-cli@/.test(lockText)) errors.push('capsule lockfile does not pin smart-image-cli');
}

const cliLink = path.join(dir, 'node_modules', 'smart-image-cli');
const program = path.join(cliLink, 'dist', 'cli', 'program.js');
if (!fs.existsSync(program)) {
  errors.push('smart-image-cli is not installed under the capsule');
} else {
  try {
    const mod = await import(pathToFileURL(program).href);
    if (typeof mod.runCli !== 'function') errors.push('smart-image-cli loaded but runCli export is missing');
  } catch (err) {
    errors.push(`smart-image-cli failed to load: ${err instanceof Error ? err.message : err}`);
  }
  try {
    const req = createRequire(path.join(fs.realpathSync(cliLink), 'package.json'));
    try {
      const Database = req('better-sqlite3');
      const db = new Database(':memory:');
      db.close();
    } catch (err) {
      errors.push(`better-sqlite3 prebuild failed to load: ${err instanceof Error ? err.message : err}`);
    }
    try {
      const sharp = req('sharp');
      await sharp({ create: { width: 1, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
    } catch (err) {
      errors.push(`sharp failed to load: ${err instanceof Error ? err.message : err}`);
    }
  } catch (err) {
    errors.push(`cannot resolve capsule package graph: ${err instanceof Error ? err.message : err}`);
  }
}

// Provider credentials are readiness detail only — never a core-runtime failure.
try {
  const cfgPath =
    process.platform === 'win32' && process.env.APPDATA
      ? path.join(process.env.APPDATA, 'smart-image-cli', 'config.json')
      : process.env.XDG_CONFIG_HOME
        ? path.join(process.env.XDG_CONFIG_HOME, 'smart-image-cli', 'config.json')
        : path.join(os.homedir(), '.config', 'smart-image-cli', 'config.json');
  if (!fs.existsSync(cfgPath)) {
    warnings.push('provider credentials not configured (optional for core runtime; required for pick/analyze AI)');
  } else {
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const active = raw?.activeProvider ?? 'ollama';
    if (!raw?.providers?.[active]?.apiKey) {
      warnings.push(`provider "${active}" has no apiKey (warning only; provider-required commands fail explicitly)`);
    }
  }
} catch {
  warnings.push('could not inspect provider config (warning only)');
}

if (errors.length) {
  process.stderr.write('smart-image not ready:\n');
  for (const e of errors) process.stderr.write(`  - ${e}\n`);
  process.stderr.write(`Remediation: ${setup}\n`);
  process.exit(1);
}
for (const w of warnings) process.stderr.write(`warning: ${w}\n`);
process.stdout.write('ready\n');
process.exit(0);
