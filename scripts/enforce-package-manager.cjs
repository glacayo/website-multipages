#!/usr/bin/env node

const ua = process.env.npm_config_user_agent || '';
const execPath = process.env.npm_execpath || '';
const lifecycle = process.env.npm_lifecycle_event || '';

const isPnpm = ua.includes('pnpm/') || execPath.toLowerCase().includes('pnpm');
const isNpm = ua.includes('npm/') || execPath.toLowerCase().includes('npm-cli');

if (!isPnpm) {
  const reason = isNpm
    ? 'npm detected'
    : `unsupported package manager detected${ua ? ` (${ua})` : ''}`;

  console.error('\n[package-manager-guard] This repository is pnpm-only.');
  console.error(`[package-manager-guard] Blocked because ${reason}.`);
  if (lifecycle) {
    console.error(`[package-manager-guard] Failing lifecycle/script: ${lifecycle}`);
  }
  console.error('[package-manager-guard] Use pnpm instead of npm.');
  console.error('[package-manager-guard] Examples:');
  console.error('  pnpm install');
  console.error('  pnpm run build');
  console.error('  pnpm add <package>');
  process.exit(1);
}

process.exit(0);
