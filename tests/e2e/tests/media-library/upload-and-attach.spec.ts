import { test, expect } from '@playwright/test';
import path from 'path';

import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { addAttributesToContentType } from '../../../utils/content-types';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

/**
 * The `media.upload-and-attach` critical path.
 *
 * `media-library/future/media-library-upload.spec.ts` covers upload against the beta library.
 * Nothing covered attaching an asset to an entry, on either implementation.
 *
 * Deliberately carries no `E2E_MEDIA_LIBRARY` gate, unlike the specs under `future/`.
 *
 * Selecting a library swaps the Media Library page only. `upload/admin/src/index.ts` registers the
 * `media` field (`MediaLibraryInput`) and the picker (`MediaLibraryDialog`) outside its
 * `if (!isLegacyMediaLibrary)` block, and neither the current library nor `future/` ships an
 * equivalent — so entry editing opens the same component tree whichever library is selected, and
 * one spec covers both suites. Confirmed by running it under `current` and `legacy`.
 *
 * Gating it to one suite would leave the other with no coverage of the single most common thing
 * people do with the Media Library. Revisit if the current library grows its own picker: that turns
 * this into two specs, and both halves then need gating explicitly. A suite gated the wrong way
 * does not fail, it skips and reports green.
 */
test.describe('Media Library - upload and attach to an entry', { tag: ['@critical'] }, () => {
  // Long timeout — adding the media field to Article restarts the server.
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    // resetAlways because this test mutates the schema; retries must start clean.
    await sharedSetup('media-upload-and-attach', page, {
      resetFiles: true,
      importData: 'with-admin',
      login: true,
      resetAlways: true,
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('an uploaded asset can be attached to an entry, published, and is served by the API', async ({
    page,
  }) => {
    // The seeded Article CT has no media attribute (title, content, authors, slug, seo), so the
    // field under test has to be created first. This writes the schema and restarts the server.
    await addAttributesToContentType(page, 'Article', [
      { type: 'media', name: 'cover', media: { multiple: false } },
    ]);

    // --- Create an entry and open the picker from the media field's empty state ---
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.getByRole('textbox', { name: 'title' }).fill('Article with cover');

    // EmptyStateAsset renders only while the carousel holds no assets (CarouselAssets.tsx L104).
    const emptyState = page.getByRole('button', {
      name: 'Click to add an asset or drag and drop one in this area',
    });
    await clickAndWait(page, emptyState);

    // "Add new assets" is the *dialog's* accessible name (its `h2`), not a control inside it.
    // Read off the rendered accessibility tree rather than the translation files, which are
    // ambiguous about which step each string belongs to.
    const dialog = page.getByRole('dialog', { name: 'Add new assets' });

    // Precondition asserted rather than assumed. `with-admin` seeds 9 assets, so the picker opens
    // on a populated browse step: "Media Library is empty" cannot render, and the way through to
    // the upload step is "Add more assets". If the fixture ever stops seeding media this fails
    // here instead of silently clicking the wrong control.
    await expect(dialog.getByRole('tab', { name: 'browse' })).toBeVisible();
    const addAssets = dialog.getByRole('button', { name: 'Add more assets' });
    await expect(addAssets).toBeVisible();

    // --- Upload from inside the picker ---
    await addAssets.click();

    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../../data/uploads/test-image.jpg'));

    await page.getByRole('button', { name: 'Upload 1 asset to the library' }).click();

    // MediaLibraryInput passes the fresh upload back as `initiallySelectedAssets`, so it returns
    // pre-selected and only needs confirming. This deliberately avoids the browse-grid checkbox,
    // which renders with no accessible name.
    await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));

    // --- Attached in the form, before saving ---
    await expect(emptyState).toBeHidden();
    // CarouselInput renders the current asset's name as its secondaryLabel (CarouselAssets.tsx L78).
    await expect(page.getByText('test-image.jpg').first()).toBeVisible();

    // --- Save, then publish ---
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await findAndClose(page, 'Published Document');

    // --- Survives a reload: the relation persisted, it wasn't just held in form state ---
    await page.reload();
    await expect(page.getByText('test-image.jpg').first()).toBeVisible();

    // --- The API returns the media populated, and the file is really served ---
    const documentId = page.url().match(/api::article\.article\/([^/?#]+)/)?.[1];
    expect(documentId, 'could not read documentId from the edit-view URL').toBeTruthy();

    const loginRes = await page.request.post('/admin/login', {
      data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
    });
    const loginBody = await loginRes.json();
    const adminToken: string | undefined = loginBody.data?.token;
    expect(adminToken, `API login failed: ${JSON.stringify(loginBody)}`).toBeTruthy();

    const headers = { Authorization: `Bearer ${adminToken}` };
    const res = await page.request.get(
      `/content-manager/collection-types/api::article.article/${documentId}`,
      { headers }
    );
    expect(res.status(), 'GET content-manager entry').toBe(200);

    const body = await res.json();
    const entry = body.data ?? body;

    expect(entry.cover, 'media field was not populated on the returned entry').toBeTruthy();
    expect(entry.cover.name).toBe('test-image.jpg');
    expect(entry.cover.url, 'uploaded asset has no url').toBeTruthy();

    // Upload -> attach -> publish -> served. Without this the test would pass against a broken
    // provider that records the relation but never persists the file.
    const mediaRes = await page.request.get(entry.cover.url);
    expect(mediaRes.status(), `GET ${entry.cover.url}`).toBe(200);
  });
});
