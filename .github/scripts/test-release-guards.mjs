#!/usr/bin/env node
/**
 * Self-tests for the release guard helper (@see verify-release.mjs) and for the
 * static safety invariants of publish.yml. Node built-ins only.
 *
 * Run: node --test .github/scripts/test-release-guards.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  MAX_RELEASES_PAGES,
  REGISTRY_TIMEOUT_MS,
  RELEASES_TIMEOUT_MS,
  classifyRegistryStatus,
  describeReleasesUrlProblem,
  findReleaseByTag,
  isCanonicalReleasesUrl,
  parseNextLink,
  parseStableTag,
  probeRegistry,
  readDefaultTemplateRef,
  registryVersionUrl,
  releasesListUrl,
  verifyRegistryMetadata,
  verifyReleaseTag,
  verifyVersionIdentity,
} from './verify-release.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'publish.yml');
const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');

/** @param {string} file */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`could not read JSON from ${file}: ${error instanceof Error ? error.message : error}`);
  }
}

test('parseStableTag accepts only exact stable vX.Y.Z tags', () => {
  for (const good of ['v0.0.0', 'v2.3.1', 'v10.20.30']) {
    assert.equal(parseStableTag(good), good.slice(1), `expected ${good} to parse`);
  }
  for (const bad of ['2.3.1', 'v2.3', 'v2', 'v2.3.1-rc.1', 'v2.3.1+build', 'v01.2.3', 'v2.3.01', 'v2.3.1 ', '', null, 2]) {
    assert.equal(parseStableTag(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test('verifyVersionIdentity requires tag, both manifests, and template ref to match', () => {
  const base = { tag: 'v2.3.1', version: '2.3.1', rootVersion: '2.3.1', cliVersion: '2.3.1', templateRef: 'v2.3.1' };
  assert.deepEqual(verifyVersionIdentity(base), { ok: true, errors: [] });

  const rootMismatch = verifyVersionIdentity({ ...base, rootVersion: '2.3.0' });
  assert.equal(rootMismatch.ok, false);
  assert.match(rootMismatch.errors.join('\n'), /root package\.json version "2\.3\.0" !== "2\.3\.1"/);

  const cliMismatch = verifyVersionIdentity({ ...base, cliVersion: '2.3.2' });
  assert.equal(cliMismatch.ok, false);
  assert.match(cliMismatch.errors.join('\n'), /create-contractor-site version/);

  const refMismatch = verifyVersionIdentity({ ...base, templateRef: 'v2.3.0' });
  assert.equal(refMismatch.ok, false);
  assert.match(refMismatch.errors.join('\n'), /DEFAULT_TEMPLATE_REF/);

  const badTag = verifyVersionIdentity({ ...base, tag: '2.3.1', version: null });
  assert.equal(badTag.ok, false);
  assert.match(badTag.errors.join('\n'), /exact stable semver tag/);
});

test('verifyReleaseTag requires an annotated remote tag at the publish-validated commit', () => {
  const sha = 'a'.repeat(40);
  assert.equal(verifyReleaseTag({ tag: 'v2.3.1', objectType: 'tag', tagCommit: sha, expectedCommit: sha }).ok, true);
  assert.equal(verifyReleaseTag({ tag: 'v2.3.1', objectType: 'commit', tagCommit: sha, expectedCommit: sha }).ok, false);
  assert.equal(
    verifyReleaseTag({ tag: 'v2.3.1', objectType: 'tag', tagCommit: 'b'.repeat(40), expectedCommit: sha }).ok,
    false,
  );
  assert.equal(verifyReleaseTag({ tag: 'v2.3.1', objectType: 'tag', tagCommit: sha, expectedCommit: 'HEAD' }).ok, false);
  assert.equal(verifyReleaseTag({ tag: 'v2.3.1', objectType: 'tag', tagCommit: sha, expectedCommit: '' }).ok, false);
});

test('classifyRegistryStatus fails closed on absent/present expectations', () => {
  assert.equal(classifyRegistryStatus({ expected: 'absent', status: 404 }).ok, true);
  assert.equal(classifyRegistryStatus({ expected: 'absent', status: 200 }).ok, false);
  assert.equal(classifyRegistryStatus({ expected: 'absent', status: 0 }).ok, false);
  assert.equal(classifyRegistryStatus({ expected: 'absent', status: 500 }).ok, false);
  assert.equal(classifyRegistryStatus({ expected: 'present', status: 200 }).ok, true);
  assert.equal(classifyRegistryStatus({ expected: 'present', status: 404 }).ok, false);
  assert.equal(classifyRegistryStatus({ expected: 'present', status: 0 }).ok, false);
  assert.equal(classifyRegistryStatus({ expected: 'other', status: 200 }).ok, false);
});

test('verifyRegistryMetadata rejects missing or mismatched package metadata', () => {
  const expected = { expectedName: 'create-contractor-site', expectedVersion: '2.3.1' };
  assert.equal(
    verifyRegistryMetadata({ metadata: { name: 'create-contractor-site', version: '2.3.1' }, ...expected }).ok,
    true,
  );
  assert.equal(verifyRegistryMetadata({ metadata: { name: 'other', version: '2.3.1' }, ...expected }).ok, false);
  assert.equal(
    verifyRegistryMetadata({ metadata: { name: 'create-contractor-site', version: '9.9.9' }, ...expected }).ok,
    false,
  );
  assert.equal(verifyRegistryMetadata({ metadata: null, ...expected }).ok, false);
});

test('probeRegistry reports a non-matching status as 0 (uncertain)', async () => {
  const ok = await probeRegistry('https://example.invalid/pkg/1.0.0', async () => ({ status: 404 }));
  assert.equal(ok.status, 404);
  const down = await probeRegistry('https://example.invalid/pkg/1.0.0', async () => {
    throw new Error('network down');
  });
  assert.equal(down.status, 0);
  assert.match(down.error, /network down/);
});

test('probeRegistry fails closed on redirects, non-canonical URLs, and bare 200s', async () => {
  const url = 'https://registry.npmjs.org/create-contractor-site/2.3.1';

  let seen;
  await probeRegistry(url, async (_target, options) => {
    seen = options;
    return { status: 404 };
  });
  assert.equal(seen.redirect, 'error', 'the probe must forbid fetch redirects');
  assert.ok(seen.signal instanceof AbortSignal, 'the probe must bound the request with an abort signal');

  const followed = await probeRegistry(url, async () => ({
    status: 200,
    url: 'https://evil.example/create-contractor-site/2.3.1',
    json: async () => ({ name: 'create-contractor-site', version: '2.3.1' }),
  }));
  assert.equal(followed.status, 0);
  assert.match(followed.error, /non-canonical/);

  const bare = await probeRegistry(url, async () => ({ status: 200, url }));
  assert.equal(bare.status, 0);
  assert.match(bare.error, /not valid JSON/);

  const noMetadata = await probeRegistry(url, async () => ({ status: 200, url, json: async () => ({}) }));
  assert.equal(noMetadata.status, 0);
  assert.match(noMetadata.error, /name\/version/);

  const rejectedRedirect = await probeRegistry(url, async () => {
    throw new Error('redirect not allowed');
  });
  assert.equal(rejectedRedirect.status, 0);

  const good = await probeRegistry(url, async () => ({
    status: 200,
    url,
    json: async () => ({ name: 'create-contractor-site', version: '2.3.1' }),
  }));
  assert.equal(good.status, 200);
  assert.deepEqual(good.metadata, { name: 'create-contractor-site', version: '2.3.1' });
});

test('probeRegistry bounds each request with a 10s timeout and fails closed on abort', async () => {
  const url = 'https://registry.npmjs.org/create-contractor-site/2.3.1';
  let seen;
  const aborted = await probeRegistry(url, async (_target, options) => {
    seen = options;
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  });
  assert.equal(REGISTRY_TIMEOUT_MS, 10_000, 'the registry probe timeout must be 10s');
  assert.ok(seen.signal instanceof AbortSignal, 'the probe must pass an AbortSignal to fetch');
  assert.equal(aborted.status, 0, 'an aborted probe must be inconclusive, never a trusted status');
});

test('readDefaultTemplateRef tracks the current CLI version contract', () => {
  const cliVersion = readJson(path.join(REPO_ROOT, 'packages/create-contractor-site/package.json')).version;
  const source = fs.readFileSync(
    path.join(REPO_ROOT, 'packages/create-contractor-site/src/copy-template.mjs'),
    'utf8',
  );
  // Derived from the manifest so a coordinated version bump keeps this green.
  assert.equal(readDefaultTemplateRef(source), `v${cliVersion}`);
  assert.equal(readDefaultTemplateRef('const DEFAULT_TEMPLATE_REF = env || "v9.9.9";'), 'v9.9.9');
  assert.equal(readDefaultTemplateRef('no match here'), null);
});

test('registryVersionUrl targets the exact version endpoint', () => {
  assert.equal(
    registryVersionUrl({ package: 'create-contractor-site', version: '2.3.1' }),
    'https://registry.npmjs.org/create-contractor-site/2.3.1',
  );
  assert.equal(
    registryVersionUrl({ registry: 'https://r.example/', package: 'pkg', version: '1.0.0' }),
    'https://r.example/pkg/1.0.0',
  );
});

// --- Authenticated List releases absence helper -------------------------

const RELEASES_URL_PAGE_1 = releasesListUrl({ owner: 'glacayo', repo: 'website-multipages' });
const RELEASE_OPTIONS = { owner: 'glacayo', repo: 'website-multipages', tag: 'v2.3.1', token: 'ghs_test_token' };

/** Minimal fetch Response stand-in for the releases helper. */
function releasesResponse({ status = 200, url, body, link = null }) {
  return {
    status,
    url,
    headers: { get: (name) => (name.toLowerCase() === 'link' ? link : null) },
    json: async () => body,
  };
}

test('releasesListUrl targets the canonical authenticated List releases endpoint', () => {
  assert.equal(
    releasesListUrl({ owner: 'glacayo', repo: 'website-multipages' }),
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=1',
  );
  assert.equal(
    releasesListUrl({ owner: 'o', repo: 'r', page: 3, perPage: 50 }),
    'https://api.github.com/repos/o/r/releases?per_page=50&page=3',
  );
});

test('parseNextLink extracts rel=next and fails closed on unparseable Link headers', () => {
  assert.deepEqual(parseNextLink(null), { next: null });
  assert.deepEqual(parseNextLink(''), { next: null });
  assert.deepEqual(parseNextLink('<https://api.github.com/repositories/1/releases?page=2>; rel="next"'), {
    next: 'https://api.github.com/repositories/1/releases?page=2',
  });
  assert.deepEqual(parseNextLink('<https://api.github.com/repositories/1/releases?page=2>; rel="last"'), { next: null });
  assert.match(parseNextLink('not a link header').error, /no parseable entries/);
});

test('parseNextLink never concludes end-of-pagination on duplicate or garbage entries', () => {
  const page2 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2';
  const page3 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=3';

  // Two rel="next" entries: the second could point somewhere the first does not,
  // so neither may be trusted as the single continuation.
  const duplicate = parseNextLink(`<${page2}>; rel="next", <${page3}>; rel="next"`);
  assert.equal(duplicate.next, null);
  assert.match(duplicate.error, /more than once/);

  // Unparsed trailing garbage must not be silently dropped while a next entry
  // still parses: the listing would be treated as complete when it is not.
  const trailingInEntry = parseNextLink(`<${page2}>; rel="next" garbage`);
  assert.equal(trailingInEntry.next, null);
  assert.match(trailingInEntry.error, /unparseable|no parseable/);

  const trailingEntry = parseNextLink(`<${page2}>; rel="next", garbage`);
  assert.equal(trailingEntry.next, null);
  assert.match(trailingEntry.error, /unparseable/);

  const danglingComma = parseNextLink(`<${page2}>; rel="next",`);
  assert.equal(danglingComma.next, null);
  assert.match(danglingComma.error, /unparseable/);

  // A well-formed next entry, alone or alongside non-next relations, still parses.
  assert.deepEqual(parseNextLink(`<${page2}>; rel="next"`), { next: page2 });
  assert.deepEqual(parseNextLink(`<${page2}>; rel="next", <${page3}>; rel="last"`), { next: page2 });
});

test('isCanonicalReleasesUrl accepts only the exact expected releases endpoint and bounded query', () => {
  const expected = { owner: 'glacayo', repo: 'website-multipages', currentPage: 1 };
  assert.equal(
    isCanonicalReleasesUrl('https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2', expected),
    true,
  );
  assert.equal(
    isCanonicalReleasesUrl(
      `https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=${MAX_RELEASES_PAGES}`,
      { ...expected, currentPage: MAX_RELEASES_PAGES - 1 },
    ),
    true,
  );
  // An explicit default https port is normalized away and stays canonical.
  assert.equal(
    isCanonicalReleasesUrl(
      'https://api.github.com:443/repos/glacayo/website-multipages/releases?per_page=100&page=2',
      expected,
    ),
    true,
  );
});

test('isCanonicalReleasesUrl fails closed on foreign, unbound, and malformed pagination links', () => {
  const expected = { owner: 'glacayo', repo: 'website-multipages', currentPage: 1 };
  const rejected = [
    // Repository-id links cannot be tied to the expected repository.
    'https://api.github.com/repositories/123/releases?per_page=100&page=2',
    // Wrong origin, scheme, or host.
    'https://evil.example/repos/glacayo/website-multipages/releases?per_page=100&page=2',
    'http://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2',
    // An alternate port is a different origin.
    'https://api.github.com:8443/repos/glacayo/website-multipages/releases?per_page=100&page=2',
    // Userinfo and fragment must never ride along.
    'https://user:pass@api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2#frag',
    // Unbound or wrong repository.
    'https://api.github.com/repos/other/website-multipages/releases?per_page=100&page=2',
    'https://api.github.com/repos/glacayo/other/releases?per_page=100&page=2',
    // Not the releases endpoint.
    'https://api.github.com/repos/glacayo/website-multipages/tags?per_page=100&page=2',
    // Missing, non-conforming, duplicated, or unsupported query parameters.
    'https://api.github.com/repos/glacayo/website-multipages/releases?page=2',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=50&page=2',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=1',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2&extra=1',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&per_page=100&page=2',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2&page=3',
    `https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=${MAX_RELEASES_PAGES + 1}`,
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=0',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=abc',
    'not-a-url',
  ];
  for (const url of rejected) {
    assert.equal(isCanonicalReleasesUrl(url, expected), false, `expected rejection: ${url}`);
  }

  // Without an expected repository there is nothing to bind the link to.
  assert.equal(
    isCanonicalReleasesUrl('https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2'),
    false,
  );
  assert.equal(isCanonicalReleasesUrl(null, expected), false);
});

test('describeReleasesUrlProblem names the unsupported repository-id form', () => {
  const problem = describeReleasesUrlProblem('https://api.github.com/repositories/123/releases?per_page=100&page=2', {
    owner: 'glacayo',
    repo: 'website-multipages',
    currentPage: 1,
  });
  assert.match(problem, /repository-id pagination is unsupported/);
});

test('findReleaseByTag proves absence from a complete empty listing', async () => {
  const result = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => {
      assert.equal(url, RELEASES_URL_PAGE_1);
      return releasesResponse({ url, body: [] });
    },
  });
  assert.deepEqual(result, { ok: true, present: false });
});

test('findReleaseByTag treats an existing draft or published tag as present', async () => {
  const draft = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => releasesResponse({ url, body: [{ tag_name: 'v2.3.1', draft: true }] }),
  });
  assert.deepEqual(draft, { ok: true, present: true });

  const published = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => releasesResponse({ url, body: [{ tag_name: 'v2.3.1', draft: false }] }),
  });
  assert.deepEqual(published, { ok: true, present: true });
});

