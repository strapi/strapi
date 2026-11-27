import { expect, type Locator, type Page } from '@playwright/test';

import { adminResponse } from '../responses';

/** Settings > API Tokens > a token: the create and edit form. */
export class ApiTokenPage {
  readonly nameField: Locator;

  readonly duration: Locator;

  readonly type: Locator;

  /** The token's value, shown once after the creation. */
  readonly tokenValue: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.nameField = page.getByRole('textbox', { name: 'Name' });
    this.duration = page.getByRole('combobox', { name: 'Token duration' });
    this.type = page.getByRole('combobox', { name: 'Token type' });
    this.tokenValue = page.locator('main').getByText(/^[0-9a-f]{64,}$/);
  }

  heading(name: string) {
    return this.page.getByRole('heading', { name, level: 1 });
  }

  async expectCreateFormReady() {
    await expect(this.heading('Create API Token')).toBeVisible();
  }

  async fill({ name, duration, type }: { name: string; duration: string; type: string }) {
    await this.nameField.fill(name);
    await this.duration.click();
    await this.page.getByRole('option', { name: duration, exact: true }).click();
    await this.type.click();
    await this.page.getByRole('option', { name: type, exact: true }).click();
  }

  /** Saves and waits for the creation (the page then shows the token's value). */
  async save() {
    const saved = adminResponse(this.page, 'POST', /^\/admin\/api-tokens$/);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await saved;
  }

  /** Goes back to the list of tokens with the "Back" link. */
  async goBack() {
    await this.page.getByRole('link', { name: 'Back' }).click();
  }
}
