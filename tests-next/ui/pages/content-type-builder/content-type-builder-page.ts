import { expect, type Page } from '@playwright/test';

/** Content-Type Builder: the list of types on the left and the fields of the open type. */
export class ContentTypeBuilderPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private sideMenu() {
    return this.page.getByRole('navigation', { name: 'Content-Type Builder' });
  }

  /**
   * By URL: clicking the main navigation link leaves its tooltip over the side menu's first
   * links, which then can't be clicked.
   */
  async open() {
    await this.page.goto('/admin/plugins/content-type-builder');
    await expect(
      this.sideMenu().getByRole('heading', { name: 'Content-Type Builder' })
    ).toBeVisible();
  }

  /** Opens a type from the side menu and waits for its title. */
  async openType(name: string) {
    await this.sideMenu().getByRole('link', { name, exact: true }).click();
    await expect(this.page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
  }

  collectionTypeLink(name: string) {
    return this.sideMenu().getByRole('link', { name, exact: true });
  }

  /** A field of the open type, with its name and its type shown inside. */
  field(name: string) {
    return this.page.getByRole('button', { name, exact: true });
  }

  saveButton() {
    return this.sideMenu().getByRole('button', { name: 'Save' });
  }
}
