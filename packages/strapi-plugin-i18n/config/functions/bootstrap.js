'use strict';

const { capitalize, isArray, isEmpty } = require('lodash/fp');
const { getService } = require('../../utils');

module.exports = async () => {
  // Entity Service
  decorateEntityService();

  // Data
  await ensureDefaultLocale();

  // Sections Builder
  registerSectionsBuilderHandlers();

  // Actions
  await registerActions();
  registerActionsHooks();
  updateActionsProperties();

  // Conditions
  registerConditions();

  // Engine/Permissions
  registerPermissionsHandlers();

  // Hooks & Models
  registerModelsHooks();
};

// Steps

const decorateEntityService = () => {
  const { decorator } = getService('entity-service-decorator');

  strapi.entityService.decorate(decorator);
};

const registerSectionsBuilderHandlers = () => {
  const { sectionsBuilder } = strapi.admin.services.permission;

  // Adding the permissions layout handler for the "locales" property
  sectionsBuilder.addHandler('singleTypes', localesPropertyHandler);
  sectionsBuilder.addHandler('collectionTypes', localesPropertyHandler);
};

const ensureDefaultLocale = async () => {
  const { initDefaultLocale } = getService('locales');

  await initDefaultLocale();
};

const registerActions = async () => {
  const { actionProvider } = strapi.admin.services.permission;

  await actionProvider.registerMany(actions);
};

const registerActionsHooks = () => {
  const { actionProvider } = strapi.admin.services.permission;

  actionProvider.hooks.appliesPropertyToSubject.register(appliesPropertyToSubjectHook);
};

const registerConditions = () => {
  const { conditionProvider } = strapi.admin.services.permission;

  conditionProvider.registerMany(conditions);
};

const updateActionsProperties = () => {
  const { actionProvider } = strapi.admin.services.permission;

  // Register the transformation for every new action
  actionProvider.hooks.willRegister.register(addLocalesPropertyIfNeeded);

  // Handle already registered actions
  actionProvider.values().forEach(action => addLocalesPropertyIfNeeded({ value: action }));
};

const registerPermissionsHandlers = () => {
  const { engine } = strapi.admin.services.permission;

  engine.hooks.willEvaluatePermission.register(willEvaluatePermissionHandler);
};

const registerModelsHooks = () => {
  Object.values(strapi.models)
    .filter(model => getService('content-types').isLocalized(model))
    .forEach(model => {
      strapi.db.lifecycles.register({
        model: model.uid,
        async beforeCreate(data) {
          await getService('localizations').assignDefaultLocale(data);
        },
      });
    });
};

// Utils

const addLocalesPropertyIfNeeded = ({ value: action }) => {
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

// Hooks

const appliesPropertyToSubjectHook = ({ property, subject }) => {
  if (property === 'locales') {
    const model = strapi.getModel(subject);

    return getService('content-types').isLocalized(model);
  }

  return true;
};

// Other

const actions = ['create', 'read', 'update', 'delete'].map(uid => ({
  section: 'settings',
  category: 'Internationalization',
  subCategory: 'Locales',
  pluginName: 'i18n',
  displayName: capitalize(uid),
  uid: `locale.${uid}`,
}));

const conditions = [
  {
    displayName: 'Has Locale Access',
    name: 'has-locale-access',
    plugin: 'i18n',
    handler: (user, options) => {
      const { locales } = options.permission.properties || {};
      const { superAdminCode } = strapi.admin.services.role.constants;

      const isSuperAdmin = user.roles.some(role => role.code === superAdminCode);

      if (isSuperAdmin) {
        return true;
      }

      return {
        locale: {
          $in: locales || [],
        },
      };
    },
  },
];

/**
 * Locales property handler for the permission engine
 * Add the has-locale-access condition if the locales property is defined
 * @param {Permission} permission
 * @param {function(string)} addCondition
 */
const willEvaluatePermissionHandler = ({ permission, addCondition }) => {
  const { subject, properties } = permission;
  const { locales } = properties || {};

  const { isLocalized } = getService('content-types');

  // If there is no subject defined, ignore the permission
  if (!subject) {
    return;
  }

  const ct = strapi.contentTypes[subject];

  // If the subject exists but isn't localized, ignore the permission
  if (!isLocalized(ct)) {
    return;
  }

  // If the subject is localized but the locales property is null (access to all locales), ignore the permission
  if (locales === null) {
    return;
  }

  addCondition('plugins::i18n.has-locale-access');
};

/**
 * Handler for the permissions layout (sections builder)
 * Adds the locales property to the subjects
 * @param action
 * @param section
 * @return {Promise<void>}
 */
const localesPropertyHandler = async ({ action, section }) => {
  const { actionProvider } = strapi.admin.services.permission;

  const locales = await getService('locales').find();

  // Do not add the locales property if there is none registered
  if (isEmpty(locales)) {
    return;
  }

  for (const subject of section.subjects) {
    const applies = await actionProvider.appliesToProperty('locales', action.actionId, subject.uid);
    const hasLocalesProperty = subject.properties.find(property => property.value === 'locales');

    if (applies && !hasLocalesProperty) {
      subject.properties.push({
        label: 'Locales',
        value: 'locales',
        children: locales.map(({ name, code }) => ({ label: name || code, value: code })),
      });
    }
  }
};
