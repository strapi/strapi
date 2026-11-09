import fs from 'fs';
import path from 'path';
import type { Core } from '@strapi/strapi';

/**
 * Where the email plugin finds the example's provider (`providers/file-email.js`). The plugin turns
 * the provider name to lower case and, when no `@strapi/provider-email-<name>` package exists,
 * `require`s the name as it is. An absolute path keeps its capitals only by luck (a checkout in
 * `~/Code` fails), so this gives the path relative to the email plugin's own folder, which holds
 * no capitals as long as the folders inside the monorepo have none. A project outside the monorepo
 * installs a real provider instead (see `README.md`).
 */
const localEmailProvider = () => {
  // `__dirname` is `config/` when the CLI loads the file for the build and `dist/config/` when the
  // server runs the compiled one, so look for the provider one level up, then two.
  const provider = [path.join(__dirname, '..'), path.join(__dirname, '..', '..')]
    .map((root) => path.join(root, 'providers', 'file-email.js'))
    .find((candidate) => fs.existsSync(candidate)) as string;
  const emailPluginDirectory = path.dirname(require.resolve('@strapi/email/strapi-server'));

  return path.relative(fs.realpathSync(emailPluginDirectory), fs.realpathSync(provider));
};

type PluginEntry = { enabled?: boolean; resolve?: string; config?: Record<string, unknown> };

const basePluginsConfig = ({
  env,
}: Core.Config.Shared.ConfigParams): Record<string, PluginEntry> => ({
  'end-users': {
    enabled: true,
    config: {
      // Signs the sessions. Required in production; set it in `.env` (see `.env.example`).
      secret: env('END_USERS_SECRET'),

      // The front end runs on another origin (`localhost:5173`), so Better Auth must trust it:
      // this list gates the `Origin` check and the redirect URLs the front end sends.
      trustedOrigins: env.array('FRONTEND_URL', ['http://localhost:5173']),

      // A front end on another site gets no cookie from `SameSite=Lax`, the default. This sends
      // `SameSite=None; Secure`, which browsers accept over plain http on `localhost` only: any
      // other host needs https. Bearer mode does not use cookies, so it does not depend on this.
      cookies: { crossSite: true },

      // Better Auth limits sign-ups and sign-ins to a few a minute from one address. The browser
      // tests (`end-users-frontend`) all come from one, so they switch the limit off here.
      // Leave it on everywhere else.
      rateLimit: { enabled: env.bool('END_USERS_RATE_LIMIT', true) },
    },
  },

  // Development only: every email is written to `.tmp/emails/<timestamp>-<to>.json` instead of sent
  // (see `providers/file-email.js`). The links in the verification, password reset and change
  // email messages are in those files.
  email: {
    config: {
      provider: localEmailProvider(),
      providerOptions: {},
      settings: { defaultFrom: 'end-users@example.com', defaultReplyTo: 'end-users@example.com' },
    },
  },
});

/**
 * The migration end-to-end run (`end-users-frontend/playwright.migration.config.ts`) starts this
 * application twice on one database: first as a project that still uses Users & Permissions
 * (`seed`), then migrated (`migrate`). Left unset, which is every other start, nothing changes.
 */
const pluginsConfig = (params: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const config = basePluginsConfig(params);
  const stage = params.env('END_USERS_E2E_MIGRATION');
  const endUsers = config['end-users'];

  if (stage === 'seed') {
    return {
      ...config,
      'end-users': { ...endUsers, enabled: false },
      // The plugin is not an installed dependency of the example: it is resolved from the workspace
      'users-permissions': {
        enabled: true,
        resolve: require.resolve('@strapi/plugin-users-permissions/package.json'),
        // Given, or the plugin writes a secret of its own to `.env`
        config: { jwtSecret: params.env('JWT_SECRET') },
      },
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

export default pluginsConfig;
