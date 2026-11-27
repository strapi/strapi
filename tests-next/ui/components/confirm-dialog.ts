import { expect, type Page } from '@playwright/test';

/** The "Are you sure?" dialog of delete actions. */
export class ConfirmDialog {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get root() {
    return this.page.getByRole('alertdialog', { name: 'Confirmation' });
  }

  async confirm() {
    await this.root.getByRole('button', { name: 'Confirm' }).click();
    await expect(this.root).toBeHidden();
  }

  async cancel() {
    await this.root.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.root).toBeHidden();
  }
}
