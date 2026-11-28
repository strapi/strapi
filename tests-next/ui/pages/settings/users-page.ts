import { expect, type Locator, type Page } from '@playwright/test';

import { Navigation } from '../../components';

/** Settings > Administration panel > Users: the list of admin users. */
export class UsersPage {
  readonly heading: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Users', level: 1 });
  }

  async goto() {
    await this.page.goto('/admin/settings/users');
    await expect(this.heading).toBeVisible();
  }

  /** Through the main navigation and the Settings menu. */
  async open() {
    await new Navigation(this.page).openSettings('Administration panel', 'Users');
    await expect(this.heading).toBeVisible();
  }

  /**
   * The rows whose text contains `text`, for example a user's full name, or
   * `` `${fullName} ${email} ${role}` `` to check a user's role.
   */
  row(text: string) {
    return this.page.getByRole('row', { name: text });
  }

  /** Opens a user's edit page (UserPage), by full name. */
  async openUser(fullName: string) {
    await this.row(fullName)
      .getByRole('link', { name: `Edit ${fullName}` })
      .click();
  }
}