test('findReleaseByTag fails closed on auth, rate-limit, server, network, and redirect errors', async () => {
  for (const status of [401, 403, 429, 500]) {
    const result = await findReleaseByTag({
      ...RELEASE_OPTIONS,
      fetchImpl: async (url) => releasesResponse({ status, url, body: [] }),
    });
    assert.equal(result.ok, false, `HTTP ${status} must fail closed`);
    assert.match(result.error, new RegExp(String(status)));
  }

  const network = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async () => {
      throw new Error('socket hang up');
    },
  });
  assert.equal(network.ok, false, 'a network failure must fail closed');
  assert.doesNotMatch(network.error, /ghs_test_token/, 'errors must never leak the token');

  const redirectRejected = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async () => {
      throw new Error('redirect not allowed');
    },
  });
  assert.equal(redirectRejected.ok, false);

  const nonCanonical = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async () => releasesResponse({ status: 200, url: 'https://evil.example/releases', body: [] }),
  });
  assert.equal(nonCanonical.ok, false);
  assert.match(nonCanonical.error, /non-canonical/);
});

test('findReleaseByTag fails closed on malformed response bodies', async () => {
  const notArray = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => releasesResponse({ url, body: { message: 'nope' } }),
  });
  assert.equal(notArray.ok, false);
  assert.match(notArray.error, /JSON array/);

  const invalidJson = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => ({
      status: 200,
      url,
      headers: { get: () => null },
      json: async () => {
        throw new Error('not JSON');
      },
    }),
  });
  assert.equal(invalidJson.ok, false);

  const badEntry = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => releasesResponse({ url, body: [{ draft: true }] }),
  });
  assert.equal(badEntry.ok, false);
  assert.match(badEntry.error, /malformed release entry/);

  const noToken = await findReleaseByTag({ ...RELEASE_OPTIONS, token: '' });
  assert.equal(noToken.ok, false);
  assert.match(noToken.error, /token/);
});

