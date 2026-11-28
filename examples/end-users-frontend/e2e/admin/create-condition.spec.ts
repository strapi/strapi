import { expect, test } from '@playwright/test';

import { goToEndUsers, openRoleEditor, openSettings, signInAdmin } from './helpers.ts';

import type { Page } from '@playwright/test';

/** An origin Strapi trusts (`FRONTEND_URL` in `playwright.config.ts`), which a sign-up must come from */
const FRONTEND_ORIGIN = 'http://localhost:5173';

const SAMPLE_PASSWORD = ['Passw0rd', '!long'].join('');

const DISPLAY_NAME = 'E2E titles';

/** Opens a single select by its name and picks an option */
const choose = async (page: Page, select: string, option: string) => {
  await page.getByRole('combobox', { name: select, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

test('an admin creates a condition in development and a role can pick it', async ({
  page,
  request,
}) => {
  // Saving writes a file and restarts Strapi, which compiles the application again first
  test.setTimeout(240_000);

  // The end user the preview is tried with
  const sampleEmail = `e2e-sample-${Date.now()}@example.com`;
  const signedUp = await request.post('/api/auth/sign-up/email', {
    data: { name: 'E2E Sample', email: sampleEmail, password: SAMPLE_PASSWORD },
    headers: { Origin: FRONTEND_ORIGIN },
  });

  expect(signedUp.ok()).toBe(true);

  await signInAdmin(page);
  await goToEndUsers(page, 'Conditions');

  await page.getByRole('link', { name: 'New condition' }).click();
  await expect(page.getByRole('heading', { name: 'New condition' })).toBeVisible();

  // Named like the files the next run removes (`e2e/reset-database.mjs`)
  await page.getByRole('textbox', { name: /^Name/ }).fill(`e2e-${Date.now()}`);
  await page.getByRole('textbox', { name: /Display name/ }).fill(DISPLAY_NAME);

  // Applies to Article
  await page.getByRole('combobox', { name: /Content types/ }).click();
  await page.getByRole('option', { name: 'Article' }).click();
  // The list of a multiple choice stays open
  await page.keyboard.press('Escape');

  // An input a role gives: minTitle, a text that starts at "ok"
  await page.getByRole('button', { name: 'Add input' }).click();
  await page.getByRole('textbox', { name: 'Input 1 name' }).fill('minTitle');
  await page.getByRole('textbox', { name: 'Input 1 default' }).fill('ok');

  // Who: users with a verified email
  await page.getByRole('button', { name: 'Add verified email check' }).click();

  // Which: title starts with the input, and any of (author is the signed-in user, publishedAt is empty)
  await page.getByRole('button', { name: 'Add check' }).click();
  await choose(page, 'Which check 1 field', 'title');
  await choose(page, 'Which check 1 operator', 'starts with');
  await choose(page, 'Which check 1 value kind', 'An input');
  await choose(page, 'Which check 1 value input', 'minTitle');

  await page.getByRole('button', { name: 'Add group' }).click();

  const group = page.getByRole('group', { name: 'Which group 2' });

  // A new group starts with one check
  await choose(page, 'Which group 2 check 1 field', 'author.documentId');
  await choose(page, 'Which group 2 check 1 value kind', 'The signed-in user');

  await group.getByRole('button', { name: 'Add check' }).click();
  await choose(page, 'Which group 2 check 2 field', 'publishedAt');
  await choose(page, 'Which group 2 check 2 operator', 'is empty');

  // On create, set author to the user
  await page.getByRole('button', { name: 'Set a field on create' }).click();
  await choose(page, 'Stamp 1 field', 'author');

  // The summary says what was built
  const summary = page.getByRole('region', { name: 'Summary' });

  await expect(summary).toContainText('Applies to Article.');
  await expect(summary).toContainText('Only for users who have a verified email.');
  await expect(summary).toContainText('title starts with the minTitle input');
  await expect(summary).toContainText('author.documentId is the signed-in user');
  await expect(summary).toContainText('publishedAt is empty');
  await expect(summary).toContainText('On create, sets author to the signed-in user.');

  // Try it on the end user before saving: how many articles it keeps for them
  await page.getByRole('textbox', { name: "End user's email" }).fill(sampleEmail);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByText(/\d+ of \d+ articles/)).toBeVisible();

  // Save. Strapi restarts, and the page goes back to the list once it is up again
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByRole('row', { name: new RegExp(DISPLAY_NAME) })).toContainText('Builder', {
    timeout: 90_000,
  });

  // A role can pick it: Editor › Article › Settings lists it, to tick. Nothing is saved
  await openRoleEditor(page, 'Editor');

  const dialog = await openSettings(page, 'Article');

  await dialog.getByRole('combobox', { name: 'Can Find When' }).click();

  const picked = page.getByRole('option', { name: DISPLAY_NAME });

  await expect(picked).toBeVisible();
  await expect(picked).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});
