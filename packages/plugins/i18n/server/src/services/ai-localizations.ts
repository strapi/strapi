import type { Core, Modules, UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { getService } from '../utils';
import _ from 'lodash';
import { c } from 'tar';

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

      const localizedRoots = new Set();

      const translateableContent = await traverseEntity(
        ({ key, attribute, parent, value, path }, { remove }) => {
          // Always remove media and blocks fields
          if (attribute && ['media', 'blocks'].includes(attribute.type)) {
            remove(key);
            return;
          }

          // If this field is localized, keep it (and mark as localized root if component/dz)
          const isLocalized = attribute?.pluginOptions?.i18n?.localized === true;
          if (isLocalized) {
            // If it's a component/dynamiczone, add to the set
            if (['component', 'dynamiczone'].includes(attribute.type)) {
              localizedRoots.add(path.raw);
            }
            return; // keep
          }

          // If parent exists in the localized roots set, keep it
          if (parent && localizedRoots.has(parent.path.raw)) {
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

      console.log('AI Localizations: localized roots:', localizedRoots);

      console.log(
        'AI Localizations: translateable content:',
        JSON.stringify(translateableContent, null, 2)
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

      const aiResult = {
        localizations: [
          {
            locale: 'fr',
            content: {
              title: 'Bonjour',
              teamMembers: {
                id: 19,
                name: 'Jane Smith',
                role: 'Developpeuse',
                organization: [
                  {
                    id: 1,
                    name: 'TestO',
                    address: 'Test address',
                    testComponent: [
                      {
                        id: 1,
                        testName: 'Test Name',
                        testAnotherText: 'Test Another Text',
                      },
                    ],
                  },
                ],
              },
              createdBy: null,
            },
          },
          {
            locale: 'de',
            content: {
              title: 'Hallo',
              teamMembers: {
                id: 19,
                name: 'Jane Smith',
                role: 'Entwicklerin',
                organization: [
                  {
                    id: 1,
                    name: 'TestO',
                    address: 'Test address',
                    testComponent: [
                      {
                        id: 1,
                        testName: 'Test Name',
                        testAnotherText: 'Test Another Text',
                      },
                    ],
                  },
                ],
              },
              createdBy: null,
            },
          },
        ],
      };

      //const aiResult = await response.json();
      console.log('DOCUMENT:', JSON.stringify(document, null, 2));

      try {
        await Promise.allSettled(
          aiResult.localizations.map(async (localization: any) => {
            const { content, locale } = localization;

            // Fetch the derived locale document
            const derivedDoc = await strapi.documents(model).findOne({
              documentId,
              locale,
              populate: '*',
            });

            // Use traverseEntity to collect all media field paths from the schema
            /*const mediaContent = await traverseEntity(
              ({ key, attribute }, { remove }) => {
                if (!attribute) return;
                if (attribute.type === 'media') {
                  if (!derivedDoc || !derivedDoc[key]) return;
                }
                if (['component', 'dynamiczone'].includes(attribute.type)) return;
                remove(key);
              },
              { schema, getModel: strapi.getModel.bind(strapi) },
              document
            );

            const mergedData = _.merge({}, content, mediaContent);

            console.log(
              'Merging media fields for locale',
              JSON.stringify(mergedData, null, 2),
              locale
            );*/

            return strapi.documents(model).update({
              documentId,
              locale,
              fields: [],
              data: content//mergedData,
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

export { createAILocalizationsService };
