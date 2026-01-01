import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { login } from '../../../../utils/login';
import { createContent, fillField } from '../../../../utils/content-creation';
import { findAndClose, navToHeader } from '../../../../utils/shared';
import { resetFiles } from '../../../../utils/file-reset';
import { createComponent, addAttributesToContentType } from '../../../../utils/content-types';

test.describe('Conditional Fields - Enum-controlled conditional text fields and value are cleared when hidden', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('As a user I can see that enum fields control text field visibility and values are cleared when hidden', async ({
    page,
  }) => {
    await navToHeader(page, ['Content Manager'], 'Content Manager');
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

  test('As a user I can publish an entry that has some hidden required conditional fields', async ({
    page,
  }) => {
    await navToHeader(page, ['Content-Type Builder'], 'Content-Type Builder');

    await createComponent(page, {
      name: 'Link',
      categoryCreate: 'Navigation',
      icon: 'link',
      attributes: [
        {
          type: 'enumeration',
          name: 'target',
          enumeration: { values: ['Same window', 'New window'] },
        },
        {
          type: 'text',
          name: 'linkInternal',
          advanced: {
            required: true,
            condition: {
              field: 'target',
              operator: 'is',
              value: 'Same window',
              action: 'show',
            },
          },
        },
        {
          type: 'text',
          name: 'linkExternal',
          advanced: {
            required: true,
            condition: {
              field: 'target',
              operator: 'is',
              value: 'New window',
              action: 'show',
            },
          },
        },
      ],
    });

    await addAttributesToContentType(page, 'Article', [
      {
        type: 'component',
        name: 'links',
        component: {
          useExisting: 'Link',
          options: {
            repeatable: true,
          },
        },
      },
    ]);

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.getByRole('link', { name: 'Create new entry' }).last().click();

    await fillField(page, {
      name: 'links',
      type: 'component_repeatable',
      value: [
        {
          category: 'Navigation',
          name: 'Link',
          fields: [{ name: 'target', type: 'enumeration', value: 'New window' }],
        },
      ],
    });

    await expect(page.getByLabel('linkExternal*')).toBeVisible();
    await expect(page.getByLabel('linkInternal')).toBeHidden();
    await page.getByRole('button', { name: 'Publish' }).click();

    // Shouldn't publish because linkExternal is visible and empty
    await findAndClose(page, 'There are validation errors', { role: 'alert' });
    await expect(page.getByText('This value is required', { exact: false })).toBeVisible();

    await page.getByRole('combobox', { name: 'target' }).click();
    await page.getByRole('option', { name: 'Same window' }).click();
    await expect(page.getByLabel('linkInternal*')).toBeVisible();
    await expect(page.getByLabel('linkExternal')).toBeHidden();
    await page.getByLabel('linkInternal*').fill('/internal-link');

    await page.getByRole('button', { name: 'Publish' }).click();

    // Should publish without any errors
    await findAndClose(page, 'Published Document');
  });
});
