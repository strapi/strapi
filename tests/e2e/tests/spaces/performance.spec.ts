import { test, expect } from '@playwright/test';

import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import {
  ARTICLE_LIST_URL,
  DEFAULT_WORKSPACE,
  SUB_WORKSPACE,
  WORKSPACE_NAMES,
  createArticle,
  pinWorkspace,
  resetWorkspaces,
  switchWorkspaceInUi,
  waitForAdminReady,
} from './utils';

const ROWS = 12;

/** Counts the matching requests a block of work issues. */
const countRequests = async (
  page: import('@playwright/test').Page,
  match: RegExp,
  work: () => Promise<void>
): Promise<string[]> => {
  const seen: string[] = [];
  const listener = (request: import('@playwright/test').Request) => {
    if (match.test(request.url())) {
      seen.push(request.url());
    }
  };

  page.on('request', listener);
  try {
    await work();
  } finally {
    page.off('request', listener);
  }

  return seen;
};

/**
 * Workspace-awareness must not cost a request per row.
 *
 * Every read-only affordance in a sub-workspace — the lock, the panel, the
 * guard on each document and bulk action — needs to know whether the workspace
 * may edit a given entry. Asked naively that is one request per row, several
 * times over; these tests hold the line at one batched request per page.
 */
test.describe('Workspaces — request cost', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
    await waitForAdminReady(page);
    await resetWorkspaces(page);
    await pinWorkspace(page, DEFAULT_WORKSPACE);

    for (let index = 0; index < ROWS; index += 1) {
      await createArticle(page, { title: `Acme entry ${index}`, workspace: SUB_WORKSPACE });
    }
  });

  test('a sub-workspace list asks for every row’s state in one request', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);

    const requests = await countRequests(page, /\/spaces\/entry-states/, async () => {
      await page.goto(ARTICLE_LIST_URL);
      await expect(page.getByRole('row').filter({ hasText: 'Acme entry 0' })).toBeVisible();
      await page.waitForLoadState('networkidle');
    });

    expect(requests).toHaveLength(1);
    // …and that request covers the whole page, not one row of it.
    const ids = new URL(requests[0]).searchParams.get('documentIds')?.split(',') ?? [];
    expect(ids.length).toBeGreaterThan(1);
  });

  /**
   * The default workspace edits everything, so there is nothing to ask about.
   */
  test('the default workspace asks for no entry states at all', async ({ page }) => {
    const requests = await countRequests(page, /\/spaces\/entry-states/, async () => {
      await page.goto(ARTICLE_LIST_URL);
      await expect(page.getByRole('row').filter({ hasText: 'Acme entry 0' })).toBeVisible();
      await page.waitForLoadState('networkidle');
    });

    expect(requests).toHaveLength(0);
  });

  /**
   * Switching workspace is a data swap, not a page load: the admin stays
   * mounted and refetches what changed.
   */
  test('switching workspace does not reload the page', async ({ page }) => {
    await page.goto(ARTICLE_LIST_URL);
    await waitForAdminReady(page);

    const navigations: string[] = [];
    const listener = (request: import('@playwright/test').Request) => {
      if (request.isNavigationRequest()) {
        navigations.push(request.url());
      }
    };

    page.on('request', listener);
    try {
      await switchWorkspaceInUi(page, WORKSPACE_NAMES[SUB_WORKSPACE]);
      await expect(page.getByRole('row').filter({ hasText: 'Acme entry 0' })).toBeVisible();
    } finally {
      page.off('request', listener);
    }

    expect(navigations).toHaveLength(0);
  });
});
