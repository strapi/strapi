import { expect, type Locator, type Page } from '@playwright/test';

import { adminResponse } from '../responses';

/** Settings > Roles > a role: the create form (`/new`) and the edit form (`/:id`). */
export class RolePage {
  readonly name: Locator;

  readonly description: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.name = page.getByRole('textbox', { name: 'Name' });
    this.description = page.getByRole('textbox', { name: 'Description' });
  }

  async goto(id: number | 'new') {
    await this.page.goto(`/admin/settings/roles/${id}`);
    await expect(this.name).toBeVisible();
  }

  async fill({ name, description }: { name?: string; description?: string }) {
    if (name !== undefined) await this.name.fill(name);
    if (description !== undefined) await this.description.fill(description);
  }

  /** A tab of the permissions: `Collection Types`, `Single Types`, `Plugins`, `Settings`. */
  async openPermissionsTab(tab: string) {
    await this.page.getByRole('tab', { name: tab }).click();
  }

  /**
   * The checkbox of one action on one content type, by their display names:
   * `permission('Publish', 'article')`.
   */
  permission(action: string, subject: string) {
    return this.page.getByRole('checkbox', {
      name: `Select ${action} ${subject} permission`,
      exact: true,
    });
  }

  /** Creates the role: the form then opens the new role's edit page. */
  async create() {
    await this.page.getByRole('button', { name: 'Save' }).click();
    await expect(this.page).toHaveURL(/\/admin\/settings\/roles\/\d+$/);
  }

  /** Saves an existing role: its permissions, then its name and description. */
  async save() {
    const saved = adminResponse(this.page, 'PUT', /^\/admin\/roles\/\d+$/);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await saved;
  }
}
