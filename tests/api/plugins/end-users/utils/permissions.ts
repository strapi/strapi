import type { Core } from '@strapi/types';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';

export const PROFILE_UID = 'plugin::end-users.profile';
export const IS_OWNER = 'plugin::end-users.is-owner';
export const IS_SELF = 'plugin::end-users.is-self';

/** The tables Better Auth keeps for the end user, the user last: what a sign-up leaves behind */
export const ENGINE_UIDS = [
  'plugin::end-users.session',
  'plugin::end-users.account',
  'plugin::end-users.verification',
  'plugin::end-users.two-factor',
  'plugin::end-users.user',
  // The rate limit and lockout counters, which outlive a run in the shared test database
  'plugin::end-users.rate-limit',
];

/** A permission row as a test gives it to `setRolePermissions` */
export interface PermissionRow {
  action: string;
  subject?: string | null;
  properties?: Record<string, unknown>;
  conditions?: Array<{ name: string; params?: Record<string, unknown> }>;
}

/** A row with the properties and conditions a test gives it, none by default */
export const row = (
  action: string,
  subject: string | null = null,
  properties: Record<string, unknown> = {},
  conditions: NonNullable<PermissionRow['conditions']> = []
) => ({ action, subject, properties, conditions });

/** An unconditioned row, with the properties (fields, populateDepth) it lists */
export const unconditioned = (
  action: string,
  subject: string | null = null,
  properties: Record<string, unknown> = {}
) => row(action, subject, properties);

/** A row held under `is-owner`, on the relation `field` */
export const owned = (
  action: string,
  subject: string | null,
  field: string,
  properties: Record<string, unknown> = {}
) => row(action, subject, properties, [{ name: IS_OWNER, params: { field } }]);

/**
 * Deletes every row of each type, one type after the other. The generated test database is a file
 * that outlives a run and every file shares it, so a test starts from an empty set of what it uses.
 */
export const emptyTables = async (strapi: Core.Strapi, uids: string[]) => {
  for (const uid of uids) {
    // eslint-disable-next-line no-await-in-loop
    await strapi.db.query(uid as never).deleteMany({ where: {} });
  }
};

/** The password every user these helpers sign up has. It passes the plugin's password rules. */
export const TEST_PASSWORD = 'Passw0rd!long';

/**
 * The origin these helpers sign up from, as a front end would. A request with an `Origin` header
 * is checked against the trusted origins, so the instance must trust this one
 * (`pluginConfig: { trustedOrigins: [TEST_ORIGIN] }`; `createFixturesInstance` does).
 */
export const TEST_ORIGIN = 'http://localhost:5173';

/** The header that sends a session token as a Bearer token. */
export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/**
 * Replaces every permission of the role with this `type` (`public`, `authenticated`, or `custom`
 * for the first custom role) by `rows`, in one diff through the plugin's permission service, so
 * the ability cache is cleared as it is in production. The role is found by `type` in
 * `role.list()`. `rows` are stored as given: `subject`, `properties` and `conditions` default to
 * what the first version of the plugin stored (`null`, `{}`, `[]`), and `origin` is not stored.
 */
export const setRolePermissions = async (
  strapi: Core.Strapi,
  roleType: string,
  rows: PermissionRow[]
): Promise<void> => {
  const plugin = strapi.plugin('end-users');
  const roles = await plugin.service('role').list();
  const role = (roles as Array<{ documentId: string; type: string }>).find(
    ({ type }) => type === roleType
  );

  if (!role) {
    throw new Error(`setRolePermissions: there is no role of type "${roleType}"`);
  }

  const permissions = plugin.service('permission');
  const held = (await permissions.findForRoles([role.documentId])) as Array<{
    documentId: string;
  }>;

  await permissions.applyDiff(role.documentId, {
    create: rows.map(({ action, subject = null, properties = {}, conditions = [] }) => ({
      action,
      subject,
      properties,
      conditions,
    })),
    update: [],
    delete: held.map(({ documentId }) => documentId),
  });
};

/**
 * Signs a new user up through `/api/auth/sign-up/email`, as `strategy.test.api.ts` does, and gives
 * the session token Better Auth sends back (`set-auth-token`, the Bearer token) and the user's
 * `documentId`. The user gets the Authenticated role, as any new user does.
 */
export const createSignedInUser = async (
  rq: any,
  email: string
): Promise<{ token: string; documentId: string }> => {
  const res = await rq.post('/api/auth/sign-up/email', {
    body: { email, password: TEST_PASSWORD, name: email.split('@')[0] },
    headers: { Origin: TEST_ORIGIN },
  });

  const token = res.headers['set-auth-token'] as string | undefined;

  if (res.statusCode !== 200 || !token) {
    throw new Error(
      `createSignedInUser: sign-up of ${email} answered ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  return { token, documentId: res.body.user.id as string };
};

/**
 * Puts both built-in roles back as a new installation has them: Public holds nothing, and
 * Authenticated holds its default grants. Every file shares the roles, and the database outlives a
 * run, so a test sets them rather than assuming them.
 */
export const resetRoles = async (strapi: Core.Strapi): Promise<void> => {
  await setRolePermissions(strapi, 'public', []);
  await setRolePermissions(strapi, 'authenticated', [...DEFAULT_AUTHENTICATED_PERMISSIONS]);
};