test('findReleaseByTag follows validated pagination to a target on a later page', async () => {
  const calls = [];
  const page2 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2';
  const result = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === RELEASES_URL_PAGE_1) {
        return releasesResponse({ url, body: [{ tag_name: 'v2.3.0' }], link: `<${page2}>; rel="next"` });
      }
      assert.equal(url, page2);
      return releasesResponse({ url, body: [{ tag_name: 'v2.3.1' }] });
    },
  });
  assert.deepEqual(result, { ok: true, present: true });
  assert.deepEqual(calls, [RELEASES_URL_PAGE_1, page2]);
});

test('findReleaseByTag fails closed when rel=next skips a page instead of advancing by one', async () => {
  const calls = [];
  const page2 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2';
  const page3 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=3';
  // The tag is on page 2, which the 1 -> 3 link omits. Following page 3 would
  // walk page 1 and page 3, miss the tag, and falsely conclude it is absent.
  // The helper must stop at the malformed link and never request page 3.
  const result = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === RELEASES_URL_PAGE_1) {
        return releasesResponse({ url, body: [{ tag_name: 'v2.3.0' }], link: `<${page3}>; rel="next"` });
      }
      if (url === page2) return releasesResponse({ url, body: [{ tag_name: 'v2.3.1' }] });
      if (url === page3) return releasesResponse({ url, body: [] });
      throw new Error(`unexpected URL ${url}`);
    },
  });
  assert.equal(result.ok, false, 'a skipped page must never prove absence');
  assert.match(result.error, /did not advance exactly one page/);
  assert.deepEqual(calls, [RELEASES_URL_PAGE_1], 'the omitted page 2 must not be bypassed by fetching page 3');
});

