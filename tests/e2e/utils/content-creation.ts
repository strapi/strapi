import { expect, type Page } from '@playwright/test';
import { typeMap } from './content-types';
import { clickAndWait, findAndClose, navToHeader } from './shared';

export interface FieldValue {
  type: keyof typeof typeMap;
  name: string;
  value: string | number | boolean | null; // Supports common data types
}

export interface CreateContentOptions {
  publish?: boolean;
}

/**
 * Fill a single field based on its type.
 */
export const fillField = async (page: Page, field: FieldValue): Promise<void> => {
  const { name, type, value } = field;

  switch (type) {
    case 'boolean':
      if (typeof value === 'boolean') {
        const isChecked = await page.getByLabel(name).isChecked();
        if (isChecked !== value) {
          await page.getByLabel(name).click(); // Toggle checkbox
        }
      }
      break;

    // all other cases can be handled as text fills
    default:
      await page.getByLabel(name).fill(String(value));
      break;
  }
};

/**
 * Validate that fields have been saved correctly by checking their values on the page.
 */
export const validateFields = async (page: Page, fields: FieldValue[]): Promise<void> => {
  for (const field of fields) {
    const { name, type, value } = field;

    switch (type) {
      case 'boolean':
        if (typeof value === 'boolean') {
          const isChecked = await page.getByLabel(name).isChecked();
          expect(isChecked).toBe(value); // Verify checkbox state
        }
        break;

      default:
        const fieldValue = await page.getByLabel(name).inputValue();
        expect(fieldValue).toBe(String(value)); // Verify text/numeric input values
        break;
    }
  }
};

/**
 * Fill all fields in the provided order.
 */
export const fillFields = async (page: Page, fields: FieldValue[]): Promise<void> => {
  for (const field of fields) {
    await fillField(page, field);
  }
};

/**
 * Main function to create content by filling fields and optionally publishing it.
 */
export const createContent = async (
  page: Page,
  contentType: string,
  fields: FieldValue[],
  options: CreateContentOptions = {}
): Promise<void> => {
  await navToHeader(page, ['Content Manager', contentType], contentType);

  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }));

  await fillFields(page, fields);

  if (options.publish) {
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await findAndClose(page, 'Published Document');
  } else {
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
  }

  // validate that data has been created successfully by refreshing page and checking that each field still has the value
  await page.reload();
  await validateFields(page, fields);

  // TODO: remove after testing
  const elementExists = await page
    .getByRole('link', { name: 'i dont exist' })
    .isVisible({ timeout: 0 });
  expect(elementExists).toBeTruthy(); // This will fail, triggering trace capture
};
