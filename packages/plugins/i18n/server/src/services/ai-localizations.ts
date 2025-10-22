import type { Core, Modules, UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { getService } from '../utils';

const createAILocalizationsService = ({ strapi }: { strapi: Core.Strapi }) => {
  // TODO: add a helper function to get the AI server URL
  const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';
  const aiLocalizationJobsService = getService('ai-localization-jobs');

  return {
    // Async to avoid changing the signature later (there will be a db check in the future)
    async isEnabled() {
      // Check if future flag is enabled
      const isFutureFlagEnabled = strapi.features.future.isEnabled('unstableAILocalizations');
      if (!isFutureFlagEnabled) {
        return false;
      }

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

      // Extract only the localized content from the document
      const translateableContent = await traverseEntity(
        ({ key, attribute }, { remove }) => {
          const hasLocalizedOption = attribute?.pluginOptions?.i18n?.localized === true;
          // Only keep fields that actually need to be localized
          // TODO: remove blocks from this list once the AI server can handle it reliably
          if (!hasLocalizedOption || ['media', 'blocks'].includes(attribute.type)) {
            remove(key);
          }
        },
        { schema, getModel: strapi.getModel.bind(strapi) },
        document
      );

      // Call the AI server to get the localized content
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
        const tokenData = await strapi.service('admin::user').getAiToken();
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
      } else {
        await aiLocalizationJobsService.upsertJobForDocument({
          documentId,
          contentType: model,
          sourceLocale: document.locale,
          targetLocales,
          status: 'completed',
        });
      }

      const aiResult = await response.json();

      // Get all media field names dynamically from the schema
      const mediaFields = Object.entries(schema.attributes)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, attr]) => attr.type === 'media')
        .map(([key]) => key);

      try {
        await Promise.allSettled(
          aiResult.localizations.map(async (localization: any) => {
            const { content, locale } = localization;

            // Fetch the derived locale document
            const derivedDoc = await strapi.documents(model).findOne({
              documentId,
              locale,
              populate: mediaFields,
            });

            // Merge AI content and media fields
            const mergedData = { ...content };
            for (const field of mediaFields) {
              // Only copy media if not already set in derived locale
              if (!derivedDoc || !derivedDoc[field]) {
                mergedData[field] = document[field];
              } else {
                mergedData[field] = derivedDoc[field];
              }
            }

            return strapi.documents(model).update({
              documentId,
              locale,
              fields: [],
              data: mergedData,
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

        // Only trigger on create/update actions
        if (!['create', 'update'].includes(context.action)) {
          return result;
        }

        // Don't await since localizations should be done in the background without blocking the request
        // Use setImmediate to ensure this runs outside the current transaction context
        setImmediate(() => {
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
        });

        return result;
      });
    },
  };
};

export { createAILocalizationsService };
