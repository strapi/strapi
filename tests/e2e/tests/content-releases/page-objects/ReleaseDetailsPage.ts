import { type Page, type Locator } from '@playwright/test';
import { clickAndWait } from '../../../../utils/shared';

/**
 * Page Object Model for the Release details page.
 *
 */

export class ReleaseDetailsPage {
  readonly page: Page;
  readonly publishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.publishButton = page.getByRole('button', { name: 'Publish', exact: true });
  }

  /**
   * The release title heading. Name-specific, so it's a method (built per call),
   * not a constructor field. The spec asserts this is visible after publishing.
   */
  heading(name: string): Locator {
    return this.page.getByRole('heading', { name });
  }

  /**
   * Publish the currently-open release.
   */
  async publish() {
    await clickAndWait(this.page, this.publishButton);
  }
}
