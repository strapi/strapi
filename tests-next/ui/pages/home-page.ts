import { expect, type Page } from '@playwright/test';

/** The home page of the admin panel and the profile menu of its navigation. */
export class HomePage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  heading() {
    return this.page.getByRole('heading', { name: /^Hello/, level: 1 });
  }

  /** The button of the navigation that opens the profile menu (the user's initials and name). */
  profileMenuButton() {
    return this.page.getByRole('navigation').getByRole('button');
  }

  async open() {
    await this.page.goto('/admin');
    await expect(this.heading()).toBeVisible();
  }

  async logOut() {
    await this.profileMenuButton().click();
    await this.page.getByRole('menuitem', { name: 'Log out' }).click();
  }
}
