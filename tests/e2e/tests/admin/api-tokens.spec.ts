import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { navToHeader } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { Admin } from '../../pageHelpers/Admin';

const createAPIToken = async (admin: Admin, tokenName: string, duration: string, type: string) => {
  await admin.navToAPISection();
  await admin.fillName(tokenName);
  await admin.selectTokenDuration(duration);
  await admin.selectTokenType(type);
  await admin.saveToken();
  await admin.validateTokenCreation();
};
test.describe('API Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  const testCases = [
    ['30-day Read-only token', '30 days', 'Read-only'],
    ['30-day full-access token', '30 days', 'Full access'],
    ['7-day token', '7 days', 'Full access'],
    ['90-day token', '90 days', 'Full access'],
    ['unlimited token', 'Unlimited', 'Full access'],
  ];

  for (const [name, duration, type] of testCases) {
    test(`A user should be able to create a ${name}`, async ({ page }) => {
      const admin = new Admin(page);
      await createAPIToken(admin, name, duration, type);
    });
  }

  test('Created tokens list page should be correct', async ({ page }) => {
    const admin = new Admin(page);
    await createAPIToken(admin, 'my test token', 'unlimited', 'Full access');
    await admin.navToAPISection();
    await admin.validateTokenInList('my test token');
  });
});
