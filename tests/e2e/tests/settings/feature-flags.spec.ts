import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { navToHeader } from '../../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';

test.describe('Feature flags visibility', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('hidden-by-default future features are not visible in UI', async ({ page }) => {
    const flags = await page.evaluate(() => ({
      indexing:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).strapi?.future?.isEnabled?.('unstableContentTypeBuilderIndexing') === true,
      mediaLibrary:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).strapi?.future?.isEnabled?.('unstableMediaLibrary') === true,
    }));

    expect(flags.indexing).toBe(false);
    expect(flags.mediaLibrary).toBe(false);

    // Indexing feature: hidden in CTB attribute advanced settings when future flag is disabled.
    await navToHeader(page, ['Content-Type Builder', 'Article'], 'Article');
    await page.getByRole('button', { name: 'Add another field', exact: true }).click();
    await page
      .getByRole('button', { name: 'Text Small or long text like title or description' })
      .click();
    await page.getByLabel('Name', { exact: true }).fill('featureFlagCheckField');
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await expect(page.getByText('Unique field')).toBeVisible();
    await expect(page.getByText('Indexing', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: /Unique \(global\)/i })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: /Unique \(variant\)/i })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: /Index \(non-unique\)/i })).toHaveCount(0);
    await page.getByRole('button', { name: 'Finish' }).click();

    // Media library future feature: no grid/table toggles in legacy media library UI.
    // Navigating away from CTB with unsaved changes opens a confirmation; confirm to abandon changes.
    await page.locator('role=link[name^="Media Library"]').last().click();
    const leaveConfirmation = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(leaveConfirmation).toBeVisible();
    await leaveConfirmation.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: 'Media Library', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Grid view' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Table view' })).toHaveCount(0);
  });
});
