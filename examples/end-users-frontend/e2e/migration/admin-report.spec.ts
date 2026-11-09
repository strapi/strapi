import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { signInAdmin } from '../admin/helpers.ts';

/** The banner's text, for a number of items that need attention */
const bannerText = /(\d+) migration items? needs? attention/;

test('the banner counts the open items, the report downloads, and acknowledging one lowers the count', async ({
  page,
}) => {
  await signInAdmin(page);
  await page.goto('/admin/settings/end-users/advanced');

  const banner = page.getByText(bannerText);

  await expect(banner).toBeVisible();

  const openBefore = Number((await banner.textContent())?.match(bannerText)?.[1]);

  expect(openBefore).toBeGreaterThan(0);

  // The banner leads to the Migration section, which holds the report
  const section = page.locator('#migration');

  await expect(section.getByRole('heading', { name: 'Migration' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');

  await section.getByRole('button', { name: 'Download report' }).click();

  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('end-users-migration-report.json');

  const report = JSON.parse(await readFile(await download.path(), 'utf8'));

  expect(report.items.map((item: { id: string }) => item.id)).toContain(
    'provider-not-supported:instagram'
  );

  // Acknowledge the instagram provider, which has no equivalent: its row is the innermost box that
  // holds its message and a checkbox
  await section
    .locator('div')
    .filter({ hasText: 'The instagram provider is not carried over' })
    .filter({ has: page.getByRole('checkbox') })
    .last()
    .getByRole('checkbox', { name: 'Mark resolved' })
    .click();

  await expect(page.getByText(`${openBefore - 1} migration item`)).toBeVisible();
});
