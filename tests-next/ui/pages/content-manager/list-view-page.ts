import { expect, type Locator, type Page } from '@playwright/test';

/** Content Manager > a collection type: the list of its entries. */
export class ListViewPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The title of the list: the content type's display name. */
  heading(displayName: string): Locator {
    return this.page.getByRole('heading', { name: displayName, level: 1, exact: true });
  }

  /** By uid and display name: `goto('api::article.article', 'Article')`. */
  async goto(uid: string, displayName: string) {
    await this.page.goto(`/admin/content-manager/collection-types/${uid}`);
    await expect(this.heading(displayName)).toBeVisible();
  }

  /** Opens an entry's edit view (EditViewPage) by clicking a cell of its row. */
  async openEntry(cellText: string) {
    await this.page.getByRole('gridcell', { name: cellText, exact: true }).click();
  }
}
