import { expect, type Page } from '@playwright/test';

/**
 * Helpers shared by the Workspaces (spaces plugin) e2e specs.
 *
 * Two conventions matter here and are easy to get wrong:
 *
 * 1. **The active workspace is client state.** The plugin keeps it in
 *    `localStorage` and turns it into the `X-Strapi-Space-Id` header on every
 *    request. `pinWorkspace()` sets it explicitly rather than relying on
 *    whatever a previous step left behind.
 * 2. **A `null` workspace means "shared with every workspace"**, not "no
 *    workspace". Entries restored by the DTS import carry no workspace and are
 *    therefore shared — read-only outside the default workspace. Specs that
 *    care about ownership create their own entries instead of reusing fixtures.
 */

export const DEFAULT_WORKSPACE = 'default';
export const SUB_WORKSPACE = 'acme';

/** The workspace names as the admin renders them. */
export const WORKSPACE_NAMES = {
  [DEFAULT_WORKSPACE]: 'Default',
  [SUB_WORKSPACE]: 'Acme',
} as const;

const STORAGE_KEY = 'strapi-spaces:current-slug';

export const ARTICLE_UID = 'api::article.article';
export const ARTICLE_LIST_URL = `/admin/content-manager/collection-types/${ARTICLE_UID}`;

/** The workspace switcher button in the main navigation. */
export const workspaceSwitcher = (page: Page) =>
  page.getByRole('button', { name: /Current workspace/ });

/**
 * Selects the workspace the admin acts in, then let the caller navigate.
 *
 * A one-off write, not `addInitScript`: an init script re-runs on every
 * navigation, so it would silently undo a workspace the test switched to
 * through the UI and make such a test pass for the wrong reason. The page must
 * already be on the admin origin (call it after the first `goto`).
 */
export const pinWorkspace = async (page: Page, slug: string) => {
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, slug]
  );
};

/**
 * The admin JWT, so a spec can drive the API with the logged-in identity.
 *
 * Where it lives depends on "Remember me": ticked, the admin keeps it in
 * `localStorage`; otherwise — which is what `login()` does by default — in the
 * `jwtToken` cookie. Both are checked.
 */
const readAdminToken = async (page: Page): Promise<string | null> => {
  const stored = await page.evaluate(
    () => window.localStorage.getItem('jwtToken') ?? window.sessionStorage.getItem('jwtToken')
  );

  if (stored) {
    // Storage keeps it JSON-encoded; the cookie does not.
    return stored.startsWith('"') ? (JSON.parse(stored) as string) : stored;
  }

  const cookie = (await page.context().cookies()).find(({ name }) => name === 'jwtToken');

  return cookie?.value ? decodeURIComponent(cookie.value) : null;
};

const getAdminToken = async (page: Page): Promise<string> => {
  // `login()` clicks the button without waiting for the response, so the token
  // can land a moment later. Poll instead of failing on the first miss.
  await expect.poll(() => readAdminToken(page), { timeout: 15_000 }).not.toBeNull();

  const token = await readAdminToken(page);

  if (!token) {
    throw new Error('No admin token found — call login() before using the API helpers.');
  }

  return token;
};

/**
 * Waits until the admin is authenticated and the plugin has resolved the
 * workspace list — the switcher only renders then, which makes it the honest
 * signal that a spec can start acting.
 */
export const waitForAdminReady = async (page: Page) => {
  await expect(workspaceSwitcher(page)).toBeVisible({ timeout: 30_000 });
};

/** Headers that authenticate as the logged-in admin, acting from `workspace`. */
export const adminApiHeaders = async (page: Page, workspace: string) => ({
  Authorization: `Bearer ${await getAdminToken(page)}`,
  'Content-Type': 'application/json',
  'X-Strapi-Space-Id': workspace,
});

const apiHeaders = adminApiHeaders;

/**
 * Creates an article through the Content Manager API, as the logged-in admin,
 * acting from `workspace`. Returns its documentId.
 *
 * Setup goes through the API on purpose: these specs assert on workspace rules,
 * not on the create form, and each one needs several entries in place.
 */
