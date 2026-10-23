---
name: release
description: Release a new ownfolio version - pick the next semver version from the commits since the last tag, tag and push it, wait for CI and the container image build, then deploy that version.
argument-hint: '[version, e.g. 0.9.0 or patch|minor|major]'
disable-model-invocation: true
---

# Release

Cut a new release of ownfolio and deploy it. Work through the steps in order and stop at the first one that fails,
reporting what failed and why. Do not skip a step or work around a failure (no `--force`, no re-tagging an existing
version, no deleting remote tags) without asking the user.

## 1. Preconditions

- The working tree is clean and the current branch is `main`.
- `git fetch --tags origin` and make sure local `main` equals `origin/main`. If local commits are not pushed yet, push
  them first (`git push origin main`) after telling the user which commits these are.
- The `Test` workflow for `HEAD` has succeeded (`gh run list --workflow test.yaml --commit "$(git rev-parse HEAD)"`).
  If it is still running, wait for it (`gh run watch <id> --exit-status`). If it failed, stop.
- Run the checks CI does not cover for releases: `npm run pages` must succeed locally (the `Pages` workflow runs on
  tags and has broken after releases before). If it needs `npm run screenshots` first and that is not possible
  locally, say so instead of silently skipping it.

## 2. Pick the version

If an argument was given, use it: an explicit version (`0.9.0` or `v0.9.0`) as is, or `patch`/`minor`/`major` as the
bump. Otherwise derive the bump from the Conventional Commits since the last tag
(`git describe --tags --abbrev=0`, then `git log <last-tag>..HEAD --format='%s%n%b'`):

- `BREAKING CHANGE` in a body or `!` after the type (`feat!:`) → major bump. While the version is `0.x`, a breaking
  change bumps the minor version instead.
- any `feat` → minor bump
- otherwise (`fix`, `perf`, `refactor`, `build`, `chore`, …) → patch bump
- no commits since the last tag → stop, there is nothing to release.

Tags are lightweight and prefixed with `v` (e.g. `v0.8.0`). Make sure the new tag does not exist locally or on
`origin`. Tell the user the chosen version together with the commits that led to it. If the bump is major (or a
breaking change on `0.x`), ask for confirmation before continuing.

## 3. Tag and push

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 4. Wait for CI and the image

Pushing the tag triggers the `Publish` workflow (`.github/workflows/publish.yaml`), which builds and pushes the
container image, and the `Pages` workflow. Find the runs for the tag
(`gh run list --workflow publish.yaml --branch vX.Y.Z`; they can take a few seconds to show up) and wait for them with
`gh run watch <id> --exit-status`, running it in the background if it takes long.

- If `Publish` fails, stop and show the failing step's log (`gh run view <id> --log-failed`). Do not deploy.
- If only `Pages` fails, report it, but the deploy can go on.

Then verify that the image for exactly this version exists in the registry, e.g.
`docker manifest inspect ghcr.io/ownfolio/ownfolio:X.Y.Z` (the image tag has no `v` prefix). Do not rely on `latest`.

## 5. Deploy

How ownfolio is deployed is intentionally not described here, because it lives outside this repository and may change.
Find it out now, every time, instead of assuming:

- Check your memory, `AGENTS.md`/`CLAUDE.md`, the README and docs for pointers to where and how the deployment is
  defined (infrastructure repositories, config management, hosting provider, …).
- Inspect that place to see how the currently deployed version is pinned and how earlier versions were rolled out (for
  example its git history for previous version bumps), and follow the same procedure for `X.Y.Z`.
- If you cannot find out with reasonable confidence how to deploy, or the procedure has steps that are destructive or
  would not be easily reversible, stop and ask the user rather than guessing.
- Follow the conventions of the place you change (commit message style, branch, etc.), and do not change anything there
  beyond what the deploy needs.

After deploying, verify the new version is actually running (e.g. the server responds and reports or serves the new
version) as far as you can check it.

## 6. Report

Summarise: the released version and the commits it contains, the CI run links, the image reference, what you did to
deploy it and how you verified it. Mention anything that was skipped or failed along the way (e.g. a failed `Pages`
run). If you learned how deployment works and it is not in your memory yet or has changed, update your memory.
