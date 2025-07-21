import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { createContent, fillField } from '../../../utils/content-creation';
import { navToHeader } from '../../../utils/shared';

test.describe('Conditional Fields - Boolean fields control relation field visibility', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await navToHeader(page, ['Content Manager'], 'Content Manager');
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
});
