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
  readonly newFolderMenuItem: Locator;
  readonly fileInput: Locator;
  readonly gridViewButton: Locator;
  readonly tableViewButton: Locator;
  readonly dropZone: Locator;
  readonly uploadProgressDialog: Locator;
  readonly assetDetailsDrawer: Locator;
  readonly createFolderDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'Import files' });
    this.newFolderMenuItem = page.getByRole('menuitem', { name: 'New folder' });
    this.fileInput = page.locator('input[type="file"]');
    this.gridViewButton = page.getByRole('radio', { name: 'Grid view' });
    this.tableViewButton = page.getByRole('radio', { name: 'Table view' });
    this.dropZone = page.getByTestId('assets-dropzone');
    this.uploadProgressDialog = page.getByRole('dialog', { name: /upload/i });
    this.assetDetailsDrawer = page.getByRole('dialog').filter({ has: page.getByText('File info') });
    this.createFolderDialog = page.getByRole('dialog', { name: /new folder in/i });
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

  /**
   * Get an asset row in table view. Rows use role="row" in the grid.
   */
  getAssetRow(name: string) {
    return this.page.getByRole('grid').getByRole('row').filter({ hasText: name }).first();
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

  /**
   * Get an asset card in grid view by (partial) filename.
   * Asset cards use role="listitem" in the list.
   */
  getAssetCard(name: string) {
    return this.dropZone.getByRole('listitem').filter({ hasText: name }).first();
  }

  /**
   * Wait for the upload progress dialog to show success state
   */
  async waitForUploadProgressSuccess() {
    await this.uploadProgressDialog.getByText('Upload successful!').waitFor({ state: 'visible' });
  }

  /**
   * Close the upload progress dialog
   */
  async closeUploadProgressDialog() {
    await this.uploadProgressDialog.getByRole('button', { name: 'Close' }).click();
  }

  /**
   * Click an asset row in table view to open the details drawer
   */
  async clickAssetInTable(name: string) {
    const row = this.getAssetRow(name);
    await row.click();
  }

  /**
   * Click an asset card in grid view to open the details drawer
   */
  async clickAssetInGrid(name: string) {
    const card = this.getAssetCard(name);
    await card.click();
  }

  /**
   * Get the value of a detail field in the asset details drawer by its label
   * The DetailItem structure has label and value as siblings, so we find the label and get its following sibling
   */
  getDrawerDetailValue(label: string) {
    const labelEl = this.assetDetailsDrawer.getByText(label);
    return labelEl.locator('xpath=following-sibling::*[1]');
  }

  /**
   * Close the asset details drawer
   */
  async closeAssetDetailsDrawer() {
    await this.assetDetailsDrawer.getByRole('button', { name: 'Close' }).click();
  }

  /**
   * Open the New menu and click "New folder"
   */
  async openCreateFolderDialog() {
    await this.openNewMenu();
    await this.newFolderMenuItem.click();
  }

  /**
   * Full flow: open dialog, type name, submit
   */
  async createFolder(name: string) {
    await this.openCreateFolderDialog();
    await this.createFolderDialog.getByRole('textbox').fill(name);
    await this.createFolderDialog.getByRole('button', { name: /create folder/i }).click();
  }

  /**
   * Get a folder card in grid view
   */
  getFolderCard(name: string) {
    return this.dropZone.getByRole('listitem').filter({ hasText: name }).first();
  }

  /**
   * Get a folder row in table view
   */
  getFolderRow(name: string) {
    return this.page.getByRole('grid').getByRole('row').filter({ hasText: name }).first();
  }

  /**
   * Navigate into a folder by clicking its card/row
   */
  async navigateIntoFolder(name: string) {
    await this.page.getByText(name).first().click();
  }
}
