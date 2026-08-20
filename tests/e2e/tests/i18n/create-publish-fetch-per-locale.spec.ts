import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { login } from '../../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';

// Critical path #19 — i18n.create-publish-fetch-per-locale (@extended)
//
// Create + publish the same document independently in three locales (en / fr / es), then assert the
// public REST delivery API honours `?locale=` — each locale returns its own entry and not the others'.
// Article is used because it is localized, has no required fields, and (unlike U&P state) is covered
// by the e2e DB reset, so entries do not accumulate across runs.
test.describe('i18n - create, publish and fetch per locale', { tag: ['@extended'] }, () => {
  // Long timeout — several publishes across locales
  test.describe.configure({ timeout: 500000 });

  const titles = {
    en: 'i18n locale article EN',
    fr: 'i18n locale article FR',
    es: 'i18n locale article ES',
  } as const;

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  // Fill the title, working around a webkit quirk where `fill` doesn't register until the field is
  // touched (same workaround the existing i18n specs use).
  const fillTitle = async (page: Page, browser: Browser, value: string) => {
    const title = page.getByRole('textbox', { name: 'title' });
    if (browser.browserType().name() === 'webkit') {
      await title.press('a');
      await title.press('Delete');
    }
    await title.fill(value);
  };

  // From the edit view, switch to another locale (creating that locale's draft), fill it, publish.
  const addAndPublishLocale = async (
    page: Page,
    browser: Browser,
    localeLabel: string,
    title: string
  ) => {
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: localeLabel }).click();
    await fillTitle(page, browser, title);
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');
  };

  // Enable public `find`/`findOne` on article so the REST delivery endpoint is reachable without auth.
  const grantPublicArticleRead = async (
    request: APIRequestContext,
    headers: Record<string, string>
  ) => {
    const rolesRes = await request.get('/users-permissions/roles', { headers });
    const publicRole = (await rolesRes.json()).roles.find((r: any) => r.type === 'public');
    expect(publicRole, 'public role not found').toBeTruthy();

    const roleRes = await request.get(`/users-permissions/roles/${publicRole.id}`, { headers });
    const { role } = await roleRes.json();
    for (const group of Object.values<any>(role.permissions)) {
      if (group?.controllers?.article) {
        group.controllers.article.find.enabled = true;
        group.controllers.article.findOne.enabled = true;
      }
    }
    const put = await request.put(`/users-permissions/roles/${publicRole.id}`, {
      headers,
      data: {
        name: role.name,
        description: role.description,
        type: role.type,
        permissions: role.permissions,
      },
    });
    expect(put.ok(), 'granting public article read failed').toBeTruthy();
  };

  test('a document published per locale is returned only by the matching ?locale= query', async ({
    page,
    browser,
  }) => {
    // --- Create + publish the default (en) version ---
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await fillTitle(page, browser, titles.en);
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    // --- Add + publish the fr and es versions of the same document, independently ---
    await addAndPublishLocale(page, browser, 'French (fr)', titles.fr);
    await addAndPublishLocale(page, browser, 'Spanish (es)', titles.es);

    // --- Make the content readable on the public REST API ---
    const adminLogin = await page.request.post('/admin/login', {
      data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
    });
    const adminToken = (await adminLogin.json()).data?.token;
    expect(adminToken, 'admin API login failed').toBeTruthy();
    await grantPublicArticleRead(page.request, { Authorization: `Bearer ${adminToken}` });

    // --- Each ?locale= returns its own published entry and none of the others' ---
    for (const [code, title] of Object.entries(titles)) {
      const res = await page.request.get(`/api/articles?locale=${code}`);
      expect(res.status(), `GET /api/articles?locale=${code}`).toBe(200);
      const returnedTitles: string[] = (await res.json()).data.map((d: any) => d.title);

      expect(returnedTitles, `?locale=${code} should include its own entry`).toContain(title);
      for (const [otherCode, otherTitle] of Object.entries(titles)) {
        if (otherCode !== code) {
          expect(
            returnedTitles,
            `?locale=${code} must not include the ${otherCode} entry`
          ).not.toContain(otherTitle);
        }
      }
    }
  });
});
