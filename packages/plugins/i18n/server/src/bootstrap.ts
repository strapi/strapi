import type { Strapi } from '@strapi/strapi';

import { getService } from './utils';

const registerModelsHooks = () => {
  const i18nModelUIDs = Object.values(strapi.contentTypes)
    .filter((contentType) => getService('content-types').isLocalizedContentType(contentType))
    .map((contentType) => contentType.uid);

  if (i18nModelUIDs.length > 0) {
    strapi.db.lifecycles.subscribe({
      models: i18nModelUIDs,
      async afterCreate(event) {
        await getService('localizations').syncNonLocalizedAttributes(event.result, event.model);
      },
      async afterUpdate(event) {
        await getService('localizations').syncNonLocalizedAttributes(event.result, event.model);
      },
      // TODO support bulk events
      // async afterCreateMany(event) {
      // },
      // async afterUpdateMany(event) {
      // },
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

  // TODO: v5 handled in the document service or via document service middlewares
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
