import { test, expect } from '@playwright/test';

import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../utils/shared';
import { waitForRestart } from '../../utils/restart';

test.describe('Edit view', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to publish multiple locales of my document', async ({ page, browser }) => {
    /**
     * Navigate to our articles list-view where there will be one document already made in the `en` locale
     */
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    /**
     * Create a new spanish draft article
     */
    await expect(
      page.getByRole('heading', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    /**
     * Now we should be on a new document in the `es` locale
     */
    expect(new URL(page.url()).searchParams.get('plugins[i18n][locale]')).toEqual('es');
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    /**
     * This is here because the `fill` method below doesn't immediately update the value
     * in webkit.
     */
    if (browser.browserType().name() === 'webkit') {
      await page.getByRole('textbox', { name: 'title' }).press('s');
      await page.getByRole('textbox', { name: 'title' }).press('Delete');
    }

    await page.getByRole('textbox', { name: 'title' }).fill('Por qué prefiero el fútbol al fútbol');

    /**
     * Save the spanish draft
     */
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Open the bulk locale publish modal
     */
    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Publish multiple locales', exact: true }).click();

    // Select all locales, assert there are 2 drafts ready to publish and publish them
    await page
      .getByRole('row', { name: 'Select all entries Name' })
      .getByLabel('Select all entries')
      .click();

    await expect(page.getByText('2 entries ready to publish')).toBeVisible();
    await page
      .getByLabel('Publish multiple locales')
      .getByRole('button', { name: 'Publish' })
      .click();

    // Assert that all locales are now published
    await expect(page.getByRole('gridcell', { name: 'Already Published' })).toHaveCount(2);

    await expect(
      page.getByLabel('Publish multiple locales').getByRole('button', { name: 'Publish' })
    ).toBeDisabled();
  });

  test('As a user I want to unpublish multiple locales of my document', async ({
    page,
    browser,
  }) => {
    /**
     * Navigate to our articles list-view where there will be one document already made in the `en` locale
     */
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    /**
     * Create a new spanish draft article
     */
    await expect(
      page.getByRole('heading', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();

    /**
     * Publish the english article
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Success:Published');

    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    /**
     * Now we should be on a new document in the `es` locale
     */
    expect(new URL(page.url()).searchParams.get('plugins[i18n][locale]')).toEqual('es');
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    /**
     * This is here because the `fill` method below doesn't immediately update the value
     * in webkit.
     */
    if (browser.browserType().name() === 'webkit') {
      await page.getByRole('textbox', { name: 'title' }).press('s');
      await page.getByRole('textbox', { name: 'title' }).press('Delete');
    }

    await page.getByRole('textbox', { name: 'title' }).fill('Por qué prefiero el fútbol al fútbol');

    /**
     * Save the spanish draft
     */
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Publish the spanish article
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Success:Published');

    /**
     * Open the bulk locale unpublish modal
     */
    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Unpublish multiple locales', exact: true }).click();

    // Select all locales, assert there are 2 entries ready to unpublish and unpublish them
    await page
      .getByRole('row', { name: 'Select all entries Name' })
      .getByLabel('Select all entries')
      .click();

    /**
     * Unpublish the articles
     */
    await expect(page.getByText('2 entries ready to unpublish')).toBeVisible();
    await page
      .getByLabel('Unpublish multiple locales')
      .getByRole('button', { name: 'Unpublish' })
      .click();

    // Assert that all locales are now unpublished
    await expect(page.getByRole('gridcell', { name: 'Draft' })).toHaveCount(2);

    await expect(
      page.getByLabel('Unpublish multiple locales').getByRole('button', { name: 'Unpublish' })
    ).toBeDisabled();
  });
});
