import { test, expect, type Page } from '@playwright/test';
import { sharedSetup } from '../../../utils/setup';
import { switchUser } from '../../../utils/login';
import {
  ADMIN_EMAIL_ADDRESS,
  ADMIN_PASSWORD,
  EDITOR_EMAIL_ADDRESS,
  EDITOR_PASSWORD,
} from '../../constants';

/**
 * Open Admin Tokens via direct routes (Layout header title is not a semantic heading).
 */
const goToAdminTokensList = async (page: Page) => {
  await page.goto('/admin/settings/admin-tokens');
  // Avoid matching the Settings nav link (also "Admin Tokens"); the list page uses an h1.
  await expect(page.getByRole('heading', { name: 'Admin Tokens', exact: true })).toBeVisible();
};

const goToCreateAdminToken = async (page: Page) => {
  await page.goto('/admin/settings/admin-tokens/create');
  await expect(page.getByText('Create Admin Token', { exact: true })).toBeVisible();
};

const createAdminToken = async (page: Page, tokenName: string, duration?: string) => {
  await goToCreateAdminToken(page);
  await page.getByLabel('Name*').fill(tokenName);
  if (duration !== undefined) {
    await page.getByLabel('Token duration').click();
    await page.getByRole('option', { name: duration }).click();
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
};

test.describe('Admin Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('admin-tokens-e2e', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
    });
  });

  test('creates a 30-day admin token and shows Copy after save', async ({ page }) => {
    await createAdminToken(page, 'e2e-admin-token-30d', '30 days');
  });

  test('list shows the token and Owner column', async ({ page }) => {
    await createAdminToken(page, 'e2e-admin-token-list', '30 days');
    await goToAdminTokensList(page);
    await expect(page.getByRole('gridcell', { name: 'Owner', exact: true })).toBeVisible();
    await expect(
      page.getByRole('gridcell', { name: 'e2e-admin-token-list', exact: true })
    ).toBeVisible();
  });

  test('create page has no Content-API Token type selector', async ({ page }) => {
    await goToCreateAdminToken(page);
    await expect(page.getByLabel('Token type')).not.toBeVisible();
  });

  test('create page shows permission matrix with Plugins tab', async ({ page }) => {
    await goToCreateAdminToken(page);
    await expect(page.getByRole('tab', { name: 'Plugins' })).toBeVisible();
  });
});

test.describe('Admin Tokens — ownership', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('admin-tokens-ownership', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
    });
  });

  test('non-owner super admin sees Owner but not Copy / Regenerate on editor token', async ({
    page,
  }) => {
    await switchUser({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await createAdminToken(page, 'e2e-editor-owned-token', '30 days');

    await switchUser({ page, username: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD });
    await goToAdminTokensList(page);
    await page.getByRole('gridcell', { name: 'e2e-editor-owned-token', exact: true }).click();

    await expect(page.getByLabel('Owner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Regenerate' })).not.toBeVisible();
  });

  test('token owner sees Copy and Regenerate after create', async ({ page }) => {
    await switchUser({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await createAdminToken(page, 'e2e-owner-sees-actions', '30 days');
    await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  });
});
