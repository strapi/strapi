import type { Strapi } from '@strapi/strapi';

import { getService } from './utils';

const registerModelsHooks = () => {
  strapi.db.lifecycles.subscribe({
    models: ['plugin::i18n.locale'],

    async afterCreate() {
      await getService('permissions').actions.syncSuperAdminPermissionsWithLocales();
    },

    async afterDelete() {
      await getService('permissions').actions.syncSuperAdminPermissionsWithLocales();
    },
  });

  strapi.documents.use(async (context, next) => {
    // @ts-expect-error ContentType is not typed correctly on the context
    const schema = context.contentType;

    if (!['create', 'update', 'discardDraft', 'publish'].includes(context.action)) {
      return next(context);
    }

    if (!getService('content-types').isLocalizedContentType(schema)) {
      return next(context);
    }

    // Collect the result of the document service action and sync non localized
    // attributes based on the response

    /*
      result might not contain all the non localizedAttributes (you can pass a populate that would only retrun some nested data and not all of it) we might need to fetch the data with a deepPopulate to be able to copy correctly (only populate the fields you need to copy of course)
    */
    const result = (await next(context)) as any;
    await getService('localizations').syncNonLocalizedAttributes(result, schema);

    return result;
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
