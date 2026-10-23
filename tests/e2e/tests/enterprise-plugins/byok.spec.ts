import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';
import {
  BYOK_CHAT_COMPLETIONS_PATH,
  BYOK_TRANSLATIONS_MODEL,
  startByokMockProvider,
  type ByokMockProvider,
} from './byok-mock-provider';

const SOURCE_COUNTRY_NAME = 'Germany';
const TRANSLATED_COUNTRY_NAME_BY_LOCALE = {
  fr: 'Allemagne',
  de: 'Deutschland',
  es: 'Alemania',
};

test.describe('BYOK plugin', () => {
  let byokMockProvider: ByokMockProvider;

  test.beforeAll(async () => {
    if (!process.env.STRAPI_BYOK_PLUGIN_PATH) {
      throw new Error(
        'STRAPI_BYOK_PLUGIN_PATH is not set. See docs/docs/contributing/03-testing/e2e/03-enterprise-plugins.md.'
      );
    }

    byokMockProvider = await startByokMockProvider({
      localizations: Object.entries(TRANSLATED_COUNTRY_NAME_BY_LOCALE).map(([locale, name]) => ({
        locale,
        content: { name },
      })),
    });
  });

  test.afterAll(async () => {
    await byokMockProvider?.close();
  });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('Strapi loads the BYOK plugin', async ({ page }) => {
    await page.goto('/admin/settings/list-plugins');

    await expect(page.getByText('Bring your own AI key')).toBeVisible();
  });

  test('AI Translation and AI Media Library are available in their settings', async ({ page }) => {
    await page.goto('/admin/settings/internationalization');
    await expect(page.getByRole('heading', { name: 'AI Translations' })).toBeVisible();

    await page.goto('/admin/settings/media-library');
    await expect(
      page.getByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).toBeVisible();
  });

  test('AI Translation fills the other locales with the reply of the BYOK provider', async ({
    page,
  }) => {
    await page.goto('/admin/settings/internationalization');
    const aiTranslationsToggle = page.getByRole('checkbox');
    await aiTranslationsToggle.click();
    await findAndClose(page, 'Changes saved');
    await expect(aiTranslationsToggle).toBeChecked();

    await navToHeader(page, ['Content Manager', 'Country'], 'Country');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await page.getByRole('textbox', { name: 'name' }).fill(SOURCE_COUNTRY_NAME);
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved document');

    await expect
      .poll(() => byokMockProvider.receivedRequests)
      .toContainEqual({ path: BYOK_CHAT_COMPLETIONS_PATH, model: BYOK_TRANSLATIONS_MODEL });

    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    await expect(async () => {
      await page.reload();
      await expect(page.getByRole('textbox', { name: 'name' })).toHaveValue(
        TRANSLATED_COUNTRY_NAME_BY_LOCALE.es
      );
    }).toPass();
  });
});
