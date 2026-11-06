import { expect, request as playwrightRequest, type Locator, type Page } from '@playwright/test';

import { STRAPI_URL } from '../helpers.ts';

/**
 * The administrator the admin specs sign in as. The database is empty at the start of a run, so the
 * first spec registers it; later ones find it there. Test values, only fit for the e2e database.
 */
export const ADMIN_EMAIL = 'e2e-admin@example.com';
export const ADMIN_PASSWORD = 'E2e-Admin-Passw0rd';
const ADMIN_FIRSTNAME = 'E2E';
const ADMIN_LASTNAME = 'Admin';

/**
 * What the admin keeps in `localStorage` for its guided tour, with the tours off: the same state the
 * monorepo's own e2e suite starts from (`tests/utils/global-setup.ts`). A tour's pop-ups cover the
 * page.
 */
const GUIDED_TOUR_OFF = {
  tours: {
    contentTypeBuilder: { currentStep: 0, length: 5, isCompleted: false },
    contentManager: { currentStep: 0, length: 4, isCompleted: false },
    apiTokens: { currentStep: 0, length: 4, isCompleted: false },
    strapiCloud: { currentStep: 0, length: 0, isCompleted: false },
  },
  enabled: false,
  completedActions: [],
};

/** The Settings link of the admin's main menu (`navToHeader` takes it the same way: the last one) */
const settingsLink = (page: Page) => page.getByRole('link', { name: /^Settings/ }).last();

/**
 * Registers the first administrator when Strapi has none, through the same route the admin's
 * registration page uses. The request has a cookie jar of its own: the answer sets the admin's
 * session cookie, which would sign the page in and leave no login form to go through.
 */
export const registerAdminIfMissing = async () => {
  const api = await playwrightRequest.newContext({ baseURL: STRAPI_URL });

  try {
    const init = await api.get('/admin/init');

    if (!init.ok()) {
      throw new Error(`GET /admin/init answered ${init.status()}: ${await init.text()}`);
    }

    const { data } = (await init.json()) as { data: { hasAdmin: boolean } };

    if (data.hasAdmin) {
      return;
    }

    const registered = await api.post('/admin/register-admin', {
      data: {
        email: ADMIN_EMAIL,
        firstname: ADMIN_FIRSTNAME,
        lastname: ADMIN_LASTNAME,
        password: ADMIN_PASSWORD,
      },
    });

    if (!registered.ok()) {
      throw new Error(
        `POST /admin/register-admin answered ${registered.status()}: ${await registered.text()}`
      );
    }
  } finally {
    await api.dispose();
  }
};

/**
 * Signs in to Strapi's admin panel as the e2e administrator, through the login page: registers the
 * administrator first when Strapi has none. Ends on the admin's home page.
 */
export const signInAdmin = async (page: Page) => {
  await registerAdminIfMissing();

  await page.context().addInitScript((tour) => {
    window.localStorage.setItem('STRAPI_GUIDED_TOUR', JSON.stringify(tour));
  }, GUIDED_TOUR_OFF);

  await page.goto('/admin');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password*', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  // The first load of the panel after the admin was built can be slow
  await expect(settingsLink(page)).toBeVisible({ timeout: 30_000 });
};

/**
 * Goes to a page of the plugin by the menus, as a person does: Settings, then the link under the
 * End users section (the admin's own Roles is under another section, so the section is named).
 * Ends when the page's heading is there.
 */
export const goToEndUsers = async (page: Page, link: 'Roles' | 'Conditions') => {
  await settingsLink(page).click();

  const section = page
    .getByRole('listitem')
    .filter({ has: page.getByText('End users', { exact: true }) });

  await section.getByRole('link', { name: link, exact: true }).click();
  await expect(page.getByRole('heading', { name: link, exact: true })).toBeVisible();
};

/** The row of a content type in the role editor: the button that opens and closes it */
const contentTypeRow = (page: Page, contentType: string) =>
  page.getByRole('button', { name: contentType, exact: true });

/** The role editor is there once the content types of the layout are listed */
export const expectRoleEditor = async (page: Page, contentType = 'Article') => {
  await expect(page.getByRole('heading', { name: 'Edit a role' })).toBeVisible();
  await expect(contentTypeRow(page, contentType)).toBeVisible();
};

/** Roles, then the editor of the role with this name, opened from its Edit button in the list */
export const openRoleEditor = async (page: Page, role: string) => {
  await goToEndUsers(page, 'Roles');
  await page.getByRole('button', { name: `Edit ${role}`, exact: true }).click();
  await expectRoleEditor(page);
};

/**
 * The Settings button of a content type's row in the role editor. Every row has one and none says
 * whose it is, so it is found from the row: the innermost box that holds both the row's own button
 * and a Settings button is that row.
 */
export const settingsButton = (page: Page, contentType: string): Locator =>
  page
    .locator('div')
    .filter({ has: contentTypeRow(page, contentType) })
    .filter({ has: page.getByRole('button', { name: 'Settings', exact: true }) })
    .last()
    .getByRole('button', { name: 'Settings', exact: true });

/** Opens the Settings of a content type in the role editor and gives its dialog */
export const openSettings = async (page: Page, contentType: string): Promise<Locator> => {
  await settingsButton(page, contentType).click();

  // The breadcrumbs of the dialog name the content type
  const dialog = page.getByRole('dialog').filter({ hasText: contentType });

  await expect(dialog).toBeVisible();

  return dialog;
};
