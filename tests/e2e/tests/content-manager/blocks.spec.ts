import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Blocks editor', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('adds a code block and specifies the language', async ({ page, browserName }) => {
    // Write some text into a blocks editor
    const code = 'const problems = 99';
    await navToHeader(page, ['Content Manager', 'Homepage'], 'Homepage');
    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible();
    const textbox = page.getByRole('textbox').filter({ hasText: 'Drag' });
    await expect(textbox).toBeVisible();
    await textbox.click();
    await textbox.fill(code);
    await expect(page.getByText(code)).toBeVisible();

    test.skip(
      browserName === 'firefox',
      'Firefox loses focus when clicking the toolbar in Playwright, but not in a real environment'
    );

    // Use the toolbar to convert the block to a code block and specify the language
    const toolbar = page.getByRole('toolbar');
    await toolbar.getByRole('combobox').click();
    await page.getByLabel('Code block').click();
    await textbox.getByText(code).click();
    const languageSelect = page.getByText('Plain text');
    await expect(languageSelect).toBeVisible();
    await languageSelect.click();
    await page.getByText('Fortran').click();
    await expect(page.getByText('Fortran')).toBeVisible();

    // Ensure we're not in the middle of the code block, so that double enter creates a new block
    for (let i = 0; i < code.length; i++) {
      await page.keyboard.press('ArrowRight');
    }
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Fortran')).not.toBeVisible();

    // Save and reload to make sure the change is persisted. Await the PUT — the toast can resolve before
    // the request finishes on fast machines.
    const savePut = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/content-manager/single-types/api::homepage.homepage') &&
        response.ok()
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await savePut;
    await findAndClose(page, 'Saved document');

    await page.reload();

    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible();
    const textboxAfterReload = page.getByRole('textbox').filter({ hasText: 'Drag' });
    await expect(textboxAfterReload).toBeVisible();
    await expect(textboxAfterReload.getByText(code)).toBeVisible();

    // Before save we moved the caret into a new block; after reload the toolbar reflects whichever
    // block has focus (often not the code block). Click the saved code to focus that block again.
    // The language combobox lives on the blocks toolbar (a sibling of the editable surface in the
    // a11y tree), not inside the `textbox` node — scope to the draft tabpanel's toolbar.
    // Focus the code block (click the `<code>` surface, not just the text node) so the blocks
    // toolbar shows the language combobox.
    await textboxAfterReload.locator('code').filter({ hasText: code }).click();
    const draftPanel = page.getByRole('tabpanel', { name: 'draft' });
    await expect(async () => {
      await expect(draftPanel.getByRole('combobox').filter({ hasText: 'Fortran' })).toBeVisible();
    }).toPass({ timeout: 15_000 });
  });
});
