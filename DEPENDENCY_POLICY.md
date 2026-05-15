# Dependency Policy

This project uses pnpm with semver ranges in `package.json` and exact versions in `pnpm-lock.yaml`.

Rules:

1. Commit `pnpm-lock.yaml` on every dependency change.
2. In CI and reproducible environments, install with:
   `pnpm install --frozen-lockfile`
3. Do not run blind upgrades such as `pnpm update` and merge them without review.
4. Before upgrading dependencies:
   - review why the upgrade is needed
   - inspect `pnpm-lock.yaml` changes
   - run `pnpm run build`
   - verify no unexpected new build-script packages are introduced
5. Prefer checking what changed first with:
   `pnpm outdated`

Current allowed build-script packages are defined in `pnpm-workspace.yaml`.
