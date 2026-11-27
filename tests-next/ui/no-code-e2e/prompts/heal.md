{{context}}

# Task: heal a generated spec after a UI change

`{{specFile}}` fails because the UI changed, not the behaviour. Triage said:

> {{triage}}

Scenario `{{scenarioFile}}`:

```markdown
{{scenario}}
```

Failure (end of the Playwright output, then the page snapshot at the failure):

```
{{failure}}
```

## Rules

- Fix how the spec reaches the page: selectors in Page Objects or components first (that fixes
  every spec using them), then the spec's steps (a new click, a dialog to confirm).
- Never remove, weaken or rewrite an `expect` of a spec, and never change what it expects. If the
  only way to make the spec pass is to change an assertion, the behaviour changed: stop and answer
  `cannot_heal`.
- Don't add waits for time, skips or retries.
- Run the spec with `run-spec.mjs` until it passes, then once with `--repeat-each 3`.

Answer with the JSON object: `status` (`healed` or `cannot_heal`) and `reason` (in French, one or
two sentences: what changed in the UI and what you changed).
