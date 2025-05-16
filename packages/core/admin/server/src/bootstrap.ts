import { merge, map, difference, uniq } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { async } from '@strapi/utils';
import { getService } from './utils';
import adminActions from './config/admin-actions';
import adminConditions from './config/admin-conditions';

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
    await apiTokenService.create({
      name: 'Read Only',
      description:
        'A default API token with read-only permissions, only used for accessing resources',
      type: 'read-only',
      lifespan: null,
    });

    await apiTokenService.create({
      name: 'Full Access',
      description:
        'A default API token with full access permissions, used for accessing or modifying resources',
      type: 'full-access',
      lifespan: null,
    });
  }
};

export default async ({ strapi }: { strapi: Core.Strapi }) => {
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
