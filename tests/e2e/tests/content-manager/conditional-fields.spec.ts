import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { createContent, fillField } from '../../utils/content-creation';
import { navToHeader } from '../../utils/shared';

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

  test('As a user if I change an enum field that affects a conditional relation field, the field should be hidden', async ({
    page,
  }) => {
    await createContent(
      page,
      'Condition',
      [
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

    // Wait for conditional logic to process
    await page.waitForTimeout(500);

    await expect(page.getByLabel('Author')).toBeHidden();
  });
});
