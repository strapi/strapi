# simple strapi command tests

These are the CLI tests for the simple strapi commands that aren't covered by another test domain

## Update list snapshots

To update the \*:list command snapshots:

- go to `cd test-apps/cli/test-app-0`
- run `yarn install` to add project to workspace; do not commit any changes to yarn.lock
- run the command this test is for (for example, `yarn strapi routes:list`)
- if output looks as expected, copy and paste it to the test string
  - backslashes (\\) must be manually escaped with another backslash (\\)
  - comparison only checks for the existence of each trimmed line that contains alphanumeric characters, so order and whitespace _outside_ of the boxes will not matter. Whitespace _within_ the boxes may be compared.
- you may need to run `yarn test:clean` before tests can run again
