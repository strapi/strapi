import type { Strapi } from '@strapi/types';

import { getService } from './utils';

const registerModelsHooks = () => {
  const i18nModelUIDs = Object.values(strapi.contentTypes)
    .filter((contentType) => getService('content-types').isLocalizedContentType(contentType))
    .map((contentType) => contentType.uid);

  if (i18nModelUIDs.length > 0) {
    // TODO V5 : to remove ?
    // Should this code exist? It's putting business logic on the query engine
    // whereas it should maybe stay on the entity service layer ?
    strapi.db.lifecycles.subscribe({
      models: i18nModelUIDs,
      async beforeCreate(event) {
        await getService('localizations').assignDefaultLocaleToEntries(event.params.data);
      },
      async beforeCreateMany(event) {
        await getService('localizations').assignDefaultLocaleToEntries(event.params.data);
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

export default async ({ strapi }: { strapi: Strapi }) => {
  const { sendDidInitializeEvent } = getService('metrics');
  const { decorator } = getService('entity-service-decorator');
  const { initDefaultLocale } = getService('locales');
  const { sectionsBuilder, actions, engine } = getService('permissions');

  // Entity Service
  (strapi.entityService as any).decorate(decorator);

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
