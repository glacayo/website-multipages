#!/usr/bin/env node
/**
 * Truthful Windows-safe entry: import runCli (never the silent pnpm bin shim).
 * Forwards process.argv as an array — no shell interpolation. Retain until a
 * future pinned CLI independently proves isDirectRun fixed under pnpm/Windows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const program = path.join(dir, 'node_modules', 'smart-image-cli', 'dist', 'cli', 'program.js');

function fail(msg) {
  process.stderr.write(`${msg}\nRun: pnpm run images:setup\n`);
  process.exit(1);
}

if (!fs.existsSync(program)) fail('smart-image capsule is not installed (missing smart-image-cli).');

/** @type {{ runCli?: (argv?: readonly string[]) => Promise<void> }} */
let mod;
try {
  mod = await import(pathToFileURL(program).href);
} catch (err) {
  fail(`smart-image capsule failed to load: ${err instanceof Error ? err.message : err}`);
}
if (typeof mod.runCli !== 'function') fail('smart-image-cli runCli export is missing.');

try {
  await mod.runCli(['node', 'smart-img', ...process.argv.slice(2)]);
} catch (err) {
  process.stderr.write(`smart-image run failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(process.exitCode && process.exitCode !== 0 ? process.exitCode : 1);
}
process.exit(typeof process.exitCode === 'number' ? process.exitCode : 0);