export const createArticle = async (
  page: Page,
  { title, workspace }: { title: string; workspace: string }
): Promise<string> => {
  const response = await page.request.post(`/content-manager/collection-types/${ARTICLE_UID}`, {
    headers: await apiHeaders(page, workspace),
    data: { title },
  });

  expect([200, 201], `creating "${title}" in ${workspace}`).toContain(response.status());

  return (await response.json()).data.documentId as string;
};

/**
 * Moves entries to another workspace, or shares them with every workspace when
 * `targetWorkspace` is `null`. Only the default workspace may share.
 */
export const moveEntries = async (
  page: Page,
  {
    documentIds,
    targetWorkspace,
    from = DEFAULT_WORKSPACE,
    uid = ARTICLE_UID,
  }: {
    documentIds: string[];
    targetWorkspace: string | null;
    from?: string;
    uid?: string;
  }
) => {
  const response = await page.request.post('/spaces/move', {
    headers: await apiHeaders(page, from),
    data: { uid, documentIds, targetSpaceSlug: targetWorkspace },
  });

  expect(response.status(), `moving ${documentIds.join(', ')} from ${from}`).toBe(200);
};

/** Shares entries with every workspace (default workspace only). */
export const shareEntries = (page: Page, documentIds: string[]) =>
  moveEntries(page, { documentIds, targetWorkspace: null });

/**
 * Deletes every workspace except the two seeded ones.
 *
 * Workspaces are NOT part of the content types the DTS import restores, so they
 * survive `resetDatabaseAndImportDataFromPath` — a workspace a test created
 * would otherwise still be there for the next one, and creating it again fails
 * on the unique slug. Call it right after `login`.
 */
export const resetWorkspaces = async (page: Page) => {
  const headers = await apiHeaders(page, DEFAULT_WORKSPACE);
  const response = await page.request.get('/spaces/all', { headers });
  const workspaces = (await response.json()) as Array<{ id: number; slug: string }>;

  for (const workspace of workspaces) {
    if (workspace.slug !== DEFAULT_WORKSPACE && workspace.slug !== SUB_WORKSPACE) {
      await page.request.delete(`/spaces/${workspace.id}`, { headers });
    }
  }
};

/** Switches workspace through the UI and waits for the admin to settle. */
export const switchWorkspaceInUi = async (page: Page, name: string) => {
  await workspaceSwitcher(page).click();
  await page.getByRole('menuitem', { name, exact: true }).click();
  await page.waitForLoadState('networkidle');
};

/** The list-view row for an entry, located by its title cell. */
export const listRow = (page: Page, title: string) =>
  page.getByRole('row').filter({ hasText: title });

/** Selects a list-view row's checkbox. */
export const selectListRow = async (page: Page, title: string) => {
  await listRow(page, title).getByRole('checkbox').check();
};

/**
 * Binds an admin role to a set of workspaces, which is what makes the users
 * holding it members of those workspaces and of no other.
 *
 * A role bound to nothing is *platform-wide*: everyone holding it belongs
 * everywhere. That is the state a fresh install is in, so a spec that wants a
 * genuinely restricted admin has to bind their role first.
 */
export const bindRoleToWorkspaces = async (page: Page, roleCode: string, slugs: string[]) => {
  const headers = await adminApiHeaders(page, DEFAULT_WORKSPACE);

  const rolesResponse = await page.request.get('/admin/roles', { headers });
  const roles = (await rolesResponse.json()).data as Array<{
    id: number;
    code: string;
    name: string;
    description: string;
  }>;
  const role = roles.find((candidate) => candidate.code === roleCode);
  expect(role, `role ${roleCode} not found`).toBeTruthy();

  const response = await page.request.put(`/admin/roles/${role!.id}`, {
    headers,
    data: { name: role!.name, description: role!.description, spaces: slugs },
  });

  expect(response.status(), `binding ${roleCode} to ${slugs.join(', ')}`).toBe(200);
};

/** Logs in through the API and returns the token, for direct request checks. */
export const loginViaApi = async (page: Page, email: string, password: string): Promise<string> => {
  const response = await page.request.post('/admin/login', { data: { email, password } });
  expect(response.status(), `API login as ${email}`).toBe(200);
  return (await response.json()).data.token as string;
};

/** Logs the current admin out through the user menu. */
export const logout = async (page: Page) => {
  await page.getByRole('button', { name: /Test Admin|test testing/ }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForLoadState('networkidle');
};
