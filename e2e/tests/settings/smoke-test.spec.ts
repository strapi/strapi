import { test, expect, Page } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';
import { describeOnCondition } from '../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const headerVisible = async (page: Page, name: string) => {
  await page.waitForSelector(`:is(h1, h2, h3, h4, h5, h6):has-text("${name}")`);
  return page.getByRole('heading', { name }).isVisible();
};

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('every expected feature is displayed', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

    await page.getByRole('link', { name: 'API Tokens' }).click();
    expect(await headerVisible(page, 'API Tokens')).toBe(true);

    await page.getByLabel('Settings').getByRole('link', { name: 'Documentation' }).click();
    expect(await headerVisible(page, 'Documentation')).toBe(true);

    await page.getByRole('link', { name: 'Internationalization' }).click();
    expect(await headerVisible(page, 'Internationalization')).toBe(true);

    await page.getByLabel('Settings').getByRole('link', { name: 'Media Library' }).click();
    expect(await headerVisible(page, 'Media Library')).toBe(true);

    await page.getByRole('link', { name: 'Single Sign-On' }).click();
    expect(await headerVisible(page, 'Single Sign-On')).toBe(true);

    await page.getByRole('link', { name: 'Transfer Tokens' }).click();
    expect(await headerVisible(page, 'Transfer Tokens')).toBe(true);

    await page.getByRole('link', { name: 'Webhooks' }).click();
    expect(await headerVisible(page, 'Webhooks')).toBe(true);

    await page.getByRole('link', { name: 'Roles' }).first().click();
    expect(await headerVisible(page, 'Roles')).toBe(true);

    await page.getByRole('link', { name: 'Users' }).click();
    expect(await headerVisible(page, 'Users')).toBe(true);
  });

  describeOnCondition(edition === 'EE')(() => {
    test('every EE feature is displayed', async ({ page }) => {
      await page.getByRole('link', { name: 'Review Workflows' }).click();
      expect(await headerVisible(page, 'Review Workflows')).toBe(true);

      await page.getByRole('link', { name: 'Audit Logs' }).click();
      expect(await headerVisible(page, 'Audit Logs')).toBe(true);
    });
  });
});
