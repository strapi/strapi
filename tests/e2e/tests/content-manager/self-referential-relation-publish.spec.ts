import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

/**
 * A draft entry whose relation points at itself must keep that relation visible in the edit
 * view immediately after publishing, without a manual page refresh.
 *
 * Server-side persistence of self-referential relations on publish is covered by the API
 * integration tests (self-referential-relations.test.api.ts). This complements them at the UI
 * layer: the explicit reload at the end distinguishes a front-end cache/invalidation problem
 * (chip missing before reload, present after) from actual server-side data loss (missing in
 * both).
 */
test.describe('Self-referential relation - publish reflects in the admin without a refresh', () => {
  test.beforeEach(async ({ page }) => {
    // coreStore: false keeps the freshly generated app's auto-synced Content Manager layout,
    // which includes the `related` field. Restoring the snapshot config would hide it because
    // the snapshot predates this field.
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    // The restored permissions snapshot predates the `related` field, so Super Admin would see
    // "No permissions to see this field". Resync rebuilds CM config + Super Admin permissions.
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  test('a draft entry related to itself keeps the relation visible after publishing (no refresh)', async ({
    page,
  }) => {
    // 1. Create a new Dog entry.
    await navToHeader(page, ['Content Manager', 'Dog'], 'Dog');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());

    await page.getByRole('textbox', { name: 'name' }).fill('Rex');

    // Save first so the entry exists and can be selected as its own relation target.
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    // 2. Point the "related" relation at the entry itself.
    await page.getByRole('combobox', { name: 'related' }).click();
    await clickAndWait(page, page.getByRole('option', { name: 'Rex' }));

    // The self-relation chip is shown after selecting.
    const relationChip = page.getByRole('button', { name: 'Rex' });
    await expect(relationChip).toBeVisible();

    // Persist the self-relation on the draft.
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
    await expect(relationChip).toBeVisible();

    // 3. Publish without reloading the page afterwards.
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await findAndClose(page, 'Published Document');

    // The self-relation must stay visible without a manual refresh: a missing chip here
    // indicates a front-end cache/invalidation problem after publish.
    await expect(relationChip).toBeVisible();

    // After an explicit reload the relation must still be present, confirming it was persisted
    // server-side. If the chip is missing before this reload but present after, the defect is
    // front-end only; if it is missing in both, the relation was lost on the server.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(relationChip).toBeVisible();
  });
});
