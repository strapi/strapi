import type { Core, Modules, Schema, UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { getService } from '../utils';

const isLocalizedAttribute = (attribute: Schema.Attribute.Attribute | undefined): boolean => {
  return (attribute?.pluginOptions as any)?.i18n?.localized === true;
};

const UNSUPPORTED_ATTRIBUTE_TYPES: Schema.Attribute.Kind[] = [
  'media',
  'relation',
  'boolean',
  'enumeration',
];

const IGNORED_FIELDS = [
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'locale',
  'updatedBy',
  'createdBy',
  'localizations',
];

/**
 * Deep merge where target values take priority over source values.
 * Arrays are merged by index to align repeatable component / dynamic zone items.
 */
const deepMerge = (
  source: Record<string, any>,
  target: Record<string, any>
): Record<string, any> => {
  const result = { ...source };

  for (const key of Object.keys(target)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      result[key] = targetVal.map((item, i) => {
        if (item && typeof item === 'object' && sourceVal[i] && typeof sourceVal[i] === 'object') {
          return deepMerge(sourceVal[i], item);
        }
        return item;
      });
    } else if (
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal) &&
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal)
    ) {
      result[key] = deepMerge(sourceVal, targetVal);
    } else {
      result[key] = targetVal;
    }
  }

  return result;
};

/**
 * Merges unsupported field types (media, boolean, enumeration, relation)
 * from a source document into the target data object.
 *
 * Uses traverseEntity to walk the source document and extract only unsupported fields,
 * then deep-merges the AI-translated target data on top so translated values take priority.
 */
const mergeUnsupportedFields = async (
  targetData: Record<string, any>,
  sourceDoc: Record<string, any> | null,
  schema: Schema.Schema,
  getModel: (uid: UID.Schema) => Schema.Schema | undefined
): Promise<Record<string, any>> => {
  if (!sourceDoc) {
    return targetData;
  }

  // Track paths of relation/media fields so traverseEntity's recursion
  // into those fields doesn't strip internal fields like `id` or `url`.
  const preservedPaths = new Set<string>();

  // Use traverseEntity to extract only unsupported fields from the source document.
  // traverseEntity handles component and dynamic zone recursion automatically.
  const unsupportedFieldsOnly = await traverseEntity(
    ({ key, attribute, path }, { remove }) => {
      // If we're inside a relation or media subtree, preserve everything.
      // Use path-based prefix check instead of parent-based check because
      // traverseEntity mutates `parent` across siblings at the same level,
      // which would incorrectly mark sibling fields as inside a preserved subtree.
      const isInsidePreservedSubtree =
        path.raw && Array.from(preservedPaths).some((pp) => path.raw!.startsWith(`${pp}.`));
      if (isInsidePreservedSubtree) {
        preservedPaths.add(path.raw!);
        return;
      }

      if (IGNORED_FIELDS.includes(key)) {
        remove(key);
        return;
      }

      // Keep fields with no schema attribute (e.g. __component in dynamic zones)
      if (!attribute) {
        return;
      }

      // Mark relation and media subtrees as preserved so their internal
      // fields (id, url, etc.) are not removed during recursion
      if (attribute.type === 'media' || attribute.type === 'relation') {
        preservedPaths.add(path.raw!);
        return;
      }

      // Keep other unsupported attribute types (boolean, enumeration)
      if (UNSUPPORTED_ATTRIBUTE_TYPES.includes(attribute.type)) {
        return;
      }

      // Keep components and dynamic zones — traverseEntity recurses into them
      if (attribute.type === 'component' || attribute.type === 'dynamiczone') {
        return;
      }

      // Remove supported (translatable) fields
      remove(key);
    },
    { schema, getModel: getModel as (uid: string) => Schema.Schema },
    sourceDoc
  );

  // Deep merge: AI-translated target takes priority over source unsupported fields
  return deepMerge(unsupportedFieldsOnly, targetData);
};

