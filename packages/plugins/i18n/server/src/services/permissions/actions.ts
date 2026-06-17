import { isArray, getOr, prop } from 'lodash/fp';
import { errors } from '@strapi/utils';
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

const validateRolePermissionsLocales = async (permissions: any[]) => {
  const { isLocalizedContentType } = getService('content-types');
  const { actionProvider } = strapi.service('admin::permission');

  for (const permission of permissions) {
    const { subject, action, properties = {} } = permission;

    if (!subject) {
      continue;
    }

    const model = strapi.getModel(subject);

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

/**
 * Repairs role permissions on content types that just had i18n enabled in this sync.
 * Only patches permissions where `properties.locales` is missing or `[]`; leaves `null` alone.
 * Safe to run at `afterSync` time because it does not depend on the actionProvider.
 */
const repairPermissionsForNewlyLocalizedTypes = async ({
  oldContentTypes,
  contentTypes,
}: {
  oldContentTypes: Record<string, any> | null | undefined;
  contentTypes: Record<string, any>;
}) => {
  if (!oldContentTypes) {
    return;
  }

  const { isLocalizedContentType } = getService('content-types');

  const newlyLocalizedUids: string[] = [];
  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }
    if (
      !isLocalizedContentType(oldContentTypes[uid]) &&
      isLocalizedContentType(contentTypes[uid])
    ) {
      newlyLocalizedUids.push(uid);
    }
  }

  if (newlyLocalizedUids.length === 0) {
    return;
  }

  try {
    const defaultLocaleCode = await getService('locales').getDefaultLocale();
    if (!defaultLocaleCode) {
      return;
    }

    const permissionService = strapi.service('admin::permission');
    const allPermissions = await permissionService.findMany({});

    await Promise.all(
      allPermissions
        .filter(
          (permission: any) =>
            newlyLocalizedUids.includes(permission.subject) &&
            needsLocalesPatch(permission.properties)
        )
        .map((permission: any) =>
          strapi.db.query('admin::permission').update({
            where: { id: permission.id },
            data: {
              properties: { ...(permission.properties ?? {}), locales: [defaultLocaleCode] },
            },
          })
        )
    );
  } catch (error) {
    strapi.log.error('Failed to repair i18n permissions for newly localized content types.', error);
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
  repairPermissionsForNewlyLocalizedTypes,
  validateRolePermissionsLocales,
};
