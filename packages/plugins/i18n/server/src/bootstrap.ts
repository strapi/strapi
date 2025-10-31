import type { Schema } from '@strapi/types';
import { isEqual } from 'lodash';
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

    if (!['create', 'update', 'discardDraft'].includes(context.action)) {
      return next();
    }

    if (!getService('content-types').isLocalizedContentType(schema)) {
      return next();
    }

    // Build a populate array for all non localized fields within the schema
    const { getNestedPopulateOfNonLocalizedAttributes, copyNonLocalizedAttributes } =
      getService('content-types');
    const attributesToPopulate = getNestedPopulateOfNonLocalizedAttributes(schema.uid);

    // Get original data before the update to compare what actually changed
    const originalData =
      context.action === 'update' && context.params.documentId
        ? await strapi.db.query(schema.uid).findOne({
            where: { documentId: context.params.documentId },
            populate: attributesToPopulate,
          })
        : null;

    // Get the result of the document service action
    const result = (await next()) as any;

    // @ts-expect-error true
    const paramData = context.params.data;
    const currentFields = copyNonLocalizedAttributes(schema, paramData);
    const originalFields = copyNonLocalizedAttributes(schema, originalData);

    // Only sync if there are actual changes to non-localized fields
    const shouldSync =
      !originalData ||
      Object.keys(currentFields).some((key) => {
        return !isEqual(currentFields[key], originalFields[key]);
      });

    if (shouldSync) {
      await getService('localizations').syncNonLocalizedAttributes(paramData, schema);
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

  // AI Localizations
  getService('ai-localizations').setupMiddleware();

  sendDidInitializeEvent();
};
