import { expect, type Locator, type Page } from '@playwright/test';

import { adminResponse } from '../responses';

/** Settings > Users > a user: the edit form. */
export class UserPage {
  readonly roles: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.roles = page.getByRole('combobox', { name: "User's roles" });
  }

  /** Replaces roles in the "User's roles" select, by name. */
  async changeRoles({ remove = [], add = [] }: { remove?: string[]; add?: string[] }) {
    await this.roles.click();
    const listbox = this.page.getByRole('listbox');
    for (const role of remove) {
      await listbox.getByRole('option', { name: role, exact: true }).uncheck();
    }
    for (const role of add) {
      await listbox.getByRole('option', { name: role, exact: true }).check();
    }
    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  }

  async save() {
    const saved = adminResponse(this.page, 'PUT', /^\/admin\/users\/\d+$/);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await saved;
  }
}
