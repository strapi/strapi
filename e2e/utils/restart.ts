import { Page, expect } from '@playwright/test';

export const waitForRestart = async (page: Page) => {
  // restart message should appear
  await expect(page.getByRole('heading', { name: 'Waiting for restart...' })).toBeVisible();

  // then it should eventually go away
  await expect(page.getByRole('heading', { name: 'Waiting for restart...' })).not.toBeVisible();
};
