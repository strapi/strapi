import { expect, type Page } from '@playwright/test';

import { Navigation } from '../../components';

/**
 * Settings: the menu of every settings page. A settings page that a test only opens (the smoke
 * test) doesn't need a class of its own: `openPage()` goes through the menu and `heading()` is
 * the page's title.
 */
export class SettingsPage {
  private readonly page: Page;

  private readonly navigation: Navigation;

  constructor(page: Page) {
    this.page = page;
    this.navigation = new Navigation(page);
  }

  /** The title of a settings page: `heading('Webhooks')`. */
  heading(name: string) {
    return this.page.getByRole('heading', { name, level: 1, exact: true });
  }

  /** Through the main navigation: Settings opens on its Overview page. */
  async open() {
    await this.navigation.mainLink('Settings').click();
    await expect(this.heading('Overview')).toBeVisible();
  }

  /**
   * A page of the Settings menu, by its section and link, from the page Settings is on:
   * `openPage('Users & Permissions plugin', 'Roles')`.
   */
  async openPage(section: string, name: string) {
    await this.navigation.settingsLink(section, name).click();
  }
}