test('findReleaseByTag fails closed on duplicate rel=next entries and never follows either', async () => {
  const calls = [];
  const page2 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2';
  const page3 = 'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=3';
  const result = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => {
      calls.push(url);
      return releasesResponse({ url, body: [], link: `<${page2}>; rel="next", <${page3}>; rel="next"` });
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /more than once/);
  assert.deepEqual(calls, [RELEASES_URL_PAGE_1], 'duplicate next links must never be followed');
});

test('findReleaseByTag fails closed on unsupported repository-id pagination and never follows it', async () => {
  const calls = [];
  // This is the shape GitHub can emit: it names a numeric repository id that is
  // not provably this owner/repo, so trusting it could prove absence on another
  // repository. The helper must stop instead of walking it.
  const unbound = 'https://api.github.com/repositories/999/releases?per_page=100&page=2';
  const result = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => {
      calls.push(url);
      return releasesResponse({ url, body: [], link: `<${unbound}>; rel="next"` });
    },
  });
  assert.equal(result.ok, false, 'an unbound repository-id next link must never prove absence');
  assert.match(result.error, /repository-id pagination is unsupported/);
  assert.deepEqual(calls, [RELEASES_URL_PAGE_1], 'the unbound next page must never be requested');
});

test('findReleaseByTag fails closed on foreign, userinfo, fragment, and non-increasing pagination links', async () => {
  const nextLinks = [
    // Repeats the current page instead of advancing.
    RELEASES_URL_PAGE_1,
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=0',
    'https://api.github.com:8443/repos/glacayo/website-multipages/releases?per_page=100&page=2',
    'https://user:pass@api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2',
    'https://api.github.com/repos/glacayo/website-multipages/releases?per_page=100&page=2#frag',
    'https://api.github.com/repos/other/website-multipages/releases?per_page=100&page=2',
  ];
  for (const next of nextLinks) {
    const result = await findReleaseByTag({
      ...RELEASE_OPTIONS,
      fetchImpl: async (url) => releasesResponse({ url, body: [], link: `<${next}>; rel="next"` }),
    });
    assert.equal(result.ok, false, `expected fail-closed for next link ${next}`);
    assert.match(result.error, /pagination link was not trusted/);
  }
});

