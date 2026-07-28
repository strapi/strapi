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
  readonly importFromUrlMenuItem: Locator;
  readonly fileInput: Locator;
  readonly gridViewButton: Locator;
  readonly tableViewButton: Locator;
  readonly dropZone: Locator;
  readonly uploadProgressDialog: Locator;
  readonly assetDetailsDrawer: Locator;
  readonly createFolderDialog: Locator;
  readonly importFromUrlDialog: Locator;
  readonly urlTextarea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.newFolderMenuItem = page.getByRole('menuitem', { name: 'New folder' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'File upload', exact: true });
    this.importFromUrlMenuItem = page.getByRole('menuitem', { name: 'File upload from URL' });

    this.fileInput = page.locator('input[type="file"]');
    this.gridViewButton = page.getByRole('radio', { name: 'Grid view' });
    this.tableViewButton = page.getByRole('radio', { name: 'Table view' });
    this.dropZone = page.getByTestId('assets-dropzone');
    this.uploadProgressDialog = page.getByRole('dialog', { name: /upload/i });
    this.assetDetailsDrawer = page.getByRole('dialog').filter({ has: page.getByText('File info') });
    this.createFolderDialog = page.getByRole('dialog', { name: /new folder in/i });
    this.importFromUrlDialog = page.getByRole('dialog', { name: 'Import from URL' });
    this.urlTextarea = page.getByRole('textbox', { name: 'URL' });
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
      .getByRole('status')
      .first();
    await notification.waitFor({ state: 'visible' });
  }

  /**
   * Wait for the bulk-move success toast after drag-and-drop.
   * Scoped to the Notifications region so it does not match the a11y live region.
   */
  async waitForMoveSuccess() {
    await this.getMoveSuccessNotification().waitFor({ state: 'visible' });
  }

  getMoveSuccessNotification() {
    return this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status')
      .filter({ hasText: 'Elements have been moved successfully' });
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

  /**
   * Toggle an asset's selection checkbox in table view (additive).
   */
  async selectAsset(name: string) {
    await this.page.getByRole('checkbox', { name: `Select ${name}` }).click();
  }

  /**
   * Toggle a folder's selection checkbox in table view (additive).
   */
  async selectFolder(name: string) {
    await this.page.getByRole('checkbox', { name: `Select ${name}` }).click();
  }

  /**
   * The floating bulk action bar (visible only when at least one asset is selected).
   */
  getBulkActionsBar() {
    return this.page.getByRole('region', { name: 'Bulk actions' });
  }

  /**
   * Delete the currently selected assets through the bulk action bar,
   * confirming the dialog. Resolves once the success notification shows.
   */
  async bulkDeleteSelection() {
    await this.getBulkActionsBar().getByRole('button', { name: 'Delete' }).click();
    await this.page.getByRole('button', { name: 'Confirm' }).click();
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status')
      .first();
    await notification.waitFor({ state: 'visible' });
  }

  /**
   * Move the currently selected items through the bulk action bar: open the
   * "Move elements to" modal, pick the destination in the Location select and
   * submit. Resolves once the success notification shows.
   */
  async bulkMoveSelectionTo(destinationName: string) {
    await this.getBulkActionsBar().getByRole('button', { name: 'Move' }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Move elements to' });
    await dialog.getByRole('combobox').click();
    await this.page.getByRole('option', { name: destinationName }).click();
    await dialog.getByRole('button', { name: 'Move' }).click();
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status')
      .first();
    await notification.waitFor({ state: 'visible' });
  }

  async switchToGridView() {
    await this.gridViewButton.click();
  }

  /**
   * The toolbar "Sort: <active>" dropdown.
   */
  getSortMenuTrigger() {
    return this.page.getByRole('button', { name: /^sort:/i });
  }

  /**
   * Open the sort dropdown, pick one option, close the menu (it stays open on
   * select so several facets can be tuned — Escape dismisses it).
   */
  async pickSortOption(optionName: string) {
    await this.getSortMenuTrigger().click();
    await this.page.getByRole('menuitem', { name: optionName, exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  /**
   * Names of the rendered table rows (folders and assets), header excluded.
   */
  async getTableRowNames() {
    const rows = this.page.getByRole('grid').getByRole('row');
    const texts = await rows.allInnerTexts();
    return texts.slice(1).map((text) => text.split('\n').find(Boolean) ?? '');
  }

  async switchToTableView() {
    await this.tableViewButton.click();
  }

  async isGridViewActive() {
    return (await this.gridViewButton.getAttribute('aria-checked')) === 'true';
  }

  /**
   * The grid container. Scoped via test id so card/folder locators don't
   * collide with the sidebar FolderTree, which also renders folder names as
   * list items inside the `main` landmark.
   */
  get assetsGrid() {
    return this.page.getByTestId('assets-grid');
  }

  /**
   * Get an asset card in grid view by (partial) filename.
   * Asset cards use role="listitem" in the list.
   */
  getAssetCard(name: string) {
    return this.assetsGrid.getByRole('listitem').filter({ hasText: name }).first();
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
   * Get an editable text input inside the asset details drawer by its visible
   * label (File name, Caption, Alternative text).
   */
  getAssetDetailsDrawerTextField(label: string) {
    return this.assetDetailsDrawer.getByRole('textbox', { name: label });
  }

  /**
   * Get the Location SingleSelect combobox inside the asset details drawer.
   */
  getAssetDetailsDrawerLocationSelect() {
    return this.assetDetailsDrawer.getByRole('combobox', { name: /location/i });
  }

  /**
   * Replace the value of an editable text field in the drawer.
   */
  async fillAssetDetailsDrawerText(label: string, value: string) {
    const field = this.getAssetDetailsDrawerTextField(label);
    await field.fill(value);
  }

  /**
   * Open the Location select and choose the option with the given name
   * (e.g. "Media Library" for the root).
   */
  async selectAssetDetailsDrawerLocation(name: string | RegExp) {
    await this.getAssetDetailsDrawerLocationSelect().click();
    await this.page.getByRole('option', { name }).click();
  }

  /**
   * Click the Save button inside the asset details drawer.
   */
  async clickAssetDetailsDrawerSave() {
    await this.assetDetailsDrawer.getByRole('button', { name: 'Save' }).click();
  }

  /**
   * Click the trash icon in the drawer footer and confirm the dialog.
   * Returns once the confirm dialog has been dismissed.
   */
  async deleteAssetFromDrawer() {
    await this.assetDetailsDrawer.getByRole('button', { name: /Delete this/i }).click();

    // Confirm dialog renders in a Radix portal at body root — query off `page`,
    // not the drawer locator.
    const confirmDialog = this.page
      .getByRole('alertdialog')
      .filter({ hasText: /Delete this media file\?/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Confirm' }).click();
  }

  /**
   * Click the replace icon in the drawer footer, confirm the dialog, and set
   * the file picked by the native file chooser. Returns once the upload
   * request has been initiated (the chooser was satisfied).
   *
   * Use `getDrawerToast(...)` to assert the in-drawer success toast.
   */
  async replaceAssetFromDrawer(filePath: string) {
    await this.assetDetailsDrawer.getByRole('button', { name: /Replace this/i }).click();

    const confirmDialog = this.page
      .getByRole('alertdialog')
      .filter({ hasText: /Replace this media file\?/i });
    await expect(confirmDialog).toBeVisible();

    // Continue triggers `fileInputRef.current?.click()` which opens the native
    // chooser. Wait for the chooser event BEFORE clicking so we don't miss it.
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await confirmDialog.getByRole('button', { name: 'Continue' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  /**
   * Get the in-drawer alert toast (above the preview). Matches the substring
   * shown in the success/error message.
   */
  getDrawerToast(message: string | RegExp) {
    return this.assetDetailsDrawer.getByText(message);
  }

  /**
   * Open the fullscreen crop & focus editor from the preview. Returns once the
   * editor footer (Apply) is visible. The editor renders in a Portal at body
   * root, so query off `page`, not the drawer.
   */
  async openCropEditor() {
    await this.assetDetailsDrawer.getByRole('button', { name: 'Crop' }).click();
    await expect(this.page.getByRole('button', { name: 'Apply' })).toBeVisible();
  }

  /**
   * Click Apply in the crop editor (replace the original).
   */
  async applyCrop() {
    await this.page.getByRole('button', { name: 'Apply' }).click();
  }

  /**
   * Click "Save as copy" in the crop editor (new asset in the same folder).
   */
  async saveCropAsCopy() {
    await this.page.getByRole('button', { name: 'Save as copy' }).click();
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
    return this.assetsGrid.getByRole('listitem').filter({ hasText: name }).first();
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

  /**
   * Open the import from URL dialog
   */
  async openImportFromUrlDialog() {
    await this.openNewMenu();
    await this.importFromUrlMenuItem.click();
    await expect(this.importFromUrlDialog).toBeVisible();
  }

  /**
   * Upload files from URLs using the import from URL dialog
   */
  /**
   * Drag a file or folder onto a folder target using pointer events (dnd-kit).
   * Moves the pointer more than 8px before dropping to satisfy activation distance.
   */
  async dragItemToFolder(
    itemName: string,
    folderName: string,
    view: 'grid' | 'table' = 'grid',
    itemType: 'file' | 'folder' = 'file'
  ) {
    const item =
      view === 'grid'
        ? itemType === 'folder'
          ? this.getFolderCard(itemName)
          : this.getAssetCard(itemName)
        : itemType === 'folder'
          ? this.getFolderRow(itemName)
          : this.getAssetRow(itemName);
    const target = view === 'grid' ? this.getFolderCard(folderName) : this.getFolderRow(folderName);

    const itemBox = await item.boundingBox();
    const targetBox = await target.boundingBox();

    if (!itemBox || !targetBox) {
      throw new Error(
        `Could not resolve drag source "${itemName}" or target folder "${folderName}"`
      );
    }

    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 12, startY);
    await this.page.mouse.move(endX, endY, { steps: 12 });
    await this.page.mouse.up();
  }

  /**
   * Drag a folder row/card onto itself (invalid shallow drop).
   */
  async dragFolderToSelf(folderName: string, view: 'grid' | 'table' = 'table') {
    const folder = view === 'grid' ? this.getFolderCard(folderName) : this.getFolderRow(folderName);

    const box = await folder.boundingBox();
    if (!box) {
      throw new Error(`Could not resolve folder "${folderName}"`);
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 12, startY);
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.up();
  }

  /**
   * Sidebar folder tree navigation (left rail).
   */
  get folderTreeNav() {
    return this.page.getByRole('navigation', { name: /media library folders/i });
  }

  getTreeFolderRow(name: string) {
    return this.folderTreeNav.getByRole('button', { name, exact: true });
  }

  getHomeTreeRow() {
    return this.folderTreeNav.getByRole('button', { name: 'Home' });
  }

  /**
   * Drag a file or folder from the main view onto a sidebar folder row.
   */
  async dragItemToTreeFolder(
    itemName: string,
    treeFolderName: string,
    view: 'grid' | 'table' = 'table',
    itemType: 'file' | 'folder' = 'file'
  ) {
    const item =
      view === 'grid'
        ? itemType === 'folder'
          ? this.getFolderCard(itemName)
          : this.getAssetCard(itemName)
        : itemType === 'folder'
          ? this.getFolderRow(itemName)
          : this.getAssetRow(itemName);
    const target = this.getTreeFolderRow(treeFolderName);

    await this.dragBetweenLocators(item, target);
  }

  /**
   * Drag a file or folder from the main view onto the sidebar Home row.
   */
  async dragItemToHome(
    itemName: string,
    view: 'grid' | 'table' = 'table',
    itemType: 'file' | 'folder' = 'file'
  ) {
    const item =
      view === 'grid'
        ? itemType === 'folder'
          ? this.getFolderCard(itemName)
          : this.getAssetCard(itemName)
        : itemType === 'folder'
          ? this.getFolderRow(itemName)
          : this.getAssetRow(itemName);
    const target = this.getHomeTreeRow();

    await this.dragBetweenLocators(item, target);
  }

  /**
   * Hover a dragged item over a collapsed sidebar folder long enough to spring-load it open.
   * Leaves the pointer over `treeFolderName` with the mouse button held down.
   */
  async springLoadFolder(
    itemName: string,
    treeFolderName: string,
    view: 'grid' | 'table' = 'table',
    itemType: 'file' | 'folder' = 'file',
    dwellMs = 650
  ) {
    const item =
      view === 'grid'
        ? itemType === 'folder'
          ? this.getFolderCard(itemName)
          : this.getAssetCard(itemName)
        : itemType === 'folder'
          ? this.getFolderRow(itemName)
          : this.getAssetRow(itemName);
    const target = this.getTreeFolderRow(treeFolderName);

    const itemBox = await item.boundingBox();
    const targetBox = await target.boundingBox();

    if (!itemBox || !targetBox) {
      throw new Error(
        `Could not resolve drag source "${itemName}" or tree folder "${treeFolderName}"`
      );
    }

    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 12, startY);
    await this.page.mouse.move(endX, endY, { steps: 12 });
    await this.page.waitForTimeout(dwellMs);
  }

  /**
   * Complete a drag started by `springLoadFolder` by dropping on a locator.
   */
  async dropDraggedItemOn(locator: Locator) {
    const targetBox = await locator.boundingBox();

    if (!targetBox) {
      throw new Error('Could not resolve drop target');
    }

    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await this.page.mouse.move(endX, endY, { steps: 8 });
    await this.page.mouse.up();
  }

  private async dragBetweenLocators(item: Locator, target: Locator) {
    const itemBox = await item.boundingBox();
    const targetBox = await target.boundingBox();

    if (!itemBox || !targetBox) {
      throw new Error('Could not resolve drag source or drop target');
    }

    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 12, startY);
    await this.page.mouse.move(endX, endY, { steps: 12 });
    await this.page.mouse.up();
  }
}
