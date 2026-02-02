import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Assets Page (Future version)
 */
export class AssetsPage {
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
   * Upload files via the file picker dialog
   * This method opens the menu, clicks Import files, verifies the file picker opens, and uploads files
   */
  async uploadFilesWithFilePicker(filePaths: string | string[]) {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

    // Open the New menu
    await this.openNewMenu();

    // Set up a promise to wait for the file chooser
    const fileChooserPromise = this.page.waitForEvent('filechooser');

    // Click the Import files menu item
    await this.importFilesMenuItem.click();

    // Wait for and verify the file picker is present
    const fileChooser = await fileChooserPromise;

    // Upload the files
    await fileChooser.setFiles(paths);

    return fileChooser;
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

  /**
   * Check if the file input value is empty (reset)
   */
  async isFileInputReset() {
    const inputValue = await this.fileInput.inputValue();
    return inputValue === '';
  }

  /**
   * Get a specific asset row by name
   */
  getAssetRow(name: string) {
    return this.page.getByRole('row', { name: new RegExp(name) });
  }
}
