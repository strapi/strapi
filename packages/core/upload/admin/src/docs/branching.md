# Branching, commits, PRs

## Branch names

- Features: `future/cms-<ticket>-<slug>`
  - e.g. `future/cms-124-asset-details-footer-actions`
- Fixes inside the future tree: `fix/<scope>` (no `future/` prefix)

## Base branch

- Default: `develop`.
- If the feature depends on an unmerged feature branch (CMS-124 depended
  on CMS-123), base off that branch and stack the PR.

## Commit messages

- Feature commits in this tree: `future(upload): <description>`.
- Follow-up fixes within the same branch: `fix: <description>`.
- Keep feature commits separate during rebases. **Don't auto-squash branch
  history unless explicitly asked** — Adrien wants commits preserved so
  review can be done per logical scope.

When rebasing onto `develop` and conflicts replay across multiple commits,
prefer `git rebase -i` with `git rerere` enabled over `git reset --soft
<merge-base> + recommit`.

## PR

- Title: `future(upload): <concise description>` (under 70 chars).
- Body: follow `.github/PULL_REQUEST_TEMPLATE.md` — four sections (What
  / Why / How to test / Related).
- Linear magic word: `fix CMS-NNN` in the related section auto-transitions
  the ticket on merge.
- GitHub magic word: `Fix #<issue>` auto-closes the issue.
- Base: `develop` (or the parent feature branch if stacked).