test('findReleaseByTag fails closed when pagination cannot be verified', async () => {
  const badHost = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => releasesResponse({ url, body: [], link: '<https://evil.example/releases?page=2>; rel="next"' }),
  });
  assert.equal(badHost.ok, false);
  assert.match(badHost.error, /pagination link/);

  const unparseable = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => releasesResponse({ url, body: [], link: 'not a link header' }),
  });
  assert.equal(unparseable.ok, false);
  assert.match(unparseable.error, /pagination/);

  const nextPageFails = await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (url) => {
      if (url === RELEASES_URL_PAGE_1) {
        const page2 = RELEASES_URL_PAGE_1.replace('page=1', 'page=2');
        return releasesResponse({ url, body: [], link: `<${page2}>; rel="next"` });
      }
      throw new Error('second page unavailable');
    },
  });
  assert.equal(nextPageFails.ok, false);
});

test('findReleaseByTag bounds each request with a 10s timeout and sends an authenticated canonical request', async () => {
  let seen;
  await findReleaseByTag({
    ...RELEASE_OPTIONS,
    fetchImpl: async (_url, options) => {
      seen = options;
      return releasesResponse({ url: RELEASES_URL_PAGE_1, body: [] });
    },
  });
  assert.equal(RELEASES_TIMEOUT_MS, 10_000, 'the releases timeout must be 10s');
  assert.equal(seen.redirect, 'error', 'the helper must forbid fetch redirects');
  assert.ok(seen.signal instanceof AbortSignal, 'the helper must bound each request with an abort signal');
  assert.equal(seen.headers.authorization, 'Bearer ghs_test_token', 'the helper must authenticate');
});

