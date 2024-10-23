import { test, expect, Page } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition, findAndClose, skipCtbTour } from '../../utils/shared';
import { resetFiles } from '../../utils/file-reset';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Preview', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar', (cts) => cts, { coreStore: false });
    await resetFiles();
    await page.goto('/admin');
    await page.evaluate(() => window.localStorage.setItem('GUIDED_TOUR_SKIPPED', 'true'));
    await login({ page });
    await page.waitForURL('/admin');
  });

  test('Preview button should appear for configured content types', async ({
    page,
    context,
    browser,
  }) => {
    // Open an edit view for a content type that has preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

    // Copy the preview link
    await page.getByRole('button', { name: /copy preview link/i }).click();
    await findAndClose(page, 'Copied preview link');

    // Check that preview opens in a new tab
    const newTabPromiseDraft = page.waitForEvent('popup');
    await page.getByRole('link', { name: /open preview/i }).click();
    const newTab = await newTabPromiseDraft;
    expect(newTab.url()).toMatch(/^https:\/\/strapi\.io\/preview\/api::article\.article.*\/draft$/);

    // Check that preview link reflects the publication status
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');
    await page.getByRole('tab', { name: /published/i }).click();
    const newTabPromisePublished = page.waitForEvent('popup');
    await page.getByRole('link', { name: /open preview/i }).click();
    const newTab2 = await newTabPromisePublished;
    expect(newTab2.url()).toMatch(
      /^https:\/\/strapi\.io\/preview\/api::article\.article.*\/published$/
    );
  });

  test('Preview button should not appear for content types without preview config', async ({
    page,
  }) => {
    // Open an edit view for a content type that does not have preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Product' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /nike mens/i }));

    await expect(page.getByRole('link', { name: /open preview/i })).not.toBeVisible();
  });
});
