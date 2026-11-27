# No-code E2E (PoC)

QA engineers write ui test scenarios in Markdown ([`../scenarios`](../scenarios/README.md)).
CI workflows run Claude Code to turn them into Playwright specs, keep the specs green when the UI
changes, and open a Linear issue when a spec catches what looks like a regression.

The day-to-day run is plain Playwright: generated specs are committed, reviewed and run by the
`tests_next_ui` jobs like any other spec. The model is only called when a scenario changes or a
generated spec fails.

## Layout

| Path                              | What                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `tests-next/ui/scenarios/`        | Scenarios (`.md`), written by QA engineers                       |
| `tests-next/ui/tests/generated/`  | Generated specs, at the scenario's relative path                 |
| `no-code-e2e/config.json`         | Paths, models, turn and budget caps, Linear team and project     |
| `no-code-e2e/prompts/`            | What the agents are told: shared context, generate, triage, heal |
| `no-code-e2e/scripts/`            | Orchestration, without dependencies (Node ≥ 22)                  |
| `.github/workflows/no-code-e2e-*` | The two workflows                                                |

Each generated spec starts with `// no-code-e2e: scenario=<file> id=<id> hash=<hash>`. The hash
is the scenario's: a spec is regenerated when it differs, and deleted when its scenario is gone.
A run only looks at the files, so it is idempotent whatever triggered it.

## Workflows

### `No-code E2E: generate`

On a PR of this repository that changes `tests-next/ui/scenarios/**` (never forks or bots), or by
hand (`only`: scenario ids, `model`: another generation model).

1. `plan`: lints every scenario and lists what to do. Stops there when nothing is out of date,
   which is the case after the app's own push.
2. `generate`, one scenario at a time:
   - the agent (`models.generate`) writes the spec, and Page Objects or a content type of
     `setup/schema.ts` when needed, or refuses the scenario, or asks for clarification;
   - the script stamps the header, checks the diff and runs the spec `repeatEach` times;
   - red: retried with the failure (`attempts.generate`), then once with `models.escalate`;
   - green: committed. Otherwise rolled back.
3. The whole ui suite runs once, then a last diff check on everything.
4. The commits are pushed to the PR's branch by the GitHub App (so `tests_next_ui` runs on them),
   and the report is posted as a PR comment.

### `No-code E2E: heal`

After the Tests workflow fails on `develop`, on a PR when the `no-code-e2e-heal` label is added,
or by hand.

1. Runs the generated specs. Each failing spec runs again: green means flaky (Linear issue).
2. Triage (`models.triage`, read-only): `locator` (the UI moved), `assertion` (the behaviour
   changed: possible regression, Linear issue) or `environment`.
3. `locator`: the healer (`models.heal`) fixes Page Objects or steps, never an assertion. Kept
   when the spec is green `repeatEach` times, the diff check passes and the whole suite stays
   green; then pushed to `no-code-e2e/heal-<run>` with a PR against the tested branch.

Linear issues go to the project of `config.json`, one open issue per scenario: a new failure
comments on it.

## Guardrails

- **Tools**: Claude Code runs with `--permission-mode dontAsk`: reading is allowed, editing only
  in `allowedPaths` (generate or heal), and Bash only runs `scripts/run-spec.mjs`.
- **Diff check** (`lib.mjs`, `checkChanges`), without a model, on every attempt and on the whole
  run: allowed paths only; no `skip`, `fixme`, `only`, `describeOnCondition`, `waitForTimeout`,
  `networkidle` or `process.env`; no removed `expect` in a spec, except in a spec regenerated from
  a changed scenario; deletions only of generated specs. A violation rolls the changes back.
- **GitHub App**: contents and pull requests write, no workflows permission, no bypass of branch
  rules. It can't change a workflow or push to `develop`.
- **Secrets**: only for PRs from branches of this repository.

## Cost

- `--bare`: no CLAUDE.md, hooks or plugins in the agents' context; `prompts/context.md` carries
  what they need.
- `run-spec.mjs` prints the end of the Playwright output and the page's accessibility snapshot at
  the failure (`error-context.md`), not the whole log. Agents explore a page with a throwaway spec
  that logs an aria snapshot, instead of a browser MCP server.
- Caps per call: `maxTurns` and `maxBudgetUsd`. The workflows cancel a run when a new push comes.
- Each run reports the cost and turns per scenario (job summary and PR comment).

## Run locally

```bash
node tests-next/ui/no-code-e2e/scripts/scenarios.mjs              # lint + plan, no model call
node --test tests-next/ui/no-code-e2e/scripts/__tests__/*.test.mjs

# Needs `yarn build`, Chromium, Claude Code (`claude`) and ANTHROPIC_API_KEY:
node tests-next/ui/no-code-e2e/scripts/generate.mjs --report /tmp/report.json --only auth-logout
node tests-next/ui/no-code-e2e/scripts/heal.mjs --report /tmp/report.json
```

`generate.mjs` and `heal.mjs` commit locally and reset the working tree of `tests-next/ui` on
failure: run them on a clean branch.
