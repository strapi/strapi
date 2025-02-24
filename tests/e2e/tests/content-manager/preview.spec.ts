import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition, findAndClose } from '../../utils/shared';
import { resetFiles } from '../../utils/file-reset';

test.describe('Preview', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar', (cts) => cts, { coreStore: false });
    await resetFiles();
    await page.goto('/admin');
    await page.evaluate(() => window.localStorage.setItem('GUIDED_TOUR_SKIPPED', 'true'));
    await login({ page });
    await page.waitForURL('/admin');
  });

  test('Preview button should appear for configured content types', async ({ page, context }) => {
    // Open an edit view for a content type that has preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

    // Check that preview opens in its own page
    await clickAndWait(page, page.getByRole('link', { name: /open preview/i }));
    // Draft status is visible (second Draft text is the draft tab)
    await expect(page.getByText(/^Draft$/).nth(0)).toBeVisible();
    await expect(page.getByRole('heading', { name: /west ham post match/i })).toBeVisible();

    // Copies the link of the page
    await page.getByRole('button', { name: /copy preview link/i }).click();
    await findAndClose(page, 'Copied preview link');

    // Should go back to the edit view on close
    await clickAndWait(page, page.getByRole('link', { name: /close preview/i }));
    const titleInput = page.getByRole('textbox', { name: /title/i });
    await expect(titleInput).toBeVisible();

    // Preview link should be disabled when there are unsaved changes
    await titleInput.fill('New title');
    const previewLink = page.getByRole('link', { name: /open preview/i });
    await expect(previewLink).toBeDisabled();
    // Can't hover the link directly because of pointer-events:none, so hover the div parent
    await previewLink.locator('..').hover();
    await expect(
      page.getByRole('tooltip', { name: /please save to open the preview/i })
    ).toBeVisible();
  });

  test('Preview button should not appear for content types without preview config', async ({
    page,
  }) => {
    // Open an edit view for a content type that does not have preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Product' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /nike mens/i }));

    await expect(page.getByRole('link', { name: /open preview/i })).not.toBeVisible();
  });

  test('Tabs for Draft and Publish should be visible for content type with D&P enabled', async ({
    page,
  }) => {
    // Navigate to the Content Manager and open the edit view of a content type with D&P enabled
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

    // Check that preview opens in its own page
    await clickAndWait(page, page.getByRole('link', { name: /open preview/i }));
    // Draft status is visible (second Draft text is the draft tab)
    await expect(page.getByText(/^Draft$/).nth(0)).toBeVisible();
    await expect(page.getByRole('heading', { name: /west ham post match/i })).toBeVisible();

    // Verify that Draft and Publish tabs are visible
    await expect(page.getByRole('tab', { name: /^Draft$/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Published$/ })).toBeVisible();

    // Expect the preview tab to be disabled (since the document is in draft status)
    await expect(page.getByText(/^Published$/)).toBeDisabled();
  });

  test('Iframe should be present and load the correct URL', async ({ page }) => {
    // Open an edit view for a content type that has preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

    // Publish the document
    await page.getByRole('button', { name: /publish/i }).click();

    // Check that preview opens in its own page
    await clickAndWait(page, page.getByRole('link', { name: /open preview/i }));

    // Check if the iframe is present
    const iframe = page.getByTitle('Preview');
    expect(iframe).not.toBeNull();

    // Check if the iframe is loading the correct URL
    await expect(iframe).toHaveAttribute('src', /\/preview\/api::article\.article\/.+\/en\/draft$/);

    // Navigate to the published tab
    await clickAndWait(page, page.getByRole('tab', { name: /^Published$/ }));

    const updatedIframe = page.getByTitle('Preview');
    await expect(updatedIframe).toHaveAttribute(
      'src',
      /\/preview\/api::article\.article\/.+\/en\/published$/
    );
  });
});

describeOnCondition(process.env.STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR === 'true')(
  'Unstable Preview',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar', (cts) => cts, {
        coreStore: false,
      });
      await resetFiles();
      await page.goto('/admin');
      await page.evaluate(() => window.localStorage.setItem('GUIDED_TOUR_SKIPPED', 'true'));
      await login({ page });
      await page.waitForURL('/admin');
    });

    test('I can edit the form to save the document as draft, modified, or published', async ({
      page,
    }) => {
      // Open an edit view for a content type that has preview
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
      await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

      // Open the preview page
      await clickAndWait(page, page.getByRole('link', { name: /open preview/i }));

      const titleBox = page.getByRole('textbox', { name: 'title' });
      const saveButton = page.getByRole('button', { name: /save/i });
      const publishButton = page.getByRole('button', { name: /publish/i });
      const draftTab = page.getByRole('tab', { name: /^Draft$/ });
      const publishedTab = page.getByRole('tab', { name: /^Published$/ });

      // Confirm initial state
      await expect(titleBox).toHaveValue(/west ham post match/i);
      await expect(page.getByRole('status', { name: /draft/i })).toBeVisible();
      await expect(draftTab).toHaveAttribute('aria-selected', 'true');
      await expect(draftTab).toBeEnabled();
      await expect(publishedTab).toHaveAttribute('aria-selected', 'false');
      await expect(publishedTab).toBeDisabled();

      // Update and save
      await titleBox.fill('West Ham pre match pep talk');
      await expect(saveButton).toBeEnabled();
      await clickAndWait(page, saveButton);
      await expect(titleBox).toHaveValue(/west ham pre match pep talk/i);
      await expect(page.getByRole('status', { name: /draft/i })).toBeVisible();

      // Publish
      await expect(publishButton).toBeEnabled();
      await clickAndWait(page, publishButton);
      await expect(titleBox).toHaveValue(/west ham pre match pep talk/i);
      await expect(page.getByRole('status', { name: /published/i })).toBeVisible();
      await expect(publishedTab).toBeEnabled();
      await clickAndWait(page, publishedTab);
      await expect(titleBox).toBeDisabled();

      // Modify
      await clickAndWait(page, draftTab);
      titleBox.fill('West Ham pre match jokes');
      await expect(saveButton).toBeEnabled();
      await clickAndWait(page, saveButton);
      await expect(titleBox).toHaveValue(/west ham pre match jokes/i);
      await expect(page.getByRole('status', { name: /modified/i })).toBeVisible();
    });
  }
);
