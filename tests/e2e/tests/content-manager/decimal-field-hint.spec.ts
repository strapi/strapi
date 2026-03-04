import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { navToHeader, clickAndWait } from '../../../utils/shared';
import {
  addAttributesToContentType,
  removeAttributeFromComponent,
} from '../../../utils/content-types';

test.describe('Decimal field hint with min/max values', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('should display correct hint for decimal field with min/max values in content manager', async ({
    page,
  }) => {
    const contentTypeName = 'Country';
    await navToHeader(page, ['Content-Type Builder', contentTypeName], contentTypeName);

    await addAttributesToContentType(page, contentTypeName, [
      {
        type: 'number',
        name: 'GDP',
        number: { format: 'decimal' },
        advanced: {
          minimum: 0,
          maximum: 100,
        },
      },
    ]);

    await navToHeader(page, ['Content Manager', contentTypeName], contentTypeName);
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());

    const gdpHint = page.getByText('min. 0 / max. 100');
    await expect(gdpHint).toBeVisible();

    const nameField = page.getByText('min. 3 characters');
    await expect(nameField).toBeVisible();

    await removeAttributeFromComponent(page, contentTypeName, 'GDP');
  });
});
