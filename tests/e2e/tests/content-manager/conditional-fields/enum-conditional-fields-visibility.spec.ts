import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { createContent, fillField } from '../../../utils/content-creation';
import { findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Conditional Fields - Enum field control different fields visibility', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await navToHeader(page, ['Content Manager'], 'Content Manager');
  });

  test('As a user I can see different fields based on enum selection and field values are cleared when hidden', async ({
    page,
  }) => {
    await createContent(
      page,
      'Dog',
      [
        { name: 'name*', type: 'text', value: 'Max' },
        { name: 'age', type: 'number', value: 6 },
        { name: 'personality', type: 'enumeration', value: 'playful' },
      ],
      { save: false, publish: false, verify: false }
    );

    // When personality is 'playful', favoriteToy field should be visible
    await expect(page.getByLabel('favoriteToy')).toBeVisible();
    await fillField(page, { name: 'favoriteToy', type: 'text', value: 'Tennis ball' });

    // Change personality to 'guard'
    await fillField(page, { name: 'personality', type: 'enumeration', value: 'guard' });

    // favoriteToy should be hidden, guardingSchedule should be visible
    await expect(page.getByLabel('favoriteToy')).toBeHidden();
    await expect(page.getByLabel('guardingSchedule')).toBeVisible();

    // Save the content
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Switch back to playful
    await fillField(page, { name: 'personality', type: 'enumeration', value: 'playful' });

    // Verify favoriteToy is visible but empty (value was cleared)
    await expect(page.getByLabel('favoriteToy')).toBeVisible();
    const toyValue = await page.getByLabel('favoriteToy').inputValue();
    expect(toyValue).toBe('');
  });
});
