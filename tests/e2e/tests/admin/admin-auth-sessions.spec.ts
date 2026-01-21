import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { TITLE_LOGIN, TITLE_HOME } from '../../constants';

test.describe('Legacy Admin Token Migration', () => {
  test.beforeEach(async ({ page, context }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await context.clearCookies();
    await page.goto('/admin');
  });

  test('should force logout on first interaction with legacy token', async ({ page }) => {
    // Simulate pre-upgrade state: inject legacy token into localStorage
    await page.evaluate(() => {
      const legacyToken = JSON.stringify('invalid-test-token');
      localStorage.setItem('jwtToken', legacyToken);
    });

    // Try to access admin - should be redirected to login
    await page.goto('/admin');

    // Should be redirected to login page
    await expect(page).toHaveTitle(TITLE_LOGIN);
    await expect(page.getByText('Log in to your Strapi account')).toBeVisible();
  });

  test('should maintain login state after fresh authentication', async ({ page, context }) => {
    // Clear any legacy tokens first
    await page.evaluate(() => {
      const legacyToken = JSON.stringify('legacy-token');
      localStorage.setItem('jwtToken', legacyToken);
    });

    // Navigate to login page
    await page.goto('/admin');
    await expect(page).toHaveTitle(TITLE_LOGIN);

    // Perform fresh login
    await login({ page });

    // Should be logged in successfully
    await expect(page).toHaveTitle(TITLE_HOME);

    // Verify session cookie is created
    const cookies = await context.cookies();
    const refreshCookie = cookies.find((cookie) => cookie.name === 'strapi_admin_refresh');
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.httpOnly).toBe(true);

    // Reload page - should stay logged in (session persistence)
    await page.reload();
    await expect(page).toHaveTitle(TITLE_HOME);
  });

  test('should handle session expiry gracefully', async ({ page, context }) => {
    // Login first
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);

    // Clear cookies and localStorage to simulate session expiry
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Navigate to trigger authentication check - should redirect to login
    await page.goto('/admin/settings');
    await expect(page).toHaveTitle(TITLE_LOGIN);
    await expect(page.getByText('Log in to your Strapi account')).toBeVisible();
  });
});
