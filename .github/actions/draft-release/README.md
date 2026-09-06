# Draft release

Prepares a Strapi CMS release candidate. It pins the shipping range against the published npm
baseline, decides the version from the commits that landed, cuts `releases/x.y.z`, opens the draft
pull request against `main`, attributes every shipping pull request, and reconciles milestones.

Triggered by hand from the Actions tab through [`draft-release.yml`](../../workflows/draft-release.yml).

## What it does

| Step         | Effect                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Pin          | Resolves the npm `latest` baseline, the `v<latest>` tag and the source branch head to fixed SHAs.            |
| Attribute    | Resolves each first-parent integration to the pull request that produced it.                                 |
| Version      | Decides `minor` or `patch` from the commits, unless `version` is given.                                      |
| Milestones   | Renames the open milestone to the shipping version, opens the next patch milestone, closes the shipping one. |
| Branch       | Pushes `releases/x.y.z` at the pinned SHA.                                                                   |
| Pull request | Opens the draft PR `Release x.y.z` against `main` and labels it `publish-experimental`.                      |
| Report       | Writes the shipping table and a machine-readable JSON block into the PR body.                                |
| Cleanup      | Moves open PRs to the next milestone, clears closed-unmerged PRs and every issue, then comments.             |

## Version rule

When `version` is empty, the commits decide and nothing overrides them:

```text
any BREAKING CHANGE or `!` in the range  -> stop
any `feat` in the range                  -> minor
otherwise                                -> patch
```

`enhancement`, `future`, `security`, `fix`, `chore`, `ci`, `docs`, `test` and `revert` never force a
minor. `feat(i18n)` counts like any other feature.

Two corrections keep the rule honest:

- **Unparsed subjects fall back to the pull request's own commits.** commitlint runs
  `--from base.sha --to head.sha`, so it validates the commits inside a pull request, never the
  squash subject that lands on `develop`. Subjects such as
  `Feat/e2e critical ctb add fields (#26559)` therefore reach `develop` ungated, and only the pull
  request's commits are reliable.
- **Release back-merges are ignored.** `chore: release v5.52.3 update develop` is a pull request
  whose head is `main`, carrying the previous release's commits. Counting them would let an already
  shipped `feat` vote for a second minor.

## Attribution rule

A pull request is accepted for an integration only when all of these hold:

1. `merged_at` is set.
2. `base.ref` is `develop`.
3. `merge_commit_sha` equals the integration SHA.

Similar titles, authors or dates are never enough. A subject reference such as `(#27482)` is used
only as a fallback, and only when the referenced pull request carries hard evidence of its own.

Records are reported with one of five statuses: `resolved`, `direct-integration`, `ambiguous`,
`lookup-failed` and `unresolved`. A `lookup-failed` record stops the run, because a failed API call
must never be mistaken for a commit pushed straight to `develop`.

## Inputs

| Input        | Default   | Purpose                                                              |
| ------------ | --------- | -------------------------------------------------------------------- |
| `token`      | required  | GitHub App token.                                                    |
| `version`    | `''`      | Explicit `x.y.z`. Bypasses the commit rule.                          |
| `dry_run`    | `true`    | Compute everything, record the planned writes, perform none of them. |
| `source_ref` | `develop` | Branch the release is cut from.                                      |

The default `GITHUB_TOKEN` is not enough. A pull request opened with it does not trigger
`pull_request` workflows, so the release PR would get no CI, and a label applied with it does not
fire the `labeled` event, so [`publish-pr-experimental.yml`](../../workflows/publish-pr-experimental.yml)
would never run.

## Outputs

`version`, `bump`, `branch`, `pr_number`, `pr_url`, `journal_path`.

## The write journal

This action does not roll back. A run that dies halfway leaves the repository half-changed and a
human finishes or reverts it, so every mutation is recorded before the next one starts. The journal
is written to the step summary and uploaded as an artifact whether the run succeeds or fails.

