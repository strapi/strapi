import { type Page } from '@playwright/test';
import { clickAndWait, navToHeader } from '../../../../utils/shared';

/**
 * Page Object Model for the Releases list page.
 **/

export class ReleasesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the Releases list from anywhere in the admin.
   */
  async goto() {
    await navToHeader(this.page, ['Releases'], 'Releases');
  }

  /**
   * Open a single release by name, then wait for the details URL to settle.
   */
  async openRelease(name: string) {
    await clickAndWait(this.page, this.page.getByRole('link', { name }));
    await this.page.waitForURL('/admin/plugins/content-releases/*');
  }
}
