import { map, merge, difference } from 'lodash';

import type { Core } from '@strapi/types';
import { async } from '@strapi/utils';
import { getService } from './utils';
import {
  getTokenOptions,
  getLegacyExpiresInSeconds,
  hasUserConfiguredAuthOptionsExpiresIn,
} from './services/token';
import adminActions from './config/admin-actions';
import adminConditions from './config/admin-conditions';
import constants from './services/constants';
import { persistTablesWithPrefix } from '../../ee/server/src/services/persist-tables';
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

/**
 * Actions that exist only while the two-factor feature does. Registered unconditionally, the role
 * editor offered a Security permission for a page that is not there, on every install, flag or
 * no flag. Gated the way EE actions are gated on their licence: switching the feature off and
 * restarting drops these grants from custom roles, as `cleanPermissionsInDatabase` does for any
 * action that is no longer registered; the super admin gets them back when it is switched on.
 */
const MFA_ACTION_UIDS = new Set(['security-settings.read', 'security-settings.update']);

const registerPermissionActions = async () => {
  const mfaEnabled = getService('mfa').isEnabled();
  const actions = adminActions.actions.filter(
    (action) => mfaEnabled || !MFA_ACTION_UIDS.has(action.uid)
  );
  await getService('permission').actionProvider.registerMany(actions);
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
    async beforeDelete(event) {
      // Delete all admin API tokens owned by this user before the user row is removed
      await getService('api-token-admin').deleteTokensForUser(event.params.where.id);
    },
    async afterUpdate(event) {
      if (event.params.data?.preferedLanguage) {
        sendDidChangeInterfaceLanguage();
      }
      if (event.params.data?.roles !== undefined) {
        // We re-sync token permissions for all owner users with their role when the user is updated
        await getService('api-token-admin').syncPermissionsForUser(event.result.id);
      }
    },
  });

  strapi.db.lifecycles.subscribe({
    models: ['admin::role'],
    // We re-sync token permissions for all owner users with this role when the role is deleted
    async beforeDelete(event) {
      const users = await strapi.db.query('admin::user').findMany({
        where: { roles: { id: event.params.where.id } },
        select: ['id'],
      });
      event.state.affectedUserIds = users.map((u: { id: unknown }) => u.id);
    },
    async afterDelete(event) {
      for (const userId of (event.state.affectedUserIds as unknown[]) ?? []) {
        await getService('api-token-admin').syncPermissionsForUser(userId as string | number);
      }
    },
  });
};

const syncAuthSettings = async () => {
  const adminStore = await strapi.store({ type: 'core', name: 'admin' });
  const adminAuthSettings = await adminStore.get({ key: 'auth' });
  const newAuthSettings = merge({}, defaultAdminAuthSettings, adminAuthSettings);

  const roleExists = await getService('role').exists({
    id: newAuthSettings.providers.defaultRole,
  });

  // Reset the default SSO role if it has been deleted manually
  if (!roleExists) {
    newAuthSettings.providers.defaultRole = null;
  }

  await adminStore.set({ key: 'auth', value: newAuthSettings });
};

type APITokenPermissionRow = {
  action: string;
  token?: { id: number | string; name?: string } | null;
};

// Bounds the `IN (...)` list the token populate binds, below every database's parameter limit
export const REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE = 1000;

/**
 * Reads the permissions about to be removed with their token, in batches,
 * so the token populate never binds one parameter per stored permission
 */
const findAPITokenPermissionsByActions = async (actions: string[]) => {
  const permissions: APITokenPermissionRow[] = [];

  for (let offset = 0; ; offset += REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE) {
    const batch: APITokenPermissionRow[] = await strapi.db
      .query('admin::api-token-permission')
      .findMany({
        select: ['id', 'action'],
        where: { action: { $in: actions } },
        populate: { token: { select: ['id', 'name'] } },
        orderBy: { id: 'asc' },
        limit: REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE,
        offset,
      });

    permissions.push(...batch);

    if (batch.length < REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE) {
      return permissions;
    }
  }
};

