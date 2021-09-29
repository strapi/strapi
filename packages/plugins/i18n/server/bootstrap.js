'use strict';

const { getService } = require('./utils');

module.exports = async ({ strapi }) => {
  const { sendDidInitializeEvent } = getService('metrics');
  const { decorator } = getService('entity-service-decorator');
  const { initDefaultLocale } = getService('locales');
  const { sectionsBuilder, actions, engine } = getService('permissions');

  // Entity Service
  strapi.entityService.decorate(decorator);

  // Data
  await initDefaultLocale();

  // Sections Builder
  sectionsBuilder.registerLocalesPropertyHandler();

  // Actions
  await actions.registerI18nActions();
  actions.registerI18nActionsHooks();
  actions.updateActionsProperties();

  // Engine/Permissions
  engine.registerI18nPermissionsHandlers();

  // Hooks & Models
  registerModelsHooks();

  sendDidInitializeEvent();
};

const registerModelsHooks = () => {
  const i18nModelUIDs = Object.values(strapi.contentTypes)
    .filter(contentType => getService('content-types').isLocalizedContentType(contentType))
    .map(contentType => contentType.uid);

  if (i18nModelUIDs.length > 0) {
    strapi.db.lifecycles.subscribe({
      models: i18nModelUIDs,
      async beforeCreate(event) {
        await getService('localizations').assignDefaultLocale(event.params.data);
      },
    });
  }

  strapi.db.lifecycles.subscribe({
    models: ['plugin::i18n.locale'],

    async afterCreate() {
      await getService('permissions').actions.syncSuperAdminPermissionsWithLocales();
    },

    async afterDelete() {
      await getService('permissions').actions.syncSuperAdminPermissionsWithLocales();
    },
  });
};
