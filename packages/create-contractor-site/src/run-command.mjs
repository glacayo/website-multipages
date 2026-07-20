import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MIN_PNPM_VERSION = '11.1.2';

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isExecutableFile(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Follow a Windows .cmd shim to the real .exe when the shim points at one.
 * Handles pnpm's `@"%~dp0\..\...\pnpm.exe" %*` layout and absolute quoted exes.
 *
 * @param {string} cmdPath
 * @returns {string | null}
 */
function resolveExeFromCmdShim(cmdPath) {
  if (!/\.(cmd|bat)$/i.test(cmdPath) || !isExecutableFile(cmdPath)) {
    return null;
  }

  let text = '';
  try {
    text = fs.readFileSync(cmdPath, 'utf8');
  } catch {
    return null;
  }

  const dir = path.dirname(cmdPath);
  const patterns = [
    /"(%~dp0[^"\r\n]+?\.(?:exe|cjs|js))"/i,
    /(%~dp0\\[^\s"&|<>]+?\.(?:exe|cjs|js))/i,
    /"([a-zA-Z]:\\[^"\r\n]+?\.(?:exe|cjs|js))"/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (!match) continue;
    const raw = match[1].replace(/%~dp0/gi, dir + path.sep);
    const resolved = path.normalize(raw);
    if (isExecutableFile(resolved)) return resolved;
  }

  return null;
}

/**
 * Search PATH for a command, preferring real executables over shell shims.
 * Never shells out — pure filesystem lookup.
 *
 * @param {string} command bare name like "pnpm" or "git"
 * @returns {string | null} absolute path or null
 */
export function resolveCommandPath(command) {
  if (!command || typeof command !== 'string') return null;

  if (path.isAbsolute(command) && isExecutableFile(command)) {
    const fromShim = resolveExeFromCmdShim(command);
    return fromShim || command;
  }

  /** @type {string[]} */
  const names = [];
  if (process.platform === 'win32') {
    if (command === 'pnpm') {
      // Prefer native exe, then cmd shim (which we may dereference), then bare name.
      names.push('pnpm.exe', 'pnpm.CMD', 'pnpm.cmd', 'pnpm.bat', 'pnpm');
    } else if (command === 'git') {
      names.push('git.exe', 'git.cmd', 'git.bat', 'git');
    } else if (/\.(exe|cmd|bat|com)$/i.test(command)) {
      names.push(command);
    } else {
      const pathExt = (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
        .split(';')
        .filter(Boolean);
      // Prefer .EXE first regardless of PATHEXT order.
      const ordered = [
        ...pathExt.filter((e) => e.toUpperCase() === '.EXE'),
        ...pathExt.filter((e) => e.toUpperCase() !== '.EXE'),
      ];
      for (const ext of ordered) {
        names.push(`${command}${ext}`);
      }
      names.push(command);
    }
  } else {
    names.push(command);
  }

  const pathEnv = process.env.PATH || '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      const full = path.join(dir, name);
      if (!isExecutableFile(full)) continue;

      const fromShim = resolveExeFromCmdShim(full);
      if (fromShim) return fromShim;
      // Skip extensionless / .ps1 shims that cannot be spawned with shell:false.
      if (process.platform === 'win32' && /\.ps1$/i.test(full)) continue;
      if (
        process.platform === 'win32' &&
        !/\.(exe|cmd|bat|com)$/i.test(full) &&
        command === 'pnpm'
      ) {
        // Bare "pnpm" next to pnpm.CMD is often a POSIX shim; keep looking.
        continue;
      }
      return full;
    }
  }

  return null;
}

/**
 * Prefer running pnpm via its Node entrypoint or native exe so Windows never
 * needs a shell. Falls back to cmd.exe only for unresolved .cmd shims.
 *
 * @param {string} pnpmPath
 * @returns {{ command: string, argsPrefix: string[], viaCmd: boolean }}
 */
