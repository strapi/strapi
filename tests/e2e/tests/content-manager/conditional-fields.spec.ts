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

  test('As a user I can see that boolean fields control text field visibility and values are cleared when hidden', async ({
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

  test('As a user I can see that boolean fields control relation field visibility', async ({
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

  test('As a user I can toggle boolean fields to show/hide many-to-many relation fields', async ({
    page,
  }) => {
    await createContent(
      page,
      'Dog',
      [
        {
          name: 'name*',
          type: 'text',
          value: 'Buddy',
        },
        {
          name: 'age',
          type: 'number',
          value: 4,
        },
        {
          name: 'likesCats',
          type: 'boolean',
          value: true,
        },
      ],
      { save: false, publish: false, verify: false }
    );

    // When likesCats is true, bestFriendCats should be visible
    await expect(page.getByLabel('bestFriendCats')).toBeVisible();

    // Toggle likesCats to false
    await fillField(page, {
      name: 'likesCats',
      type: 'boolean',
      value: false,
    });

    // bestFriendCats should now be hidden
    await expect(page.getByLabel('bestFriendCats')).toBeHidden();
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

  test('As a user I can select relations in conditional fields and save them successfully', async ({
    page,
  }) => {
    // Create a cat first
    await navToHeader(page, ['Content Manager', 'Cat'], 'Cat');
    await page.getByRole('link', { name: 'Create new entry' }).last().click();

    await fillField(page, { name: 'name*', type: 'text', value: 'Whiskers' });
    await fillField(page, { name: 'age', type: 'number', value: 3 });
    await fillField(page, { name: 'personality', type: 'enumeration', value: 'friendly' });

    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Navigate to Dogs
    await navToHeader(page, ['Content Manager', 'Dog'], 'Dog');
    await page.getByRole('link', { name: 'Create new entry' }).last().click();

    await fillField(page, { name: 'name*', type: 'text', value: 'Luna' });
    await fillField(page, { name: 'age', type: 'number', value: 1 });
    await fillField(page, { name: 'likesCats', type: 'boolean', value: true });

    // bestFriendCats relation should be visible
    await expect(page.getByLabel('bestFriendCats')).toBeVisible();

    // Add Whiskers as a friend - relation fields use combobox
    await page.getByLabel('bestFriendCats').click();
    await page.getByText('Whiskers').click();

    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Verify the relation was saved
    await expect(page.getByText('Whiskers')).toBeVisible();
  });
});
