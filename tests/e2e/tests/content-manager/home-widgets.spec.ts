import { test, expect, type Page } from '@playwright/test';
import { sharedSetup } from '../../../utils/setup';
import {
  clickAndWait,
  findAndClose,
  navToHeader,
  withContentManagerPublish,
  withContentManagerSave,
} from '../../../utils/shared';

/**
 * `waitForResponse` inherits `actionTimeout` (10s by default — see playwright.base.config.js). WebKit
 * often needs a bit longer while homepage widget chunks load before those GETs fire; use a modest
 * override so we do not fail on slow-but-healthy CI.
 */
const HOMEPAGE_WIDGET_RESPONSE_MS = 20_000;

/**
 * Homepage widgets use RTK Query (`recent-documents`, `count-documents`). Develop only did
 * DTS + `/admin` + login; this suite also hard-refreshes after `sharedSetup` so RTK does not show
 * stale widget data when the full content-manager run order varies. Register listeners, then reload.
 */
async function waitForHomepageWidgetsReady(page: Page) {
  const responseOpts = { timeout: HOMEPAGE_WIDGET_RESPONSE_MS };
  const recentEdited = page.waitForResponse(
    (r) =>
      r.url().includes('/content-manager/homepage/recent-documents') &&
      r.url().includes('action=update') &&
      r.ok(),
    responseOpts
  );
  const recentPublished = page.waitForResponse(
    (r) =>
      r.url().includes('/content-manager/homepage/recent-documents') &&
      r.url().includes('action=publish') &&
      r.ok(),
    responseOpts
  );
  const countDocuments = page.waitForResponse(
    (r) => r.url().includes('/content-manager/homepage/count-documents') && r.ok(),
    responseOpts
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await Promise.all([recentEdited, recentPublished, countDocuments]);
}

test.describe('Homepage - Content Manager Widgets', () => {
  test.beforeEach(async ({ page }) => {
    // Same pattern as history.spec: resetFiles → DTS import on every test so schema + DB match
    // `with-admin` after other specs may have mutated the test app (CTB, etc.). resetAlways is
    // slower but avoids order-dependent failures in the full content-manager run.
    await sharedSetup('home-widgets', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
      resetAlways: true,
    });
    await waitForHomepageWidgetsReady(page);
  });

  test('a user should see the last edited entries', async ({ page }) => {
    const recentlyEditedWidget = page.getByLabel(/last edited entries/i);
    await expect(recentlyEditedWidget).toBeVisible();

    // Make content update in the CM
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: /^nike mens/i }));

    const nameBox = page.getByLabel(/name/i);
    await nameBox.fill('Nike Mens newer!');
    await withContentManagerSave(page, async () => {
      await page.getByRole('button', { name: /save/i }).click();
    });
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
    await withContentManagerPublish(page, async () => {
      await page.getByRole('button', { name: /publish/i }).click();
    });
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
    await withContentManagerSave(page, async () => {
      await page.getByRole('button', { name: /save/i }).click();
    });
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
    await withContentManagerPublish(page, async () => {
      await page.getByRole('button', { name: /publish/i }).click();
    });
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
    await withContentManagerPublish(page, async () => {
      await page.getByRole('button', { name: /publish/i }).click();
    });
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

    // Baseline should be drafts only (no published/modified). beforeEach already reloads and waits
    // on homepage APIs; the chart can still repaint segment labels a tick late — poll until stable.
    await expect(async () => {
      await expect(chartWidget.getByText('Draft')).toBeVisible();
      await expect(chartWidget.getByText('Modified')).not.toBeVisible();
      await expect(chartWidget.getByText('Published')).not.toBeVisible();
    }).toPass();

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
    await withContentManagerPublish(page, async () => {
      await page.getByRole('button', { name: /publish/i }).click();
    });
    await findAndClose(page, 'Published document');

    // Modify an entry
    await page.getByRole('link', { name: 'Back' }).click();
    await clickAndWait(
      page,
      page.getByRole('gridcell', { name: 'Why I prefer football over soccer' })
    );
    await withContentManagerPublish(page, async () => {
      await page.getByRole('button', { name: /publish/i }).click();
    });
    await findAndClose(page, 'Published document');
    const title = page.getByLabel(/title/i);
    await title.fill('West Ham pre match pep talk');
    await withContentManagerSave(page, async () => {
      await page.getByRole('button', { name: /save/i }).click();
    });
    await findAndClose(page, 'Saved document');

    // Go back to the home page
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));

    // The published and modified entries should be visible in the chart
    await expect(chartWidget.getByText('Draft')).toBeVisible();
    await expect(chartWidget.getByText('Modified')).toBeVisible();
    await expect(chartWidget.getByText('Published')).toBeVisible();

    const arcDraftUpdated = chartWidget.locator('circle').nth(0);
    const arcPublished = chartWidget.locator('circle').nth(1);
    const arcModified = chartWidget.locator('circle').nth(2);

    // Tooltip text follows focus; on fast clients the segment can repaint a tick after focus.
    await expect(async () => {
      await arcDraftUpdated.focus();
      await expect(tooltip).toContainText(`${initialDraftCount - 2} Draft`);
    }).toPass();

    await expect(async () => {
      await arcPublished.focus();
      await expect(tooltip).toContainText('1 Modified');
    }).toPass();

    await expect(async () => {
      await arcModified.focus();
      await expect(tooltip).toContainText('1 Published');
    }).toPass();
  });
});
