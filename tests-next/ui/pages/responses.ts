import { URL } from 'node:url';

import type { Page, Response } from '@playwright/test';

/**
 * The admin API response a click causes, for actions with no visible end (a save that stays on
 * the page). Start waiting before the click:
 *
 *   const saved = adminResponse(page, 'PUT', /^\/admin\/roles\/\d+$/);
 *   await saveButton.click();
 *   await saved;
 *
 * Fails when the response isn't a success, so a test never goes on after a failed write.
 */
export const adminResponse = async (
  page: Page,
  method: string,
  pathname: RegExp
): Promise<Response> => {
  const response = await page.waitForResponse(
    (res) => res.request().method() === method && pathname.test(new URL(res.url()).pathname)
  );
  if (!response.ok()) {
    throw new Error(`${method} ${response.url()} answered ${response.status()}`);
  }
  return response;
};
