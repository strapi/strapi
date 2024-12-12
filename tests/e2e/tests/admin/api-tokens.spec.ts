import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { clickAndWait, navToHeader } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { sharedSetup } from '../../utils/setup';

const createAPIToken = async (page, tokenName, duration, type) => {
  await navToHeader(page, ['Settings', 'API Tokens', 'Create new API Token'], 'Create API Token');

  await clickAndWait(page, page.getByLabel('Name*'));
  await page.getByLabel('Name*').fill(tokenName);

  await clickAndWait(page, page.getByLabel('Token duration'));
  await clickAndWait(page, page.getByRole('option', { name: duration }));

  await clickAndWait(page, page.getByLabel('Token type'));
  await clickAndWait(page, page.getByRole('option', { name: type }));

  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

  await expect(page.getByText('Make sure to copy this token')).toBeVisible();
  await expect(page.getByText('Expiration date:')).toBeVisible();
};

test.describe('API Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });
  });

  // Test token creation
  const testCases = [
    ['30-day Read-only token', '30 days', 'Read-only'],
    ['30-day full-access token', '30 days', 'Full access'],
    ['7-day token', '7 days', 'Full access'],
    ['90-day token', '90 days', 'Full access'],
    ['unlimited token', 'Unlimited', 'Full access'],
  ];
  for (const [name, duration, type] of testCases) {
    test(`A user should be able to create a ${name}`, async ({ page }) => {
      await createAPIToken(page, name, duration, type);
    });
  }

  test('Created tokens list page should be correct', async ({ page }) => {
    await createAPIToken(page, 'my test token', 'unlimited', 'Full access');
    await navToHeader(page, ['Settings', 'API Tokens'], 'API Tokens');

    const row = page.getByRole('gridcell', { name: 'my test token', exact: true });
    await expect(row).toBeVisible();
  });
});
