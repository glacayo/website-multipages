#!/usr/bin/env node
/** Theme palette lint: hard-coded colors outside approved tokens fail the build. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const EXTS = new Set(['.astro', '.css', '.ts', '.js', '.mjs']);
const APPROVED_THEME_FILES = new Set(['src/styles/global.css']);
const APPROVED_COLOR_TOKENS = new Set([
  'primary', 'primary-dark', 'accent', 'dark', 'light', 'muted', 'surface', 'border',
]);
const STOCK =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const TOKENS = 'primary|primary-dark|primary_dark|accent|dark|light|muted|surface|border';
const PREFIX =
  'bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|accent|caret|divide|shadow|placeholder';
const NAMED = 'white|black|transparent|current|inherit';
const OPACITY = '(?:/(?:\\d{1,3}|\\d+\\.\\d+))?';
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const FUNC_RE = /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|hwb|color)\(/gi;
const ARB_RE = new RegExp(
  `(?:^|[^\\w-])((?:${PREFIX})(?:-(?:solid|dashed|dotted|double))?)-\\[([^\\]]+)\\]`,
  'g',
);
const STOCK_RE = new RegExp(
  `(?:^|[^\\w-])((?:${PREFIX}|shadow)-(?:${STOCK})(?:-\\d{2,3})?(?:/\\d{1,3})?)\\b`,
  'g',
);
const TOKEN_UTIL_RE = new RegExp(`^(?:${PREFIX}|shadow)-(?:${TOKENS})${OPACITY}$`);
const NAMED_UTIL_RE = new RegExp(`^(?:${PREFIX}|shadow)-(?:${NAMED})${OPACITY}$`);
const STOCK_INNER_RE = new RegExp(`^(?:${STOCK})(?:-\\d{2,3})?$`, 'i');
const NAMED_INNER_RE = new RegExp(`^(?:${NAMED})(?:\\/[\\d.]+)?$`, 'i');
const VAR_COLOR_RE = /^var\(--color-([\w-]+)\)$/i;
const COLOR_UTIL_RE = new RegExp(
  `(?:^|[^\\w-])((?:${PREFIX}|shadow)-([a-zA-Z][\\w-]*?)${OPACITY})\\b`,
  'g',
);
const COLOR_PROP_RE = new RegExp(
  '\\b(?:color|background-color|border-color|outline-color|text-decoration-color|caret-color|' +
    'accent-color|fill|stroke|stop-color|column-rule-color|flood-color|lighting-color)\\s*:\\s*([a-zA-Z][\\w-]*)',
  'gi',
);
const STRUCTURAL_REST = new Set(
  ('none auto solid dashed dotted double hidden collapse separate cover contain fixed local scroll ' +
    'clip origin border padding content bottom center top left right start end justify ellipsis wrap ' +
    'nowrap balance pretty xs sm md base lg xl 2xl 3xl 4xl 5xl 6xl 7xl 8xl 9xl underline overline ' +
    'line-through wavy baseline sub super decoration x y s e t r b l invert full min max fit screen ' +
    'svh lvh dvh').split(' '),
);
const STRUCTURAL_ROOT_RE =
  /^(?:gradient|repeat|clip|origin|blend|position|size|opacity|blur|spread|offset|from|via|to|space|divide|shrink|grow|basis|span|order|col|row|auto|safe|inner|outer)(?:-|$)/i;
const TECH_CSS_NAMED = new Set([
  'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none',
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'assets' && path.resolve(dir) === path.resolve(SRC)) continue;
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(full, out);
    } else if (EXTS.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}
/** Strip line/block/HTML comments; keep newlines and string contents. */
function stripComments(src) {
  let out = '', i = 0, state = 'code';
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && n === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (c === '<' && src.startsWith('<!--', i)) { state = 'html'; out += '    '; i += 4; continue; }
      if (c === "'" || c === '"' || c === '`') { state = c; out += c; i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += c; } else out += ' '; i += 1; continue; }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i += 1; continue;
    }
    if (state === 'html') {
      if (c === '-' && src.startsWith('-->', i)) { state = 'code'; out += '   '; i += 3; continue; }
      out += c === '\n' ? '\n' : ' '; i += 1; continue;
    }
    out += c;
    if (c === '\\' && i + 1 < src.length) { out += src[i + 1]; i += 2; continue; }
    if (c === state) state = 'code';
    i += 1;
  }
  return out;
}
/** Same-line @theme { ... } only (avoids prose matches). */
function findThemeBlocks(src) {
  const blocks = [];
  const re = /@theme\b[^\n{]*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const openEnd = m.index + m[0].length;
    let j = openEnd, depth = 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') depth -= 1;
      j += 1;
    }
    blocks.push({ start: m.index, end: j, openEnd, body: src.slice(openEnd, j > openEnd ? j - 1 : openEnd) });
    re.lastIndex = j;
  }
  return blocks;
}
/** Validate @theme; blank approved bodies. Unapproved keep text so nested colors flag. */
function processThemeBlocks(rel, src, push) {
  const blocks = findThemeBlocks(src);
  if (!blocks.length) return src;
  const approvedFile = APPROVED_THEME_FILES.has(rel);
  let out = src;
  for (const b of blocks) {
    if (!approvedFile) { push(b.start, '@theme', 'unapproved-theme'); continue; }
    const colorRe = /--color-([\w-]+)\s*:/g;
    let cm;
    while ((cm = colorRe.exec(b.body)) !== null) {
      if (!APPROVED_COLOR_TOKENS.has(cm[1].toLowerCase())) {
        push(b.openEnd + cm.index, `--color-${cm[1]}`, 'unapproved-theme-token');
      }
    }
  }
  if (approvedFile) {
    for (let i = blocks.length - 1; i >= 0; i -= 1) {
      const b = blocks[i];
      out = out.slice(0, b.start) + out.slice(b.start, b.end).replace(/[^\n]/g, ' ') + out.slice(b.end);
    }
  }
  return out;
}
function parseIgnores(raw) {
  const lines = raw.split(/\r?\n/);
  const ignoreFile = lines.slice(0, 30).some((l) => /theme-lint-ignore-file\b/.test(l));
  const ignoreLines = new Set();
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!/theme-lint-ignore(?:-next-line)?\b/.test(line) || /theme-lint-ignore-file\b/.test(line)) continue;
    ignoreLines.add(/theme-lint-ignore-next-line\b/.test(line) ? idx + 2 : idx + 1);
  }
  return { ignoreFile, ignoreLines };
}
function readFn(text, nameStart, openParenIdx) {
  let i = openParenIdx + 1, depth = 1;
  while (i < text.length && depth > 0) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth -= 1;
    i += 1;
  }
  return text.slice(nameStart, i);
}
function isAllowedFn(full) {
  const m = full.match(/^rgba?\(([\s\S]*)\)$/i);
  if (!m) return false;
  const p = m[1].trim().split(/[,\s/]+/).filter(Boolean);
  if (p.length < 3) return false;
  const [r, g, b] = p.slice(0, 3).map(Number);
  if (![r, g, b].every(Number.isFinite)) return false;
  return (r === 255 && g === 255 && b === 255) || (r === 0 && g === 0 && b === 0);
}
function isApprovedVarColor(inner) {
  const m = String(inner).trim().match(VAR_COLOR_RE);
  return Boolean(m && APPROVED_COLOR_TOKENS.has(m[1].toLowerCase()));
}
function isStructuralUtilRest(rest) {
  if (!rest) return true;
  if (STRUCTURAL_REST.has(rest) || STRUCTURAL_ROOT_RE.test(rest) || /^\d/.test(rest)) return true;
  return /^[xytrblse](?:-\d+)?$/i.test(rest) || /^\d+%$/.test(rest);
}
function isUnknownColorUtil(util, rest) {
  if (TOKEN_UTIL_RE.test(util) || NAMED_UTIL_RE.test(util)) return false;
  if (STOCK_INNER_RE.test(rest.replace(/\/[\d.]+$/, ''))) return false;
  if (isStructuralUtilRest(rest)) return false;
  return /^[a-zA-Z]+(?:-\d{2,3})?$/.test(rest);
}

