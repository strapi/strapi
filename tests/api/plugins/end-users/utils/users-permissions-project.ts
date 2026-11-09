import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import knex from 'knex';
import type { Knex } from 'knex';
import type { Core } from '@strapi/types';
import { env } from '@strapi/utils';
import { createRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

import type { MigrationConfig } from '../../../../../packages/plugins/end-users/server/src/migration/config';
// The stock user schema, read from the plugin's source so the extension keeps whatever it ships
import stockUserSchema from '../../../../../packages/plugins/users-permissions/server/src/content-types/user';
import { createEndUsersInstance, TEST_ENCRYPTION_KEY } from './create-end-users-instance';
import type { CreateEndUsersInstanceOptions } from './create-end-users-instance';
import { organizationModel, seoComponent } from './fixtures';
import { makeLegacySecret, signLegacyJwt } from './legacy-tokens';
import { TEST_PASSWORD } from './permissions';

/**
 * A project that has used the Users & Permissions plugin: users, roles, permissions, stores, admin
 * permissions and tokens, all written by the plugin itself, on the database the end-users plugin
 * then boots on to migrate it.
 *
 * The test app holds the project's types and the two user extensions as files, which Strapi reads
 * when it starts. Every instance made here writes what it needs and puts the app back as it was
 * when it is destroyed: the project's types stay (the organization, the memo pointing at the
 * Users & Permissions user, the `shared.seo` component) and no extension is left. A file that is
 * done with the harness calls `removeProjectTypes()` so the next file finds the app without them.
 */

const UP_USER = 'plugin::users-permissions.user';
const UP_ROLE = 'plugin::users-permissions.role';
const UP_PERMISSION = 'plugin::users-permissions.permission';
const EU_USER = 'plugin::end-users.user';
const MEMO = 'api::memo.memo';
const ORGANIZATION = 'api::organization.organization';
const FILE = 'plugin::upload.file';

const UP = 'plugin::users-permissions';

const ORIGIN = 'https://app.example.test';
const AVATAR_NAME = 'migration-fixture-avatar.png';
const ADMIN_EDITOR_EMAIL = 'editor@example.com';
const API_TOKEN_NAME = 'legacy-reader';

export type FixtureUser =
  'alice' | 'aliceDuplicate' | 'bob' | 'carol' | 'dave' | 'erinUpper' | 'erin' | 'frank';

export interface UsersPermissionsProject {
  users: Record<
    FixtureUser,
    { id: number; documentId: string; email: string; username: string; password: string | null }
  >;
  roles: Record<
    'public' | 'authenticated' | 'editors' | 'editorsLower',
    { id: number; documentId: string }
  >;
  jwtSecret: string;
  githubSecret: string;
  /** Bob's, 40 hex characters */
  confirmationToken: string;
  /** Alice's */
  oldTokens: { legacyJwt: string; refreshToken: string | null };
  adminEditor: { email: string; password: string };
  ids: { memo: number; organization: number; file: number };
}

/** What a project adds to the profile: what the migration carries over from the user */
export const MIGRATED_PROFILE_ATTRIBUTES: Record<string, unknown> = {
  company: { type: 'string' },
  tags: { type: 'json' },
  seo: { type: 'component', repeatable: false, component: 'shared.seo' },
  avatar: { type: 'media', multiple: false, allowedTypes: ['images', 'files'] },
  organization: {
    type: 'relation',
    relation: 'manyToOne',
    target: ORGANIZATION,
  },
};

/**
 * A relation from the user to the user (friends, followers), which only a file that asks for it
 * has: it adds a link table to the project and to its profile, which other files' counts do not
 * expect. Off again with `useFriendsRelation(false)`.
 */
let friendsRelation = false;

export const useFriendsRelation = (on = true) => {
  friendsRelation = on;
};

/* -------------------------------------------------------------------------------------------------
 * The test app's files
 * -----------------------------------------------------------------------------------------------*/

const appDir = () => path.dirname(process.env.ENV_PATH as string);
const appFile = (...segments: string[]) => path.join(appDir(), ...segments);

const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
};

const memoSchemaFile = () => appFile('src/api/memo/content-types/memo/schema.json');
const upExtensionDir = () => appFile('src/extensions/users-permissions');
const euExtensionDir = () => appFile('src/extensions/end-users');

