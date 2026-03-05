import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Homepage - Content Manager Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the last edited entries', async ({ page }) => {
    const recentlyEditedWidget = page.getByLabel(/last edited entries/i);
    await expect(recentlyEditedWidget).toBeVisible();

    // Make content update in the CM
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: /^nike mens/i }));

    const nameBox = page.getByLabel(/name/i);
    await nameBox.fill('Nike Mens newer!');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    // Go back to the home page, the updated entry should be the first in the table
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const mostRecentEntry = recentlyEditedWidget.getByRole('row').nth(0);
    await expect(mostRecentEntry).toBeVisible();
    await expect(
      mostRecentEntry.getByRole('gridcell', { name: /nike mens newer!/i })
    ).toBeVisible();
    await expect(mostRecentEntry.getByRole('gridcell', { name: /draft/i })).toBeVisible();
  });

  test('a user should see the last published entries', async ({ page }) => {
    const recentlyPublishedWidget = page.getByLabel(/last published entries/i);
    await expect(recentlyPublishedWidget).toBeVisible();

    // Make content update in the CM
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

    // Go back to the home page, the published entry should be the first in the table with published status
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const mostRecentPublishedEntry = recentlyPublishedWidget.getByRole('row').nth(0);
    await expect(mostRecentPublishedEntry).toBeVisible();
    await expect(
      mostRecentPublishedEntry.getByRole('gridcell', { name: 'West Ham post match analysis' })
    ).toBeVisible();
    await expect(
      mostRecentPublishedEntry.getByRole('gridcell', { name: 'Published' })
    ).toBeVisible();

    // Now go modify the published entry
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    const title = page.getByLabel(/title/i);
    await title.fill('West Ham pre match pep talk');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    // Go back to the home page, the published entry should be the first in the table with modified status
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const mostRecentModifiedEntry = recentlyPublishedWidget.getByRole('row').nth(0);
    await expect(
      // It should still be the published data, not the modified draft data
      mostRecentModifiedEntry.getByRole('gridcell', { name: 'West Ham post match analysis' })
    ).toBeVisible();
    await expect(mostRecentModifiedEntry.getByRole('gridcell', { name: 'Modified' })).toBeVisible();
  });

  test('a user should see entries per locale in the last published entries widget', async ({
    page,
  }) => {
    const recentlyPublishedWidget = page.getByLabel(/last published entries/i);
    await expect(recentlyPublishedWidget).toBeVisible();

    // Create and publish an English article
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.waitForURL(
      /\/admin\/content-manager\/collection-types\/api::article\.article\/create/
    );
    const titleFieldEnglish = page.getByLabel(/title/i);
    await titleFieldEnglish.fill('West Ham Football Team');
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

    // Create and publish a French entry
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'French (fr)' }).click();
    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.waitForURL(
      /\/admin\/content-manager\/collection-types\/api::article\.article\/create/
    );
    const titleFieldFrench = page.getByLabel(/title/i);
    await titleFieldFrench.fill("L'équipe de West Ham");
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

    // Go back to the home page, the recently published widget should show entries from different locales
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const englishEntry = recentlyPublishedWidget
      .getByRole('row')
      .filter({ hasText: 'West Ham Football Team' });
    const frenchEntry = recentlyPublishedWidget
      .getByRole('row')
      .filter({ hasText: "L'équipe de West Ham" });
    await expect(englishEntry).toBeVisible();
    await expect(frenchEntry).toBeVisible();
  });

  test('a user should see the entries chart widget', async ({ page }) => {
    const chartWidget = page.getByLabel('Entries', { exact: true });

    await expect(chartWidget).toBeVisible();

    // By default, the chart should only show draft entries (no published/modified)
    await expect(chartWidget.getByText('Draft')).toBeVisible();
    await expect(chartWidget.getByText('Modified')).not.toBeVisible();
    await expect(chartWidget.getByText('Published')).not.toBeVisible();

    const arcDraft = chartWidget.locator('circle').first();
    await arcDraft.focus();

    const tooltip = page.getByTestId('entries-chart-tooltip');

    await expect(tooltip).toBeVisible();

    // Get the initial draft count from the tooltip
    const tooltipText = await tooltip.textContent();
    const initialDraftMatch = tooltipText?.match(/(\d+) Draft/);
    const initialDraftCount = initialDraftMatch ? parseInt(initialDraftMatch[1]) : 0;

    // Publish an entry
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

    // Modify an entry
    await page.getByRole('link', { name: 'Back' }).click();
    await clickAndWait(
      page,
      page.getByRole('gridcell', { name: 'Why I prefer football over soccer' })
    );
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');
    const title = page.getByLabel(/title/i);
    await title.fill('West Ham pre match pep talk');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    // Go back to the home page
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));

    // The published and modified entries should be visible in the chart
    await expect(chartWidget.getByText('Draft')).toBeVisible();
    await expect(chartWidget.getByText('Modified')).toBeVisible();
    await expect(chartWidget.getByText('Published')).toBeVisible();

    const arcDraftUpdated = chartWidget.locator('circle').nth(0);
    await arcDraftUpdated.focus();

    await expect(tooltip).toBeVisible();
    // Should be 2 less than initial (we published 2 entries)
    await expect(tooltip).toContainText(`${initialDraftCount - 2} Draft`);

    const arcPublished = chartWidget.locator('circle').nth(1);
    await arcPublished.focus();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('1 Modified');

    const arcModified = chartWidget.locator('circle').nth(2);
    await arcModified.focus();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('1 Published');
  });
});
