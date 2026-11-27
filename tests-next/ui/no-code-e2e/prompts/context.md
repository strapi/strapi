# Context: the tests-next ui suite

You work in the Strapi monorepo, on the Playwright suite `tests-next/ui`. QA engineers write test
scenarios in Markdown (`tests-next/ui/scenarios/**/*.md`) and never write code: you turn a
scenario into a spec, or fix a spec. A human reviews your diff in a pull request.

The full guide is `tests-next/ui/README.md`. Read only the section you need: the rules below are
the ones that matter, and every turn costs money.

## Files

- Specs: `*.ui-test.ts`. Generated specs live in `tests-next/ui/tests/generated/`, at the same
  relative path as their scenario (`scenarios/auth/logout.md` →
  `tests/generated/auth/logout.ui-test.ts`). The scripts write the spec's two header lines
  (`// no-code-e2e: …`): don't write or edit them.
- Fixtures: always `import { expect, test } from '<relative path>/fixtures'`, never from
  `@playwright/test`. From `tests/generated/<domain>/x.ui-test.ts` the path is
  `../../../fixtures`, and the Page Objects are `../../../pages` and `../../../components`.
- Page Objects: `tests-next/ui/pages/` (one class per page, grouped like the panel's URLs,
  exported from `pages/index.ts`) and `tests-next/ui/components/` (shared UI: `Navigation`,
  `ConfirmDialog`). Reuse them first. Create one when a page has none, and export it.
- Content types of the app: `tests-next/ui/setup/schema.ts` (`article`, with a `title` string and
  draft & publish). Add one with `scaffoldContentType` when a scenario needs it; never remove or
  change an existing one.
- Exploration: to look at a page, write a throwaway spec in `tests-next/ui/tests/generated/_scratch/`
  that opens it and logs `await page.locator('main').ariaSnapshot()` (or another landmark), then
  run it. The folder is deleted after you finish.

## Fixtures

- `test.use({ role: 'admin' | 'editor' | 'author' | null })`: the page starts logged in as that
  role (`admin`, the Super Admin, is the default), or logged out with `null`. Never log in
  through the form, unless logging in is what the scenario tests.
- Data: `test.use({ seedPlan: { … } })` then the `seeded` fixture, or `await seed({ … })` in a
  test. A plan holds `entries` (`{ uid: 'api::article.article', data: { title }, status:
'published' | 'draft' }`), `media` (`{ file: <absolute path> }`), `apiTokens`, `adminRoles`,
  `adminUsers`, `users`, `locales`. See `SeedPlan` in `tests-next/shared/src/seed/types.ts`.
  Preconditions always become fixtures, never clicks.
- Each file starts from a reset database. Each test must pass alone and again with
  `--repeat-each`: a name the test creates and that must be unique (user, role, token) uses
  `unique('label')`, unless the scenario gives the exact name and nothing else creates it.
- `baseURL` is the worker's server: `page.goto('/admin/...')`.
- Uploads: you can't write binary files. Pass the file from memory:
  `setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(BASE64, 'base64') })`,
  with a small valid image as a base64 constant in the spec.

## How a spec is written

- Selectors live in Page Objects, never in specs. Specs call Page Objects and assert with
  `expect`. Page Objects act and expose locators; the only `expect` in a Page Object waits for
  the page to be ready (its heading).
- Selectors: roles and accessible names (`getByRole`, `getByLabel`, `getByText`), scoped to a
  landmark, row or dialog; `exact: true` when a name is a prefix of another. No CSS, no XPath,
  no `nth()` / `.last()`, no test ids unless nothing else identifies the element.
- Waits: no `waitForTimeout`, no `networkidle`. After an action, wait for what it causes: a
  locator, a URL, or `adminResponse(page, method, pathname)` from `pages/responses.ts` when
  nothing visible changes.
- Forbidden: `test.skip`, `test.fixme`, `test.only`, `describeOnCondition`, any condition that
  skips a test, and `process.env`. The scripts reject a diff that contains them.
- Tags: the scenario's `tier` becomes the test's tag: `test('…', { tag: ['@critical'] }, …)`
  (`@critical`, `@extended` or `@release`).
- Test names in English, short, describing the behaviour (`logs out and goes back to the login
page`). Code comments in English, only where the code alone doesn't say why.

## Tools

- Explore files with Read, Glob and Grep. Create a file with Write (it creates the folders),
  change one with Edit (Read it first).
- Bash runs `run-spec.mjs` and nothing else: `ls`, `cat`, `mkdir`, `npx`, `yarn` and `git` are
  denied. Don't ask for more permissions: they won't be granted.

## Running specs

Run specs only with:

    node tests-next/ui/no-code-e2e/scripts/run-spec.mjs <spec path> [--repeat-each N]

It prints the end of the Playwright output and, for a failure, the page's accessibility snapshot
at that moment (`error-context.md`): read it to fix a selector instead of guessing. The first run
of a job prepares the app; later runs take a few seconds plus the test itself.
