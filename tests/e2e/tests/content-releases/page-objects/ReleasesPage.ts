import { expect, type Locator, type Page } from '@playwright/test';
import { clickAndWait, navToHeader } from '../../../../utils/shared';

interface Schedule {
  date: Date;
  /** An option of the time combobox, e.g. '08:00' */
  time: string;
}

/**
 * Page Object Model for the Releases list page.
 **/

export class ReleasesPage {
  readonly page: Page;
  readonly newReleaseButton: Locator;
  readonly newReleaseDialog: Locator;
  /** The releases table's data rows: the header row has no release link */
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newReleaseButton = page.getByRole('button', { name: 'New release' });
    this.newReleaseDialog = page.getByRole('dialog', { name: 'New release' });
    this.rows = page.getByRole('row').filter({ has: page.getByRole('link') });
  }

  /**
   * Navigate to the Releases list from anywhere in the admin.
   */
  async goto() {
    await navToHeader(this.page, ['Releases'], 'Releases');
  }

  releaseLink(name: string): Locator {
    return this.page.getByRole('link', { name, exact: true });
  }

  row(name: string): Locator {
    return this.rows.filter({ has: this.releaseLink(name) });
  }

  /**
   * The "N releases" count under the page title. ICU plural copy, so whitespace is matched loosely.
   */
  releaseCount(count: number): Locator {
    return this.page.getByText(new RegExp(`^${count}\\s+releases?$`));
  }

  /**
   * Open a single release by name, then wait for the details URL to settle.
   */
  async openRelease(name: string) {
    await clickAndWait(this.page, this.releaseLink(name));
    await this.page.waitForURL('/admin/plugins/content-releases/*');
  }

  async goToNextPage() {
    await clickAndWait(this.page, this.page.getByRole('link', { name: /go to next page/i }));
  }

  /**
   * Create a release from the "New release" side panel, then wait for its details page.
   * Without a schedule, the release is created unscheduled.
   */
  async createRelease(name: string, schedule?: Schedule) {
    await this.newReleaseButton.click();
    await expect(this.newReleaseDialog).toBeVisible();
    await this.newReleaseDialog.getByRole('textbox', { name: 'Release name' }).fill(name);

    if (schedule) {
      await this.newReleaseDialog.getByRole('combobox', { name: 'Date' }).click();
      const dateLabel = schedule.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      await this.page.getByLabel(dateLabel).click();
      await this.newReleaseDialog.getByRole('combobox', { name: /^time$/i }).click();
      await this.page.getByRole('option', { name: schedule.time }).click();
    } else {
      await this.newReleaseDialog
        .getByRole('checkbox', { name: "I don't have a release date yet" })
        .check();
    }

    await clickAndWait(
      this.page,
      this.newReleaseDialog.getByRole('button', { name: 'Create release' })
    );
    await this.page.waitForURL('/admin/plugins/content-releases/*');
    await expect(this.page.getByRole('heading', { name })).toBeVisible();
  }
}
