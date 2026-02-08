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
  readonly dropZone: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'Import files' });
    this.fileInput = page.locator('input[type="file"]');
    this.dropZone = page.getByTestId('assets-dropzone');
  }

  /**
   * Navigate to the Media Library page
   */
  async goto() {
    await this.page.goto('/admin/plugins/unstable-upload');
  }

  /**
   * Switch the assets view to list (table) view
   * Waits for the page to be ready (drop zone visible) before switching
   */
  async switchToListView() {
    await this.page.getByRole('radio', { name: 'Table view' }).click();
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
