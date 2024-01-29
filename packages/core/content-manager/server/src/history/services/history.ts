import type { LoadedStrapi, Entity } from '@strapi/types';
import { omit } from 'lodash/fp';
import { HISTORY_VERSION_UID } from '../constants';

import type { HistoryVersions } from '../../../../shared/contracts';

const createHistoryService = ({ strapi }: { strapi: LoadedStrapi }) => {
  /**
   * Use the query engine API, not the document service,
   * since we'll refactor history version to be just a model instead of a content type.
   * TODO: remove this comment once the refactor is done.
   */
  const query = strapi.db.query(HISTORY_VERSION_UID);

  let isInitialized = false;

  return {
    async init() {
      // Prevent initializing the service twice
      if (isInitialized) {
        return;
      }

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
        this.createVersion({
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

      isInitialized = true;
    },

    async createVersion(historyVersionData: HistoryVersions.CreateHistoryVersion) {
      await query.create({
        data: {
          ...historyVersionData,
          createdAt: new Date(),
          createdBy: strapi.requestContext.get()?.state?.user.id,
        },
      });
    },
  };
};

export { createHistoryService };