test('publish.yml keeps the token-free OIDC safety invariants', () => {
  const source = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(source, /^\s*workflow_dispatch:/m, 'must be manual dispatch only');
  assert.match(source, /^\s*id-token: write\s*$/m, 'publish job needs id-token: write');
  assert.match(source, /^\s*environment: npm\s*$/m, 'publish job must use the npm environment');
  assert.match(source, /^\s*contents: write\s*$/m, 'release job needs contents: write');
  assert.match(source, /--provenance/, 'publish must request provenance');
  assert.match(source, /--access public/, 'publish must be public');
  assert.doesNotMatch(source, /images:(check|setup|run)/, 'image tooling must never enter a workflow');
  assert.doesNotMatch(source, /secrets\./, 'no repository/secret token wiring');
  assert.doesNotMatch(source, /NODE_AUTH_TOKEN\s*=/, 'must not assign NODE_AUTH_TOKEN');
  assert.doesNotMatch(source, /NPM_TOKEN\s*=/, 'must not assign NPM_TOKEN');

  // TOCTOU guard: the release job must consume the publish-validated commit and
  // re-verify the remote tag before creating the GitHub release, and the guards
  // must self-test before the irreversible publish step.
  assert.match(
    source,
    /outputs:\s*\n\s*validated_sha:\s*\$\{\{\s*steps\.validated\.outputs\.sha\s*\}\}/,
    'publish job must export the publish-validated SHA',
  );
  assert.match(
    source,
    /VALIDATED_SHA:\s*\$\{\{\s*needs\.publish\.outputs\.validated_sha\s*\}\}/,
    'release job must consume the publish-validated SHA',
  );
  assert.match(
    source,
    /verify-release\.mjs release-tag --tag "\$RELEASE_TAG" --expect-commit/,
    'release job must re-verify the remote tag commit before gh release create',
  );
  assert.match(source, /node --test \.github\/scripts\/test-release-guards\.mjs/, 'publish must run the guard self-tests');

  // The user-controlled tag input must only appear in non-shell contexts:
  // env bindings and the concurrency group key, never inside a run script.
  for (const line of source.split('\n')) {
    if (line.includes('${{ inputs.tag }}')) {
      assert.match(line, /^\s*(RELEASE_TAG:|group:)/, `tag input must bind to env only, got: ${line.trim()}`);
    }
  }
});

