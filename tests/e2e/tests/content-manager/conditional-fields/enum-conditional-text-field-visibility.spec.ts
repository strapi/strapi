import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { createContent, fillField } from '../../../utils/content-creation';
import { findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Conditional Fields - Enum-controlled conditional text fields and value are cleared when hidden', () => {
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
      'Dog',
      [
        { name: 'name*', type: 'text', value: 'Rucola' },
        { name: 'personality', type: 'enumeration', value: 'playful' },
        { name: 'favoriteToy', type: 'text', value: 'ball' },
      ],
      { save: false, publish: false, verify: false }
    );

    // Verify favoriteToy field is visible
    await expect(page.getByLabel('favoriteToy')).toBeVisible();

    // Change enum value so that favoriteToy field should become hidden
    await fillField(page, { name: 'personality', type: 'enumeration', value: 'lazy' });

    // Verify favoriteToy field is hidden
    await page.getByLabel('favoriteToy').isHidden();

    // Save the content
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for save notification
    await findAndClose(page, 'Saved Document');

    // Switch enum value back so favoriteToy field should reappear
    await fillField(page, { name: 'personality', type: 'enumeration', value: 'playful' });

    // Verify favoriteToy field is visible but empty (value was cleared when hidden)
    await expect(page.getByLabel('favoriteToy')).toBeVisible();
    const toyValue = await page.getByLabel('favoriteToy').inputValue();
    expect(toyValue).toBe('');
    // Add a new value to favoriteToy field
    await page.getByLabel('favoriteToy').fill('kong');

    // Save again to verify content can be saved correctly
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for save notification
    await findAndClose(page, 'Saved Document');

    // Verify the saved value persists
    await expect(page.getByLabel('favoriteToy')).toHaveValue('kong');
  });
});
