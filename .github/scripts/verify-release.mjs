#!/usr/bin/env node
/**
 * Release guard verifier for the guarded npm publish workflow (publish.yml).
 *
 * Keeps the security gates testable and out of inline shell:
 *   identity    — exact stable annotated tag, tag/Main/HEAD commit identity,
 *                 manifest + DEFAULT_TEMPLATE_REF version equality
 *   registry    — exact version absent (preflight) or present (post-publish)
 *   drift       — re-fetch origin/main and re-check commit identity
 *   commit      — print only the validated commit SHA (for a job output)
 *   release-tag — remote annotated tag is still at the publish-validated commit
 *   release-absent — no draft or published release has the exact tag, proven by
 *                 a complete authenticated List releases response
 *
 * Fails closed: an unexpected registry status, an inconclusive GitHub release
 * listing, or a git error exits non-zero.
 * A registry 200 is trusted only when its body names the exact version; the
 * probe never follows a redirect. It never publishes and never writes to the
 * repository.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const STABLE_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const FULL_SHA_RE = /^[0-9a-f]{40}$/;
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
export const REGISTRY_TIMEOUT_MS = 10_000;

/**
 * @param {unknown} value
 * @returns {string | null} version without the leading `v`, or null if invalid
 */
export function parseStableTag(value) {
  if (typeof value !== 'string' || !STABLE_TAG_RE.test(value)) return null;
  return value.slice(1);
}

/**
 * @param {{ tag: string, version: string | null, rootVersion: string, cliVersion: string, templateRef: string | null }} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function verifyVersionIdentity({ tag, version, rootVersion, cliVersion, templateRef }) {
  const errors = [];
  if (!version) errors.push(`tag "${tag}" is not an exact stable semver tag (expected vX.Y.Z).`);
  if (rootVersion !== version) errors.push(`root package.json version "${rootVersion}" !== "${version}".`);
  if (cliVersion !== version) errors.push(`create-contractor-site version "${cliVersion}" !== "${version}".`);
  if (templateRef !== tag) errors.push(`DEFAULT_TEMPLATE_REF "${templateRef}" !== tag "${tag}".`);
  return { ok: errors.length === 0, errors };
}

/**
 * Confirms the remote tag the release job is about to publish a GitHub release
 * for is still an annotated tag pointing at the exact commit the publish job
 * validated. Closes the window where a pushed tag moves after npm publish.
 *
 * @param {{ tag: string, objectType: string, tagCommit: string, expectedCommit: string }} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function verifyReleaseTag({ tag, objectType, tagCommit, expectedCommit }) {
  const errors = [];
  if (objectType !== 'tag') {
    errors.push(`refs/tags/${tag} is a "${objectType}", not an annotated tag.`);
  }
  if (typeof expectedCommit !== 'string' || !FULL_SHA_RE.test(expectedCommit)) {
    errors.push(`publish-validated commit "${String(expectedCommit)}" is not a full 40-character SHA.`);
  } else if (tagCommit !== expectedCommit) {
    errors.push(`remote tag ${tag} (${tagCommit}) !== publish-validated commit (${expectedCommit}).`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {{ expected: 'absent' | 'present', status: number }} input
 * @returns {{ ok: boolean, reason: string }}
 */
export function classifyRegistryStatus({ expected, status }) {
  if (expected === 'absent') {
    if (status === 404) return { ok: true, reason: 'version absent (404)' };
    if (status === 200) return { ok: false, reason: 'version already published (200)' };
    return { ok: false, reason: `registry check inconclusive (status ${status})` };
  }
  if (expected === 'present') {
    if (status === 200) return { ok: true, reason: 'version published (200)' };
    if (status === 404) return { ok: false, reason: 'version missing after publish (404)' };
    return { ok: false, reason: `registry confirmation inconclusive (status ${status})` };
  }
  return { ok: false, reason: `unknown expectation "${expected}"` };
}

