import type { Core } from '@strapi/types';

import { getService } from '../utils';

/**
 * Backups outlive sessions and devices on purpose, so the only things that remove them are the
 * author (by saving, restoring, or discarding) and the disappearance of what they point at.
 */
const createLifecyclesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: { isInitialized: boolean } = { isInitialized: false };

  return {
    async bootstrap() {
      if (state.isInitialized) {
        return;
      }

      strapi.documents.use(async (context, next) => {
        const result = await next();

        if (context.action === 'delete') {
          await getService(strapi, 'autosave')
            .deleteForDocument({
              contentType: context.contentType.uid,
              documentId: context.params.documentId,
              locale: context.params.locale,
            })
            .catch((error: unknown) => {
              strapi.log.error(
                `Could not clean up autosaves for the deleted document: ${
                  error instanceof Error ? error.message : error
                }`
              );
            });
        }

        return result;
      });

      strapi.db.lifecycles.subscribe({
        models: ['admin::user'],
        async beforeDelete(event) {
          await getService(strapi, 'autosave').deleteForUser(event.params.where.id);
        },
      });

      state.isInitialized = true;
    },

    async destroy() {
      state.isInitialized = false;
    },
  };
};

export { createLifecyclesService };
