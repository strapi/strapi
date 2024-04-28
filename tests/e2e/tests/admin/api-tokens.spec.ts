import { test, expect, Page } from '@playwright/test';
import { login } from '../../utils/login';
import { navToHeader } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';

const createAPIToken = async (page, tokenName, duration, type) => {
  await navToHeader(page, ['Settings', 'API Tokens', 'Create new API Token'], 'Create API Token');

  await page.getByLabel('Name*').click();
  await page.getByLabel('Name*').fill(tokenName);

  await page.getByLabel('Token duration').click();
  await page.getByRole('option', { name: duration }).click();

  await page.getByLabel('Token type').click();
  await page.getByRole('option', { name: type }).click();

  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Make sure to copy this token')).toBeVisible();
  await expect(page.getByText('Expiration date:')).toBeVisible();
};

test.describe('API Tokens', () => {
  let page: Page;

  // For some reason, logging in after each token is extremely flaky, so we'll just do it once
  test.beforeAll(async ({ browser }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    page = await browser.newPage();
    await login({ page });
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
    test(`A user should be able to create a ${name}`, async ({}) => {
      await createAPIToken(page, name, duration, type);
    });
  }

  test('Created tokens list page should be correct', async ({}) => {
    await createAPIToken(page, 'my test token', 'unlimited', 'Full access');
    await navToHeader(page, ['Settings', 'API Tokens'], 'API Tokens');

    const row = page.getByRole('gridcell', { name: 'my test token', exact: true });
    await expect(row).toBeVisible();
    // await expect(row.getByText(/\d+ (second|minute)s? ago/)).toBeVisible();
  });
});