/**
 * Confirms a registry 200 payload describes the exact expected package/version.
 * The version endpoint is a trust boundary: without this check a mislabelled or
 * unexpected 200 payload could pass for the published artifact.
 *
 * @param {{ metadata: { name?: unknown, version?: unknown } | null, expectedName: string, expectedVersion: string }} input
 * @returns {{ ok: boolean, reason: string }}
 */
export function verifyRegistryMetadata({ metadata, expectedName, expectedVersion }) {
  if (!metadata || typeof metadata !== 'object') {
    return { ok: false, reason: 'registry returned no verifiable metadata' };
  }
  if (metadata.name !== expectedName) {
    return { ok: false, reason: `registry metadata name "${String(metadata.name)}" !== "${expectedName}"` };
  }
  if (metadata.version !== expectedVersion) {
    return { ok: false, reason: `registry metadata version "${String(metadata.version)}" !== "${expectedVersion}"` };
  }
  return { ok: true, reason: 'registry metadata name and version match' };
}

/**
 * @param {string} source contents of packages/create-contractor-site/src/copy-template.mjs
 * @returns {string | null}
 */
export function readDefaultTemplateRef(source) {
  const match = source.match(/DEFAULT_TEMPLATE_REF\s*=\s*[\s\S]*?\|\|\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/**
 * @param {{ registry?: string, package: string, version: string }} input
 * @returns {string}
 */
export function registryVersionUrl({ registry = DEFAULT_REGISTRY, package: pkgName, version }) {
  return `${registry.replace(/\/+$/, '')}/${pkgName}/${version}`;
}

/**
 * Probes the exact canonical registry version URL.
 *
 * Fails closed against a moved response: `redirect: 'error'` makes fetch
 * reject any redirect, and a response whose final URL is not the exact
 * requested URL is rejected. A `200` is trusted only when its JSON body
 * exposes both a `name` and a `version`; a bare `200` is reported as an
 * inconclusive status `0` so it can never be mistaken for a published version.
 * A hung connection is bounded by an unref'd 10s AbortSignal timeout and is
 * reported the same fail-closed way.
 *
 * @param {string} url canonical registry version URL
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ status: number, metadata?: { name: string, version: string }, error?: string }>}
 */
export async function probeRegistry(url, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });
  } catch (error) {
    return { status: 0, error: error instanceof Error ? error.message : String(error) };
  }
  if (typeof response.url === 'string' && response.url !== '' && response.url !== url) {
    return { status: 0, error: `registry redirected to a non-canonical URL: ${response.url}` };
  }
  if (response.status !== 200) return { status: response.status };
  let body;
  try {
    body = await response.json();
  } catch (error) {
    return { status: 0, error: `registry 200 body was not valid JSON: ${error instanceof Error ? error.message : error}` };
  }
  const name = body && typeof body.name === 'string' ? body.name : '';
  const version = body && typeof body.version === 'string' ? body.version : '';
  if (!name || !version) {
    return { status: 0, error: 'registry 200 body had no name/version metadata' };
  }
  return { status: 200, metadata: { name, version } };
}

export const GITHUB_API_BASE = 'https://api.github.com';
export const RELEASES_TIMEOUT_MS = 10_000;
export const RELEASES_PER_PAGE = 100;
/** Safety bound for pagination: 20 pages * 100 = 2,000 releases, far above any real repo. */
export const MAX_RELEASES_PAGES = 20;

