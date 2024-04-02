import { Page, expect } from '@playwright/test';

export const waitForRestart = async (page: Page, timeout: number = 60000) => {
  // restart message should appear
  await expect(page.getByRole('heading', { name: 'Waiting for restart...' })).toBeVisible();

  // then it should eventually go away once the server restarts
  await page.waitForSelector('text="Waiting for restart..."', { state: 'hidden', timeout });
  await expect(page.getByRole('heading', { name: 'Waiting for restart...' })).not.toBeVisible();
};
