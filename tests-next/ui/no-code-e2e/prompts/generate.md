{{context}}

# Task: generate the spec of a scenario

Scenario file: `{{scenarioFile}}`
Spec to write: `{{specFile}}`
{{regenerating}}

```markdown
{{scenario}}
```

## First, decide whether this scenario belongs here

Answer `refused` (and write no file) when the scenario is not a UI test of the admin panel:

- It checks an API directly (REST, GraphQL, content API, API token rights on the API): that is
  the API test suite (`tests-next/api`).
- It checks the Document Service, data transfer (`strapi transfer`), the MCP server, the CLI, or a
  deep relation matrix: lower layers own them.
- It creates, edits or deletes a content type, field or component through the Content-Type
  Builder: the suite's database reset doesn't support schema changes yet. Opening the
  Content-Type Builder to look at a content type is fine.
- It needs an AI feature of the product to answer for real (no stub exists).

Answer `needs_clarification` when a step or an expected result is too vague to assert (which
message, which page, which value?), and say exactly what is missing. Don't guess an assertion.

## Otherwise, write the spec

1. Read the Page Objects you may reuse (`tests-next/ui/pages/index.ts`, `components/index.ts`)
   and one existing spec close to the scenario, for the style.
2. Turn the preconditions into fixtures (`role`, `seedPlan` / `seed`, a content type in
   `setup/schema.ts` if one is missing).
3. Write the steps through Page Objects, creating or extending Page Objects where needed.
4. Each bullet of "Résultats attendus" / "Expected results" becomes at least one `expect`. Assert
   exactly what it says: don't weaken it, don't add unrelated assertions, don't drop one because
   it is hard to check (answer `needs_clarification` instead).
5. Run the spec with `run-spec.mjs`, fix it until it passes, then run it once with
   `--repeat-each 3`.
6. Keep the scenario's wording in the test name and a one-line comment per step only when the
   code doesn't make the step obvious.

Don't touch other specs, the scenario, or anything outside the allowed paths: those edits are
denied. When you are done, answer with the JSON object: `status`, `reason` (in English, one or two
sentences a QA engineer understands) and `files`.

{{feedback}}