const RELEASES_PATH_RE = /^\/repos\/([^/]+)\/([^/]+)\/releases$/;
const REPOSITORY_ID_PATH_RE = /^\/repositories\/\d+\/releases$/;
const LINK_ENTRY_RE = /^<([^<>]*)>\s*((?:;\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+\s*=\s*(?:"[^"]*"|[^\s;,]+))*)\s*$/;
const LINK_PARAM_RE = /;\s*([A-Za-z0-9!#$%&'*+.^_`|~-]+)\s*=\s*(?:"([^"]*)"|([^\s;,]+))/g;

/**
 * @param {{ owner: string, repo: string, page?: number, perPage?: number }} input
 * @returns {string} canonical authenticated List releases URL
 */
export function releasesListUrl({ owner, repo, page = 1, perPage = RELEASES_PER_PAGE }) {
  return `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`;
}

/**
 * Splits an RFC 8288 Link header on the commas that separate link-values,
 * ignoring commas inside a `<...>` target or a quoted string.
 *
 * @param {string} header
 * @returns {string[]}
 */
function splitLinkEntries(header) {
  const parts = [];
  let current = '';
  let inAngle = false;
  let inQuote = false;
  for (let i = 0; i < header.length; i += 1) {
    const char = header[i];
    if (inQuote) {
      current += char;
      if (char === '"') inQuote = false;
      continue;
    }
    if (char === '"') {
      inQuote = true;
      current += char;
      continue;
    }
    if (char === '<') {
      inAngle = true;
      current += char;
      continue;
    }
    if (char === '>') {
      inAngle = false;
      current += char;
      continue;
    }
    if (char === ',' && !inAngle) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * Parses one Link header link-value into `{ url, rel }`. Returns null for any
 * input that is not exactly `<uri>` followed by zero or more `; name=value`
 * parameters, so trailing garbage is never silently dropped. An entry with a
 * missing or duplicated `rel` parameter is also unparseable.
 *
 * @param {string} raw
 * @returns {{ url: string, rel: string } | null}
 */
function parseLinkEntry(raw) {
  const entry = raw.trim();
  if (entry === '') return null;
  const match = entry.match(LINK_ENTRY_RE);
  if (!match) return null;
  LINK_PARAM_RE.lastIndex = 0;
  let rel = null;
  let relCount = 0;
  let paramMatch;
  while ((paramMatch = LINK_PARAM_RE.exec(match[2])) !== null) {
    if (paramMatch[1].toLowerCase() !== 'rel') continue;
    rel = (paramMatch[2] !== undefined ? paramMatch[2] : paramMatch[3]).toLowerCase();
    relCount += 1;
  }
  if (rel === null || relCount > 1) return null;
  return { url: match[1].trim(), rel };
}

/**
 * Parses the RFC 8288 Link header and returns the rel="next" target. The
 * parser fails closed instead of concluding end-of-pagination: a non-empty
 * header with no parseable entry, any unparseable entry (including unparsed
 * trailing garbage), or a header that declares rel="next" more than once is
 * reported as an error so the caller stops rather than trusting an incomplete
 * listing.
 *
 * @param {unknown} header
 * @returns {{ next: string | null, error?: string }}
 */
export function parseNextLink(header) {
  if (header === null || header === undefined || header === '') return { next: null };
  if (typeof header !== 'string') return { next: null, error: 'Link header was not a string' };
  const entries = [];
  let sawUnparseable = false;
  for (const raw of splitLinkEntries(header)) {
    const entry = parseLinkEntry(raw);
    if (entry === null) {
      sawUnparseable = true;
      continue;
    }
    entries.push(entry);
  }
  if (entries.length === 0) return { next: null, error: 'Link header had no parseable entries' };
  if (sawUnparseable) return { next: null, error: 'Link header had an unparseable entry' };
  const nexts = entries.filter((entry) => entry.rel === 'next');
  if (nexts.length > 1) return { next: null, error: 'Link header declared rel="next" more than once' };
  return { next: nexts.length === 1 ? nexts[0].url : null };
}

/**
 * Validates the query string of a List releases pagination link. The only
 * accepted shape is exactly one `per_page=100` plus exactly one `page=n` that
 * is a positive integer exactly one greater than the page just read (no skipped
 * page) and no larger than `MAX_RELEASES_PAGES`. Any extra or duplicated
 * parameter is unsupported and fails closed.
 *
 * @param {URLSearchParams} params
 * @param {number | undefined} currentPage
 * @returns {string | null} reason the query is untrusted, or null when valid
 */
function releasesQueryProblem(params, currentPage) {
  for (const key of new Set(params.keys())) {
    if (key !== 'per_page' && key !== 'page') return `pagination query had an unsupported parameter "${key}"`;
  }
  if (params.getAll('per_page').length !== 1) return `pagination query did not carry exactly one per_page=${RELEASES_PER_PAGE}`;
  if (params.get('per_page') !== String(RELEASES_PER_PAGE)) {
    return `pagination per_page was not ${RELEASES_PER_PAGE}`;
  }
  if (params.getAll('page').length !== 1) return 'pagination query did not carry exactly one page';
  const rawPage = params.get('page');
  if (rawPage === null || !/^[1-9]\d*$/.test(rawPage)) return 'pagination page was not a positive integer';
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) return 'pagination page was not a safe integer';
  if (page > MAX_RELEASES_PAGES) return `pagination page exceeded the ${MAX_RELEASES_PAGES}-page bound`;
  if (typeof currentPage === 'number' && page !== currentPage + 1) {
    return `pagination page ${page} did not advance exactly one page from ${currentPage}`;
  }
  return null;
}

/**
 * @param {string} rawUrl a URL already accepted by describeReleasesUrlProblem
 * @returns {number | null} the query page, or null when it cannot be parsed
 */
function releasesPageOf(rawUrl) {
  try {
    const raw = new URL(rawUrl).searchParams.get('page');
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

/**
 * Explains why a pagination URL cannot be trusted, or returns null when it is
 * canonical. Kept separate from the boolean predicate so the caller can report
 * a specific, actionable reason instead of a bare rejection.
 *
 * A URL is trusted only when it targets the exact `https://api.github.com`
 * origin (no alternate port), carries no userinfo or fragment, names the
 * expected `/repos/<owner>/<repo>/releases` endpoint, and has a bounded,
 * strictly increasing pagination query.
 *
 * Repository-id links (`/repositories/{id}/releases`) are deliberately
 * unsupported: the numeric id cannot be tied to the expected owner/repo without
 * a second API call, so accepting one could walk a *different* repository's
 * releases and falsely "prove" the tag is absent. The check fails closed and
 * stops the run for manual inspection instead.
 *
 * @param {unknown} rawUrl
 * @param {{ owner?: string, repo?: string, currentPage?: number }} [expected]
 * @returns {string | null}
 */
export function describeReleasesUrlProblem(rawUrl, expected = {}) {
  if (typeof rawUrl !== 'string' || rawUrl === '') return 'pagination URL was not a non-empty string';
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return 'pagination URL was not an absolute URL';
  }
  if (parsed.origin !== GITHUB_API_BASE) return `pagination URL origin was not ${GITHUB_API_BASE}`;
  if (parsed.username !== '' || parsed.password !== '') return 'pagination URL carried userinfo';
  if (parsed.hash !== '') return 'pagination URL carried a fragment';
  if (!expected.owner || !expected.repo) return 'the expected owner/repo was not provided';
  if (REPOSITORY_ID_PATH_RE.test(parsed.pathname)) {
    return 'repository-id pagination is unsupported: the id cannot be tied to the expected repository';
  }
  const match = parsed.pathname.match(RELEASES_PATH_RE);
  if (!match) return 'pagination URL path was not a releases endpoint';
  if (match[1] !== expected.owner || match[2] !== expected.repo) {
    return 'pagination URL named a different repository';
  }
  return releasesQueryProblem(parsed.searchParams, expected.currentPage);
}

/**
 * @param {unknown} rawUrl
 * @param {{ owner?: string, repo?: string, currentPage?: number }} [expected]
 * @returns {boolean}
 */
export function isCanonicalReleasesUrl(rawUrl, expected = {}) {
  return describeReleasesUrlProblem(rawUrl, expected) === null;
}

/**
 * Proves whether an exact tag has a release object by walking every page of the
 * authenticated List releases endpoint. Unlike get-by-tag, this endpoint also
 * returns drafts, so it is the only list that can prove absence.
 *
 * Fails closed: any non-200 status, rejected redirect, malformed body, or
 * unverifiable pagination returns `{ ok: false }` and never counts as absence.
 * The token is sent only in the Authorization header and never appears in an
 * error message.
 *
 * @param {{ owner: string, repo: string, tag: string, token: string, fetchImpl?: typeof fetch }} input
 * @returns {Promise<{ ok: boolean, present?: boolean, error?: string }>}
 */
export async function findReleaseByTag({ owner, repo, tag, token, fetchImpl = fetch }) {
  if (!owner || !repo) return { ok: false, error: 'owner and repo are required' };
  if (!tag) return { ok: false, error: 'tag is required' };
  if (!token) return { ok: false, error: 'an authenticated GitHub token is required to list releases' };

  const visited = new Set();
  let page = 1;
  let url = releasesListUrl({ owner, repo, page });
  while (url) {
    if (visited.has(url)) return { ok: false, error: 'GitHub releases pagination loop detected' };
    visited.add(url);

    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'user-agent': 'verify-release-guard',
          'x-github-api-version': '2022-11-28',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(RELEASES_TIMEOUT_MS),
      });
    } catch (error) {
      return { ok: false, error: `GitHub releases request failed: ${error instanceof Error ? error.message : String(error)}` };
    }

    if (typeof response.url === 'string' && response.url !== '' && response.url !== url) {
      return { ok: false, error: 'GitHub releases request redirected to a non-canonical URL' };
    }
    if (response.status !== 200) {
      return { ok: false, error: `GitHub releases list returned HTTP ${response.status}` };
    }

    let body;
    try {
      body = await response.json();
    } catch (error) {
      return { ok: false, error: `GitHub releases response was not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (!Array.isArray(body)) {
      return { ok: false, error: 'GitHub releases response was not a JSON array' };
    }
    for (const item of body) {
      if (!item || typeof item !== 'object' || typeof item.tag_name !== 'string') {
        return { ok: false, error: 'GitHub releases response contained a malformed release entry' };
      }
      if (item.tag_name === tag) return { ok: true, present: true };
    }

    if (!response.headers || typeof response.headers.get !== 'function') {
      return { ok: false, error: 'GitHub releases response had no inspectable headers' };
    }
    const parsed = parseNextLink(response.headers.get('link'));
    if (parsed.error) {
      return { ok: false, error: `GitHub releases pagination could not be verified: ${parsed.error}` };
    }
    if (parsed.next) {
      // Repository-id links and any other non-`/repos/<owner>/<repo>/releases`
      // shape cannot be tied to this repository, so fail closed here and let the
      // run stop for manual inspection instead of trusting a foreign listing.
      const problem = describeReleasesUrlProblem(parsed.next, { owner, repo, currentPage: page });
      if (problem) {
        return { ok: false, error: `GitHub releases pagination link was not trusted: ${problem}` };
      }
      const nextPage = releasesPageOf(parsed.next);
      if (nextPage === null) {
        return { ok: false, error: 'GitHub releases pagination link did not carry a usable page' };
      }
      page = nextPage;
      url = parsed.next;
    } else {
      url = null;
    }
  }
  return { ok: true, present: false };
}

/** @param {string} message */
function fail(message) {
  console.error(`verify-release: ${message}`);
  process.exit(1);
}

/**
 * @param {string[]} args
 * @returns {string}
 * @throws {Error} when git fails; the top-level CLI boundary converts it to a
 *   fail-closed non-zero exit with the same `verify-release:` error output.
 */
function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr).trim() : '';
    throw new Error(`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }
}

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

/** @param {string} file */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fail(`could not read JSON from ${file}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Asserts the remote tag is annotated and its commit is exactly the workflow
 * HEAD and the current origin/main tip. Always fetches from origin first.
 *
 * @param {string} tag
 * @returns {string} the verified commit SHA
 */
function assertCommitIdentity(tag) {
  git(['fetch', '--quiet', '--force', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
  const objectType = git(['cat-file', '-t', `refs/tags/${tag}`]);
  if (objectType !== 'tag') {
    fail(`refs/tags/${tag} is a "${objectType}", not an annotated tag.`);
  }
  const tagCommit = git(['rev-parse', `refs/tags/${tag}^{commit}`]);
  const head = git(['rev-parse', 'HEAD']);
  git(['fetch', '--quiet', '--force', 'origin', 'main:refs/remotes/origin/main']);
  const main = git(['rev-parse', 'origin/main']);
  if (tagCommit !== head) fail(`tag ${tag} (${tagCommit}) !== workflow HEAD (${head}).`);
  if (tagCommit !== main) fail(`tag ${tag} (${tagCommit}) !== origin/main (${main}).`);
  return tagCommit;
}

/**
 * @param {string} tag
 * @param {string} repoRoot
 * @returns {string} verified commit SHA
 */
function runIdentity(tag, repoRoot) {
  const version = parseStableTag(tag);
  const commit = assertCommitIdentity(tag);
  const rootVersion = readJson(path.join(repoRoot, 'package.json')).version;
  const cliManifest = readJson(path.join(repoRoot, 'packages/create-contractor-site/package.json'));
  const copySource = fs.readFileSync(
    path.join(repoRoot, 'packages/create-contractor-site/src/copy-template.mjs'),
    'utf8',
  );
  const result = verifyVersionIdentity({
    tag,
    version,
    rootVersion,
    cliVersion: cliManifest.version,
    templateRef: readDefaultTemplateRef(copySource),
  });
  if (!result.ok) {
    for (const error of result.errors) console.error(`verify-release: ${error}`);
    fail('version identity checks failed.');
  }
  console.log(`identity OK: ${tag} == manifests == DEFAULT_TEMPLATE_REF; commit ${commit}`);
  return commit;
}

/**
 * @param {Record<string, string | boolean>} args
 * @returns {Promise<number>}
 */
async function runRegistry(args) {
  const tag = typeof args.tag === 'string' ? args.tag : '';
  const version = parseStableTag(tag);
  if (!version) fail(`tag "${tag}" is not an exact stable semver tag (expected vX.Y.Z).`);
  const expected = args.expect === 'present' || args.expect === 'absent' ? args.expect : null;
  if (!expected) fail('registry requires --expect absent|present.');
  const repoRoot = path.resolve(typeof args['repo-root'] === 'string' ? args['repo-root'] : process.cwd());
  const pkgName = readJson(path.join(repoRoot, 'packages/create-contractor-site/package.json')).name;
  const url = registryVersionUrl({ registry: DEFAULT_REGISTRY, package: pkgName, version });
  const probe = await probeRegistry(url);
  const result = classifyRegistryStatus({ expected, status: probe.status });
  if (!result.ok) {
    fail(`${pkgName}@${version} ${result.reason}${probe.error ? ` (${probe.error})` : ''}.`);
  }
  if (expected === 'present') {
    const metadata = verifyRegistryMetadata({ metadata: probe.metadata ?? null, expectedName: pkgName, expectedVersion: version });
    if (!metadata.ok) fail(`${pkgName}@${version} ${metadata.reason}.`);
    console.log(`registry OK: ${pkgName}@${version} ${result.reason}; ${metadata.reason}`);
    return 0;
  }
  console.log(`registry OK: ${pkgName}@${version} ${result.reason}`);
  return 0;
}

/**
 * Prints only the commit SHA the publish job validated, so the workflow can
 * freeze it as a job output and hand it to the release job.
 *
 * @param {string} tag
 * @returns {number}
 */
function runCommit(tag) {
  if (!parseStableTag(tag)) fail(`tag "${tag}" is not an exact stable semver tag (expected vX.Y.Z).`);
  const commit = assertCommitIdentity(tag);
  process.stdout.write(`${commit}\n`);
  return 0;
}

/**
 * Re-fetches the remote annotated tag and requires it to still point at the
 * publish-validated commit, immediately before the GitHub release is created.
 *
 * @param {string} tag
 * @param {string} expectedCommit
 * @returns {number}
 */
function runReleaseTag(tag, expectedCommit) {
  if (!parseStableTag(tag)) fail(`tag "${tag}" is not an exact stable semver tag (expected vX.Y.Z).`);
  if (typeof expectedCommit !== 'string' || expectedCommit === '') {
    fail('release-tag requires --expect-commit <sha>.');
  }
  git(['fetch', '--quiet', '--force', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
  const objectType = git(['cat-file', '-t', `refs/tags/${tag}`]);
  const tagCommit = git(['rev-parse', `refs/tags/${tag}^{commit}`]);
  const result = verifyReleaseTag({ tag, objectType, tagCommit, expectedCommit });
  if (!result.ok) {
    for (const error of result.errors) console.error(`verify-release: ${error}`);
    fail('release tag identity check failed.');
  }
  console.log(`release-tag OK: ${tag} is an annotated tag at ${tagCommit} == publish-validated commit`);
  return 0;
}

/**
 * Proves the exact tag has neither a draft nor a published release using an
 * authenticated, fully paginated List releases call. Any API, auth, network,
 * pagination, or body error is inconclusive and fails the run.
 *
 * @param {Record<string, string | boolean>} args
 * @returns {Promise<number>}
 */
async function runReleaseAbsent(args) {
  const tag = typeof args.tag === 'string' ? args.tag : '';
  if (!parseStableTag(tag)) fail(`tag "${tag}" is not an exact stable semver tag (expected vX.Y.Z).`);
  const slug = typeof args.repo === 'string' ? args.repo : process.env.GITHUB_REPOSITORY || '';
  const [owner, repo] = slug.split('/');
  if (!owner || !repo) fail('release-absent requires GITHUB_REPOSITORY "owner/repo" or --repo owner/repo.');
  const token = process.env.GH_TOKEN || '';
  if (!token) fail('release-absent requires GH_TOKEN for an authenticated release listing.');

  const result = await findReleaseByTag({ owner, repo, tag, token });
  if (!result.ok) {
    fail(`could not prove ${tag} is absent (${result.error}); an API failure never proves absence.`);
  }
  if (result.present) {
    fail(`a draft or published release already has tag ${tag}. Stop and inspect manually; never overwrite.`);
  }
  console.log(`release-absent OK: no draft or published release has tag ${tag}`);
  return 0;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runCli(argv) {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  const tag = typeof args.tag === 'string' ? args.tag : '';
  const repoRoot = path.resolve(typeof args['repo-root'] === 'string' ? args['repo-root'] : process.cwd());

  if (command === 'identity') {
    runIdentity(tag, repoRoot);
    return 0;
  }
  if (command === 'drift') {
    if (!parseStableTag(tag)) fail(`tag "${tag}" is not an exact stable semver tag (expected vX.Y.Z).`);
    const commit = assertCommitIdentity(tag);
    console.log(`drift OK: tag ${tag}, HEAD, and origin/main all at ${commit}`);
    return 0;
  }
  if (command === 'registry') {
    return runRegistry(args);
  }
  if (command === 'commit') {
    return runCommit(tag);
  }
  if (command === 'release-tag') {
    const expectCommit = typeof args['expect-commit'] === 'string' ? args['expect-commit'] : '';
    return runReleaseTag(tag, expectCommit);
  }
  if (command === 'release-absent') {
    return runReleaseAbsent(args);
  }
  fail(`unknown command "${command ?? ''}" (expected identity | registry | drift | commit | release-tag | release-absent).`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
