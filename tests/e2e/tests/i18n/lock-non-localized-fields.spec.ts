import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { findAndClose, navToHeader } from '../../../utils/shared';
import { resetFiles } from '../../../utils/file-reset';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';

/**
 * Regression for https://github.com/strapi/strapi/issues/27182 / PR #27184
 *
 * Non-localized (shared) fields must be read-only on secondary locales, with a
 * lock tooltip pointing editors at the default locale. Localized fields,
 * relations, and uids stay editable per locale.
 */
test.describe('Lock non-localized fields on secondary locales', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('As a user I want shared fields locked on secondary locales and editable on the default locale', async ({
    page,
  }) => {
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;

    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await expect(
      page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    const isAvailable = page.getByRole('checkbox', { name: 'isAvailable' });
    const nameField = page.getByRole('textbox', { name: 'name' }).first();
    const slugField = page.getByRole('textbox', { name: 'slug' });
    const countries = page.getByRole('combobox', { name: 'countries' });
    const variationNames = ['Small', 'Medium', 'Large'];

    // Default locale: shared scalar and nested fields editable; localized + relation fields editable
    await expect(isAvailable).not.toBeDisabled();
    await expect(isAvailable).toBeChecked();
    await expect(nameField).not.toBeDisabled();
    await expect(slugField).not.toBeDisabled();
    await expect(countries).not.toBeDisabled();
    await expect(page.getByText('variations (3)', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add an entry' })).not.toBeDisabled();

    // Regression of #24890 / Mathilde review on #27184: shared fields must NOT show
    // a Globe / "common to all locales" icon on the default locale.
    await expect(page.getByText(/This value is common to all locales/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit shared fields' })).toHaveCount(0);

    // Create a Spanish translation
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    // Shared field is prefilled from the default locale and locked
    await expect(isAvailable).toBeChecked();
    await expect(isAvailable).toBeDisabled();
    await expect(nameField).not.toBeDisabled();
    await expect(slugField).not.toBeDisabled();
    await expect(countries).not.toBeDisabled();

    await expect(page.getByText('variations (3)', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add an entry' })).toBeDisabled();

    for (const [index, name] of variationNames.entries()) {
      await page.getByRole('button', { name, exact: true }).click();
      const nestedName = page.locator(`input[name="variations.${index}.name"]`);
      await expect(nestedName).toHaveValue(name);
      await expect(nestedName).toBeDisabled();
    }

    for (const action of ['Delete', 'Drag']) {
      const buttons = page.getByRole('button', { name: action, exact: true });
      await expect(buttons).toHaveCount(3);
      for (let index = 0; index < 3; index += 1) {
        await expect(buttons.nth(index)).toBeDisabled();
      }
    }

    // Lock tooltip explains how to edit the shared value
    const isAvailableLabelAction = page
      .locator('label')
      .filter({ hasText: 'isAvailable' })
      .locator('..')
      .locator('svg')
      .first();
    await isAvailableLabelAction.hover();
    await expect(
      page.getByRole('tooltip', {
        name: 'This value is common to all locales. Edit it in the default locale.',
      })
    ).toBeVisible();

    // Canceling the unlock warning leaves shared fields locked
    await page.getByRole('button', { name: 'Edit shared fields' }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit fields common to all locales?' })
    ).toBeVisible();
    await expect(page.getByText(/Saving changes will update English \(en\)/i)).toBeVisible();
    await page.getByRole('button', { name: 'No, cancel' }).click();
    await expect(isAvailable).toBeDisabled();

    // Accepting the warning unlocks shared fields for this locale until the editor leaves
    await page.getByRole('button', { name: 'Edit shared fields' }).click();
    await page.getByRole('button', { name: 'Yes, edit shared fields' }).click();
    await expect(isAvailable).not.toBeDisabled();
    await isAvailableLabelAction.hover();
    await expect(
      page.getByRole('tooltip', {
        name: 'This value is common to all locales. Saving will update every locale.',
      })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Keep shared fields locked' }).click();
    await expect(isAvailable).toBeDisabled();

    // Saving only the localized field must not wipe the default-locale shared value
    await nameField.fill('Camiseta Nike Masculina 23/24');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');
    await expect(
      page.getByRole('heading', { name: 'Camiseta Nike Masculina 23/24' })
    ).toBeVisible();
    await expect(isAvailable).toBeDisabled();
    await expect(isAvailable).toBeChecked();

    // Back on the default locale: shared field still editable and unchanged
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
    await expect(isAvailable).not.toBeDisabled();
    await expect(isAvailable).toBeChecked();
    await expect(page.getByText('variations (3)', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add an entry' })).not.toBeDisabled();
    for (const name of variationNames) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }

    // Editing the shared field on the default locale syncs to the secondary locale
    await isAvailable.uncheck();
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Camiseta Nike Masculina 23/24' })
    ).toBeVisible();
    await expect(isAvailable).toBeDisabled();
    await expect(isAvailable).not.toBeChecked();
  });
});
