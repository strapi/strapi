import { expect, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

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
  readonly dropZone: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'Import files' });
    this.fileInput = page.locator('input[type="file"]');
    this.gridViewButton = page.getByRole('radio', { name: 'Grid view' });
    this.tableViewButton = page.getByRole('radio', { name: 'Table view' });
    this.dropZone = page.getByTestId('assets-dropzone');
  }

  async goto() {
    await this.page.goto('/admin/plugins/unstable-upload');
  }

  /**
   * Get the drop zone info message ("Drop here to upload to" / "Current folder")
   */
  getDropZoneMessage() {
    return this.page.getByText('Drop here to upload to');
  }

  /**
   * Open the New menu dropdown
   */
  async openNewMenu() {
    await this.newButton.click();
  }

  /**
   * Upload files via drag and drop onto the assets drop zone.
   * Uses DataTransfer and dispatchEvent - works in Chromium and Firefox (DataTransfer is not supported in WebKit).
   *
   * @param filePaths - Absolute path(s) to file(s) to upload
   */
  async uploadFilesWithDragAndDrop(filePaths: string | string[]) {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const files = paths.map((filePath) => {
      const buffer = readFileSync(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const mimeType = mimeTypes[ext] ?? 'application/octet-stream';
      // Pass as plain array - Buffer doesn't serialize correctly with evaluateHandle
      return { data: Array.from(new Uint8Array(buffer)), filename, mimeType };
    });

    const dataTransfer = await this.page.evaluateHandle((filesData) => {
      const dt = new DataTransfer();
      for (const { data, filename, mimeType } of filesData) {
        const file = new File([new Uint8Array(data)], filename, { type: mimeType });
        dt.items.add(file);
      }
      return dt;
    }, files);

    // dispatchEvent must fire dragenter first - that's what sets isDraggingOver and shows the overlay
    await this.dropZone.dispatchEvent('dragenter', { dataTransfer });
    await this.dropZone.dispatchEvent('dragover', { dataTransfer });
    await expect(this.getDropZoneMessage()).toBeVisible();

    await this.dropZone.dispatchEvent('drop', { dataTransfer });
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

  getAssetCard(name: string) {
    return this.page.locator('div').filter({ hasText: name }).nth(1);
  }
}
