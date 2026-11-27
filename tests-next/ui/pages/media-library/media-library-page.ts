import { expect, type Locator, type Page } from '@playwright/test';

export type UploadableFile = { name: string; mimeType: string; buffer: Buffer };

/** Media Library: the assets of the Home folder. */
export class MediaLibraryPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The title of the current folder, with its item count: "Home (1 item)". */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: /^Home \(\d+ items?\)$/ });
  }

  async goto() {
    await this.page.goto('/admin/plugins/upload');
    await expect(this.heading()).toBeVisible();
  }

  /** Clicks "Add assets" and hands the file to the browser's file chooser. */
  async uploadFromComputer(file: UploadableFile) {
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.page.getByRole('button', { name: 'Add assets' }).click(),
    ]);
    await chooser.setFiles(file);
  }

  /** The dialog shown when an upload fails. */
  uploadFailedDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Upload failed' });
  }

  /** An asset of the library, by its file name. */
  asset(fileName: string): Locator {
    return this.page.getByRole('main').getByText(fileName, { exact: true });
  }
}
