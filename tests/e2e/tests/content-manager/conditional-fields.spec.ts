import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { createContent, fillField } from '../../utils/content-creation';
import { findAndClose, navToHeader } from '../../utils/shared';

test.describe('Conditional Fields', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await navToHeader(page, ['Content Manager'], 'Content Manager');
  });

  test('As a user if I toggle a boolean field that affects a conditional field, the field should be hidden and the value should not be filled', async ({
    page,
  }) => {
    await createContent(
      page,
      'Products',
      [
        {
          name: 'name*',
          type: 'text',
          value: 'T-shirt',
        },
        {
          name: 'sku',
          type: 'number',
          value: 1,
        },
      ],
      { save: false, publish: false, verify: false }
    );

    await page.getByLabel('sku').isVisible();
    await page.getByLabel('sku').fill('5');
    await fillField(page, {
      name: 'isAvailable',
      type: 'boolean',
      value: false,
    });
    await page.getByLabel('sku').isHidden();
    await page.getByRole('button', { name: 'Save' }).click();
    await fillField(page, {
      name: 'isAvailable',
      type: 'boolean',
      value: true,
    });
    await page
      .getByLabel('sku')
      .textContent()
      .then((text) => {
        expect(text).toBe('');
      });
  });

  test('As a user if I toggle a boolean field that affects a conditional relation field, the field should be hidden', async ({
    page,
  }) => {
    await createContent(
      page,
      'Condition',
      [
        {
          name: 'isActive',
          type: 'boolean',
          value: true,
        },
      ],
      { save: false, publish: false, verify: false }
    );

    await expect(page.getByLabel('country')).toBeVisible();

    await fillField(page, {
      name: 'isActive',
      type: 'boolean',
      value: false,
    });

    await expect(page.getByLabel('country')).toBeHidden();
  });

  test('As a user if I change an enum field that affects a conditional field, the field should be hidden and its value should not be filled', async ({
    page,
  }) => {
    await createContent(
      page,
      'Products',
      [
        { name: 'name*', type: 'text', value: 'Shoes' },
        { name: 'sku', type: 'number', value: 10 },
      ],
      { save: false, publish: false, verify: false }
    );

    // Set the enum field to 'standard' initially
    await fillField(page, { name: 'type', type: 'enumeration', value: 'standard' });

    // Verify SKU field is visible and has correct value
    const skuInput = page.getByLabel('sku');
    await skuInput.isVisible();
    const initialValue = await skuInput.inputValue();
    expect(initialValue).toBe('10');

    // Change enum value so that SKU field should become hidden
    await fillField(page, { name: 'type', type: 'enumeration', value: 'custom' });

    // Verify SKU field is hidden
    await page.getByLabel('sku').isHidden();

    // Save the content
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for save notification
    await findAndClose(page, 'Saved Document');

    // Switch enum value back so SKU field should reappear
    await fillField(page, { name: 'type', type: 'enumeration', value: 'standard' });

    // Verify SKU field is visible but empty (value was cleared when hidden)
    await page.getByLabel('sku').isVisible();
    await page
      .getByLabel('sku')
      .textContent()
      .then((text) => {
        expect(text).toBe('');
      });

    // Add a new value to SKU field
    await page.getByLabel('sku').fill('20');

    // Save again to verify content can be saved correctly
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for save notification
    await findAndClose(page, 'Saved Document');

    // Verify the saved value persists
    const finalValue = await page.getByLabel('sku').inputValue();
    expect(finalValue).toBe('20');
  });

  test('As a user if I change an enum field that affects a conditional relation field, the field should be hidden', async ({
    page,
  }) => {
    await createContent(
      page,
      'Condition',
      [
        {
          name: 'isActive',
          type: 'boolean',
          value: true,
        },
        {
          name: 'roles',
          type: 'enumeration',
          value: 'tank', // Start with tank to show Author relation
        },
      ],
      { save: false, publish: false, verify: false }
    );

    await expect(page.getByLabel('Author')).toBeVisible();

    await fillField(page, {
      name: 'roles',
      type: 'enumeration',
      value: 'dps',
    });

    await page.getByRole('button', { name: 'Save' }).click();

    await findAndClose(page, 'Saved Document');

    // Wait for the field to update after save by checking it's no longer visible
    await expect(page.getByLabel('Author')).toBeHidden();
  });
});
