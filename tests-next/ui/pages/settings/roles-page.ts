import { expect, type Locator, type Page } from '@playwright/test';

import { ConfirmDialog, Navigation } from '../../components';
import { adminResponse } from '../responses';

/** Settings > Administration panel > Roles: the list of admin roles. */
export class RolesPage {
  readonly heading: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Roles', level: 1 });
  }

  async goto() {
    await this.page.goto('/admin/settings/roles');
    await expect(this.heading).toBeVisible();
  }

  /** Through the main navigation and the Settings menu. */
  async open() {
    await new Navigation(this.page).openSettings('Administration panel', 'Roles');
    await expect(this.heading).toBeVisible();
  }

  /** The row of a role, by its exact name: `Editor` doesn't match `Super Editor`. */
  row(name: string) {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name, exact: true }) });
  }

  /** A cell of a role's row, by its exact text (name, description, users). */
  cell(name: string, text: string) {
    return this.row(name).getByRole('gridcell', { name: text, exact: true });
  }

  /** Opens the create form (RolePage). */
  async addRole() {
    // The button shows twice: in the header and under the list.
    await this.page.getByRole('button', { name: 'Add new role' }).first().click();
  }

  /** Opens a role's edit form (RolePage) by clicking its row. */
  async openRole(name: string) {
    await this.row(name).click();
  }

  /** Deletes a role with no users, and waits for the deletion. */
  async deleteRole(name: string) {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    const deleted = adminResponse(this.page, 'POST', /^\/admin\/roles\/batch-delete$/);
    await new ConfirmDialog(this.page).confirm();
    await deleted;
  }
}
