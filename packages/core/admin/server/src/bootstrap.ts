import { merge, map, difference, uniq } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { async } from '@strapi/utils';
import { getService } from './utils';
import { getTokenOptions, expiresInToSeconds } from './services/token';
import adminActions from './config/admin-actions';
import adminConditions from './config/admin-conditions';
import constants from './services/constants';
import {
  DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN,
  DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN,
  DEFAULT_MAX_SESSION_LIFESPAN,
  DEFAULT_IDLE_SESSION_LIFESPAN,
} from '../../shared/utils/session-auth';

const defaultAdminAuthSettings = {
  providers: {
    autoRegister: false,
    defaultRole: null,
    ssoLockedRoles: null,
  },
};

const registerPermissionActions = async () => {
  await getService('permission').actionProvider.registerMany(adminActions.actions);
};

const registerAdminConditions = async () => {
  await getService('permission').conditionProvider.registerMany(adminConditions.conditions);
};

const registerModelHooks = () => {
  const { sendDidChangeInterfaceLanguage } = getService('metrics');

  strapi.db.lifecycles.subscribe({
    models: ['admin::user'],
    afterCreate: sendDidChangeInterfaceLanguage,
    afterDelete: sendDidChangeInterfaceLanguage,
    afterUpdate({ params }) {
      if (params.data.preferedLanguage) {
        sendDidChangeInterfaceLanguage();
      }
    },
  });
};

const syncAuthSettings = async () => {
  const adminStore = await strapi.store({ type: 'core', name: 'admin' });
  const adminAuthSettings = await adminStore.get({ key: 'auth' });
  const newAuthSettings = merge(defaultAdminAuthSettings, adminAuthSettings);

  const roleExists = await getService('role').exists({
    id: newAuthSettings.providers.defaultRole,
  });

  // Reset the default SSO role if it has been deleted manually
  if (!roleExists) {
    newAuthSettings.providers.defaultRole = null;
  }

  await adminStore.set({ key: 'auth', value: newAuthSettings });
};

const syncAPITokensPermissions = async () => {
  const validPermissions = strapi.contentAPI.permissions.providers.action.keys();
  const permissionsInDB = await async.pipe(
    strapi.db.query('admin::api-token-permission').findMany,
    map('action')
  )();

  const unknownPermissions = uniq(difference(permissionsInDB, validPermissions));

  if (unknownPermissions.length > 0) {
    await strapi.db
      .query('admin::api-token-permission')
      .deleteMany({ where: { action: { $in: unknownPermissions } } });
  }
};

/**
 * Ensures the creation of default API tokens during the app creation.
 *
 * Checks the database for existing users and API tokens:
 * - If there are no users and no API tokens, it creates two default API tokens:
 *   1. A "Read Only" API token with permissions for accessing resources.
 *   2. A "Full Access" API token with permissions for accessing and modifying resources.
 *
 * @sideEffects Creates new API tokens in the database if conditions are met.
 */

const createDefaultAPITokensIfNeeded = async () => {
  const userService = getService('user');
  const apiTokenService = getService('api-token');

  const usersCount = await userService.count();
  const apiTokenCount = await apiTokenService.count();

  if (usersCount === 0 && apiTokenCount === 0) {
    for (const token of constants.DEFAULT_API_TOKENS) {
      await apiTokenService.create(token);
    }
  }
};

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Get the merged token options (includes defaults merged with user config)
  const { options } = getTokenOptions();
  const legacyMaxRefreshFallback =
    expiresInToSeconds(options?.expiresIn) ?? DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN;
  const legacyMaxSessionFallback =
    expiresInToSeconds(options?.expiresIn) ?? DEFAULT_MAX_SESSION_LIFESPAN;

  // Warn if using deprecated legacy expiresIn for new session settings
  const hasLegacyExpires = options?.expiresIn != null;
  const hasNewMaxRefresh = strapi.config.get('admin.auth.sessions.maxRefreshTokenLifespan') != null;
  const hasNewMaxSession = strapi.config.get('admin.auth.sessions.maxSessionLifespan') != null;

  if (hasLegacyExpires && (!hasNewMaxRefresh || !hasNewMaxSession)) {
    strapi.log.warn(
      'admin.auth.options.expiresIn is deprecated and will be removed in Strapi 6. Please configure admin.auth.sessions.maxRefreshTokenLifespan and admin.auth.sessions.maxSessionLifespan.'
    );
  }

  strapi.sessionManager.defineOrigin('admin', {
    jwtSecret: strapi.config.get('admin.auth.secret'),
    accessTokenLifespan: strapi.config.get('admin.auth.sessions.accessTokenLifespan', 30 * 60),
    maxRefreshTokenLifespan: strapi.config.get(
      'admin.auth.sessions.maxRefreshTokenLifespan',
      legacyMaxRefreshFallback
    ),
    idleRefreshTokenLifespan: strapi.config.get(
      'admin.auth.sessions.idleRefreshTokenLifespan',
      DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN
    ),
    maxSessionLifespan: strapi.config.get(
      'admin.auth.sessions.maxSessionLifespan',
      legacyMaxSessionFallback
    ),
    idleSessionLifespan: strapi.config.get(
      'admin.auth.sessions.idleSessionLifespan',
      DEFAULT_IDLE_SESSION_LIFESPAN
    ),
    algorithm: options?.algorithm,
    // Pass through all JWT options (includes privateKey, publicKey, and any other options)
    jwtOptions: options,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const adminCookieSecure = strapi.config.get('admin.auth.cookie.secure');
  if (isProduction && adminCookieSecure === false) {
    strapi.log.warn(
      'Server is in production mode, but admin.auth.cookie.secure has been set to false. This is not recommended and will allow cookies to be sent over insecure connections.'
    );
  }

  await registerAdminConditions();
  await registerPermissionActions();
  registerModelHooks();

  const permissionService = getService('permission');
  const userService = getService('user');
  const roleService = getService('role');
  const apiTokenService = getService('api-token');
  const transferService = getService('transfer');
  const tokenService = getService('token');

  await roleService.createRolesIfNoneExist();
  await roleService.resetSuperAdminPermissions();
  await roleService.displayWarningIfNoSuperAdmin();

  await permissionService.cleanPermissionsInDatabase();

  await userService.displayWarningIfUsersDontHaveRole();

  await syncAuthSettings();
  await syncAPITokensPermissions();

  await getService('metrics').sendUpdateProjectInformation(strapi);
  getService('metrics').startCron(strapi);

  apiTokenService.checkSaltIsDefined();
  transferService.token.checkSaltIsDefined();
  tokenService.checkSecretIsDefined();

  await createDefaultAPITokensIfNeeded();
};
