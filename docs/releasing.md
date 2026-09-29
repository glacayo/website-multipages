# Releasing `create-contractor-site`

Releases are **manual and token-free**. A maintainer dispatches
[`publish.yml`](../.github/workflows/publish.yml) from `main` with an existing
stable annotated tag; GitHub OIDC trusted publishing authorizes npm, and the
GitHub release is created only after the registry confirms the exact version.
No `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or local `npm login` is ever involved.

## Quick path

1. On `main`, set the **same** `vX.Y.Z` in all three places: root `package.json`,
   `packages/create-contractor-site/package.json`, and `DEFAULT_TEMPLATE_REF`
   in `packages/create-contractor-site/src/copy-template.mjs`; update `CHANGELOG.md`.
2. Merge to `main`, then create and push an **annotated** tag at the exact
   `main` HEAD: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
3. Actions → **Publish (trusted publishing)** → *Run workflow* → branch `main`,
   input `tag` = `vX.Y.Z`.
4. The workflow runs three jobs in order: `validate` → `publish` → `release`.
5. Verify the npm version and its provenance attestation on npmjs.com.

The tag commit must equal `origin/main` and the workflow commit. If `main`
advances after the tag is pushed, the run fails by design: **never move or
force-update a pushed tag.** Stop, prepare a new release commit with a new
version and a new tag, and dispatch a fresh run after review.

## One-time trusted publisher binding

Bind the workflow on npmjs.com once, before the first release:

npmjs.com → `create-contractor-site` → **Settings** → **Trusted Publisher** → GitHub Actions:

| Field | Value |
|-------|-------|
| Organization / user | `glacayo` |
| Repository | `website-multipages` |
| Workflow filename | `publish.yml` |
| Environment | `npm` |
| Allowed actions | Publish (direct publish allowed) |

The GitHub **environment `npm`** referenced by the publish job must exist in
repository settings (add required reviewers there if you want a human approval
gate). The OIDC `environment` claim and the filename binding must both match, or
npm rejects the publish. See the official
[npm trusted publishers docs](https://docs.npmjs.com/trusted-publishers/).

## What each job is allowed to do

| Job | Permissions | Purpose |
|-----|-------------|---------|
| `validate` | `contents: read` | Guard self-tests, tag/identity/version checks, canonical-404 preflight, frozen install, build, capsule-free core smoke, CLI package dry-run |
| `publish` | `contents: read`, `id-token: write` | Re-check drift + unpublished version, capture the validated commit SHA, then `pnpm publish --provenance --access public` |
| `release` | `contents: write` | Re-fetch the annotated tag and require it to equal the publish-validated SHA, then `gh release create` |

The publish command is `pnpm --dir packages/create-contractor-site publish
--provenance --access public`. It never uses an auth token, and a guard step
fails if `NODE_AUTH_TOKEN`/`NPM_TOKEN` is set.

## Tag protection (defense in depth)

Protect release tags on GitHub so a published tag cannot be moved even by
mistake. Rulesets → new tag ruleset → target `v*`:

| Setting | Value |
|---------|-------|
| Target | Tags matching `v*` |
| Restrict creations | Enabled |
| Restrict updates | Enabled — blocks moving or force-updating a pushed tag |
| Restrict deletions | Enabled |

The workflow does not rely on this: the `release` job re-fetches the remote tag
and fails unless it is an annotated tag pointing at the exact publish-validated
commit. Tag protection is a second layer, not a substitute. Add required
reviewers to the `npm` environment if you also want a human gate before publish.

## Failure and recovery

| Where it stopped | State | What to do |
|------------------|-------|------------|
| `validate` any step | Nothing published | Fix the cause and dispatch a new run |
| `publish` before the publish step | Nothing published | Investigate the report; re-run only if the version is still absent |
| `publish` at the publish step | Unknown | Check npm; **never blind-republish** an existing version |
| after publish, registry confirm fails | npm may hold the version | Do **not** re-run publish; verify npm manually and create the GitHub release by hand if the version is present |
| `release` fails with **no** release present | npm is already live | Re-check the remote tag against the publish-validated commit, then create the release by hand: `gh release create vX.Y.Z --verify-tag --title vX.Y.Z --notes "…"` |
| `release` fails and the authenticated release listing finds an **existing draft or published** release | npm is already live; a release object exists | Stop. Never delete, overwrite, or blind-retry it; finish that existing release by hand (below) |
| `release` fails and the authenticated release listing is **inconclusive** (API/auth/network/rate-limit/pagination error) | npm is already live; GitHub release state unknown | Stop and inspect manually with an authenticated [List releases](https://docs.github.com/en/rest/releases/releases#list-releases) call, which includes **drafts**. `gh release view vX.Y.Z` shows a published release only, so its `404` proves nothing. An API failure never proves absence; do not retry blind |
| `main` advanced after tagging / tag no longer matches | Nothing published | Do **not** move the pushed tag. Stop, cut a new release commit with a new version and tag, and dispatch again after review |
| remote tag moved after publish confirmed | npm version is live, GitHub release blocked | Do **not** move the tag. Verify npm manually, then cut a new patch version, commit, and tag after review |

The preflight accepts only a canonical `404`; any other registry status stops
the run, so a published version can never be silently overwritten. The probe
never follows a redirect, and after publish the version counts as confirmed only
when the registry returns a `200` whose `name` and `version` metadata match the
expected package — a redirect or a bare `200` is never treated as success.

### Recovering an existing draft or partially created release

The workflow retries `gh release create` only after
`node .github/scripts/verify-release.mjs release-absent --tag vX.Y.Z` proves that
no release with that exact tag exists. The helper walks **every page** of the
authenticated [List releases](https://docs.github.com/en/rest/releases/releases#list-releases)
endpoint, which is the only listing that also returns **draft** releases; a
`gh release view`/get-by-tag lookup reports published releases only, so its
`404` is **not** proof of absence. The helper fails closed: any auth, network,
redirect, rate-limit, `4xx`/`5xx`, malformed body, or untrusted pagination
result is inconclusive and stops the run for manual inspection. A pagination
link is trusted only for the exact `https://api.github.com` origin and the
expected `/repos/<owner>/<repo>/releases` endpoint with a bounded, strictly
increasing page; a GitHub-supplied repository-id link (`/repositories/{id}/releases`)
cannot be tied to this repository, so it stops the run instead of risking
another repository's listing. An API failure is never treated as absence, and
nothing may be overwritten.

