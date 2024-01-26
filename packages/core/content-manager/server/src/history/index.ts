import type { Entity, Plugin } from '@strapi/types';
import { omit } from 'lodash/fp';
import { controllers } from './controllers';
import { services } from './services';
import { contentTypes } from './content-types';
import { getService } from './utils';

/**
 * Check once if the feature is enabled (both license info & feature flag) before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  // TODO: add license check here when it's ready on the license registry
  if (strapi.features.future.isEnabled('history')) {
    return {
      bootstrap({ strapi }) {
        strapi.documents?.middlewares.add('_all', '_all', (context, next) => {
          // Ignore actions that don't mutate documents
          if (!['create', 'update'].includes(context.action)) {
            return next(context);
          }

          // Ignore content types not created by the user
          if (!context.uid.startsWith('api::')) {
            return next(context);
          }

          const fieldsToIgnore = [
            'createdAt',
            'updatedAt',
            'publishedAt',
            'createdBy',
            'updatedBy',
            'localizations',
            'locale',
            'strapi_stage',
            'strapi_assignee',
          ];

          // Don't await the creation of the history version to not slow down the request
          getService('history-version').create({
            contentType: context.uid,
            relatedDocumentId: (context.options as { id: Entity.ID }).id,
            locale: context.params.locale,
            // TODO: check if drafts should should be "modified" once D&P is ready
            status: context.params.status,
            data: omit(fieldsToIgnore, context.params.data),
            schema: omit(fieldsToIgnore, strapi.contentType(context.uid).attributes),
          });

          return next(context);
        });
      },
      controllers,
      services,
      contentTypes,
    };
  }

  /**
   * Keep returning contentTypes to avoid losing the data if the feature is disabled,
   * or if the license expires.
   */
  return { contentTypes };
};

export default getFeature();
