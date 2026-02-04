import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Assets Page (Future version)
 */
export class AssetsPage {
  readonly page: Page;
  readonly newButton: Locator;
  readonly importFilesMenuItem: Locator;
  readonly fileInput: Locator;
  readonly gridViewButton: Locator;
  readonly tableViewButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'Import files' });
    this.fileInput = page.locator('input[type="file"]');
    this.gridViewButton = page.getByRole('radio', { name: 'Grid view' });
    this.tableViewButton = page.getByRole('radio', { name: 'Table view' });
  }

  async goto() {
    await this.page.goto('/admin/plugins/unstable-upload');
  }

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

  async waitForUploadSuccess() {
    // Wait for the success notification inside the Notifications region
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status');
    await notification.waitFor({ state: 'visible' });
  }

  async getSuccessMessage() {
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status')
      .first();
    return await notification.textContent();
  }

  async getErrorMessage() {
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('alert')
      .first();
    return await notification.textContent();
  }

  async isFileInputReset() {
    const inputValue = await this.fileInput.inputValue();
    return inputValue === '';
  }

  getAssetRow(name: string) {
    return this.page.getByRole('row', { name: new RegExp(name) });
  }

  async switchToGridView() {
    await this.gridViewButton.click();
  }

  async switchToTableView() {
    await this.tableViewButton.click();
  }

  async isGridViewActive() {
    return (await this.gridViewButton.getAttribute('aria-checked')) === 'true';
  }
}
