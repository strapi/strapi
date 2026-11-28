import { expect, type Page } from '@playwright/test';

/**
 * The main navigation of the admin panel and the Settings menu. Page Objects open their page
 * through it, so a change to the menus is fixed here only.
 */
export class Navigation {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** A link of the main navigation, by its name: `Content Manager`, `Settings`… */
  mainLink(name: string) {
    // Exact: "Profile settings" on the home page also contains "Settings".
    return this.page.getByRole('navigation').getByRole('link', { name, exact: true });
  }

  /**
   * A link of the Settings menu, in its section: `settingsLink('Administration panel', 'Roles')`.
   * Two sections have a `Roles` link (admin and Users & Permissions).
   */
  settingsLink(section: string, name: string) {
    return this.page
      .getByRole('navigation', { name: 'Settings' })
      .getByRole('listitem')
      .filter({ has: this.page.getByText(section, { exact: true }) })
      .getByRole('link', { name, exact: true });
  }

  /** Opens a Settings page from the menus, the way a user does. */
  async openSettings(section: string, name: string) {
    await this.mainLink('Settings').click();
    const link = this.settingsLink(section, name);
    await expect(link).toBeVisible();
    await link.click();
  }
}