A dry run fills the same structure without calling the API. That is the rehearsal: a reviewable,
line-by-line list of every milestone rename, pull request reassignment and ref push the real run
would perform.

### Undoing a partial run

| `op`                    | Undo                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `milestone.rename`      | `gh api -X PATCH repos/strapi/strapi/milestones/<n> -f title=<before>`        |
| `milestone.create`      | `gh api -X DELETE repos/strapi/strapi/milestones/<n>`                         |
| `milestone.close`       | `gh api -X PATCH repos/strapi/strapi/milestones/<n> -f state=open`            |
| `issue.milestone.set`   | `gh api -X PATCH repos/strapi/strapi/issues/<n> -F milestone=<before number>` |
| `issue.milestone.clear` | same, with the milestone number recorded in `before`                          |
| `branch.push`           | `git push origin --delete releases/<version>`                                 |
| `pr.create`             | `gh pr close <n> --delete-branch`                                             |
| `pr.label`              | `gh pr edit <n> --remove-label publish-experimental`                          |
| `pr.body`, `pr.comment` | Edit or delete by hand.                                                       |

## Stops

The run refuses to continue on any of these:

1. npm `latest` disagrees with the highest published stable version.
2. The `v<latest>` tag is missing.
3. The baseline is not an ancestor of the source ref.
4. Rebase merges are enabled on the repository.
5. The range carries a breaking change.
6. The range is empty.
7. Zero or more than one open milestone.
8. `releases/<version>` already exists.
9. The `version` input is malformed or not greater than the baseline.
10. Any commit-to-pulls lookup failed.

`ambiguous` and `unresolved` records do not stop the run. They are listed in the pull request body
under "Needs a human".

## Contributing

### Requirements

- Node 22.18 or newer, up to 26. Nothing else has to be installed to run the sources or the tests.

### No build step, no committed bundle

The TypeScript sources run directly through Node's type stripping. `action.yml` is a composite
action that runs `node index.ts`, so what ships is what you read: no `dist/`, no bundler, and no way
for a committed artifact to drift from its source.

That is only possible because the action has **no runtime dependencies**. `@actions/core` and
`@actions/github` were the only reason a bundle existed, and both are replaced by small local
modules:

- [`lib/actions.ts`](lib/actions.ts) implements the slice of the
  [workflow command protocol](https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions)
  this action uses: inputs from `INPUT_*`, outputs to `$GITHUB_OUTPUT`, `::warning::` / `::error::`,
  and the job summary file.
- [`lib/github.ts`](lib/github.ts) is a dozen REST calls over `fetch`, with `Link`-header
  pagination.

Both are injected through a stub in their tests, which is how they reach full coverage without a
network or a process.

Keep it dependency-free. Adding one brings the bundle back.

### Node version

Type stripping needs Node >= 22.18. The action checks this before running and fails with a clear
message, and the workflow pins the version with `actions/setup-node`.

### Layout

```text
action.yml       composite action: version guard, then `node index.ts`
index.ts         entry point: reads inputs, builds adapters, flushes the journal
lib/types.ts     the domain vocabulary; every runtime union is derived from its `as const` list
lib/actions.ts   the Actions runtime protocol
lib/github.ts    the GitHub REST adapter
lib/range.ts     the Git adapter and the first-parent log parser
lib/*.ts         one module per decision, pure
__tests__/*.ts   node:test suites, one per module
```

Decision functions are pure. The process, the network and Git are reached only through adapters,
which is what makes every rule testable in isolation.

### TypeScript dialect

`tsconfig.json` enforces what type stripping can erase, with `erasableSyntaxOnly`: no `enum`, no
`namespace`, no parameter properties, `import type` on every type-only import, and an explicit `.ts`
extension on every relative import. Literal unions derived from `as const` lists replace the enums
those rules forbid.

### Commands

- `yarn test:unit`: run the `node:test` suites straight off the TypeScript sources
- `yarn test:ts`: typecheck
- `yarn lint`: lint