test('publish.yml bounds gh release create retries behind an authenticated absence check', () => {
  const source = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(
    source,
    /verify-release\.mjs release-absent --tag "\$RELEASE_TAG"/,
    'absence must be proven via the authenticated List releases helper before retrying',
  );
  assert.doesNotMatch(
    source,
    /^\s*gh release view/m,
    'get-by-tag must not be invoked: it omits drafts and its 404 never proves absence',
  );
  assert.match(source, /Stop and inspect manually; never overwrite\./, 'an existing release/draft must stop the run');
  assert.match(source, /for attempt in 1 2 3 4 5; do/, 'release create retries must stay bounded');
  assert.doesNotMatch(source, /gh release (delete|edit)/, 'recovery must never mutate an existing release');

  // The helper must run before any retry sleep, i.e. inside the retry loop and
  // ahead of the backoff, so a retry only ever follows proven absence.
  const retryBlock = source.slice(source.indexOf('Create GitHub release for the published tag'));
  const helperIndex = retryBlock.indexOf('verify-release.mjs release-absent');
  const sleepIndex = retryBlock.indexOf('sleep 10');
  assert.ok(helperIndex !== -1 && sleepIndex !== -1 && helperIndex < sleepIndex, 'the absence helper must run before the retry backoff');
});

test('publish.yml re-checks registry absence in the same shell step immediately before publish', () => {
  const source = fs.readFileSync(WORKFLOW, 'utf8');
  const publishCommand = 'pnpm --dir packages/create-contractor-site publish --provenance --access public';
  const publishIndex = source.indexOf(publishCommand);
  assert.ok(publishIndex !== -1, 'the irreversible publish command must exist');

  // The nearest preceding absence check must live in the same run block, so no
  // step boundary or backoff can open a TOCTOU window before the upload.
  const absenceIndex = source.lastIndexOf('registry --tag "$RELEASE_TAG" --expect absent', publishIndex);
  assert.ok(absenceIndex !== -1, 'a registry --expect absent re-check must precede publish');
  const between = source.slice(absenceIndex, publishIndex);
  assert.doesNotMatch(between, /^\s*- name:/m, 'the re-check and publish must share one shell step');
  assert.doesNotMatch(between, /\bsleep\b/, 'no backoff may separate the re-check from publish');
  assert.equal((between.match(/\n/g) || []).length, 1, 'the absence check must be the line immediately before publish');

  // The drift/identity re-check and the validated-commit capture stay intact.
  assert.match(source, /- name: Recheck drift and identity/, 'the drift/identity re-check must remain');
  assert.match(source, /drift --tag "\$RELEASE_TAG"/, 'the drift guard must remain');
  assert.match(source, /identity --tag "\$RELEASE_TAG"/, 'the identity guard must remain');
  assert.match(source, /id: validated/, 'the validated-commit capture must remain');
  assert.doesNotMatch(source, /continue-on-error/, 'a failing guard must stop the run, never continue');
});

test('verify-release CLI reports a git failure as a fail-closed non-zero exit', () => {
  const script = path.join(__dirname, 'verify-release.mjs');
  // Run outside any git worktree so the first `git fetch` fails deterministically.
  let status = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(process.execPath, [script, 'drift', '--tag', 'v2.3.1'], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    status = typeof error.status === 'number' ? error.status : -1;
    stdout = error.stdout ? String(error.stdout) : '';
    stderr = error.stderr ? String(error.stderr) : '';
  }
  assert.equal(status, 1, 'a git failure must exit non-zero');
  assert.match(stderr, /^verify-release: git .* failed/, 'a git failure must keep the verify-release error output');
  assert.equal(stdout, '', 'a failing guard must not print a success line');
});

test('ci.yml runs the release guard self-tests and never invokes image tooling', () => {
  const source = fs.readFileSync(CI_WORKFLOW, 'utf8');
  assert.match(source, /node --test \.github\/scripts\/test-release-guards\.mjs/, 'CI must self-test the release guards');
  assert.doesNotMatch(source, /images:(check|setup|run)/, 'image tooling must never enter CI');
});

test('manifests keep the publish guard rails', () => {
  const rootPkg = readJson(path.join(REPO_ROOT, 'package.json'));
  const cliPkg = readJson(path.join(REPO_ROOT, 'packages/create-contractor-site/package.json'));
  assert.equal(rootPkg.private, true, 'template root must stay private (no accidental root publish)');
  assert.notEqual(cliPkg.private, true, 'create-contractor-site must stay publishable');
  assert.equal(rootPkg.version, cliPkg.version, 'root and CLI versions must move together for a release');
  assert.equal(parseStableTag(`v${cliPkg.version}`), cliPkg.version, 'CLI version must be exact stable semver');
});
