import { expect, type Page } from '@playwright/test';
import { typeMap } from './content-types';
import { clickAndWait, findAndClose, locateSequence, navToHeader } from './shared';

export type FieldValueValue = string | number | boolean | null | Array<ComponentValue>;

export interface ComponentValue {
  category: string; // Category the component belongs to
  name: string; // Name of the component
  fields: FieldValue[]; // Nested fields within the component
}

export interface FieldValue {
  type: keyof typeof typeMap;
  name: string;
  value: FieldValueValue; // Use the extracted type here
}

export interface CreateContentOptions {
  publish?: boolean;
  save: boolean;
  verify: boolean;
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

    case 'component_repeatable':
    case 'component':
      if (Array.isArray(value)) {
        for (const component of value) {
          const { fields: componentFields, name: componentName } = component;

          // Locate the component by its name and click the button to add it
          const buttonLocator = await locateSequence(page, [
            { type: 'div', text: componentName },
            { type: 'button', text: 'add one' },
          ]);
          await buttonLocator.click();

          // Fill component fields
          if (componentFields && Array.isArray(componentFields)) {
            for (const field of componentFields) {
              await fillField(page, field);
            }
          }
        }
      }
      break;
    case 'dz':
      if (Array.isArray(value)) {
        for (const component of value) {
          const { fields: componentFields } = component;

          // Click "Add a component to {name}"
          await page.getByRole('button', { name: `Add a component to ${name}` }).click();

          // Expand component category if not open
          const categoryButton = page.getByRole('button', { name: component.category });
          if ((await categoryButton.getAttribute('data-state')) !== 'open') {
            await categoryButton.click();
          }

          // Select the component to add it to the dz
          const componentButton = page.getByRole('button', { name: component.name });
          if ((await componentButton.getAttribute('data-state')) !== 'open') {
            await componentButton.click();
          }

          // check if we need to expand it now that it has been added
          const expandButton = page.getByRole('button', { name: component.name });
          if ((await expandButton.getAttribute('data-state')) !== 'open') {
            await expandButton.click();
          }

          // Fill component fields
          if (componentFields && Array.isArray(componentFields)) {
            for (const field of componentFields) {
              await fillField(page, field);
            }
          }
        }
      }
      break;

    case 'date_date':
      // 1) Parse the date from the string (expected "MM/DD/YYYY" or something that new Date(...) can handle)
      const date = new Date(value as string);

      // 2) Decide if we use the UI approach or direct fill
      const now = new Date();
      const sameMonthAndYear =
        date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

      if (sameMonthAndYear) {
        // -- UI approach (click date in the datepicker) --
        const input = page.getByLabel(name);
        await input.click();

        // Build the aria-label for the date cell
        const formattedDate = date.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        // Click on that cell
        await page.locator(`td[aria-label="${formattedDate}"]`).click();

        // Optionally verify that the input matches the zero-padded "MM/DD/YYYY"
        const expected = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(
          date.getDate()
        ).padStart(2, '0')}/${date.getFullYear()}`;

        await expect(input).toHaveValue(expected);
      } else {
        // f
        await page.getByLabel(name).fill(value as string);
        // trigger blur to ensure the date is saved correctly
        await page.keyboard.press('Tab');
      }
      break;

    // TODO: all cases that cannot be handled as text fills

    // all other cases can be handled as text fills
    default:
      await page.getByLabel(name).last().fill(String(value));
      break;
  }
};

/**
 * Validate that fields have been saved correctly by checking their values on the page.
 */
export const verifyFields = async (page: Page, fields: FieldValue[]): Promise<void> => {
  for (const field of fields) {
    const { name, type, value } = field;

    switch (type) {
      case 'boolean':
        const isChecked = await page.getByLabel(name).isChecked();
        expect(isChecked).toBe(value);
        break;
      case 'date_date':
        const inputValue = await page.getByLabel(name).inputValue();
        const expectedDate = new Date(value as string);
        const expectedFormat = `${String(expectedDate.getMonth() + 1).padStart(2, '0')}/${String(expectedDate.getDate()).padStart(2, '0')}/${expectedDate.getFullYear()}`;
        expect(inputValue).toBe(expectedFormat);
        break;
      case 'dz':
        for (const component of value as ComponentValue[]) {
          const { fields: componentFields, name: compName } = component;

          // Validate each field within the component
          for (const componentField of componentFields) {
            // Ensure the category is expanded
            const categoryButton = page
              .locator('button[data-state]', { hasText: compName })
              .first();

            if ((await categoryButton.getAttribute('data-state')) !== 'open') {
              await categoryButton.click();
            }

            // TODO: make this only check within the dz box so we don't have to use unique names for each field
            await verifyFields(page, [componentField]);
          }
        }
        break;
      // TODO: component fields should actually check that they are in the same component
      default:
        const fieldValue = await page.getByLabel(name, { exact: true }).inputValue();
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
  options: CreateContentOptions
): Promise<void> => {
  await navToHeader(page, ['Content Manager', contentType], contentType);

  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());

  await fillFields(page, fields);

  if (options.save) {
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document', { required: options.verify });
  }

  if (options.publish) {
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await findAndClose(page, 'Published Document', { required: options.verify });
  }

  if (options.verify) {
    // validate that data has been created successfully by refreshing page and checking that each field still has the value
    await page.reload();
    await verifyFields(page, fields);
  }
};