const createAILocalizationsService = ({ strapi }: { strapi: Core.Strapi }) => {
  // TODO: add a helper function to get the AI server URL
  const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';
  const aiLocalizationJobsService = getService('ai-localization-jobs');

  return {
    // Async to avoid changing the signature later (there will be a db check in the future)
    async isEnabled() {
      // Check if user disabled AI features globally
      const isAIEnabled = strapi.config.get('admin.ai.enabled', true);
      if (!isAIEnabled) {
        return false;
      }

      // Check if the user's license grants access to AI features
      const hasAccess = strapi.ee.features.isEnabled('cms-ai');
      if (!hasAccess) {
        return false;
      }

      const settings = getService('settings');
      const aiSettings = await settings.getSettings();
      if (!aiSettings?.aiLocalizations) {
        return false;
      }

      return true;
    },

    /**
     * Checks if there are localizations that need to be generated for the given document,
     * and if so, calls the AI service and saves the results to the database.
     * Works for both single and collection types, on create and update.
     */
    async generateDocumentLocalizations({
      model,
      document,
    }: {
      model: UID.ContentType;
      document: Modules.Documents.AnyDocument;
    }) {
      const isFeatureEnabled = await this.isEnabled();
      if (!isFeatureEnabled) {
        return;
      }

      const schema = strapi.getModel(model);
      const localeService = getService('locales');

      // No localizations needed for content types with i18n disabled
      const isLocalizedContentType = getService('content-types').isLocalizedContentType(schema);
      if (!isLocalizedContentType) {
        return;
      }

      // Don't trigger localizations if the update is on a derived locale, only do it on the default
      const defaultLocale = await localeService.getDefaultLocale();
      if (document?.locale !== defaultLocale) {
        return;
      }

      const documentId = document.documentId;

      if (!documentId) {
        strapi.log.warn(`AI Localizations: missing documentId for ${schema.uid}`);
        return;
      }

      const localizedRoots = new Set();

      const translateableContent = await traverseEntity(
        ({ key, attribute, parent, path }, { remove }) => {
          if (IGNORED_FIELDS.includes(key)) {
            remove(key);
            return;
          }
          const hasLocalizedOption = attribute && isLocalizedAttribute(attribute);
          if (attribute && UNSUPPORTED_ATTRIBUTE_TYPES.includes(attribute.type)) {
            remove(key);
            return;
          }

          // If this field is localized, keep it (and mark as localized root if component/dz)
          if (hasLocalizedOption) {
            // If it's a component/dynamiczone, add to the set
            if (['component', 'dynamiczone'].includes(attribute.type)) {
              localizedRoots.add(path.raw);
            }
            return; // keep
          }

          if (parent && localizedRoots.has(parent.path.raw)) {
            // If parent exists in the localized roots set, keep it
            // If this is also a component/dz, propagate the localized root flag
            if (['component', 'dynamiczone'].includes(attribute?.type ?? '')) {
              localizedRoots.add(path.raw);
            }
            return; // keep
          }

          // Otherwise, remove the field
          remove(key);
        },
        { schema, getModel: strapi.getModel.bind(strapi) },
        document
      );

      if (Object.keys(translateableContent).length === 0) {
        strapi.log.info(
          `AI Localizations: no translatable content for ${schema.uid} document ${documentId}`
        );
        return;
      }

      const localesList = await localeService.find();
      const targetLocales = localesList
        .filter((l) => l.code !== document.locale)
        .map((l) => l.code);

      if (targetLocales.length === 0) {
        strapi.log.info(
          `AI Localizations: no target locales for ${schema.uid} document ${documentId}`
        );
        return;
      }

      await aiLocalizationJobsService.upsertJobForDocument({
        contentType: model,
        documentId,
        sourceLocale: document.locale,
        targetLocales,
        status: 'processing',
      });

      let token: string;
      try {
        const tokenData = await strapi.get('ai').getAiToken();
        token = tokenData.token;
      } catch (error) {
        await aiLocalizationJobsService.upsertJobForDocument({
          documentId,
          contentType: model,
          sourceLocale: document.locale,
          targetLocales,
          status: 'failed',
        });

        throw new Error('Failed to retrieve AI token', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      /**
       * Provide a schema to the LLM so that we can give it instructions about how to handle each
       * type of attribute. Only keep essential schema data to avoid cluttering the context.
       * Ignore fields that don't need to be localized.
       * TODO: also provide a schema of all the referenced components
       */
      const minimalContentTypeSchema = Object.fromEntries(
        Object.entries(schema.attributes)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, attr]) => {
            const isLocalized = isLocalizedAttribute(attr);
            const isSupportedType = !UNSUPPORTED_ATTRIBUTE_TYPES.includes(attr.type);
            return isLocalized && isSupportedType;
          })
          .map(([key, attr]) => {
            const minimalAttribute = { type: attr.type };
            if (attr.type === 'component') {
              (
                minimalAttribute as Schema.Attribute.Component<`${string}.${string}`, boolean>
              ).repeatable = attr.repeatable ?? false;
            }
            return [key, minimalAttribute];
          })
      );

      strapi.log.http('Contacting AI Server for localizations generation');
      const response = await fetch(`${aiServerUrl}/i18n/generate-localizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: translateableContent,
          sourceLocale: document.locale,
          targetLocales,
          contentTypeSchema: minimalContentTypeSchema,
        }),
      });

      if (!response.ok) {
        strapi.log.error(
          `AI Localizations request failed: ${response.status} ${response.statusText}`
        );

        await aiLocalizationJobsService.upsertJobForDocument({
          documentId,
          contentType: model,
          sourceLocale: document.locale,
          targetLocales,
          status: 'failed',
        });

        throw new Error(`AI Localizations request failed: ${response.statusText}`);
      }

      const aiResult = await response.json();

      // Use populate-builder service for deep populate to fetch all nested fields
      const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
      // @ts-expect-error - populate-builder service returns a callable function
      const deepPopulate = await populateBuilderService(model).populateDeep(Infinity).build();
      const getModelBound = strapi.getModel.bind(strapi);

      // Fetch the source document with all fields populated (for new locales that don't exist yet)
      const sourceDocWithAllFields = await strapi.documents(model).findOne({
        documentId,
        locale: document.locale,
        populate: deepPopulate,
      });

      try {
        await Promise.all(
          aiResult.localizations.map(async (localization: any) => {
            const { content, locale } = localization;

            // Fetch the existing derived locale document with all fields populated
            const derivedDoc = await strapi.documents(model).findOne({
              documentId,
              locale,
              populate: deepPopulate,
            });

            // Start with AI-translated content
            let mergedData = structuredClone(content);

            // Merge unsupported fields from existing derived doc (if exists) or source doc
            // This preserves media, booleans, enumerations, and relations at all levels
            const sourceForUnsupportedFields = derivedDoc || sourceDocWithAllFields;
            mergedData = await mergeUnsupportedFields(
              mergedData,
              sourceForUnsupportedFields,
              schema,
              getModelBound
            );

            await strapi.documents(model).update({
              documentId,
              locale,
              fields: [],
              data: mergedData,
            });

            await aiLocalizationJobsService.upsertJobForDocument({
              documentId,
              contentType: model,
              sourceLocale: document.locale,
              targetLocales,
              status: 'completed',
            });
          })
        );
      } catch (error) {
        await aiLocalizationJobsService.upsertJobForDocument({
          documentId,
          contentType: model,
          sourceLocale: document.locale,
          targetLocales,
          status: 'failed',
        });
        strapi.log.error('AI Localizations generation failed', error);
      }
    },
    setupMiddleware() {
      strapi.documents.use(async (context, next) => {
        const result = await next();

        // Only trigger for the allowed actions
        if (!['create', 'update'].includes(context.action)) {
          return result;
        }

        // Check if AI localizations are enabled before triggering
        const isEnabled = await this.isEnabled();
        if (!isEnabled) {
          return result;
        }

        // Don't await since localizations should be done in the background without blocking the request
        strapi
          .plugin('i18n')
          .service('ai-localizations')
          .generateDocumentLocalizations({
            model: context.contentType.uid,
            document: result,
          })
          .catch((error: any) => {
            strapi.log.error('AI Localizations generation failed', error);
          });

        return result;
      });
    },
  };
};

export { createAILocalizationsService, mergeUnsupportedFields };
