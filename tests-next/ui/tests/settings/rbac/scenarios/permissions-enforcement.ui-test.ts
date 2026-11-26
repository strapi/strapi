import { expect, logIn, test } from '../../../../fixtures';
import { EditViewPage, ListViewPage, RolePage, RolesPage } from '../../../../pages';

const ARTICLE = { uid: 'api::article.article', displayName: 'Article' };
const TITLE = 'West Ham post match analysis';
const READ_FIELDS = { fields: ['title'] };

test.describe('RBAC - Permissions enforcement', { tag: ['@critical'] }, () => {
  test('a user without publish permission cannot publish content', async ({
    page,
    browser,
    server,
    seed,
    unique,
  }) => {
    // A role that can read, update and publish articles, a user with it, and an article. The
    // legacy spec used the built-in Author role, which had publish in its DTS data; the app's
    // default Author role doesn't, so removing it would change nothing. `unique`: the role code
    // and email are new on every run of the test, and each email has its own login rate limit.
    const roleName = unique('Article Publisher');
    const roleCode = roleName.toLowerCase().replace(/\s+/g, '-');
    const credentials = {
      email: `${unique('publisher')}@tests.strapi.io`,
      password: 'Testing123!',
    };
    await seed({
      adminRoles: [
        {
          name: roleName,
          code: roleCode,
          permissions: [
            {
              action: 'plugin::content-manager.explorer.read',
              subject: ARTICLE.uid,
              properties: READ_FIELDS,
            },
            {
              action: 'plugin::content-manager.explorer.update',
              subject: ARTICLE.uid,
              properties: READ_FIELDS,
            },
            { action: 'plugin::content-manager.explorer.publish', subject: ARTICLE.uid },
          ],
        },
      ],
      adminUsers: [
        {
          ...credentials,
          firstname: 'Article',
          lastname: 'Publisher',
          roles: [roleCode],
        },
      ],
      entries: [{ uid: ARTICLE.uid, data: { title: TITLE } }],
    });

    // Step 1: remove the publish permission from the role, as the Super Admin.
    const roles = new RolesPage(page);
    const role = new RolePage(page);

    await page.goto('/admin');
    await roles.open();
    await roles.openRole(roleName);
    await role.openPermissionsTab('Collection Types');
    await role.permission('Publish', 'article').uncheck();
    await role.save();

    // Steps 2–3: the user of the role, in a context of its own (logged in through the API).
    const { storageState, token } = await logIn(server, credentials);
    const context = await browser.newContext({ storageState });
    try {
      const userPage = await context.newPage();
      const list = new ListViewPage(userPage);
      const entry = new EditViewPage(userPage);

      // Step 4: navigate to the article.
      await list.goto(ARTICLE.uid, ARTICLE.displayName);
      await list.openEntry(TITLE);
      await entry.waitFor(TITLE);

      // Step 5: assert the UI hides the action — the Publish button is disabled
      await expect(entry.publishButton).toBeDisabled();

      // Step 6: assert the API enforces it too — a direct publish call returns 403.
      // UI hiding alone is not sufficient; the publish route's hasPermissions policy
      // (config: ['plugin::content-manager.explorer.publish']) must reject the request.
      // The documentId is taken from the edit-view URL we are currently on.
      const publishRes = await userPage.request.post(
        `/content-manager/collection-types/${ARTICLE.uid}/${entry.documentId()}/actions/publish`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(publishRes.status()).toBe(403);
    } finally {
      await context.close();
    }
  });
});
