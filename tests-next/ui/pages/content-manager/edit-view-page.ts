import { URL } from 'node:url';

import { expect, type Locator, type Page } from '@playwright/test';

/** Content Manager > an entry: the edit view. */
export class EditViewPage {
  /** The Publish button of the Entry panel. */
  readonly publishButton: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.publishButton = page.getByRole('button', { name: 'Publish', exact: true });
  }

  /** The entry's title: the value of its main field. */
  heading(title: string) {
    return this.page.getByRole('heading', { name: title, level: 1 });
  }

  /** Waits for the edit view of an entry, by its title. */
  async waitFor(title: string) {
    await expect(this.heading(title)).toBeVisible();
  }

  /** The documentId of the open entry, from the URL. */
  documentId() {
    const id = new URL(this.page.url()).pathname.split('/').pop();
    if (!id) {
      throw new Error(`No documentId in ${this.page.url()}`);
    }
    return id;
  }
}
