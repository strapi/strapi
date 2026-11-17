import fs from 'node:fs';
import path from 'node:path';
import type { Core } from '@strapi/strapi';

/**
 * Example code: it shows the plugin's services at work, and is not part of the plugin.
 *
 * What the example puts in place on start, so that anyone trying the plugin has something to try it
 * on: the sign-up fields, and what the roles may do with articles. Everything here goes through the
 * plugin's own services, and none of it overwrites a choice made since:
 *
 * - the registration fields are set only while the list is empty;
 * - Public and Authenticated get the permissions of their `seed/roles/*.json` file only while
 *   neither of them holds a permission on articles yet;
 * - a custom role is imported only while no role has its name.
 *
 * So a restart changes nothing, an administrator's edits stay, and a database that is deleted (or a
 * role that is emptied of every article permission) starts from the seed again.
 */

const PLUGIN_ID = 'end-users';

/** The profile fields (`src/extensions/end-users/content-types/profile`) a sign-up form may send. */
const REGISTRATION_FIELDS = ['company', 'newsletter'];

/** Where the permissions on articles of the built-in roles start with. */
const ARTICLE_ACTION_PREFIX = 'api::article.article.';

/** A permission row as `seed/roles/*.json` writes it: the field list and conditions are stored as they are. */
interface PermissionRow {
  action: string;
  subject: string | null;
  properties: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
}

/** What the role service's `toFile` writes (see `seed/roles/*.json`). */
interface RoleFile {
  version: 1;
  role: { name: string; type: 'public' | 'authenticated' | 'custom' };
  permissions: PermissionRow[];
}

interface SettingsService {
  get(): Promise<{ signUp: { registrationFields: string[] } }>;
  set(patch: { signUp: { registrationFields: string[] } }): Promise<unknown>;
}

interface ExistingRole {
  documentId: string;
  name: string;
  type: string;
}

interface RoleService {
  list(): Promise<ExistingRole[]>;
  fromFile(file: unknown): Promise<{ name: string }>;
}

interface PermissionService {
  findForRoles(
    roleDocumentIds: string[]
  ): Promise<Array<{ action: string; subject: string | null; roleDocumentId: string }>>;
  applyDiff(
    roleDocumentId: string,
    diff: { create: PermissionRow[]; update: never[]; delete: never[] }
  ): Promise<void>;
}

const pluginService = <T>(strapi: Core.Strapi, name: string) =>
  strapi.plugin(PLUGIN_ID).service(name) as unknown as T;

/** `seed/roles/*.json` at the root of the application (not in `dist`), in file name order. */
const readRoleFiles = (strapi: Core.Strapi): RoleFile[] => {
  const directory = path.join(strapi.dirs.app.root, 'seed', 'roles');

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')) as RoleFile);
};

const rowKey = ({ action, subject }: { action: string; subject: string | null }) =>
  `${action}|${subject ?? ''}`;

/** The profile fields a sign-up may write, until an administrator chooses others (or none). */
const seedRegistrationFields = async (strapi: Core.Strapi) => {
  const settings = pluginService<SettingsService>(strapi, 'settings');

  if ((await settings.get()).signUp.registrationFields.length > 0) {
    return;
  }

  await settings.set({ signUp: { registrationFields: REGISTRATION_FIELDS } });
  strapi.log.info(
    `[example] Sign-up may set the profile fields: ${REGISTRATION_FIELDS.join(', ')}`
  );
};

/**
 * Public and Authenticated exist from the plugin's first start and are found by `type`: a role
 * file cannot create them, so its permissions are added to the role that is there. Both get theirs
 * in one transaction (the permission service's own transactions join it), so a failed start leaves
 * neither half-seeded.
 */
const seedBuiltInRoles = async (
  strapi: Core.Strapi,
  files: RoleFile[],
  existing: ExistingRole[]
) => {
  const permissions = pluginService<PermissionService>(strapi, 'permission');

  const builtIn = files.flatMap((file) => {
    const role = existing.find(({ type }) => type === file.role.type);

    return file.role.type !== 'custom' && role ? [{ file, role }] : [];
  });

  await strapi.db.transaction(async () => {
    const held = await permissions.findForRoles(builtIn.map(({ role }) => role.documentId));

    if (held.some(({ action }) => action.startsWith(ARTICLE_ACTION_PREFIX))) {
      return;
    }

    for (const { file, role } of builtIn) {
      const roleHolds = new Set(
        held.filter(({ roleDocumentId }) => roleDocumentId === role.documentId).map(rowKey)
      );
      const create = file.permissions.filter((row) => !roleHolds.has(rowKey(row)));

      if (create.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await permissions.applyDiff(role.documentId, { create, update: [], delete: [] });
        strapi.log.info(
          `[example] ${role.name} may now: ${create.map((row) => row.action).join(', ')}`
        );
      }
    }
  });
};

/**
 * A custom role is created from its file, the way an administrator imports one. Two servers that
 * start together on an empty database can both try: role names are unique, so one import fails, and
 * when the role is there after all the other server made it, which is all this start needed.
 */
const seedCustomRoles = async (
  strapi: Core.Strapi,
  files: RoleFile[],
  existing: ExistingRole[]
) => {
  const roles = pluginService<RoleService>(strapi, 'role');

  for (const file of files.filter(({ role }) => role.type === 'custom')) {
    if (existing.some(({ name }) => name === file.role.name)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      await roles.fromFile(file);
      strapi.log.info(`[example] Imported the ${file.role.name} role`);
    } catch (error) {
      // eslint-disable-next-line no-await-in-loop
      const now = await roles.list();

      if (!now.some(({ name }) => name === file.role.name)) {
        throw error;
      }
    }
  }
};

const seedRoles = async (strapi: Core.Strapi) => {
  const files = readRoleFiles(strapi);
  const existing = await pluginService<RoleService>(strapi, 'role').list();

  await seedBuiltInRoles(strapi, files, existing);
  await seedCustomRoles(strapi, files, existing);
};

export const seedExample = async (strapi: Core.Strapi) => {
  await seedRegistrationFields(strapi);
  await seedRoles(strapi);
};
