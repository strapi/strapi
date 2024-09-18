import type { Schema } from '@strapi/types';
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
    const schema: Schema.ContentType = context.contentType;

    if (!['create', 'update', 'discardDraft', 'publish'].includes(context.action)) {
      return next();
    }

    if (!getService('content-types').isLocalizedContentType(schema)) {
      return next();
    }

    // Build a populate array for all non localized fields within the schema
    const { getNestedPopulateOfNonLocalizedAttributes } = getService('content-types');

    const attributesToPopulate = getNestedPopulateOfNonLocalizedAttributes(schema.uid);

    // Get the result of the document service action
    const result = (await next()) as any;

    // We may not have received a result with everything populated that we need
    // Use the id and populate built from non localized fields to get the full
    // result
    let resultID;
    // TODO: fix bug where an empty array can be returned
    if (Array.isArray(result?.entries) && result.entries[0]?.id) {
      resultID = result.entries[0].id;
    } else if (result?.id) {
      resultID = result.id;
    } else {
      return result;
    }

    if (attributesToPopulate.length > 0) {
      const populatedResult = await strapi.db
        .query(schema.uid)
        .findOne({ where: { id: resultID }, populate: attributesToPopulate });

      await getService('localizations').syncNonLocalizedAttributes(populatedResult, schema);
    }

    return result;
  });
};

export default async () => {
  const { sendDidInitializeEvent } = getService('metrics');
  const { initDefaultLocale } = getService('locales');
  const { sectionsBuilder, actions, engine } = getService('permissions');

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
