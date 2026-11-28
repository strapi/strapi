import { expect, type Locator, type Page } from '@playwright/test';

import { Navigation } from '../../../components';

/**
 * Settings > Users & Permissions plugin > Roles: the end-user roles (Public, Authenticated), not
 * the admin roles of `RolesPage`.
 */
export class UsersPermissionsRolesPage {
  readonly heading: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Roles', level: 1 });
  }

  async goto() {
    await this.page.goto('/admin/settings/users-permissions/roles');
    await expect(this.heading).toBeVisible();
  }

  /** Through the main navigation and the Settings menu. */
  async open() {
    await new Navigation(this.page).openSettings('Users & Permissions plugin', 'Roles');
    await expect(this.heading).toBeVisible();
  }

  /** The name cell of a role, exact: `Public`, `Authenticated`. */
  role(name: string) {
    return this.page.getByRole('gridcell', { name, exact: true });
  }
}