function pnpmSpawnTarget(pnpmPath) {
  if (/\.exe$/i.test(pnpmPath)) {
    return { command: pnpmPath, argsPrefix: [], viaCmd: false };
  }

  const dir = path.dirname(pnpmPath);
  const cjsCandidates = [
    path.join(dir, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    path.join(dir, '..', 'pnpm', 'bin', 'pnpm.cjs'),
    path.join(dir, 'pnpm.cjs'),
    // @pnpm/exe layout sometimes ships a JS entry beside the exe package
    path.join(dir, 'pnpm.js'),
  ];

  for (const candidate of cjsCandidates) {
    if (isExecutableFile(candidate)) {
      return {
        command: process.execPath,
        argsPrefix: [candidate],
        viaCmd: false,
      };
    }
  }

  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(pnpmPath)) {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      argsPrefix: [],
      viaCmd: true,
    };
  }

  return { command: pnpmPath, argsPrefix: [], viaCmd: false };
}

/**
 * Quote one argument for cmd.exe when invoking via `cmd /d /s /c "..."`.
 *
 * @param {string} value
 * @returns {string}
 */
function quoteForCmd(value) {
  if (value === '') return '""';
  // Always quote on Windows cmd lines when special chars present.
  if (!/[\s"&<>|^%!]/u.test(value)) return value;
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Build a single /c argument for cmd.exe. With /S, cmd strips the outer quotes,
 * so we wrap the full command line once.
 *
 * @param {string} commandPath
 * @param {string[]} args
 * @returns {string}
 */
function buildCmdCArgument(commandPath, args) {
  const tokens = [commandPath, ...args].map(quoteForCmd).join(' ');
  return `"${tokens}"`;
}

/**
 * Spawn a command with argv arrays on all platforms. Never uses shell:true.
 *
 * @param {string} command bare tool name ("pnpm", "git") or absolute path
 * @param {string[]} args
 * @param {{ cwd?: string, stdio?: 'inherit' | 'pipe' }} [opts]
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
export function runCommand(command, args, opts = {}) {
  const { cwd = process.cwd(), stdio = 'inherit' } = opts;

  const resolved =
    path.isAbsolute(command) && isExecutableFile(command)
      ? resolveExeFromCmdShim(command) || command
      : resolveCommandPath(command);

  if (!resolved) {
    throw new Error(
      `Command not found: ${command}. Install it and ensure it is on PATH.`,
    );
  }

  /** @type {string} */
  let spawnCmd = resolved;
  /** @type {string[]} */
  let spawnArgs = [...args];
  /** @type {boolean} */
  let windowsVerbatim = false;

  const isPnpm =
    command === 'pnpm' || /[/\\]pnpm(\.cmd|\.exe|\.CMD)?$/i.test(resolved);

  if (isPnpm) {
    const target = pnpmSpawnTarget(resolved);
    if (target.viaCmd) {
      spawnCmd = process.env.ComSpec || 'cmd.exe';
      spawnArgs = ['/d', '/s', '/c', buildCmdCArgument(resolved, args)];
      windowsVerbatim = true;
    } else {
      spawnCmd = target.command;
      spawnArgs = [...target.argsPrefix, ...args];
    }
  } else if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(resolved)) {
    spawnCmd = process.env.ComSpec || 'cmd.exe';
    spawnArgs = ['/d', '/s', '/c', buildCmdCArgument(resolved, args)];
    windowsVerbatim = true;
  }

  /** @type {import('node:child_process').SpawnSyncReturns<string>} */
  const result = spawnSync(spawnCmd, spawnArgs, {
    cwd,
    stdio,
    encoding: 'utf8',
    shell: false,
    env: process.env,
    windowsHide: true,
    windowsVerbatimArguments: windowsVerbatim,
  });

  if (result.error) {
    const err = /** @type {NodeJS.ErrnoException} */ (result.error);
    if (err.code === 'ENOENT') {
      throw new Error(
        `Command not found: ${command}. Install it and ensure it is on PATH.`,
      );
    }
    throw err;
  }

  const status = result.status ?? 1;
  if (status !== 0) {
    const detail =
      stdio === 'pipe'
        ? `\n${result.stderr || result.stdout || ''}`.trim()
        : '';
    throw new Error(
      `\`${command} ${args.join(' ')}\` failed with exit code ${status}.${detail ? `\n${detail}` : ''}`,
    );
  }

  return {
    status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {string} version
 * @returns {[number, number, number]}
 */
function parseSemver(version) {
  const [major = '0', minor = '0', patch = '0'] = String(version)
    .trim()
    .split(/[.-]/u);
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
}

/**
 * @param {string} actual
 * @param {string} minimum
 * @returns {boolean}
 */
export function isVersionAtLeast(actual, minimum) {
  const left = parseSemver(actual);
  const right = parseSemver(minimum);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return true;
    if (left[i] < right[i]) return false;
  }
  return true;
}

/**
 * Ensure pnpm is available. Never falls back to npm/npx.
 */
export function assertPnpmAvailable() {
  if (!resolveCommandPath('pnpm')) {
    throw new Error(
      'pnpm is required but was not found on PATH.\n' +
        'Install pnpm >= 11.1.2 (https://pnpm.io/installation), then re-run this CLI.\n' +
        'This tool never uses npm install, npm ci, or npx.',
    );
  }

  try {
    const result = runCommand('pnpm', ['--version'], { stdio: 'pipe' });
    const version = result.stdout.trim();
    if (!isVersionAtLeast(version, MIN_PNPM_VERSION)) {
      throw new Error(
        `pnpm ${MIN_PNPM_VERSION} or newer is required. Found: ${version || 'unknown'}.`,
      );
    }
  } catch (err) {
    throw new Error(
      'pnpm was found on PATH but failed to run.\n' +
        `${err instanceof Error ? err.message : String(err)}\n` +
        'Install pnpm >= 11.1.2 (https://pnpm.io/installation), then re-run this CLI.\n' +
        'This tool never uses npm install, npm ci, or npx.',
    );
  }
}

/**
 * Ensure git is available.
 */
export function assertGitAvailable() {
  if (!resolveCommandPath('git')) {
    throw new Error(
      'git is required but was not found on PATH.\n' +
        'Install git, then re-run this CLI to finish initialization.',
    );
  }

  try {
    runCommand('git', ['--version'], { stdio: 'pipe' });
  } catch (err) {
    throw new Error(
      'git was found on PATH but failed to run.\n' +
        `${err instanceof Error ? err.message : String(err)}\n` +
        'Install git, then re-run this CLI to finish initialization.',
    );
  }
}

/**
 * Run pnpm-only target setup: install → validate:data → build.
 *
 * @param {string} targetDir
 */
export function runPnpmSetup(targetDir) {
  console.log('\n→ pnpm install');
  runCommand('pnpm', ['install'], { cwd: targetDir });
  console.log('\n→ pnpm run validate:data');
  runCommand('pnpm', ['run', 'validate:data'], { cwd: targetDir });
  console.log('\n→ pnpm run build');
  runCommand('pnpm', ['run', 'build'], { cwd: targetDir });
}

/**
 * Initialize git and create the initial scaffold commit.
 * Only call after successful install/validate/build.
 *
 * @param {string} targetDir
 */
export function runGitInit(targetDir) {
  console.log('\n→ git init');
  runCommand('git', ['init'], { cwd: targetDir });
  console.log('→ git add -A');
  runCommand('git', ['add', '-A'], { cwd: targetDir });
  console.log('→ git commit');
  // Local identity only for the scaffold commit — does not require global git config.
  runCommand(
    'git',
    [
      '-c',
      'user.name=create-contractor-site',
      '-c',
      'user.email=scaffold@localhost',
      'commit',
      '-m',
      'chore: initial client scaffold from contractor template',
      '--no-gpg-sign',
    ],
    { cwd: targetDir },
  );
}
