import type { LoadedStrapi } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../constants';
import { HistoryVersions } from '../../../../shared/contracts';

const createHistoryVersionService = ({ strapi }: { strapi: LoadedStrapi }) => {
  /**
   * Use the query engine API, not the document service,
   * since we'll refactor history version to be just a model instead of a content type.
   * TODO: remove this comment once the refactor is done.
   */
  const query = strapi.db.query(HISTORY_VERSION_UID);

  return {
    plop() {
      console.log('plop!');
    },

    async create(historyVersionData: HistoryVersions.CreateHistoryVersion) {
      console.log('creating history version!', historyVersionData);
      console.log('request state', strapi.requestContext.get()?.state);

      await query.create({
        data: {
          ...historyVersionData,
          createdAt: new Date(),
        },
      });
    },
  };
};

export { createHistoryVersionService };
