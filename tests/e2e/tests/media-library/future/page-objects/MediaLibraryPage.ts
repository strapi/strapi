import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Media Library Page (Future version)
 */
export class MediaLibraryPage {
  readonly page: Page;
  readonly newButton: Locator;
  readonly importFilesMenuItem: Locator;
  readonly fileInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'Import files' });
    this.fileInput = page.locator('input[type="file"]');
  }

  /**
   * Navigate to the Media Library page
   */
  async goto() {
    await this.page.goto('/admin/plugins/unstable-upload');
  }

  /**
   * Open the New menu dropdown
   */
  async openNewMenu() {
    await this.newButton.click();
  }

  /**
   * Upload files using the import files menu
   */
  async uploadFiles(filePaths: string | string[]) {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

    // Open the New menu
    await this.openNewMenu();

    // Set the files to upload (this triggers the file input without clicking)
    await this.fileInput.setInputFiles(paths);
  }

  /**
   * Wait for upload success notification
   */
  async waitForUploadSuccess() {
    // Wait for the success notification inside the Notifications region
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status');
    await notification.waitFor({ state: 'visible' });
  }

  /**
   * Get the success notification message
   */
  async getSuccessMessage() {
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status')
      .first();
    return await notification.textContent();
  }

  /**
   * Get the error notification message
   */
  async getErrorMessage() {
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('alert')
      .first();
    return await notification.textContent();
  }
}