To finish a draft/partial release by hand, verify before you mutate: an
authenticated [List releases](https://docs.github.com/en/rest/releases/releases#list-releases)
call filtered to your tag (it includes drafts; `gh release view vX.Y.Z` shows a
published release only), `git ls-remote --tags origin vX.Y.Z` (the remote
annotated tag must still point at the publish-validated commit), and
`pnpm view create-contractor-site@X.Y.Z version` (npm identity).
Then edit and publish the existing release. Never move or force-update the tag,
and never delete a release just to force another automatic retry.

## Rules

- pnpm only — never `npm publish`.
- No local npm login and no stored npm token, per release or ever.
- Never move, retag, or force-update a pushed tag. If `main` advances, cut a new
  version and tag after review instead.
- Keep `vX.Y.Z`, both manifests, and `DEFAULT_TEMPLATE_REF` in lockstep; the
  workflow rejects a mismatch on any of them.
- The repository root stays `"private": true` so the template (and every scaffolded
  client site) cannot be published by accident from the root. The CLI package is
  the only publishable manifest.

> pnpm performs the publish natively. Confirm OIDC trusted publishing on the
> first real release and stop if provenance or auth behaves unexpectedly.

## Checklist

- [ ] Both manifests and `DEFAULT_TEMPLATE_REF` equal `vX.Y.Z` on `main`
- [ ] Annotated tag `vX.Y.Z` pushed at the exact `main` HEAD
- [ ] npmjs.com trusted publisher bound to `publish.yml` + environment `npm`
- [ ] GitHub environment `npm` exists
- [ ] Tag ruleset protects `v*` (no updates, no deletions)
- [ ] `pnpm run validate:data` and `pnpm run build` pass before tagging
- [ ] After dispatch: `validate` → `publish` → `release` all green
- [ ] npm version + provenance confirmed on npmjs.com
