import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

/**
 * Spaces also needs its licence feature, which is rolled out separately from the
 * code. Without it the plugin does not load and none of this is on screen, so
 * the suite skips rather than failing on a missing menu item.
 */
const hasSpaces = process.env.STRAPI_FEATURE_SPACES === 'true';

describeOnCondition(edition === 'EE' && hasSpaces)('Spaces', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  const createSpace = async (page, name: string) => {
    await navToHeader(page, ['Settings', 'Spaces'], 'Spaces');
    await clickAndWait(page, page.getByRole('button', { name: 'Create a space' }));

    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    await findAndClose(page, 'Space created');
  };

  test('an administrator can create a space and see it listed', async ({ page }) => {
    await createSpace(page, 'France');

    await expect(page.getByRole('row', { name: /France/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /France/ }).getByText('france')).toBeVisible();
  });

  test('the switcher appears once there is more than one space', async ({ page }) => {
    await createSpace(page, 'France');
    await createSpace(page, 'Germany');

    await page.reload();

    const switcher = page.getByRole('combobox', { name: 'Space' });
    await expect(switcher).toBeVisible();

    await clickAndWait(page, switcher);
    await expect(page.getByRole('option', { name: 'All spaces' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'France' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Germany' })).toBeVisible();
  });

  test('content created in one space is not visible in the other', async ({ page }) => {
    await createSpace(page, 'France');
    await createSpace(page, 'Germany');
    await page.reload();

    const switchTo = async (name: string) => {
      await clickAndWait(page, page.getByRole('combobox', { name: 'Space' }));
      await clickAndWait(page, page.getByRole('option', { name, exact: true }));
      await page.waitForLoadState('networkidle');
    };

    await switchTo('France');
    await navToHeader(page, ['Content Manager'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: /create new entry/i }).first());
    await page.getByRole('textbox', { name: 'title' }).fill('Bonjour tout le monde');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved');

    await switchTo('Germany');
    await navToHeader(page, ['Content Manager'], 'Article');

    await expect(page.getByRole('gridcell', { name: 'Bonjour tout le monde' })).toHaveCount(0);

    await switchTo('France');
    await navToHeader(page, ['Content Manager'], 'Article');

    await expect(page.getByRole('gridcell', { name: 'Bonjour tout le monde' })).toBeVisible();
  });

  test('the all-spaces view shows which space each entry belongs to', async ({ page }) => {
    await createSpace(page, 'France');
    await createSpace(page, 'Germany');
    await page.reload();

    await clickAndWait(page, page.getByRole('combobox', { name: 'Space' }));
    await clickAndWait(page, page.getByRole('option', { name: 'All spaces' }));
    await page.waitForLoadState('networkidle');

    await navToHeader(page, ['Content Manager'], 'Article');

    await expect(page.getByRole('columnheader', { name: 'Space' })).toBeVisible();
  });

  test('a space can be limited to some content types', async ({ page }) => {
    await createSpace(page, 'France');

    await navToHeader(page, ['Settings', 'Spaces'], 'Spaces');
    await clickAndWait(page, page.getByRole('row', { name: /France/ }).getByLabel('Edit'));

    await page.getByRole('checkbox', { name: /Limit this space to some content types/ }).check();
    await expect(page.getByRole('checkbox', { name: 'Article' })).toBeVisible();
  });

  test('the default space cannot be deleted', async ({ page }) => {
    await navToHeader(page, ['Settings', 'Spaces'], 'Spaces');

    const defaultRow = page.getByRole('row', { name: /\(default\)/ });
    await expect(defaultRow).toBeVisible();
    await expect(defaultRow.getByLabel('Delete')).toHaveCount(0);
  });
});
