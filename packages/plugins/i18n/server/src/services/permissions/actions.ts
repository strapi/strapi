import { isArray, getOr, prop } from 'lodash/fp';
import { getService } from '../../utils';

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
};
