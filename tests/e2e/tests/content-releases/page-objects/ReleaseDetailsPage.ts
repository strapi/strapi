import { expect, type Page, type Locator } from '@playwright/test';
import { clickAndWait } from '../../../../utils/shared';
import { SkippedEntriesDrawer } from './SkippedEntriesDrawer';

/**
 * Page Object Model for the Release details page.
 *
 */

export class ReleaseDetailsPage {
  readonly page: Page;
  readonly publishButton: Locator;
  readonly createFromSkippedButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.publishButton = page.getByRole('button', { name: 'Publish', exact: true });
    this.createFromSkippedButton = page.getByRole('button', {
      name: 'Create release from skipped entries',
      exact: true,
    });
  }

  /**
   * Open a release by id. A full navigation, so it shows releases created through the API since
   * the admin loaded.
   */
  async goto(releaseId: number) {
    await this.page.goto(`/admin/plugins/content-releases/${releaseId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * The release title heading. Name-specific, so it's a method (built per call),
   * not a constructor field. The spec asserts this is visible after publishing.
   */
  heading(name: string): Locator {
    return this.page.getByRole('heading', { name });
  }

  /**
   * The name cell of an entry in the release's table.
   */
  entryCell(name: string): Locator {
    return this.page.getByRole('gridcell', { name, exact: true });
  }

  /**
   * A tab filtering the entries, named "Label (count)" when it shows a count. With `count`, only
   * the tab showing exactly that count matches. The name mirrors the English
   * `content-releases.pages.ReleaseDetails.tab.label-with-count` message: a change there breaks this.
   */
  tab(label: string, count?: number): Locator {
    if (count !== undefined) {
      return this.page.getByRole('tab', { name: `${label} (${count})`, exact: true });
    }

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return this.page.getByRole('tab', { name: new RegExp(`^${escapedLabel}( \\(\\d+\\))?$`) });
  }

  /**
   * The table row of an entry.
   */
  entryRow(name: string): Locator {
    return this.page.getByRole('row').filter({ has: this.entryCell(name) });
  }

  /**
   * Publish the currently-open release.
   */
  async publish() {
    await clickAndWait(this.page, this.publishButton);
  }

  /**
   * Open the side panel that creates a release from the entries this released release skipped.
   */
  async openSkippedEntriesDrawer() {
    await this.createFromSkippedButton.click();
    const drawer = new SkippedEntriesDrawer(this.page);
    // In the viewport, not just visible: unstyled, the panel renders below the page
    await expect(drawer.root).toBeInViewport();
    return drawer;
  }
}
