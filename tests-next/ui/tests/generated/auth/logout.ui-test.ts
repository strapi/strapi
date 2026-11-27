// no-code-e2e: scenario=tests-next/ui/scenarios/auth/logout.md id=auth-logout hash=77a11f32ff57
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

    // The login form shows the "Email" and "Password" fields.
    await expect(login.emailField()).toBeVisible();
    await expect(login.passwordField()).toBeVisible();

    // Step 4: opening the home page again redirects to the login page.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/auth\/login/);
    await expect(login.loginButton()).toBeVisible();
  }
);
