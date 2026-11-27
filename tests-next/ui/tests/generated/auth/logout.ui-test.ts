// no-code-e2e: scenario=tests-next/ui/scenarios/auth/logout.md id=auth-logout hash=d0ecf4d81a1f
// Generated from tests-next/ui/scenarios/auth/logout.md. Do not edit by hand: change the scenario instead.
import { expect, test } from '../../../fixtures';
import { HomePage, LoginPage } from '../../../pages';

test(
  'logs out and redirects to the login page when opening the home page again',
  { tag: ['@critical'] },
  async ({ page }) => {
    const home = new HomePage(page);
    const login = new LoginPage(page);

    await home.open();
    await home.logOut();

    // After logging out, the login page shows.
    await expect(page).toHaveURL(/\/admin\/auth\/login/);
    await expect(login.loginButton()).toBeVisible();

    // Step 4: opening the home page again redirects to the login page.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/auth\/login/);
    await expect(login.loginButton()).toBeVisible();
  }
);