/** The memo's controller, service and routes: without them its actions are not ones a role can hold */
const writeMemoApi = () => {
  const factory = (kind: 'Controller' | 'Service' | 'Router') =>
    `module.exports = require('@strapi/strapi').factories.createCore${kind}('${MEMO}');\n`;

  for (const [folder, kind] of [
    ['controllers', 'Controller'],
    ['services', 'Service'],
    ['routes', 'Router'],
  ] as const) {
    const file = appFile('src/api/memo', folder, 'memo.js');

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, factory(kind));
  }
};

/** The memo type: its `author` points at the given user type, one way when it is the end user's */
const writeMemo = (target: string) =>
  writeJson(memoSchemaFile(), {
    kind: 'collectionType',
    collectionName: 'memos',
    info: { singularName: 'memo', pluralName: 'memos', displayName: 'Memo' },
    options: { draftAndPublish: false },
    attributes: {
      title: { type: 'string' },
      author:
        target === UP_USER
          ? { type: 'relation', relation: 'manyToOne', target, inversedBy: 'memos' }
          : { type: 'relation', relation: 'manyToOne', target },
    },
  });

const writeProjectTypes = () => {
  writeJson(appFile('src/components/shared/seo.json'), {
    collectionName: 'components_shared_seos',
    info: { displayName: seoComponent.displayName },
    options: {},
    attributes: seoComponent.attributes,
  });
  writeJson(appFile('src/api/organization/content-types/organization/schema.json'), {
    kind: organizationModel.kind,
    collectionName: 'organizations',
    info: {
      singularName: organizationModel.singularName,
      pluralName: organizationModel.pluralName,
      displayName: organizationModel.displayName,
    },
    options: { draftAndPublish: organizationModel.draftAndPublish },
    attributes: organizationModel.attributes,
  });
  writeMemo(UP_USER);
  writeMemoApi();
};

/** The stock user plus what a project adds: the profile's four, `favorites` and `memos` */
const writeUsersPermissionsExtension = () => {
  writeJson(path.join(upExtensionDir(), 'content-types/user/schema.json'), {
    ...stockUserSchema,
    attributes: {
      ...stockUserSchema.attributes,
      ...MIGRATED_PROFILE_ATTRIBUTES,
      favorites: { type: 'relation', relation: 'manyToMany', target: ORGANIZATION },
      ...(friendsRelation
        ? { friends: { type: 'relation', relation: 'manyToMany', target: UP_USER } }
        : {}),
      memos: { type: 'relation', relation: 'oneToMany', target: MEMO, mappedBy: 'author' },
    },
  });
};

/** The app as it rests between instances: the types are there, no extension is */
const restoreApp = () => {
  fs.rmSync(upExtensionDir(), { recursive: true, force: true });
  fs.rmSync(euExtensionDir(), { recursive: true, force: true });
  writeProjectTypes();
};

/** Takes the project's types out of the app, for a file that is done with the harness */
export const removeProjectTypes = () => {
  fs.rmSync(upExtensionDir(), { recursive: true, force: true });
  fs.rmSync(euExtensionDir(), { recursive: true, force: true });
  fs.rmSync(appFile('src/api/memo'), { recursive: true, force: true });
  fs.rmSync(appFile('src/api/organization'), { recursive: true, force: true });
  fs.rmSync(appFile('src/components/shared/seo.json'), { force: true });
};

/* -------------------------------------------------------------------------------------------------
 * The plugins config the instances are built from
 * -------------------------------------------------------------------------------------------------
 * Same stub as `createEndUsersInstance` (and the same global, so the two can follow each other in
 * one file): `config/plugins.js` returns whatever the current instance registered, because Jest
 * caches that module for the whole file.
 */

const CONFIG_GLOBAL = '__END_USERS_TEST_PLUGINS_CONFIG__';
const PLUGINS_CONFIG_MODULE = `module.exports = () => globalThis.${CONFIG_GLOBAL} ?? {};\n`;

const withPluginsConfig = (config: Record<string, unknown>) => {
  const configFile = appFile('config/plugins.js');
  const original = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : null;

  (globalThis as Record<string, unknown>)[CONFIG_GLOBAL] = config;
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(configFile, PLUGINS_CONFIG_MODULE);
  jest.doMock(configFile, () => () => (globalThis as Record<string, unknown>)[CONFIG_GLOBAL] ?? {});

  return () => {
    delete (globalThis as Record<string, unknown>)[CONFIG_GLOBAL];
    jest.dontMock(configFile);

    if (original !== null) {
      fs.writeFileSync(configFile, original);
    } else {
      fs.rmSync(configFile, { force: true });
    }
  };
};

