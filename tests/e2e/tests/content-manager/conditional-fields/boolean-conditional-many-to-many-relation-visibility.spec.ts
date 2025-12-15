import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { login } from '../../../../utils/login';
import { createContent, fillField } from '../../../../utils/content-creation';
import { navToHeader } from '../../../../utils/shared';

test.describe('Conditional Fields - Boolean-controlled conditional many-to-many relation fields', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await navToHeader(page, ['Content Manager'], 'Content Manager');
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
});
