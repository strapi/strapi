import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { navToHeader } from '../../../../utils/shared';

const CODEMIRROR_DUPLICATE_RE = /multiple instances of @codemirror\/state/i;

test.describe('JSON field edit view', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('editing a JSON field does not crash with duplicate CodeMirror instances', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await navToHeader(page, ['Content Manager', 'Complex Content'], 'Complex Content');
    await page.getByRole('link', { name: 'Create new entry' }).click();
    await page.waitForURL(/api::complex\.complex\/create/);

    const editor = page.locator('.cm-editor .cm-content').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.pressSequentially('{\n  "hello": "world"\n}');

    await expect(page.getByText('Unrecognized extension value')).not.toBeVisible();
    expect(consoleErrors.join('\n')).not.toMatch(CODEMIRROR_DUPLICATE_RE);
  });
});
