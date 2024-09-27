# simple strapi command tests

These are the CLI tests for the simple strapi commands that aren't covered by another test domain

## Update list snapshots

To update the \*:list command snapshots:

- go to `/cli/test-apps/{the-test-app}`
- run `yarn install` to add project to workspace; do not commit any changes to yarn.lock
- run the command this test is for
- if output looks as expected, copy and paste it to this string
- you may need to run test:clean before tests can run again

For rows that have backslashes (\\) in the output, you must manually escape them with another backslash (\\)
