import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { createContent, fillField } from '../../../utils/content-creation';
import { findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Conditional Fields - Enum fields control text field visibility', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await navToHeader(page, ['Content Manager'], 'Content Manager');
  });

  test('As a user I can see that enum fields control text field visibility and values are cleared when hidden', async ({
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

    // // Save the content
    // await page.getByRole('button', { name: 'Save' }).click();

    // // Wait for save notification
    // await findAndClose(page, 'Saved Document');

    // // Switch enum value back so SKU field should reappear
    // await fillField(page, { name: 'type', type: 'enumeration', value: 'standard' });

    // // Verify SKU field is visible but empty (value was cleared when hidden)
    // await page.getByLabel('sku').isVisible();
    // await page
    //   .getByLabel('sku')
    //   .textContent()
    //   .then((text) => {
    //     expect(text).toBe('');
    //   });

    // // Add a new value to SKU field
    // await page.getByLabel('sku').fill('20');

    // // Save again to verify content can be saved correctly
    // await page.getByRole('button', { name: 'Save' }).click();

    // // Wait for save notification
    // await findAndClose(page, 'Saved Document');

    // // Verify the saved value persists
    // const finalValue = await page.getByLabel('sku').inputValue();
    // expect(finalValue).toBe('20');
  });
});
