{{context}}

# Task: triage a failing generated spec

You only read: you change nothing. Decide why `{{specFile}}` fails.

Scenario `{{scenarioFile}}`, which states what the product must do:

```markdown
{{scenario}}
```

Failure (end of the Playwright output, then the page snapshot at the failure):

```
{{failure}}
```

Recent commits under `packages/`:

```
{{commits}}
```

Read the spec and the Page Objects it uses. Then pick one verdict:

- `locator`: the behaviour the scenario describes still happens, but the spec can't reach it: a
  renamed button or label, a moved element, a new step in the UI (a dialog, a menu). The snapshot
  shows the expected state or the way to reach it.
- `assertion`: the product no longer does what the scenario expects: a message, a status, a
  value, a redirect or a count differs from the expected results. This is a possible regression:
  the spec must not be changed to pass.
- `environment`: the app didn't start, a timeout before the page loaded, a seed or setup error:
  nothing to do with the scenario.

When in doubt between `locator` and `assertion`, answer `assertion`: a human looks at it.

Answer with the JSON object: `verdict`, `explanation` (in French, 2 to 4 sentences, citing what
the snapshot shows), and for an `assertion`, `expected` and `actual`.
