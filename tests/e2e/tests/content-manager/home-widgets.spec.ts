import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

/** Tooltip: `{count} {label}` — see content-manager.widget.chart-entries.tooltip */
const parseEntriesChartCount = (text: string | null, label: 'Draft' | 'Modified' | 'Published') => {
  const m = text?.match(new RegExp(`(\\d+) ${label}`));
  return m ? parseInt(m[1], 10) : 0;
};

test.describe('Homepage - Content Manager Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
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
    const tooltip = page.getByTestId('entries-chart-tooltip');

    await expect(chartWidget).toBeVisible();

    /**
     * Counts come from GET /content-manager/homepage/count-documents (all permitted types).
     * Donut segment order: Draft, Modified, Published — see ChartEntriesWidget in Widgets.tsx.
     * Legend only lists segments with count > 0, so "Published" may show before this test runs.
     */
    const arcDraft = chartWidget.locator('circle').nth(0);
    const arcModifiedSeg = chartWidget.locator('circle').nth(1);
    const arcPublishedSeg = chartWidget.locator('circle').nth(2);

    await arcDraft.focus();
    await expect(tooltip).toBeVisible();
    const initialDraft = parseEntriesChartCount(await tooltip.textContent(), 'Draft');

    await arcModifiedSeg.focus();
    await expect(tooltip).toBeVisible();
    const initialModified = parseEntriesChartCount(await tooltip.textContent(), 'Modified');

    await arcPublishedSeg.focus();
    await expect(tooltip).toBeVisible();
    const initialPublished = parseEntriesChartCount(await tooltip.textContent(), 'Published');

    await expect(chartWidget.getByText('Draft')).toBeVisible();
    expect(initialModified).toBe(0);
    await expect(chartWidget.getByText('Modified')).not.toBeVisible();
    if (initialPublished === 0) {
      await expect(chartWidget.getByText('Published')).not.toBeVisible();
    } else {
      await expect(chartWidget.getByText('Published')).toBeVisible();
    }

    // Publish two Article drafts (West Ham, then Why I prefer…), then save a change on the second → +1 Modified
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

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

    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));

    await expect(chartWidget.getByText('Draft')).toBeVisible();
    await expect(chartWidget.getByText('Modified')).toBeVisible();
    await expect(chartWidget.getByText('Published')).toBeVisible();

    await arcDraft.focus();
    await expect(tooltip).toBeVisible();
    const finalDraft = parseEntriesChartCount(await tooltip.textContent(), 'Draft');

    await arcModifiedSeg.focus();
    await expect(tooltip).toBeVisible();
    const finalModified = parseEntriesChartCount(await tooltip.textContent(), 'Modified');

    await arcPublishedSeg.focus();
    await expect(tooltip).toBeVisible();
    const finalPublished = parseEntriesChartCount(await tooltip.textContent(), 'Published');

    const publishedGain = finalPublished - initialPublished;

    /**
     * Publishing two Article drafts and then saving an edit should:
     * - add at least one “modified” document (draft ≠ published row for same document_id),
     * - increase published count by 1–2 depending on prior DB state for those entries,
     * - reduce total drafts. Draft/published are not 1:1 with these UI steps (see homepage getCountDocuments).
     */
    expect(finalModified).toBe(initialModified + 1);
    expect(publishedGain).toBeGreaterThanOrEqual(1);
    expect(publishedGain).toBeLessThanOrEqual(2);
    expect(finalDraft).toBeLessThan(initialDraft);

    await arcDraft.focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(`${finalDraft} Draft`);

    await arcModifiedSeg.focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(`${finalModified} Modified`);

    await arcPublishedSeg.focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(`${finalPublished} Published`);
  });
});