function lintFile(filePath, raw) {
  const { ignoreFile, ignoreLines } = parseIgnores(raw);
  if (ignoreFile) return [];
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const findings = [];
  let text = stripComments(raw);
  const push = (index, match, kind) => {
    const before = text.slice(0, index);
    const line = before.split(/\n/).length;
    if (ignoreLines.has(line)) return;
    findings.push({ file: rel, line, col: index - before.lastIndexOf('\n'), match, kind });
  };
  text = processThemeBlocks(rel, text, push);
  let m;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(text)) !== null) push(m.index, m[0], 'hex');
  FUNC_RE.lastIndex = 0;
  while ((m = FUNC_RE.exec(text)) !== null) {
    const full = readFn(text, m.index, m.index + m[0].length - 1);
    if (!isAllowedFn(full)) push(m.index, full.length > 60 ? `${full.slice(0, 57)}...` : full, 'color-fn');
  }
  ARB_RE.lastIndex = 0;
  while ((m = ARB_RE.exec(text)) !== null) {
    const full = `${m[1]}-[${m[2]}]`, inner = m[2].trim();
    if (NAMED_INNER_RE.test(inner) || isApprovedVarColor(inner)) continue;
    const named = /^[a-zA-Z][\w-]*$/.test(inner) && !TECH_CSS_NAMED.has(inner.toLowerCase());
    if (
      /#(?:[0-9a-fA-F]{3,8})\b/.test(inner) ||
      /\b(?:rgb|rgba|hsl|hsla|oklch)\(/i.test(inner) ||
      STOCK_INNER_RE.test(inner) ||
      named
    ) {
      push(m.index + m[0].indexOf(m[1]), full, 'arbitrary-color');
    }
  }
  STOCK_RE.lastIndex = 0;
  while ((m = STOCK_RE.exec(text)) !== null) {
    if (TOKEN_UTIL_RE.test(m[1]) || NAMED_UTIL_RE.test(m[1])) continue;
    push(m.index + m[0].indexOf(m[1]), m[1], 'stock-palette');
  }
  COLOR_UTIL_RE.lastIndex = 0;
  while ((m = COLOR_UTIL_RE.exec(text)) !== null) {
    if (isUnknownColorUtil(m[1], m[2])) push(m.index + m[0].indexOf(m[1]), m[1], 'unknown-color-util');
  }
  COLOR_PROP_RE.lastIndex = 0;
  while ((m = COLOR_PROP_RE.exec(text)) !== null) {
    const name = m[1];
    if (TECH_CSS_NAMED.has(name.toLowerCase())) continue;
    if (text.slice(m.index + m[0].length).match(/^\s*\(/)) continue;
    push(m.index + m[0].lastIndexOf(name), name, 'named-color');
  }
  return findings;
}
function runLint() {
  const files = walk(SRC);
  const findings = [];
  for (const f of files) findings.push(...lintFile(f, fs.readFileSync(f, 'utf8')));
  return { findings, files: files.length };
}

/** Negative smoke without a persistent bad source file. */
function selfTest() {
  let failed = 0;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-theme-'));
  const bad = path.join(dir, 'bad.astro');
  const check = (name, ok) => {
    if (ok) console.log(`  ✓ ${name}`);
    else { failed += 1; console.error(`  ✗ ${name}`); }
  };
  try {
    check('clean source has 0 findings', runLint().findings.length === 0);
    fs.writeFileSync(bad, `<div class="text-gray-500 bg-[#ff0000]" style="color:#00ff00"></div>\n`);
    check('synthetic offender flagged', lintFile(bad, fs.readFileSync(bad, 'utf8')).length > 0);
    check('theme-lint-ignore-file suppresses', lintFile(bad, `<!-- theme-lint-ignore-file: t -->\n<div class="text-gray-500"></div>\n`).length === 0);
    check(
      'allowed tokens pass',
      lintFile(bad, `<div class="text-primary bg-muted text-white/70" style="color:var(--color-accent);background:rgba(255,255,255,0.2)"></div>\n`).length === 0,
    );
    const rogue = lintFile(bad, `\n@theme {\n  --color-rogue: #ff0000;\n}\n<div class="bg-rogue text-rogue fill-rogue border-rogue"></div>\n`);
    check(
      'rogue @theme + color utils flagged',
      rogue.some((f) => f.kind === 'unapproved-theme' || f.kind === 'unapproved-theme-token') &&
        ['bg-rogue', 'text-rogue', 'fill-rogue', 'border-rogue'].every((u) =>
          rogue.some((f) => f.kind === 'unknown-color-util' && f.match === u)),
    );
    check(
      'style color:red flagged',
      lintFile(bad, `<div style="color:red"></div>\n`).some((f) => f.kind === 'named-color' && f.match.toLowerCase() === 'red'),
    );
    const globalPath = path.join(ROOT, 'src/styles/global.css');
    const inGlobal = lintFile(
      globalPath,
      `@theme {\n  --color-primary: #003060;\n  --color-rogue: #ff0000;\n}\nbody { color: var(--color-primary); }\n`,
    );
    check('unapproved token in canonical @theme flagged', inGlobal.some((f) => f.kind === 'unapproved-theme-token' && /rogue/.test(f.match)));
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  console.log(`\nlint-theme self-test: ${failed === 0 ? 'passed' : 'FAILED'}`);
  process.exit(failed === 0 ? 0 : 1);
}
function main() {
  if (process.argv.includes('--self-test')) {
    console.log('lint-theme self-test');
    return selfTest();
  }
  const { findings, files } = runLint();
  if (findings.length) {
    console.error('\n[lint-theme] Out-of-palette / hard-coded colors found:\n');
    for (const f of findings) console.error(`  ${f.file}:${f.line}:${f.col}  (${f.kind})  ${f.match}`);
    console.error(`\n[lint-theme] ${findings.length} issue(s). Use palette tokens or document theme-lint-ignore.\n`);
    process.exit(1);
  }
  console.log(`[lint-theme] OK — scanned ${files} file(s), no hard-coded palette violations.`);
}
module.exports = { lintFile, runLint, APPROVED_COLOR_TOKENS, APPROVED_THEME_FILES };
if (require.main === module) main();
