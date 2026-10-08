import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { sharedSetup } from '../../../../utils/setup';
import { createContent, fillField } from '../../../../utils/content-creation';
import { clickAndWait, confirmRenameMigration, navToHeader } from '../../../../utils/shared';
import { waitForRestart } from '../../../../utils/restart';

test.describe('Conditional Fields - condition follows a rename of its source field', () => {
  // Triggers a server restart
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('cm-conditional-rename-source-field', page, {
      resetFiles: true,
      importData: 'with-admin',
      login: true,
      resetAlways: true,
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('renaming the enum a condition depends on keeps the dependent field conditional', async ({
    page,
  }) => {
    // Rename Dog.personality -> temperament in the CTB
    await navToHeader(page, ['Content-Type Builder', 'Dog'], 'Dog');
    await clickAndWait(page, page.getByRole('button', { name: 'Edit personality' }));
    await page.getByLabel('Name', { exact: true }).fill('temperament');
    await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));
    // A rename must not raise the "will break these conditions" warning
    await expect(page.getByText('will break these conditions')).toBeHidden();
    await page.getByRole('button', { name: 'Save' }).click();
    await confirmRenameMigration(page, { preserve: true });
    await waitForRestart(page);

    // In the CM, favoriteToy and guardingSchedule must follow the renamed enum
    await navToHeader(page, ['Content Manager'], 'Content Manager');
    await createContent(
      page,
      'Dog',
      [
        { name: 'name*', type: 'text', value: 'Rucola' },
        { name: 'temperament', type: 'enumeration', value: 'playful' },
      ],
      { save: false, publish: false, verify: false }
    );
    await expect(page.getByLabel('favoriteToy')).toBeVisible();

    await fillField(page, { name: 'temperament', type: 'enumeration', value: 'lazy' });
    await expect(page.getByLabel('favoriteToy')).toBeHidden();

    await fillField(page, { name: 'temperament', type: 'enumeration', value: 'guard' });
    await expect(page.getByLabel('guardingSchedule')).toBeVisible();
    await expect(page.getByLabel('favoriteToy')).toBeHidden();
  });
});
