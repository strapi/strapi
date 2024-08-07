import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { navToHeader } from '../../utils/shared';

const EDIT_URL = /\/admin\/content-manager\/single-types\/api::homepage.homepage(\?.*)?/;

test.describe('Blocks editor', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.fixme('adds a code block and specifies the language', async ({ page }) => {
    // Write some text into a blocks editor
    const code = 'const problems = 99';
    await navToHeader(page, ['Content Manager', 'Homepage'], 'Untitled');
    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible();
    const textbox = page.getByRole('textbox').nth(1);
    await expect(textbox).toBeVisible();
    await textbox.click();
    await textbox.fill(code);
    await expect(page.getByText(code)).toBeVisible();

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

    // Save and reload to make sure the change is persisted
    await page.getByRole('button', { name: 'Save' }).click();
    await page.reload();
    await expect(page.getByText(code)).toBeVisible();
    await page.getByText(code).click();
    await expect(page.getByText('Fortran')).toBeVisible();
    await expect(page.getByText('Plain text')).not.toBeVisible();
  });
});
