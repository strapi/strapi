import { test, expect, type Page } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { navToHeader } from '../../../utils/shared';

const UNSAVED_MESSAGE =
  'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.';

const openInviteModal = async (page: Page) => {
  await page.getByRole('button', { name: 'Invite new user' }).click();

  // The modal header is a breadcrumb rather than a title, so the dialog has no accessible name.
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  return modal;
};

test.describe('Invite user modal', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
    await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');
  });

  test('closes without asking while the form is untouched', async ({ page }) => {
    const modal = await openInviteModal(page);

    await page.keyboard.press('Escape');

    await expect(modal).toBeHidden();
    await expect(page.getByRole('alertdialog')).toBeHidden();
  });

  test('asks before discarding changes on Escape and outside click', async ({ page }) => {
    const modal = await openInviteModal(page);
    await modal.getByRole('textbox', { name: 'First name' }).fill('Kai');

    await page.keyboard.press('Escape');

    const alert = page.getByRole('alertdialog');
    await expect(alert).toContainText(UNSAVED_MESSAGE);

    await alert.getByRole('button', { name: 'Cancel' }).click();

    await expect(alert).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('textbox', { name: 'First name' })).toHaveValue('Kai');

    // Click the overlay, well outside the modal content.
    await page.mouse.click(5, 5);

    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Confirm' }).click();

    await expect(alert).toBeHidden();
    await expect(modal).toBeHidden();
  });

  test('asks before discarding changes from the close and Cancel buttons', async ({ page }) => {
    let modal = await openInviteModal(page);
    await modal.getByRole('textbox', { name: 'First name' }).fill('Kai');
    await modal.getByRole('button', { name: 'Close modal' }).click();

    const alert = page.getByRole('alertdialog');
    await expect(alert).toContainText(UNSAVED_MESSAGE);
    await alert.getByRole('button', { name: 'Confirm' }).click();
    await expect(modal).toBeHidden();

    modal = await openInviteModal(page);
    await modal.getByRole('textbox', { name: 'First name' }).fill('Kai');
    await modal.getByRole('button', { name: 'Cancel' }).click();

    await expect(alert).toContainText(UNSAVED_MESSAGE);
    await alert.getByRole('button', { name: 'Confirm' }).click();
    await expect(modal).toBeHidden();
  });
});
