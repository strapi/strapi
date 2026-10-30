import type { Schema } from '@strapi/types';
import { isEqual } from 'lodash';
import { registerAuditEvents } from './audit-logs';
import { localeForOriginalLookup } from './services/original-locale';
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
    const { getNestedPopulateOfNonLocalizedAttributes, copyNonLocalizedAttributes } =
      getService('content-types');
    const attributesToPopulate = getNestedPopulateOfNonLocalizedAttributes(schema.uid);

    // Compare the draft of the locale being changed. An unscoped findOne can
    // return the published row or another locale; Postgres does not keep
    // SQLite's insertion order, so discard then looked unchanged and skipped
    // syncing non-localized fields. `*` is not a stored locale, so a wildcard
    // discard stays unscoped and still limited to the draft row.
    const locale = localeForOriginalLookup(context.params.locale);
    const documentId =
      'documentId' in context.params && context.params.documentId
        ? context.params.documentId
        : undefined;
    const draftOnly = schema.options?.draftAndPublish ? { publishedAt: { $null: true } } : {};
    let originalData = documentId
      ? await strapi.db.query(schema.uid).findOne({
          where: {
            documentId,
            ...(locale ? { locale } : {}),
            ...draftOnly,
          },
          populate: attributesToPopulate,
        })
      : null;

    // A new locale has no row yet. Compare a sibling draft so copied
    // non-localized values do not count as a change and rewrite every locale.
    if (!originalData && documentId && locale) {
      originalData = await strapi.db.query(schema.uid).findOne({
        where: {
          documentId,
          locale: { $ne: locale },
          ...draftOnly,
        },
        populate: attributesToPopulate,
      });
    }

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

    const populatedResult = await strapi.db.query(schema.uid).findOne({
      where: { id: resultID },
      populate: attributesToPopulate,
    });

    const originalFields = copyNonLocalizedAttributes(schema, originalData);
    const currentFields = copyNonLocalizedAttributes(schema, populatedResult);

    // Only sync if there are actual changes to non-localized fields
    const shouldSync =
      !originalData ||
      Object.keys(currentFields).some((key) => {
        return !isEqual(currentFields[key], originalFields[key]);
      });

    if (shouldSync) {
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

  // Absent in CE, without the audit-logs license, or when disabled by config;
  // get() throws for services that were never added, so probe first.
  if (strapi.has('audit-logs-lifecycle')) {
    registerAuditEvents(strapi.get('audit-logs-lifecycle'));
  }

  // AI Localizations
  if (strapi.ai.admin.isAvailable()) {
    const aiTranslations = getService('ai-translations');

    if (!aiTranslations.hasProvider() && strapi.ai.admin.isStrapiManagedAiEnabled()) {
      aiTranslations.registerStrapiManagedProvider();
    }

    getService('ai-localizations').setupMiddleware();
  }

  sendDidInitializeEvent();
};
