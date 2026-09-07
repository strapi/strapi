# Draft release

Prepares a Strapi CMS release candidate. It pins the shipping range against the published npm
baseline, decides the version from the commits that landed, cuts `releases/x.y.z`, opens the draft
pull request against `main`, attributes every shipping pull request, and reconciles milestones.

It is built to run **more than once per release**. `develop` keeps moving while a candidate is open,
so a later run folds whatever landed since into the same release rather than starting a new one.

Triggered by hand from the Actions tab through [`draft-release.yml`](../../workflows/draft-release.yml).

## What it does

| Step         | Effect                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Pin          | Resolves the npm `latest` baseline, the `v<latest>` tag and `origin/develop` to fixed SHAs.         |
| Attribute    | Resolves each first-parent integration to the pull request that produced it.                        |
| Version      | Decides `minor` or `patch` from the commits, unless `version` is given.                             |
| Discover     | Finds the candidate already in flight, and decides whether to draft, refresh or redraft.            |
| Branch       | Pushes `releases/x.y.z` at the pinned SHA, or advances it.                                          |
| Pull request | Opens the draft PR `Release x.y.z` against `main`, or reuses the one in flight.                     |
| Milestones   | Makes the shipping milestone name the version that ships, keeps the next one open, closes shipping. |
| Realign      | Pulls every pull request that shipped onto the shipping milestone, whatever its author picked.      |
| Cleanup      | Moves open PRs to the next milestone, clears closed-unmerged PRs and every issue.                   |
| Report       | Writes the shipping table and a machine-readable JSON block into the PR body, then comments.        |

Every refusal happens in the preflight, before the first write. A run that stops leaves the
repository untouched; only a run that dies mid-write leaves it half-changed, and the journal is what
makes finishing that by hand mechanical.

The branch push and the pull request are the first writes because they are the two most likely to
fail on permissions: the push needs a bypass on the ruleset over `releases/*`, and the pull request
needs the app's scopes. A run that fails there leaves at most one write to undo, where the milestone
phase alone is dozens.

## Running more than once

The open pull request against `main` whose head is `releases/x.y.z` and lives in this repository is
what identifies the candidate in flight. A pull request from a fork is never a candidate, whatever
its branch is named, because anyone can open one. Nothing else works as a key: a release branch
outlives its candidate, because the ruleset over `releases/*` forbids deleting one, and a milestone
is renamed by this very action.

