/**
 * The migration's stores and admin side: what Users & Permissions kept in its settings, emails and
 * providers, what the admin roles and the Content Manager held on it, and the finished record.
 */
import { createAuthRequest, createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import {
  claimMigration,
  readRecord,
  releaseMigration,
  updateRecord,
} from '../../../../../packages/plugins/end-users/server/src/migration/record';
import { runPostSync } from '../../../../../packages/plugins/end-users/server/src/migration/post-sync';
import { clearSentEmails, sentEmails } from '../utils/email-capture-provider';
import {
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';

const ORIGIN = 'https://app.example.test';
const UP = 'plugin::users-permissions';
const CM_READ = 'plugin::content-manager.explorer.read';

interface ReportItem {
  id: string;
  kind: string;
  severity: string;
  refs?: string[];
}

/** A finished migration leaves tables that the next seed's start has to find gone */
const resetAfterMigration = () =>
  inspectDatabase(async (db) => {
    await db.schema.dropTableIfExists('memos_author_lnk');

    if (String(db.client.config.client) === 'pg') {
      const { rows } = await db.raw(
        "select tablename as name from pg_tables where schemaname = current_schema() and tablename like 'eu\\_stg\\_%'"
      );

      for (const { name } of rows) {
        // eslint-disable-next-line no-await-in-loop
        await db.raw('drop table if exists ?? cascade', [name]);
      }
    }
  });

describe('migration from users-permissions: stores, admin side and finish', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;

  const endUsers = () => strapi.plugin('end-users');
  const settings = () => endUsers().service('settings') as { get(): Promise<Record<string, any>> };
  const providers = () =>
    endUsers().service('provider') as { get(id: string): Promise<Record<string, any>> };
  const templates = () =>
    strapi.plugin('email').service('templates') as {
      get(key: string): Promise<{ isDefault: boolean; html: string }>;
    };
  const report = async () =>
    (await strapi
      .store({ type: 'plugin', name: 'end-users' })
      .get({ key: 'migration-report' })) as { items: ReportItem[] };
  const reportItem = async (id: string) => (await report()).items.find((item) => item.id === id);

  beforeAll(async () => {
    await resetAfterMigration();
    project = await seedUsersPermissionsProject();
    strapi = await migratedInstance(project);
  });

  afterAll(async () => {
    await strapi?.destroy();
    await resetAfterMigration();
    removeProjectTypes();
  });

  it('carries sign-up, verification, both redirects and the default role into the settings', async () => {
    const { signUp, redirects } = await settings().get();

    expect(signUp.enabled).toBe(true);
    expect(signUp.requireEmailVerification).toBe(true);
    expect(redirects.emailVerified).toBe(`${ORIGIN}/confirmed`);
    expect(redirects.passwordReset).toBe(`${ORIGIN}/reset`);
    expect(signUp.defaultRoles).toEqual([project.roles.authenticated.documentId]);
  });

  it('keeps company as a registration field and lists nickname', async () => {
    expect((await settings().get()).signUp.registrationFields).toEqual(['company']);
    expect(await reportItem('registration-field-dropped:all')).toMatchObject({
      refs: ['nickname'],
    });
  });

  it('stores the translated reset template through the email plugin, so it sends as stored', async () => {
    const stored = await templates().get('end-users.reset-password');

    expect(stored.isDefault).toBe(false);
    expect(stored.html).toBe('<p>Hi {{ user.name }}: {{ url }}</p>');

    clearSentEmails();

    const res = await createRequest({ strapi }).post('/api/auth/forgot-password', {
      body: { email: project.users.alice.email.toLowerCase() },
    });

    expect(res.status).toBe(200);

    const deadline = Date.now() + 3000;

    while (sentEmails().length === 0 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
    }

    const [email] = sentEmails();

    expect(email.subject).toBe('Reset your password');
    expect(email.html).toMatch(/^<p>Hi Alice: https?:\/\/[^<]+<\/p>$/);
  });

  it('keeps the default verification template and lists SERVER_URL', async () => {
    expect((await templates().get('end-users.verify-email')).isDefault).toBe(true);
    expect(await reportItem('template-untranslated:end-users.verify-email')).toMatchObject({
      refs: ['SERVER_URL'],
    });
  });

  it('stores github with its secret encrypted and shows the connect callback', async () => {
    const github = await providers().get('github');

    expect(github).toMatchObject({ clientId: 'gh-client', enabled: true, clientSecretSet: true });
    expect(github.redirectUri.endsWith('/api/connect/github/callback')).toBe(true);

    const stored = (await strapi
      .store({ type: 'plugin', name: 'end-users' })
      .get({ key: 'providers' })) as Record<string, { clientSecret: string }>;
    const encryption = strapi.service('admin::encryption') as { decrypt(value: string): string };

    expect(stored.github.clientSecret).not.toBe(project.githubSecret);
    expect(encryption.decrypt(stored.github.clientSecret)).toBe(project.githubSecret);
  });

  it('stores auth0 with tenant.auth0.com and twitter disabled, and lists instagram', async () => {
    // The provider service keeps a provider only with its credentials complete, a disabled one too:
    // these two come without, so they stay off and the report says what each needs
    expect((await providers().get('auth0')).enabled).toBe(false);
    expect((await providers().get('twitter')).enabled).toBe(false);
    expect(await reportItem('provider-needs-input:auth0')).toMatchObject({
      refs: ['clientId', 'clientSecret'],
    });
    expect(await reportItem('provider-needs-input:twitter')).toMatchObject({
      refs: ['clientId', 'clientSecret'],
    });
    expect(await reportItem('provider-not-supported:instagram')).toMatchObject({
      severity: 'action',
    });
  });

  it('lets the Editor admin role keep its end-user permissions', async () => {
    const rq = await createAuthRequest({
      strapi,
      userInfo: { email: project.adminEditor.email, password: project.adminEditor.password },
    });

    expect((await rq.get('/end-users/roles')).status).toBe(200);
    expect((await rq.get('/end-users/providers')).status).toBe(200);

    const rows = (await strapi.db.query('admin::permission').findMany({
      where: { action: { $startsWith: UP } },
      populate: ['role'],
    })) as Array<{ role?: unknown }>;

    // The tokens' own rows are the tokens'; the admin roles keep none
    expect(rows.filter((row) => row.role)).toEqual([]);
  });

  it('gives the Editor role the moved fields on the profile', async () => {
    const rows = (await strapi.db.query('admin::permission').findMany({
      where: { action: CM_READ, subject: 'plugin::end-users.profile' },
      populate: ['role'],
    })) as Array<{ properties: { fields: string[] }; role: { code: string } }>;
    const editor = rows.find((row) => row.role?.code === 'strapi-editor');

    expect(editor?.properties.fields).toContain('company');

    const old = await strapi.db
      .query('admin::permission')
      .count({ where: { subject: `${UP}.user` } });

    expect(old).toBe(0);
  });

  it('records the migration as completed with a cutover, and old tokens are accepted', async () => {
    expect(await readRecord(strapi)).toMatchObject({
      status: 'completed',
      attempt: 1,
      cutoverAt: expect.any(String),
      claim: null,
    });

    const res = await createRequest({ strapi }).get('/api/users/me', {
      headers: { Authorization: `Bearer ${project.oldTokens.legacyJwt}` },
    });

    expect(res.status).toBe(200);
  });

  it('stores a report with no seeded address, username or provider secret', async () => {
    const stored = await report();
    const json = JSON.stringify(stored);

    for (const user of Object.values(project.users)) {
      expect(json).not.toContain(user.email);
      expect(json).not.toMatch(new RegExp(`\\b${user.username.replace(/[.]/g, '\\.')}\\b`));
    }

    expect(json).not.toContain(project.githubSecret);

    const kinds = new Set(stored.items.map((item) => item.kind));

    for (const kind of [
      'duplicate-email',
      'provider-needs-input',
      'provider-not-supported',
      'template-untranslated',
      'api-token',
      'username-native-refused',
      'user-email-read-only',
    ]) {
      expect(kinds).toContain(kind);
    }
  });

  it('a second start waits for the claim and finds the migration complete', async () => {
    // Only one of two starts gets the claim
    await expect(claimMigration(strapi, 'start-a')).resolves.toBe(true);
    await expect(claimMigration(strapi, 'start-b')).resolves.toBe(false);
    await releaseMigration(strapi, 'start-a');

    // Another start holds it, and the migration is not finished as far as this one can tell
    const finished = await readRecord(strapi);

    await updateRecord(strapi, {
      status: 'in-progress',
      claim: { by: 'other-start', until: new Date(Date.now() + 60_000).toISOString() },
    });

    let settled = false;
    const second = runPostSync(strapi).then(() => {
      settled = true;
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    expect(settled).toBe(false);

    // The other start finishes
    await updateRecord(strapi, { status: 'completed', claim: null });
    await second;

    expect(await readRecord(strapi)).toMatchObject({
      status: 'completed',
      completedAt: finished?.completedAt,
      completedSteps: finished?.completedSteps,
    });
  }, 30_000);
});