/* -------------------------------------------------------------------------------------------------
 * The database, without an instance
 * -----------------------------------------------------------------------------------------------*/

const CLIENTS: Record<string, string> = {
  sqlite: 'better-sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};

/**
 * Runs `fn` on a connection of its own to the test app's database, which needs no running
 * instance: the connection is read from the app's `config/database.js` the way Strapi reads it.
 */
export const inspectDatabase = async <T>(fn: (db: Knex) => Promise<T>): Promise<T> => {
  dotenv.config({ path: process.env.ENV_PATH });

  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
  const { connection } = require(appFile('config/database.js'))({ env });
  const filename = connection.connection?.filename;

  // A fresh app has no database file yet, and SQLite will not make the folder it lives in
  if (typeof filename === 'string') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = knex({
    ...connection,
    client: CLIENTS[connection.client as string] ?? connection.client,
  });

  try {
    return await fn(db);
  } finally {
    await db.destroy();
  }
};

const TABLE_QUERIES: Record<string, string> = {
  pg: 'select tablename as name from pg_tables where schemaname = current_schema()',
  mysql2:
    'select table_name as name from information_schema.tables where table_schema = database()',
  'better-sqlite3': "select name from sqlite_master where type = 'table'",
};

const tableNames = async (db: Knex): Promise<string[]> => {
  const client = String(db.client.config.client);
  const result = await db.raw(TABLE_QUERIES[client]);
  // The alias is the same on each; the result's shape is not
  const rowsOf: Record<string, (raw: any) => Array<{ name: string }>> = {
    pg: (raw) => raw.rows,
    mysql2: (raw) => raw[0],
    'better-sqlite3': (raw) => raw,
  };

  return rowsOf[client](result).map((row) => row.name);
};

const STORE_KEYS = ['plugin_end-users_migration', 'plugin_end-users_migration-report'];
const MIGRATION_LOG_PREFIX = 'end-users-from-users-permissions';

/**
 * Forgets that a migration ever ran: both store keys, the internal migration log rows and every
 * staging table. The users, roles and tables of either plugin are left as they are.
 */
export const forgetMigration = (): Promise<void> =>
  inspectDatabase(async (db) => {
    const tables = await tableNames(db);

    if (tables.includes('strapi_core_store_settings')) {
      await db('strapi_core_store_settings').whereIn('key', STORE_KEYS).del();
    }

    if (tables.includes('strapi_migrations_internal')) {
      await db('strapi_migrations_internal')
        .where('name', 'like', `${MIGRATION_LOG_PREFIX}%`)
        .del();
    }

    for (const table of tables.filter((name) => name.startsWith('eu_stg_'))) {
      // eslint-disable-next-line no-await-in-loop
      await db.schema.dropTableIfExists(table);
    }
  });

/* -------------------------------------------------------------------------------------------------
 * Instances
 * -----------------------------------------------------------------------------------------------*/

let lastProject: { jwtSecret: string; refresh: boolean } | undefined;

const bootUsersPermissions = async (project: {
  jwtSecret: string;
  refresh: boolean;
}): Promise<Core.Strapi> => {
  writeProjectTypes();
  writeUsersPermissionsExtension();

  const restoreConfig = withPluginsConfig({
    'users-permissions': {
      config: {
        jwtSecret: project.jwtSecret,
        // Without it the plugin signs the one-token way
        ...(project.refresh ? { jwtManagement: 'refresh', sessions: { httpOnly: false } } : {}),
      },
    },
  });

  let strapi: Core.Strapi;

  try {
    // The plugin's own strategy answers: the bypass strategy would answer before it
    strapi = await createStrapiInstance({ bypassAuth: false });
  } catch (error) {
    restoreConfig();
    restoreApp();
    throw error;
  }

  const destroy = strapi.destroy.bind(strapi);

  strapi.destroy = async () => {
    try {
      await destroy();
    } finally {
      restoreConfig();
      restoreApp();
    }
  };

  return strapi;
};

/** Users & Permissions on, its extension and the memo type written again; the seed's secret */
export const usersPermissionsInstance = (): Promise<Core.Strapi> => {
  if (!lastProject) {
    throw new Error('usersPermissionsInstance: seed a project first');
  }

  return bootUsersPermissions(lastProject);
};

/**
 * The end-users plugin on the project's database, Users & Permissions off, with the compatibility
 * mode on and the project's secret and tokens. The Users & Permissions extension gives way to the
 * profile's, and the memo points at the end user: both are put back on destroy.
 */
export const migratedInstance = async (
  project: UsersPermissionsProject,
  opts: {
    migration?: Partial<MigrationConfig>;
    instance?: Partial<CreateEndUsersInstanceOptions>;
  } = {}
): Promise<Core.Strapi> => {
  const refresh = project.oldTokens.refreshToken !== null;
  const instance = opts.instance ?? {};

  fs.rmSync(upExtensionDir(), { recursive: true, force: true });
  writeMemo(EU_USER);

  try {
    const strapi = await createEndUsersInstance({
      profileAttributes: {
        ...MIGRATED_PROFILE_ATTRIBUTES,
        ...(friendsRelation
          ? { friends: { type: 'relation', relation: 'manyToMany', target: EU_USER } }
          : {}),
      },
      ...instance,
      pluginConfig: {
        compat: {
          usersPermissions: true,
          legacyJwt: {
            secret: project.jwtSecret,
            until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
          refresh: { enabled: refresh },
        },
        trustedOrigins: [ORIGIN],
        ...instance.pluginConfig,
        migration: {
          fromUsersPermissions: true,
          registrationFields: ['company', 'nickname'],
          ...opts.migration,
        },
      },
      async register({ strapi: booting }) {
        // The migration encrypts the providers' secrets while the application starts
        booting.config.set('admin.secrets.encryptionKey', TEST_ENCRYPTION_KEY);
        await instance.register?.({ strapi: booting });
      },
    });

    const destroy = strapi.destroy.bind(strapi);

    strapi.destroy = async () => {
      try {
        await destroy();
      } finally {
        restoreApp();
      }
    };

    return strapi;
  } catch (error) {
    restoreApp();
    throw error;
  }
};

/**
 * The end-users plugin in check mode next to a running Users & Permissions, on the seeded project:
 * both plugins are on, the project's types and Users & Permissions extension are in place, and
 * the plugin is dormant. Put back on destroy, like the other instances.
 */
export const checkInstance = async (migration: 'check' | false = 'check'): Promise<Core.Strapi> => {
  if (!lastProject) {
    throw new Error('checkInstance: seed a project first');
  }

  const { jwtSecret, refresh } = lastProject;

  writeProjectTypes();
  writeUsersPermissionsExtension();

  try {
    const strapi = await createEndUsersInstance({
      pluginConfig: { migration: { fromUsersPermissions: migration } },
      // Runs after the instance's plugins config is set and before Strapi reads it: Users &
      // Permissions, which that config turns off, is put back as the seed's own instance has it
      builder: {
        async build() {
          const config = (globalThis as Record<string, any>)[CONFIG_GLOBAL];

          config['users-permissions'] = {
            config: {
              jwtSecret,
              ...(refresh ? { jwtManagement: 'refresh', sessions: { httpOnly: false } } : {}),
            },
          };
        },
        async cleanup() {},
      },
    });

    const destroy = strapi.destroy.bind(strapi);

    strapi.destroy = async () => {
      try {
        await destroy();
      } finally {
        restoreApp();
      }
    };

    return strapi;
  } catch (error) {
    restoreApp();
    throw error;
  }
};

/* -------------------------------------------------------------------------------------------------
 * The seed
 * -----------------------------------------------------------------------------------------------*/

interface UserSpec {
  key: FixtureUser;
  email: string;
  username: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  role: 'authenticated' | 'editors' | 'editorsLower';
  password: boolean;
}

const LATE_USERS = new Set<FixtureUser>(['aliceDuplicate', 'erinUpper']);

const USER_SPECS: UserSpec[] = [
  {
    key: 'alice',
    email: 'Alice@Example.com',
    username: 'Alice',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: 'authenticated',
    password: true,
  },
  {
    key: 'aliceDuplicate',
    email: 'alice@example.com',
    username: 'alice.second',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: 'authenticated',
    password: true,
  },
  // Its username is set to `jo` once it exists: the plugin's minimum length refuses it at sign-up
  {
    key: 'bob',
    email: 'bob@example.com',
    username: 'bob',
    provider: 'local',
    confirmed: false,
    blocked: false,
    role: 'authenticated',
    password: true,
  },
  {
    key: 'carol',
    email: 'carol@example.com',
    username: 'carol',
    provider: 'github',
    confirmed: true,
    blocked: false,
    role: 'authenticated',
    password: false,
  },
  {
    key: 'dave',
    email: 'dave@example.com',
    username: 'dave',
    provider: 'local',
    confirmed: true,
    blocked: true,
    role: 'editors',
    password: true,
  },
  {
    key: 'erinUpper',
    email: 'erin.upper@example.com',
    username: 'ERIN',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: 'editorsLower',
    password: true,
  },
  {
    key: 'erin',
    email: 'erin@example.com',
    username: 'erin',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: 'authenticated',
    password: true,
  },
  {
    key: 'frank',
    email: 'frank@example.com',
    username: 'frank@home',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: 'authenticated',
    password: true,
  },
];

const AUTHENTICATED_ACTIONS = [
  `${UP}.user.me`,
  `${UP}.user.find`,
  `${UP}.user.update`,
  `${UP}.role.find`,
  // Twice on purpose: a role can carry the same action in two rows
  `${MEMO}.find`,
  `${MEMO}.find`,
  `${MEMO}.create`,
  `${UP}.auth.changePassword`,
  `${UP}.auth.connect`,
];

const ADMIN_EDITOR_ACTIONS = [
  { action: `${UP}.roles.read`, subject: null, properties: {}, conditions: [] },
  { action: `${UP}.providers.read`, subject: null, properties: {}, conditions: [] },
  { action: `${UP}.email-templates.update`, subject: null, properties: {}, conditions: [] },
  {
    action: 'plugin::content-manager.explorer.read',
    subject: UP_USER,
    properties: { fields: ['username', 'email', 'company'] },
    conditions: [],
  },
];

/** What the seed owns, taken out first so a second seed on the same database starts clean */
const clearPreviousSeed = async (strapi: Core.Strapi) => {
  await strapi.db.query(UP_USER).deleteMany({ where: {} });
  await strapi.db.query(MEMO).deleteMany({ where: {} });
  await strapi.db.query(ORGANIZATION).deleteMany({ where: {} });
  await strapi.db.query(FILE).deleteMany({ where: { name: AVATAR_NAME } });
  // Public keeps the rows the plugin gave it (its sign-in and sign-up routes), which the project
  // adds to; every other role's are written again below
  const publicRole = await strapi.db.query(UP_ROLE).findOne({ where: { type: 'public' } });

  await strapi.db.query(UP_PERMISSION).deleteMany({
    where: { $or: [{ role: { id: { $ne: publicRole.id } } }, { action: `${MEMO}.find` }] },
  });
  await strapi.db
    .query(UP_ROLE)
    .deleteMany({ where: { type: { $notIn: ['public', 'authenticated'] } } });
  await strapi.db.query('admin::user').deleteMany({ where: { email: ADMIN_EDITOR_EMAIL } });
  await strapi.db.query('admin::api-token').deleteMany({ where: { name: API_TOKEN_NAME } });

  const editor = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-editor' } });

  await strapi.db.query('admin::permission').deleteMany({
    where: {
      role: editor.id,
      action: { $in: ADMIN_EDITOR_ACTIONS.map(({ action }) => action) },
      subject: { $in: [UP_USER] },
    },
  });
  await strapi.db.query('admin::permission').deleteMany({
    where: {
      role: editor.id,
      action: { $in: ADMIN_EDITOR_ACTIONS.slice(0, 3).map((a) => a.action) },
    },
  });
};

const seedStores = async (strapi: Core.Strapi, githubSecret: string) => {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });

  await store.set({
    key: 'advanced',
    value: {
      unique_email: false,
      allow_register: true,
      email_confirmation: true,
      email_confirmation_redirection: `${ORIGIN}/confirmed`,
      email_reset_password: `${ORIGIN}/reset`,
      default_role: 'authenticated',
    },
  });

  const grant = ((await store.get({ key: 'grant' })) ?? {}) as Record<string, any>;

  grant.email = { ...grant.email, enabled: true };
  grant.github = {
    ...grant.github,
    enabled: true,
    key: 'gh-client',
    secret: githubSecret,
    scope: ['user:email'],
    callback: `${ORIGIN}/connect/github`,
  };
  grant.auth0 = { ...grant.auth0, enabled: true, subdomain: 'tenant' };
  grant.twitter = { ...grant.twitter, enabled: true };
  grant.instagram = { ...grant.instagram, enabled: true };
  grant.cognito = {
    ...grant.cognito,
    enabled: false,
    jwksurl: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Abc123/.well-known/jwks.json',
  };
  await store.set({ key: 'grant', value: grant });

  const email = (await store.get({ key: 'email' })) as Record<string, any>;

  email.reset_password.options = {
    ...email.reset_password.options,
    object: 'Reset your password',
    message: '<p>Hi <%= USER.username %>: <%= URL %>?code=<%= TOKEN %></p>',
  };
  email.email_confirmation.options = {
    ...email.email_confirmation.options,
    message: '<p><%= URL %>?confirmation=<%= CODE %> from <%= SERVER_URL %></p>',
  };
  await store.set({ key: 'email', value: email });
};

