import { expect, type Locator, type Page } from '@playwright/test';

/** Settings > Global settings > API Tokens: the list of API tokens. */
export class ApiTokensPage {
  readonly heading: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'API Tokens', level: 1 });
  }

  async goto() {
    await this.page.goto('/admin/settings/api-tokens');
    await expect(this.heading).toBeVisible();
  }

  /** The row of a token, by its exact name. */
  row(name: string) {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name, exact: true }) });
  }

  /** Opens the create form (ApiTokenPage). */
  async addToken() {
    // The button shows in the header, and again under an empty list.
    await this.page.getByRole('link', { name: 'Create new API Token' }).first().click();
  }

  /** Opens a token's page (ApiTokenPage) from its row. */
  async openToken(name: string) {
    await this.page.getByRole('link', { name: `Edit ${name}`, exact: true }).click();
  }
}
