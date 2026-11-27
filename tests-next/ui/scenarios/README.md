# No-code E2E scenarios

Each `.md` file of this folder describes a test of the admin panel. When a PR adds or changes a
scenario, CI generates the matching Playwright spec and pushes it to the PR's branch. There is no
code to write: review the generated spec and the comment left on the PR, then merge.

How it works: [`../no-code-e2e/README.md`](../no-code-e2e/README.md).

## Writing a scenario

One folder per domain (`content-manager/`, `settings/`…), one file per scenario.

```markdown
---
id: cm-create-and-publish-article # unique, kebab-case
feature: content-manager
tier: critical # critical | extended | release
edition: CE # CE (EE not supported yet)
---

# Create and publish an article

## Preconditions

I am logged in as an editor.
There are 3 published articles.

## Steps

1. Go to the Content Manager, "Article" collection.
2. Create a new entry with the title "Hello world".
3. Publish the entry.

## Expected results

- A success notification shows.
- The entry shows in the list with the "Published" status.
```

- **Preconditions**: free text. The role (administrator, editor, author, logged out), the data
  ("3 published articles"), a content type the test needs ("a Product content type with a price
  field"). They are created directly in the database, not through the UI.
- **Steps**: a numbered list of what a user does in the admin panel.
- **Expected results**: a bulleted list. Each bullet becomes at least one check. Be precise: the
  exact text of a message, the expected status, the number of items. A result too vague to check
  gets a question on the PR instead of a guess.
- Section titles can also be in French: `Préconditions`, `Étapes`, `Résultats attendus`.

## What is refused

The agent refuses these, with an explanation on the PR:

- API tests (REST, GraphQL, API token rights): they belong to the API suite;
- Document Service, data transfer, MCP server, CLI;
- creating or changing a content type in the Content-Type Builder (viewing one is fine);
- the product's AI features;
- the EE edition, for now.

## Checking a scenario before pushing

```bash
node tests-next/ui/no-code-e2e/scripts/scenarios.mjs
```

Prints format errors and the scenarios that will be generated. No AI call.

## Changing or deleting a scenario

- Changing a `.md` regenerates its spec on the next CI run.
- Deleting a `.md` deletes its spec.
- Never edit a generated spec by hand: it would be overwritten. Change the scenario.