const seedAdmin = async (strapi: Core.Strapi) => {
  const editor = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-editor' } });

  await strapi.service('admin::role').addPermissions(editor.id, ADMIN_EDITOR_ACTIONS);

  const adminEditor = {
    email: ADMIN_EDITOR_EMAIL,
    password: `${randomBytes(9).toString('base64url')}Aa1`,
  };

  await strapi.service('admin::user').create({
    ...adminEditor,
    firstname: 'Edie',
    lastname: 'Editor',
    roles: [editor.id],
    isActive: true,
    registrationToken: null,
  });

  await strapi.service('admin::api-token').create({
    name: API_TOKEN_NAME,
    description: '',
    type: 'custom',
    permissions: [`${UP}.user.find`],
    lifespan: null,
  });

  return adminEditor;
};

/**
 * Boots a plain instance with Users & Permissions on, seeds a project through the plugin itself
 * and destroys the instance. Call it from a `beforeAll`.
 */
export const seedUsersPermissionsProject = async (
  opts: { refresh?: boolean } = {}
): Promise<UsersPermissionsProject> => {
  const refresh = opts.refresh === true;
  const jwtSecret = makeLegacySecret();
  const githubSecret = randomBytes(16).toString('hex');
  const confirmationToken = randomBytes(20).toString('hex');

  await forgetMigration();

  lastProject = { jwtSecret, refresh };

  const strapi = await bootUsersPermissions(lastProject);

  try {
    await clearPreviousSeed(strapi);

    const query = (uid: string) => strapi.db.query(uid as never) as any;
    const documents = (uid: string) => strapi.documents(uid as never) as any;

    // Roles and what they may do
    const roles = {} as UsersPermissionsProject['roles'];
    const builtIn = (type: string) => query(UP_ROLE).findOne({ where: { type } });

    roles.public = await builtIn('public');
    roles.authenticated = await builtIn('authenticated');
    roles.editors = await query(UP_ROLE).create({
      data: { name: 'Editors', description: 'Writes memos', type: 'editors' },
    });
    // Another type, since the plugin keeps one role per type
    roles.editorsLower = await query(UP_ROLE).create({
      data: { name: 'editors', description: 'The same name, lower case', type: 'editors_lower' },
    });

    const grants: Array<[number, string[]]> = [
      [roles.public.id, [`${MEMO}.find`]],
      [roles.authenticated.id, AUTHENTICATED_ACTIONS],
      [roles.editors.id, [`${MEMO}.update`, `${UP}.user.destroy`]],
    ];

    for (const [roleId, actions] of grants) {
      for (const action of actions) {
        // eslint-disable-next-line no-await-in-loop
        await query(UP_PERMISSION).create({ data: { action, role: roleId } });
      }
    }

    await seedStores(strapi, githubSecret);

    // What alice points at
    const acme = await documents(ORGANIZATION).create({ data: { name: 'Acme' } });
    const globex = await documents(ORGANIZATION).create({ data: { name: 'Globex' } });
    const file = await documents(FILE).create({
      data: {
        name: AVATAR_NAME,
        hash: `avatar_${randomBytes(4).toString('hex')}`,
        ext: '.png',
        mime: 'image/png',
        size: 1.2,
        url: '/uploads/avatar.png',
        provider: 'local',
        folderPath: '/',
      },
    });

    // Users, in order, through the plugin's own service (which hashes the password)
    const users = {} as UsersPermissionsProject['users'];
    const userService = strapi.plugin('users-permissions').service('user');

    for (const spec of USER_SPECS.filter(({ key }) => !LATE_USERS.has(key))) {
      const extra =
        spec.key === 'alice'
          ? {
              company: 'Acme',
              tags: ['vip', 'beta'],
              seo: { metaTitle: 'Alice' },
              avatar: file.id,
              organization: acme.documentId,
              favorites: [acme.documentId, globex.documentId],
            }
          : {};

      // eslint-disable-next-line no-await-in-loop
      const created = await userService.add({
        username: spec.username,
        email: spec.email,
        provider: spec.provider,
        ...(spec.password ? { password: TEST_PASSWORD } : {}),
        confirmed: spec.confirmed,
        blocked: spec.blocked,
        role: roles[spec.role].documentId,
        ...extra,
      });

      users[spec.key] = {
        id: created.id,
        documentId: created.documentId,
        email: spec.email,
        username: spec.username,
        password: spec.password ? TEST_PASSWORD : null,
      };
    }

    // The two whose spelling differs only in case go in last, straight into the table: the plugin's
    // own checks would refuse them, and they are what the de-duplication has to handle
    const bcrypt = await import('bcryptjs');
    const mysql = strapi.db.dialect.client === 'mysql';

    for (const spec of USER_SPECS.filter(({ key }) => LATE_USERS.has(key))) {
      // Strapi puts a unique index on `username` (`unique: true`), not on `email`, and MySQL's
      // collation is case-insensitive: `ERIN` next to `erin` cannot be inserted there
      if (mysql && spec.key === 'erinUpper') {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const created = await query(UP_USER).create({
        data: {
          documentId: randomBytes(12).toString('hex'),
          username: spec.username,
          email: spec.email,
          provider: spec.provider,
          password: bcrypt.hashSync(TEST_PASSWORD, 10),
          confirmed: spec.confirmed,
          blocked: spec.blocked,
          role: roles[spec.role].id,
          publishedAt: new Date(),
        },
      });

      users[spec.key] = {
        id: created.id,
        documentId: created.documentId,
        email: spec.email,
        username: spec.username,
        password: TEST_PASSWORD,
      };
    }

    // Too short for the plugin's own validation, which is how a project got one in the first place
    await query(UP_USER).update({ where: { id: users.bob.id }, data: { username: 'jo' } });
    users.bob.username = 'jo';
    await query(UP_USER).update({ where: { id: users.bob.id }, data: { confirmationToken } });
    await query(UP_USER).update({
      where: { id: users.alice.id },
      data: { resetPasswordToken: randomBytes(20).toString('hex') },
    });

    const memo = await documents(MEMO).create({
      data: { title: 'Welcome', author: users.alice.documentId },
    });

    // The Document Service has to have linked the avatar to alice
    const linked = await strapi.db
      .getConnection('files_related_mph')
      .where({ related_id: users.alice.id, related_type: UP_USER, field: 'avatar' })
      .count({ count: '*' })
      .first();

    if (Number(linked?.count) === 0) {
      throw new Error("seed: the Document Service did not link the avatar file to alice's user");
    }

    const adminEditor = await seedAdmin(strapi);

    // Alice's tokens: the one-token kind, and the refresh token the plugin itself hands out
    const legacyJwt = signLegacyJwt(jwtSecret, { id: users.alice.id });
    let refreshToken: string | null = null;

    if (refresh) {
      const res = await createRequest({ strapi }).post('/api/auth/local', {
        body: { identifier: users.alice.username, password: TEST_PASSWORD },
      });

      if (res.status !== 200 || typeof res.body.refreshToken !== 'string') {
        throw new Error(`seed: the plugin gave alice no refresh token (${res.status})`);
      }

      refreshToken = res.body.refreshToken;
    }

    return {
      users,
      roles: {
        public: pickIds(roles.public),
        authenticated: pickIds(roles.authenticated),
        editors: pickIds(roles.editors),
        editorsLower: pickIds(roles.editorsLower),
      },
      jwtSecret,
      githubSecret,
      confirmationToken,
      oldTokens: { legacyJwt, refreshToken },
      adminEditor,
      ids: { memo: memo.id, organization: acme.id, file: file.id },
    };
  } finally {
    await strapi.destroy();
  }
};

const pickIds = ({ id, documentId }: { id: number; documentId: string }) => ({ id, documentId });