| Mode      | When                                                     | What it does                                                                                                                                         |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draft`   | No candidate is open.                                    | Cuts the branch, opens the pull request, closes the shipping milestone.                                                                              |
| `refresh` | A candidate is open and the version still agrees.        | Fast-forwards the branch, refills the shipping milestone, rewrites the body, comments. The pull request keeps its number, its reviews and its label. |
| `redraft` | A candidate is open and the commits changed the version. | Opens a replacement pull request, renames both milestones, then comments on, closes and deletes the one it replaced.                                 |

A `refresh` that finds the branch already at `develop`'s head pushes nothing. Pushing would fire
`synchronize` on the pull request and publish another identical experimental artifact for nothing.

`redraft` is the expensive path. A `feat` landing after a patch was drafted changes the version, and
the version is in the branch name, so the candidate has to be re-keyed. The replacement is opened
before the old candidate is retired, so the release is never without one.

## Version rule

When `version` is empty, the commits decide and nothing overrides them:

```text
any BREAKING CHANGE or `!` in the range  -> stop
any `feat` in the range                  -> minor
otherwise                                -> patch
```

`enhancement`, `future`, `security`, `fix`, `chore`, `ci`, `docs`, `test` and `revert` never force a
minor. `feat(i18n)` counts like any other feature.

Three corrections keep the rule honest:

- **Unparsed subjects fall back to the pull request's own commits.** commitlint runs
  `--from base.sha --to head.sha`, so it validates the commits inside a pull request, never the
  squash subject that lands on `develop`. Subjects such as
  `Feat/e2e critical ctb add fields (#26559)` therefore reach `develop` ungated, and only the pull
  request's commits are reliable.
- **Release back-merges are ignored.** `chore: release v5.52.3 update develop` is a pull request
  whose head is `main`, carrying the previous release's commits. Counting them would let an already
  shipped `feat` vote for a second minor.
- **A breaking marker is never dropped for want of a parsable subject.** The body of the landing
  commit is read on every path, not only when its subject parses. That is where a breaking footer
  most often ends up: GitHub pre-fills the squash merge box from the pull request's commits, so the
  subject can read `Feat/new upload flow (#123)` while the body carries `BREAKING CHANGE:` and the
  inner commits stay `feat:`. An unparsed subject leaves the _type_ unknown; it says nothing about
  whether the change breaks.

`bumpEvidence` names where each vote was read, so a stop is always traceable to a place a human can
look:

| `via`          | Read from                                                     |
| -------------- | ------------------------------------------------------------- |
| `subject`      | The landing commit's conventional header, including its `!`.  |
| `pr-commits`   | The commits inside the pull request, headers and bodies both. |
| `landing-body` | The body of the landing commit itself.                        |

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

| Input     | Default  | Purpose                                                              |
| --------- | -------- | -------------------------------------------------------------------- |
| `token`   | required | GitHub App token.                                                    |
| `version` | `''`     | Explicit `x.y.z`. Bypasses the commit rule.                          |
| `dry_run` | `true`   | Compute everything, record the planned writes, perform none of them. |

There is no source-branch input. A candidate always comes from the protected `develop` head, so
nothing about the release content can be chosen at dispatch time.

The default `GITHUB_TOKEN` is not enough. A pull request opened with it does not trigger
`pull_request` workflows, so the release PR would get no CI, and a label applied with it does not
fire the `labeled` event, so [`publish-pr-experimental.yml`](../../workflows/publish-pr-experimental.yml)
would never run.

## Outputs

`version`, `bump`, `mode`, `branch`, `pr_number`, `pr_url`, `journal_path`.

## The release candidate block

The pull request body carries a JSON block between `STRAPI_RELEASE_CANDIDATE_START` and
`STRAPI_RELEASE_CANDIDATE_END`, so later automation reads the release rather than the prose.

`candidate` is the part that identifies the release without re-deriving any of it:

| Field                                 | Meaning                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `branch`                              | The release branch, `releases/x.y.z`.                                                                                    |
| `headSha`                             | The commit the branch points at. Always the same value as `range.toSha`.                                                 |
| `expectedExperimentalVersion`         | `0.0.0-experimental.<headSha>`, the artifact published from that commit.                                                 |
| `branchAdvanced`                      | Whether this run moved the branch. `false` means the artifact a reader may already have tested is still the current one. |
| `pullRequestNumber`, `pullRequestUrl` | The release pull request, both `null` on a dry run.                                                                      |

`release.mode` says whether the run opened the candidate, advanced it or replaced it. The body is
rewritten wholesale on every run, so it is always the current truth; the comments are the per-run
record of which run pulled which work in, and they are never rewritten.

`pullRequests[].author` carries both halves of an identity:

| Field   | Meaning                                                                        |
| ------- | ------------------------------------------------------------------------------ |
| `login` | The GitHub username, from the pull request payload. Empty only if it has none. |
| `name`  | The display name, or `null` when no commit in the range can vouch for one.     |

A GitHub pull request payload has no display name in it: its `user` is the short user object, and
asking for the long one costs a request per distinct contributor. Git already has the name, because
a squash commit is authored by the contributor, so `%an` on the integration commit is the same
string GitHub renders next to it.

`name` is `null` rather than guessed in the two cases where that string would be someone else's: a
merge commit, authored by whoever pressed merge, and a squash whose author email is a GitHub noreply
address naming a different login, which is what a pull request written by several people leaves
behind. An address that carries no login, a work address for instance, is not evidence against the
name. The email itself never reaches the payload: it is read as evidence and dropped, because the
payload is published in a public pull request body.

The experimental version mirrors
[`publish-pr-experimental.yml`](../../workflows/publish-pr-experimental.yml), which versions on
`github.event.pull_request.head.sha` with the full 40-character SHA. Changing the scheme there means
changing `experimentalVersion` in [`lib/report.ts`](lib/report.ts).

## The write journal

This action does not roll back. A run that dies halfway leaves the repository half-changed and a
human finishes or reverts it, so every mutation is recorded before the next one starts. The journal
is written to the step summary and uploaded as an artifact whether the run succeeds or fails.

Each entry carries how far it got, so it never claims more certainty than the run has:

| `state`         | Meaning                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `planned`       | A dry run recorded it and called nothing.                                                |
| `attempted`     | The call left and has not come back. Only ever seen on a journal flushed mid-write.      |
| `applied`       | The call returned. This is the only state worth undoing.                                 |
| `failed`        | The server or git answered with a refusal, so nothing changed. The answer is in `error`. |
| `indeterminate` | The call failed in a way that proves nothing, a socket closed after the request left.    |

A GitHub response status and a git exit code both mean the operation reached a verdict, and git
updates a ref atomically, so a push that exits non-zero left the ref alone. An error carrying
neither is `indeterminate` rather than assumed harmless.

A dry run fills the same structure without calling the API. That is the rehearsal: a reviewable,
line-by-line list of every milestone rename, pull request reassignment and ref push the real run
would perform.

### Undoing a partial run

Undo an entry only when its `state` is `applied`. A `failed` entry changed nothing. An
`indeterminate` one has to be checked against GitHub before anything is touched, because nobody can
vouch for whether it landed.

| `op`                    | Undo                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `milestone.rename`      | `gh api -X PATCH repos/strapi/strapi/milestones/<n> -f title=<before>`        |
| `milestone.create`      | `gh api -X DELETE repos/strapi/strapi/milestones/<n>`                         |
| `milestone.close`       | `gh api -X PATCH repos/strapi/strapi/milestones/<n> -f state=open`            |
| `issue.milestone.set`   | `gh api -X PATCH repos/strapi/strapi/issues/<n> -F milestone=<before number>` |
| `issue.milestone.clear` | same, with the milestone number recorded in `before`                          |
| `branch.push`           | `git push origin --delete releases/<version>`                                 |
| `branch.delete`         | `git push origin <before sha>:refs/heads/<branch>`                            |
| `pr.create`             | `gh pr close <n> --delete-branch`                                             |
| `pr.close`              | `gh pr reopen <n>`                                                            |
| `pr.label`              | `gh pr edit <n> --remove-label publish-experimental`                          |
| `pr.body`, `pr.comment` | Edit or delete by hand.                                                       |

`branch.delete` is a compare-and-swap on the head the preflight saw: the push carries
`--force-with-lease` against that SHA, so a commit pushed to the old branch mid-run makes the delete
fail instead of losing the commit. The same SHA is what `before` records, and what the undo restores.

## Repository settings this action depends on

`releases/*` is covered by a repository ruleset carrying `deletion`, `non_fast_forward` and
`required_status_checks`. `required_status_checks` gates ref **updates**, not only pull request
merges, and the required contexts are all `pull_request` checks that never exist on a `develop`
commit. The release GitHub App therefore has to be a bypass actor on the ruleset covering
`releases/*`, or the branch can be neither created nor advanced. Bypass is granted per actor and not
per rule, so that ruleset should cover `releases/*` alone and leave `main`, `develop` and `v4` with
no bypass actors at all.

## Stops

The run refuses to continue on any of these, all of them before the first write:

1. npm `latest` disagrees with the highest published stable version.
2. The `v<latest>` tag is missing.
3. The baseline is not an ancestor of `origin/develop`.
4. Rebase merges are enabled on the repository.
5. The range carries a breaking change.
6. The range is empty.
7. More than one open milestone.
8. `releases/<version>` exists with no open pull request drafting it.
9. The `version` input is malformed or not greater than the baseline.
10. Any commit-to-pulls lookup failed.
11. More than one release pull request is open against `main`.
12. The candidate's version is at or below the published baseline, so that release already shipped.
13. The candidate's branch head is not contained in `origin/develop`, so someone pushed to it.
14. The range now computes a version below the candidate's, so history was rewritten.
15. No milestone is titled after the candidate's version, or the open one is not the candidate's next.
16. A milestone already holds the title this run would rename another one onto.
17. A candidate's pull request is open but its branch is gone from the remote.

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
lib/candidate.ts finding the candidate in flight, and deciding draft / refresh / redraft
lib/pipeline.ts  `preflightRelease` decides and refuses, `applyRelease` writes
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