export const syncAPITokensPermissions = async () => {
  const validPermissions = strapi.contentAPI.permissions.providers.action.keys();
  const permissionsInDB = await async.pipe(
    strapi.db.query('admin::api-token-permission').findMany,
    (permissions) => map(permissions, 'action')
  )();

  const unknownPermissions = [...new Set(difference(permissionsInDB, validPermissions))];

  if (unknownPermissions.length > 0) {
    // Read before deleting: the rows and their token are gone afterwards
    const removedPermissions = await findAPITokenPermissionsByActions(unknownPermissions);

    await strapi.db
      .query('admin::api-token-permission')
      .deleteMany({ where: { action: { $in: unknownPermissions } } });

    const tokens = new Map(
      removedPermissions
        .map((permission) => permission.token)
        .filter((token): token is NonNullable<APITokenPermissionRow['token']> => token != null)
        .map((token) => [token.id, `"${token.name}" (id ${token.id})`])
    );
    const withoutTokenCount = removedPermissions.filter(
      (permission) => permission.token == null
    ).length;

    strapi.log.warn(
      `Removed ${removedPermissions.length} stored API token permission(s) whose action is no longer registered. ` +
        `Actions: ${unknownPermissions.join(', ')}. ` +
        `API tokens: ${tokens.size === 0 ? 'none' : Array.from(tokens.values()).join(', ')}. ` +
        `Without API token: ${withoutTokenCount}.`
    );
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
  const apiTokenService = getService('api-token-content-api');

  const usersCount = await userService.count();
  const apiTokenCount = await apiTokenService.countAll();

  if (usersCount === 0 && apiTokenCount === 0) {
    for (const token of constants.DEFAULT_API_TOKENS) {
      await apiTokenService.create(token);
    }
  }
};

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Get the merged token options (includes defaults merged with user config)
  const { options } = getTokenOptions();
  const legacyExpiresIn = getLegacyExpiresInSeconds();
  const legacyMaxRefreshFallback = legacyExpiresIn ?? DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN;
  const legacyMaxSessionFallback = legacyExpiresIn ?? DEFAULT_MAX_SESSION_LIFESPAN;

  // Warn only when the user set legacy admin.auth.options.expiresIn. Merged JWT options always
  // include the default expiresIn ('30d'), so reading merged options alone is a false positive.
  const hasLegacyExpires = hasUserConfiguredAuthOptionsExpiresIn(
    strapi.config.get('admin.auth.options')
  );
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

  // The audit-log content type is registered in every edition: persist its table with it
  await persistTablesWithPrefix('strapi_audit_logs');
  // Same for the two-factor tables, and in every state of `unstableAdminMfa`: a rollback to a
  // version without them would otherwise drop every enrolment, recovery code, passkey and notice
  // at its first boot. Only whole tables can be kept this way. The `mfa*` columns on
  // `admin_users` and `mfaRequired` on `admin_roles` are still dropped by such a rollback, so a
  // roll forward again finds the tables intact but every user unenrolled.
  await persistTablesWithPrefix('strapi_admin_mfa');

  await registerAdminConditions();
  await registerPermissionActions();
  registerModelHooks();

  const permissionService = getService('permission');
  const userService = getService('user');
  const roleService = getService('role');
  const apiTokenService = getService('api-token-content-api');
  const transferService = getService('transfer');
  const tokenService = getService('token');

  await roleService.createRolesIfNoneExist();
  await roleService.displayWarningIfNoSuperAdmin();

  // Actions can still be registered in the app bootstrap, which runs after the admin one
  strapi.hook('strapi::app.afterBootstrap').register(async () => {
    // An action registered after the cleanup would lose its permissions, so registering throws
    permissionService.actionProvider.lock();

    await roleService.resetSuperAdminPermissions();
    await permissionService.cleanPermissionsInDatabase();
  });

  await userService.displayWarningIfUsersDontHaveRole();

  await syncAuthSettings();
  await syncAPITokensPermissions();
  await getService('api-token-admin').syncPermissionsForAllUsers();

  await getService('metrics').sendUpdateProjectInformation(strapi);
  getService('metrics').startCron(strapi);

  apiTokenService.checkSaltIsDefined();
  transferService.token.checkSaltIsDefined();
  tokenService.checkSecretIsDefined();

  await createDefaultAPITokensIfNeeded();

  const mfaService = getService('mfa');

  // In every state of the flag: the boot that turns it back on needs to know it was off.
  try {
    await mfaService.syncFeatureState();
  } catch (error) {
    strapi.log.warn(
      `Could not record the two-factor feature state: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (mfaService.isEnabled() && !mfaService.canEncryptSecrets()) {
    // Enrolment cannot work at all without the key, and enforcement would lock users who could
    // never comply. The settings refuse a raise in this state; this is for the operator.
    strapi.log.error(
      'Admin two-factor authentication is enabled but the admin encryption key (admin.secrets.encryptionKey, usually ENCRYPTION_KEY) is not configured, so nobody can set it up. Set the key and restart.'
    );
  }
  if (mfaService.isEnabled()) {
    // Table hygiene only: an expired challenge and a dead trust are both refused, and deleted, on
    // read. That is why the whole thing is wrapped -- a cleanup nothing depends on must never be
    // able to stop the admin from booting.
    //
    // The delete is unbounded, deliberately. Challenge rows come only from `createChallenge`,
    // which is throttled per account and rate limited per IP, and they expire after
    // `challengeTtl`, so the expired set at boot is small. Batching would be the fix if that
    // ever changed.
    const sweep = async () => {
      try {
        await mfaService.sweepExpiredChallenges();
        await mfaService.sweepExpiredTrustedDevices();
      } catch (error) {
        strapi.log.warn(
          `Could not sweep expired two-factor challenges or trusted devices: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    // Once at boot, then daily. Boot alone leaves a long-lived instance -- months, for a
    // production deployment -- never sweeping again. `strapi.cron.add` is how metrics, EE audit
    // logs, content-releases and upload all schedule their own housekeeping.
    await sweep();

    // Boot only: rows can only lose their owner's enrolment through a schema change (see the
    // persisted tables above), and that needs a restart.
    try {
      const removed = await mfaService.reconcileOrphanedRows();
      if (removed > 0) {
        strapi.log.warn(
          `Removed ${removed} two-factor rows belonging to deleted or unenrolled admin users.`
        );
      }
    } catch (error) {
      strapi.log.warn(
        `Could not reconcile two-factor rows with admin users: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    strapi.cron.add({
      sweepExpiredMfaRows: {
        task: sweep,
        options: '0 30 3 * * *',
      },
    });

    // Passkeys discoverability. A deployment whose `admin.absoluteUrl` yields no usable
    // relying-party id hides every passkey surface -- correctly, since no ceremony could succeed.
    // Asking here rather than on the first `/mfa/me` puts the cause and the config key that fixes
    // it in the startup log, where an operator is actually looking, instead of leaving the
    // surfaces silently absent. In practice this fires for a deployment that never set
    // `server.url`, so `admin.absoluteUrl` falls back to `http://<host>:<port>` and the template's
    // `HOST=0.0.0.0` makes that an IP literal.
    //
    // Its own `try`, so a store read that fails here is not reported as a sweep failure.
    try {
      await mfaService.warnIfPasskeysMisconfigured();
    } catch (error) {
      strapi.log.warn(
        `Could not check the passkey relying-party configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};
