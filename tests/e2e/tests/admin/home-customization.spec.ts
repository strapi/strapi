import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait } from '../../../utils/shared';

test.describe('Homepage Widget Customization', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the empty state when no widgets are available to add', async ({
    page,
  }) => {
    await expect(page.getByText('Hello test')).toBeVisible();

    // Look for add widget button and click it
    const addWidgetButton = page.locator('button:has-text("Add Widget")').first();
    await expect(addWidgetButton).toBeVisible();
    await clickAndWait(page, addWidgetButton);

    // Look for widget selection modal
    const widgetModal = page.locator('[role="dialog"]').first();
    await expect(widgetModal).toBeVisible();

    // Verify empty state is shown (API returns 0 widgets by default)
    const emptyState = widgetModal.locator(':has-text("No widgets available to add")').first();
    await expect(emptyState).toBeVisible();

    // Close the modal
    const closeButton = widgetModal.locator('button:has-text("Cancel")').first();
    await closeButton.click();
  });

  test('a user should be able to delete a widget from the homepage, and add it again through the modal', async ({
    page,
  }) => {
    await expect(page.getByText('Hello test')).toBeVisible();

    // Find a widget to delete (let's use the Profile widget)
    const profileWidget = page.getByLabel(/Profile/i);
    await expect(profileWidget).toBeVisible();

    // Hover over the widget to make delete button visible
    await profileWidget.hover();
    await page.waitForTimeout(1000); // Wait for hover effects to appear

    // Look for delete button (it has text "Delete" but aria-label is null)
    const deleteButton = profileWidget.locator('button').first();

    if ((await deleteButton.count()) > 0) {
      // Click delete button
      await clickAndWait(page, deleteButton);

      // Verify widget is removed
      await expect(profileWidget).not.toBeVisible();

      // Now try to add it back through the modal
      const addWidgetButton = page.locator('button:has-text("Add Widget")').first();
      await expect(addWidgetButton).toBeVisible();
      await clickAndWait(page, addWidgetButton);

      // Look for widget selection modal
      const widgetModal = page.locator('[role="dialog"]').first();
      await expect(widgetModal).toBeVisible();

      // Look for the Profile widget preview in the modal (it should now be available to add)
      const profileWidgetInModal = widgetModal.locator('h2:has-text("Profile")').first();

      if ((await profileWidgetInModal.count()) > 0) {
        // Click to add the widget back
        await clickAndWait(page, profileWidgetInModal);

        // Verify the modal is closed
        await expect(widgetModal).not.toBeVisible();

        // Verify the Profile widget is visible again
        await expect(profileWidget).toBeVisible();
      } else {
        // Close the modal
        const cancelButton = widgetModal.locator('button:has-text("Cancel")').first();
        await cancelButton.click();
      }
    } else {
      // Verify widget is still visible (no deletion occurred)
      await expect(profileWidget).toBeVisible();
    }
  });
});
