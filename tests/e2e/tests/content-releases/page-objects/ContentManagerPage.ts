import { type Page, type Locator } from '@playwright/test';
import { clickAndWait, findAndClose } from '../../../../utils/shared';

/**
 * Page Object Model for the Content Manager (list + edit views).
 */
export class ContentManagerPage {
  readonly page: Page;
  readonly contentManagerLink: Locator;
  readonly addToReleaseDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.contentManagerLink = page.getByRole('link', { name: 'Content Manager' });
    this.addToReleaseDialog = page.getByRole('dialog', { name: 'Add to release' });
  }

  async goToCollectionType(name: string) {
    await clickAndWait(this.page, this.contentManagerLink);
    await clickAndWait(this.page, this.page.getByRole('link', { name }));
  }

  async openEntry(entryName: string) {
    await this.page.getByRole('gridcell', { name: entryName }).click();
    await this.page.waitForURL('**/content-manager/collection-types/**');
  }

  get publishedTab(): Locator {
    return this.page.getByRole('tab', { name: 'Published' });
  }

  /**
   * Add the currently-open entry to a release using the default "publish" action.
   */
  async addToRelease(releaseName: string) {
    await this.page.getByRole('button', { name: 'More document actions' }).click();
    await this.page.getByRole('menuitem', { name: 'Add to release' }).click();

    await this.addToReleaseDialog.getByRole('combobox', { name: 'Select a release' }).click();
    await this.page.getByRole('option', { name: releaseName }).click();
    await this.addToReleaseDialog.getByRole('button', { name: 'Continue' }).click();

    await findAndClose(this.page, 'Entry added to release');
  }

  // A list-view row identified by its entry text.
  getRow(entryName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: entryName });
  }

  // The status cell (e.g. "Published" / "Draft") within a given entry's row.
  getRowStatus(entryName: string, status: string): Locator {
    return this.getRow(entryName).getByText(status);
  }
}
