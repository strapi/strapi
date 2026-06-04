import { isArray, getOr, prop } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { UID } from '@strapi/types';
import { getService } from '../../utils';

const { ApplicationError } = errors;

const actions = [
  {
    section: 'settings',
    category: 'Internationalization',
    subCategory: 'Locales',
    pluginName: 'i18n',
    displayName: 'Create',
    uid: 'locale.create',
  },
  {
    section: 'settings',
    category: 'Internationalization',
    subCategory: 'Locales',
    pluginName: 'i18n',
    displayName: 'Read',
    uid: 'locale.read',
    aliases: [
      { actionId: 'plugin::content-manager.explorer.read', subjects: ['plugin::i18n.locale'] },
    ],
  },
  {
    section: 'settings',
    category: 'Internationalization',
    subCategory: 'Locales',
    pluginName: 'i18n',
    displayName: 'Update',
    uid: 'locale.update',
  },
  {
    section: 'settings',
    category: 'Internationalization',
    subCategory: 'Locales',
    pluginName: 'i18n',
    displayName: 'Delete',
    uid: 'locale.delete',
  },
];

const addLocalesPropertyIfNeeded = ({ value: action }: any) => {
  const {
    section,
    options: { applyToProperties },
  } = action;

  // Only add the locales property to contentTypes' actions
  if (section !== 'contentTypes') {
    return;
  }

  // If the 'locales' property is already declared within the applyToProperties array, then ignore the next steps
  if (isArray(applyToProperties) && applyToProperties.includes('locales')) {
    return;
  }

  // Add the 'locales' property to the applyToProperties array (create it if necessary)
  action.options.applyToProperties = isArray(applyToProperties)
    ? applyToProperties.concat('locales')
    : ['locales'];
};

const shouldApplyLocalesPropertyToSubject = ({ property, subject }: any) => {
  if (property === 'locales') {
    const model = strapi.getModel(subject);

    return getService('content-types').isLocalizedContentType(model);
  }

  return true;
};

const addAllLocalesToPermissions = async (permissions: any) => {
  const { actionProvider } = strapi.service('admin::permission');
  const { find: findAllLocales } = getService('locales');

  const allLocales = await findAllLocales();
  const allLocalesCode = allLocales.map(prop('code'));

  return Promise.all(
    permissions.map(async (permission: any) => {
      const { action, subject } = permission;

      const appliesToLocalesProperty = await actionProvider.appliesToProperty(
        'locales',
        action,
        subject
      );

      if (!appliesToLocalesProperty) {
        return permission;
      }

      const oldPermissionProperties = getOr({}, 'properties', permission);

      return { ...permission, properties: { ...oldPermissionProperties, locales: allLocalesCode } };
    })
  );
};

/**
 * `properties.locales === null` means access to all locales (see engine handler) — do not patch.
 */
const needsLocalesPatch = (properties: Record<string, unknown> = {}) => {
  if (!('locales' in properties)) {
    return true;
  }

  const { locales } = properties;

  if (locales === null) {
    return false;
  }

  return Array.isArray(locales) && locales.length === 0;
};

const getLocalizedContentType = (subject: string) => {
  return strapi.getModel(subject as UID.Schema);
};

/**
 * Patches stored role permissions on localized content types when `properties.locales`
 * is missing or empty (e.g. after enabling i18n on an existing type). Without this,
 * the engine treats locale scope as "none" and roles lose access. `locales: null` is left
 * unchanged (all locales). Runs on bootstrap and after content-type sync.
 */
const repairLegacyPermissionsWithLocales = async () => {
  try {
    const defaultLocaleCode = await getService('locales').getDefaultLocale();

    if (!defaultLocaleCode) {
      return;
    }

    const { isLocalizedContentType } = getService('content-types');
    const permissionService = strapi.service('admin::permission');
    const { actionProvider } = permissionService;
    const allPermissions = await permissionService.findMany({});

    const permissionsToPatch = [];

    for (const permission of allPermissions) {
      const { action, subject, properties = {} } = permission;

      if (!subject) {
        continue;
      }

      const model = getLocalizedContentType(subject);

      if (!model || !isLocalizedContentType(model)) {
        continue;
      }

      const appliesToLocales = await actionProvider.appliesToProperty('locales', action, subject);

      if (!appliesToLocales) {
        continue;
      }

      if (!needsLocalesPatch(properties)) {
        continue;
      }

      permissionsToPatch.push(permission);
    }

    await Promise.all(
      permissionsToPatch.map((permission) => {
        const { properties = {} } = permission;

        return strapi.db.query('admin::permission').update({
          where: { id: permission.id },
          data: {
            properties: {
              ...properties,
              locales: [defaultLocaleCode],
            },
          },
        });
      })
    );
  } catch (error) {
    strapi.log.error(
      'Failed to repair legacy i18n permissions with default locale access. Role permissions on localized content types may be incomplete.',
      error
    );
  }
};

const validateRolePermissionsLocales = async (permissions: any[]) => {
  const { isLocalizedContentType } = getService('content-types');
  const { actionProvider } = strapi.service('admin::permission');

  for (const permission of permissions) {
    const { subject, action, properties = {} } = permission;

    if (!subject) {
      continue;
    }

    const model = getLocalizedContentType(subject);

    if (!model || !isLocalizedContentType(model)) {
      continue;
    }

    const appliesToLocales = await actionProvider.appliesToProperty('locales', action, subject);

    if (!appliesToLocales) {
      continue;
    }

    const { locales } = properties;

    // null means access to all locales — same semantics as the permission engine handler
    if (locales === null) {
      continue;
    }

    if (locales === undefined || (Array.isArray(locales) && locales.length === 0)) {
      throw new ApplicationError('Permissions must apply to at least one locale.');
    }
  }
};

const syncSuperAdminPermissionsWithLocales = async () => {
  const roleService = strapi.service('admin::role');
  const permissionService = strapi.service('admin::permission');

  const superAdminRole = await roleService.getSuperAdmin();

  if (!superAdminRole) {
    return;
  }

  const superAdminPermissions = await permissionService.findMany({
    where: {
      role: {
        id: superAdminRole.id,
      },
    },
  });

  const newSuperAdminPermissions = await addAllLocalesToPermissions(superAdminPermissions);

  await roleService.assignPermissions(superAdminRole.id, newSuperAdminPermissions);
};

const registerI18nActions = async () => {
  const { actionProvider } = strapi.service('admin::permission');

  await actionProvider.registerMany(actions);
};

const registerI18nActionsHooks = () => {
  const { actionProvider } = strapi.service('admin::permission');
  const { hooks } = strapi.service('admin::role');

  actionProvider.hooks.appliesPropertyToSubject.register(shouldApplyLocalesPropertyToSubject);
  hooks.willResetSuperAdminPermissions.register(addAllLocalesToPermissions);
  hooks.willValidateUpdatePermissions.register(validateRolePermissionsLocales);
};

const updateActionsProperties = () => {
  const { actionProvider } = strapi.service('admin::permission');

  // Register the transformation for every new action
  actionProvider.hooks.willRegister.register(addLocalesPropertyIfNeeded);

  // Handle already registered actions
  actionProvider.values().forEach((action: any) => addLocalesPropertyIfNeeded({ value: action }));
};

export default {
  actions,
  registerI18nActions,
  registerI18nActionsHooks,
  updateActionsProperties,
  syncSuperAdminPermissionsWithLocales,
  repairLegacyPermissionsWithLocales,
  validateRolePermissionsLocales,
};
