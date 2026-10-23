import { expect, type Page, type Locator } from '@playwright/test';
import { findAndClose } from '../../../../utils/shared';

/**
 * Page Object Model for the side panel that creates a release from the entries a released release
 * skipped. Opened from the release details page.
 */
export class SkippedEntriesDrawer {
  readonly page: Page;
  readonly root: Locator;
  readonly entries: Locator;
  readonly nameInput: Locator;
  readonly noScheduleCheckbox: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: 'Create new release from skipped entries' });
    this.entries = this.root.getByRole('listitem');
    this.nameInput = this.root.getByRole('textbox', { name: 'Release name' });
    this.noScheduleCheckbox = this.root.getByRole('checkbox', {
      name: "I don't have a release date yet",
    });
    this.createButton = this.root.getByRole('button', { name: 'Create release' });
  }

  /**
   * The "N entries carried over" heading. ICU plural copy, so whitespace is matched loosely.
   */
  carriedOverHeading(count: number): Locator {
    return this.root.getByRole('heading', {
      name: new RegExp(`^${count}\\s+entr(y|ies)\\s+carried over$`),
    });
  }

  entry(name: string): Locator {
    return this.entries.filter({ hasText: name });
  }

  async removeEntry(name: string) {
    await this.root.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(this.entry(name)).toHaveCount(0);
  }

  releaseMode(label: string): Locator {
    return this.root.getByRole('radio', { name: label });
  }

  async chooseReleaseMode(label: string) {
    await this.releaseMode(label).click();
  }

  /**
   * Submit, then wait for the new release's details page the panel navigates to.
   */
  async createRelease() {
    await this.createButton.click();
    await findAndClose(this.page, 'Release created');
    await expect(this.root).toBeHidden();
  }
}
