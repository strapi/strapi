import type { Page } from '@playwright/test';

/** The login page of the admin panel. */
export class LoginPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  loginButton() {
    return this.page.getByRole('button', { name: 'Login' });
  }
}
