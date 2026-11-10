import type { Core } from '@strapi/strapi';

/**
 * What the example does differently when it is started to test the migration from Users &
 * Permissions, apart from the example itself so that a project copying the example leaves it behind.
 * `END_USERS_E2E_MIGRATION` names the stage, and left unset, which is every other start, nothing
 * here changes anything:
 *
 * - `seed`: a project that still uses Users & Permissions, with the end-users plugin off. The
 *   migration end-to-end run (`end-users-frontend/playwright.migration.config.ts`) starts it first,
 *   on a database it then migrates.
 * - `check`: the same project with the plugin on in check mode (`migration.fromUsersPermissions:
 *   'check'`), which reads the Users & Permissions tables and reports what a migration would do.
 *   Check mode registers no end-user type, so the example's articles point at the Users &
 *   Permissions user, as in `seed`, and its own seed does not run.
 * - `migrate`: the second start of the end-to-end run, with the plugin migrating the database.
 */
type Stage = 'seed' | 'check' | 'migrate';

type PluginEntry = { enabled?: boolean; resolve?: string; config?: Record<string, unknown> };

const stageOf = (value: unknown): Stage | undefined =>
  value === 'seed' || value === 'check' || value === 'migrate' ? value : undefined;

/** The stage this start was given, or none. */
export const migrationStage = (): Stage | undefined => stageOf(process.env.END_USERS_E2E_MIGRATION);

/** Users & Permissions is not an installed dependency of the example: it is resolved from the workspace. */
const usersPermissions = ({ env }: Core.Config.Shared.ConfigParams): PluginEntry => ({
  enabled: true,
  resolve: require.resolve('@strapi/plugin-users-permissions/package.json'),
  // Given, or the plugin writes a secret of its own to `.env`
  config: { jwtSecret: env('JWT_SECRET') },
});

/** The plugins config of the example, changed for the stage this start was given. */
export const withMigrationHarness = (
  config: Record<string, PluginEntry>,
  params: Core.Config.Shared.ConfigParams
): Record<string, PluginEntry> => {
  const stage = stageOf(params.env('END_USERS_E2E_MIGRATION'));
  const endUsers = config['end-users'];

  if (stage === 'seed') {
    return {
      ...config,
      'end-users': { ...endUsers, enabled: false },
      'users-permissions': usersPermissions(params),
    };
  }

  if (stage === 'check') {
    return {
      ...config,
      'end-users': {
        ...endUsers,
        config: { ...endUsers.config, migration: { fromUsersPermissions: 'check' } },
      },
      'users-permissions': usersPermissions(params),
    };
  }

  if (stage === 'migrate') {
    return {
      ...config,
      'end-users': {
        ...endUsers,
        config: {
          ...endUsers.config,
          compat: { usersPermissions: true },
          migration: { fromUsersPermissions: true },
        },
      },
      'users-permissions': { enabled: false },
    };
  }

  return config;
};

/** Whether the end-users plugin has no end-user type to seed or point at in this start. */
export const withoutEndUsersType = (): boolean => {
  const stage = migrationStage();

  return stage === 'seed' || stage === 'check';
};

/**
 * In a project that still uses Users & Permissions the articles' author is that plugin's user, as
 * it would be there: the end-users plugin has no type to point at.
 */
export const pointAuthorAtUsersPermissions = (strapi: Core.Strapi): void => {
  if (!withoutEndUsersType()) {
    return;
  }

  const author = strapi.contentType('api::article.article').attributes.author as {
    target: string;
  };

  author.target = 'plugin::users-permissions.user';
};
