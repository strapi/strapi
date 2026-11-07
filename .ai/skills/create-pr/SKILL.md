---
name: create-pr
description: Use when drafting or publishing a pull request on strapi/strapi, including with `gh pr create`. Trigger whenever an agent is about to open a PR in this repo, or to name a branch, even if the user only says "open a PR" or "raise a PR for this".
---

# Create a strapi/strapi pull request

Source of truth: [CONTRIBUTING.md](../../../CONTRIBUTING.md), [PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md), and [commitlint.yml](../../../.github/workflows/commitlint.yml).

`gh pr create --body-file` gets nothing from the PR template. The body must contain every section of the template, with the exact headings. The PR title is checked by commitlint in CI, so it must follow the commit convention.

## Flow

### 1. Prepare the branch

- Branch from `develop` and target `develop`. Never target `main`.
- Name the branch `<type>/<short-kebab-description>`, with the same type as the commit, for example `fix/mcp-relation-output` or `chore/ai-create-issue-skill`.
- Do not commit changes under `examples/` unless the user asks for it.
- If the working tree is on `develop`, create the branch first. Never commit to `develop`.

### 1b. Fork or branch?

CONTRIBUTING.md asks external contributors to fork the repository. Check which case applies:

```bash
gh repo view strapi/strapi --json viewerPermission -q .viewerPermission
git remote -v
```

- `WRITE`, `MAINTAIN`, or `ADMIN`: push the branch to `origin`, which is `strapi/strapi`.
- `READ` or `TRIAGE`: this is a fork PR. `origin` must be the user's fork. If there is no `upstream` remote, add it, and branch from the latest `develop`:

  ```bash
  git remote add upstream https://github.com/strapi/strapi.git
  git fetch upstream
  git switch -c <type>/<short-kebab-description> upstream/develop
  ```

  If the user has no fork yet, ask before you run `gh repo fork strapi/strapi --remote`.

### 2. Verify

Run what the change needs, and report any failure to the user instead of publishing:

```bash
yarn test:unit && yarn test:front && yarn test:ts && yarn lint && yarn prettier:check
```

- Bug fix: add a test that reproduces the bug. For a feature, add tests when they cover meaningful behavior. When behavior changes, update the affected tests.
- Run `yarn version:check` if a `package.json` changed.
- E2E tests run in CI. Run them locally only for UI flows you changed.

### 3. Commit

REQUIRED SUB-SKILL: Use `git-conventions` for the type, scope, and subject. End the message with the attribution lines given by the session, if any.

```
type(scope): subject

body: what changed and why, in 1-3 sentences.
```

### 4. Check for duplicates

```bash
gh pr list --repo strapi/strapi --state all --search "<keywords>" --limit 20
```

If a PR already covers the change, show it to the user and stop.

### 5. Write the draft

Save the body outside the repository, for example in a temporary directory. Do not commit it.

The PR title is the commit subject: `type(scope): subject`, lowercase, no trailing period. For a `fix`, describe the bug, not the solution.

Use the template headings exactly, in this order. Do not add or rename sections:

```md
### What does it do?

The technical changes, as a short list or paragraph.

### Why is it needed?

The problem being solved. Say what breaks and for whom.

### How to test it?

The environment and the exact steps or commands to verify the behavior.

### Related issue(s)/PR(s)

Fix #<issue>
```

- Link the issue with `Fix #<number>` so it closes on merge. If there is none, write `None`, and do not invent one.
- Be concise and concrete. Name file paths and commands.
- Write `[NEEDS INPUT]` for anything you cannot establish, and ask the user before publishing.
- End the body with the PR attribution line given by the session, if any.

### 6. Review and publish

1. Show the user the branch name, the title, and the body.
2. Ask the user to confirm before you push or publish. Never push or open a PR without confirmation.
3. On confirmation, push and create the PR. Branch PR:

   ```bash
   git push -u origin <branch>
   gh pr create --repo strapi/strapi --base develop \
     --title "<title>" \
     --body-file <draft-path>
   ```

   Fork PR: the same command with `--head <fork-owner>:<branch>`. Get `<fork-owner>` from `git remote get-url origin`.

   Add `--draft` when the work is in progress.

4. Return the PR URL.

After publishing, check that the `commitlint` workflow passes:

```bash
gh pr checks <number> --repo strapi/strapi
```

## Common mistakes

| Mistake                              | Fix                                        |
| ------------------------------------ | ------------------------------------------ |
| Targeting `main`                     | Use `--base develop`                       |
| Type `refactor`, `perf`, or `style`  | Use `chore` or `enhancement`               |
| Title describes the fix, for a `fix` | Describe the bug                           |
| Custom PR sections                   | Use the four template headings only        |
| Missing `Fix #<issue>`               | Link the issue in `Related issue(s)/PR(s)` |
