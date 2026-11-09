import type { Core, Plugin } from '@strapi/types';
import { controllers } from './controllers';
import { services } from './services';
import { routes } from './routes';
import { getService } from './utils';
import { historyVersion } from './models/history-version';
import { registerHistoryEntitlements } from './entitlements';
import { HISTORY_VERSION_UID } from './constants';
import { toAdminUserAuthor } from './services/utils';

/**
 * Clear the author id of the versions when the author is deleted,
 * so that a new record with the same id is never shown as their author
 */
const clearDeletedAuthors = (strapi: Core.Strapi) => {
  strapi.db.lifecycles.subscribe({
    models: ['admin::user'],
    async afterDelete(event) {
      const { model, id } = toAdminUserAuthor(event.result);

      try {
        await strapi.db.query(HISTORY_VERSION_UID).updateMany({
          where: { authorModel: model, authorId: id },
          data: { authorId: null },
        });
      } catch (error) {
        // The author is already deleted: throwing would only break the rest of the delete flow
        strapi.log.error('Error while clearing the deleted author of history versions', { error });
      }
    },
  });
};

/**
 * Check once if the feature is enabled before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  if (strapi.ee.features.isEnabled('cms-content-history')) {
    return {
      register({ strapi }) {
        strapi.get('models').add(historyVersion);
        registerHistoryEntitlements(strapi);
      },
      bootstrap({ strapi }) {
        // Start recording history and saving history versions
        getService(strapi, 'lifecycles').bootstrap();
        clearDeletedAuthors(strapi);
      },
      destroy({ strapi }) {
        getService(strapi, 'lifecycles').destroy();
      },
      controllers,
      services,
      routes,
    };
  }

  /**
   * Keep registering the model to avoid losing the data if the feature is disabled,
   * or if the license expires.
   */
  return {
    register({ strapi }) {
      strapi.get('models').add(historyVersion);
      registerHistoryEntitlements(strapi);
    },
    bootstrap({ strapi }) {
      clearDeletedAuthors(strapi);
    },
  };
};

export default getFeature();
