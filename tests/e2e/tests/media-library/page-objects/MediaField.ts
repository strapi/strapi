import { type Locator, type Page } from '@playwright/test';
import { expect } from '../../../../fixtures';
import { readFileSync } from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Build a DataTransfer holding the given files, as a browser drop would carry them.
 * DataTransfer cannot be built in WebKit, so drop steps only run in Chromium and Firefox.
 */
export const createFilesDataTransfer = async (page: Page, filePaths: string | string[]) => {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  const files = paths.map((filePath) => {
    const filename = path.basename(filePath);
    return {
      // A plain array: a Buffer does not serialize through evaluateHandle.
      data: Array.from(new Uint8Array(readFileSync(filePath))),
      filename,
      mimeType: MIME_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream',
    };
  });

  return page.evaluateHandle((filesData) => {
    const dataTransfer = new DataTransfer();
    for (const { data, filename, mimeType } of filesData) {
      dataTransfer.items.add(new File([new Uint8Array(data)], filename, { type: mimeType }));
    }
    return dataTransfer;
  }, files);
};

/**
 * Find a field of the Content Manager edit view by its label.
 *
 * The field root is the innermost element that holds both the label and `inner`:
 * every outer wrapper holds them too, and they come first in document order.
 */
export const getEditViewField = (page: Page, label: string, inner: Locator) =>
  page
    .locator('div')
    .filter({ has: page.locator('label', { hasText: new RegExp(`^${label}\\*?$`) }) })
    .filter({ has: inner })
    .last();

/**
 * Page Object Model for a media field in the Content Manager edit view.
 */
export class MediaField {
  readonly page: Page;
  readonly root: Locator;
  readonly addAssetButton: Locator;
  readonly dropZone: Locator;

  constructor(page: Page, label: string) {
    this.page = page;
    // Each media field carries its own hidden file input.
    this.root = getEditViewField(page, label, page.locator('input[type="file"]'));
    this.addAssetButton = this.root.getByRole('button', { name: 'Add asset' });
    this.dropZone = this.root.getByText('Drag & drop an asset here');
  }

  async openAddAssetMenu() {
    await this.addAssetButton.click();
  }

  /**
   * Add asset > Browse library. Returns the picker dialog.
   */
  async openAssetPicker(fieldName: string) {
    await this.openAddAssetMenu();
    await this.page.getByRole('menuitem', { name: 'Browse library' }).click();

    const picker = this.page.getByRole('dialog', { name: `Add asset for ${fieldName}` });
    await expect(picker).toBeVisible();
    return picker;
  }

  /**
   * Add asset > Upload from device, then pick the files in the OS file picker.
   */
  async uploadFromDevice(filePaths: string | string[]) {
    await this.openAddAssetMenu();

    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByRole('menuitem', { name: 'Upload from device' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePaths);
  }

  /**
   * Drop files on the field's own drop zone.
   */
  async dropFiles(filePaths: string | string[]) {
    const dataTransfer = await createFilesDataTransfer(this.page, filePaths);

    await this.dropZone.dispatchEvent('dragenter', { dataTransfer });
    await this.dropZone.dispatchEvent('dragover', { dataTransfer });
    await this.dropZone.dispatchEvent('drop', { dataTransfer });
  }

  /**
   * Single media field: the edit button of the asset row. A multiple media card has
   * its actions in a menu instead, see `getCardMenuButton`.
   */
  getEditButton(assetName: string) {
    return this.root.getByRole('button', { name: `Edit ${assetName}` });
  }

  getRemoveButton(assetName: string) {
    return this.root.getByRole('button', { name: `Remove ${assetName}` });
  }

  /**
   * Multiple media field: each card opens its actions from a "More actions" menu.
   */
  getCardMenuButton(assetName: string) {
    return this.root.getByRole('button', { name: `More actions for ${assetName}` });
  }

  /**
   * Multiple media field: the carousel only renders the cards in view, and
   * these arrows page through the rest.
   */
  get previousSlideButton() {
    return this.root.getByRole('button', { name: 'Previous slide' });
  }

  get nextSlideButton() {
    return this.root.getByRole('button', { name: 'Next slide' });
  }
}
