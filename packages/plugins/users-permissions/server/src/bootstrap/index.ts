import type { Core } from '@strapi/types';
import type { SignOptions } from 'jsonwebtoken';
import lodash from 'lodash';

import crypto from 'crypto';
import type { GrantConfig, SessionsConfig } from '../types';
import { getService } from '../utils';
import usersPermissionsActions from './users-permissions-actions';
import {
  DEFAULT_ACCESS_TOKEN_LIFESPAN,
  DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN,
  DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN,
  DEFAULT_MAX_SESSION_LIFESPAN,
  DEFAULT_IDLE_SESSION_LIFESPAN,
} from '../services/constants';

type PluginStore = ReturnType<Core.Strapi['store']>;
type BootstrapConfig = { jwtSecret?: string; sessions?: SessionsConfig; jwt?: SignOptions };

const getSessionManager = (strapi: Core.Strapi) => {
  const manager = strapi.sessionManager;
  return manager ?? null;
};

const initGrant = async (strapi: Core.Strapi, pluginStore: PluginStore) => {
  const allProviders = getService(strapi, 'providers-registry').getAll();

  const grantConfig = Object.entries(allProviders).reduce<GrantConfig>((acc, [name, provider]) => {
    const { icon, enabled, grantConfig } = provider;

    acc[name] = {
      icon,
      enabled,
      ...grantConfig,
    };
    return acc;
  }, {});

  const prevGrantConfig = (await pluginStore.get({ key: 'grant' })) as GrantConfig | null;

  if (!prevGrantConfig || !lodash.isEqual(prevGrantConfig, grantConfig)) {
    // merge with the previous provider config.
    lodash.keys(grantConfig).forEach((key) => {
      if (prevGrantConfig != null && key in prevGrantConfig) {
        grantConfig[key] = lodash.merge(grantConfig[key], prevGrantConfig[key]);
      }
    });
    await pluginStore.set({ key: 'grant', value: grantConfig });
  }
};

const initEmails = async (pluginStore: PluginStore) => {
  if (!(await pluginStore.get({ key: 'email' }))) {
    const value = {
      reset_password: {
        display: 'Email.template.reset_password',
        icon: 'sync',
        options: {
          from: {
            name: 'Administration Panel',
            email: 'no-reply@strapi.io',
          },
          response_email: '',
          object: 'Reset password',
          message: `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>
<p><%= URL %>?code=<%= TOKEN %></p>

<p>Thanks.</p>`,
        },
      },
      email_confirmation: {
        display: 'Email.template.email_confirmation',
        icon: 'check-square',
        options: {
          from: {
            name: 'Administration Panel',
            email: 'no-reply@strapi.io',
          },
          response_email: '',
          object: 'Account confirmation',
          message: `<p>Thank you for registering!</p>

<p>You have to confirm your email address. Please click on the link below.</p>

<p><%= URL %>?confirmation=<%= CODE %></p>

<p>Thanks.</p>`,
        },
      },
    };

    await pluginStore.set({ key: 'email', value });
  }
};

const initAdvancedOptions = async (pluginStore: PluginStore) => {
  if (!(await pluginStore.get({ key: 'advanced' }))) {
    const value = {
      unique_email: true,
      allow_register: true,
      email_confirmation: false,
      email_reset_password: null,
      email_confirmation_redirection: null,
      default_role: 'authenticated',
    };

    await pluginStore.set({ key: 'advanced', value });
  }
};

/** Initialize plugin settings, permissions, signing secrets, and the session origin. */
export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });

  await initGrant(strapi, pluginStore);
  await initEmails(pluginStore);
  await initAdvancedOptions(pluginStore);

  await strapi
    .service('admin::permission')
    .actionProvider.registerMany(usersPermissionsActions.actions);

  await getService(strapi, 'users-permissions').initialize();

  // Define users-permissions origin configuration for sessionManager
  const upConfig = strapi.config.get<BootstrapConfig>('plugin::users-permissions');
  const sessionManager = getSessionManager(strapi);

  if (sessionManager) {
    sessionManager.defineOrigin('users-permissions', {
      jwtSecret: upConfig.jwtSecret || strapi.config.get('admin.auth.secret'),
      accessTokenLifespan: upConfig.sessions?.accessTokenLifespan || DEFAULT_ACCESS_TOKEN_LIFESPAN,
      maxRefreshTokenLifespan:
        upConfig.sessions?.maxRefreshTokenLifespan || DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN,
      idleRefreshTokenLifespan:
        upConfig.sessions?.idleRefreshTokenLifespan || DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN,
      maxSessionLifespan: upConfig.sessions?.maxSessionLifespan || DEFAULT_MAX_SESSION_LIFESPAN,
      idleSessionLifespan: upConfig.sessions?.idleSessionLifespan || DEFAULT_IDLE_SESSION_LIFESPAN,
      algorithm: upConfig.jwt?.algorithm,
      jwtOptions: upConfig.jwt || {},
    });
  }

  if (!strapi.config.get('plugin::users-permissions.jwtSecret')) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error(
        `Missing jwtSecret. Please, set configuration variable "jwtSecret" for the users-permissions plugin in config/plugins.js (ex: you can generate one using Node with \`crypto.randomBytes(16).toString('base64')\`).
For security reasons, prefer storing the secret in an environment variable and read it in config/plugins.js. See https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#configuration-using-environment-variables.`
      );
    }

    const jwtSecret = crypto.randomBytes(16).toString('base64');

    strapi.config.set('plugin::users-permissions.jwtSecret', jwtSecret);

    if (!process.env.JWT_SECRET) {
      const envPath = process.env.ENV_PATH || '.env';
      strapi.fs.appendFile(envPath, `JWT_SECRET=${jwtSecret}\n`);
      strapi.log.info(
        `The Users & Permissions plugin automatically generated a jwt secret and stored it in ${envPath} under the name JWT_SECRET.`
      );
    }
  }
};
