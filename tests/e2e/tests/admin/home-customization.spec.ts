import { test, expect } from '../../../fixtures';
import { loginWithApi } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait } from '../../../utils/shared';

test.describe('Homepage Widget Customization', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await loginWithApi({ page });
    await page.goto('/admin');
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
    await expect(deleteButton).toBeVisible();

    // Click delete button
    await clickAndWait(page, deleteButton);

    // Verify widget is removed, and still removed after a reload (the layout was saved)
    await expect(profileWidget).not.toBeVisible();
    await page.reload();
    await expect(page.getByText('Hello test')).toBeVisible();
    await expect(profileWidget).not.toBeVisible();

    // Now add it back through the modal
    const addWidgetButton = page.locator('button:has-text("Add Widget")').first();
    await expect(addWidgetButton).toBeVisible();
    await clickAndWait(page, addWidgetButton);

    // Look for widget selection modal
    const widgetModal = page.locator('[role="dialog"]').first();
    await expect(widgetModal).toBeVisible();

    // The Profile widget preview should now be available to add
    const profileWidgetInModal = widgetModal.locator('h2:has-text("Profile")').first();
    await expect(profileWidgetInModal).toBeVisible();

    // Click to add the widget back
    await clickAndWait(page, profileWidgetInModal);

    // Verify the modal is closed
    await expect(widgetModal).not.toBeVisible();

    // Verify the Profile widget is visible again, and still there after a reload
    await expect(profileWidget).toBeVisible();
    await page.reload();
    await expect(page.getByText('Hello test')).toBeVisible();
    await expect(profileWidget).toBeVisible();
  });
});
