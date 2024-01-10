import { propOr } from 'lodash/fp';
import { contentTypes } from '@strapi/utils';
import type { CoreApi, Schema } from '@strapi/types';

import {
  getPaginationInfo,
  convertPagedToStartLimit,
  shouldCount,
  transformPaginationResponse,
} from './pagination';
import { getFetchParams } from './get-fetch-params';

const {
  constants: { PUBLISHED_AT_ATTRIBUTE },
} = contentTypes;

const setPublishedAt = (data: Record<string, unknown>) => {
  data[PUBLISHED_AT_ATTRIBUTE] = propOr(new Date(), PUBLISHED_AT_ATTRIBUTE, data);
};

/**
 *
 * Returns a collection type service to handle default core-api actions
 */
const createCollectionTypeService = ({
  contentType,
}: {
  contentType: Schema.CollectionType;
}): CoreApi.Service.CollectionType => {
  const { uid } = contentType;

  return <any>{
    getFetchParams,

    async find(params = {}) {
      const fetchParams = this.getFetchParams(params);

      const paginationInfo = getPaginationInfo(fetchParams);

      const results = await strapi.documents.findMany(uid, {
        ...fetchParams,
        ...convertPagedToStartLimit(paginationInfo),
      });

      if (shouldCount(fetchParams)) {
        const count = await strapi.documents.count(uid, { ...fetchParams, ...paginationInfo });

        if (typeof count !== 'number') {
          throw new Error('Count should be a number');
        }

        return {
          results,
          pagination: transformPaginationResponse(paginationInfo, count),
        };
      }

      return {
        results,
        pagination: paginationInfo,
      };
    },

    findOne(documentId: string, params = {}) {
      return strapi.documents.findOne(uid, documentId, this.getFetchParams(params));
    },

    create(params = { data: {} }) {
      const { data } = params;

      setPublishedAt(data);

      return strapi.documents.create(uid, { ...params, data });
    },

    update(documentId: string, params = { data: {} }) {
      const { data } = params;

      return strapi.documents.update(uid, documentId, { ...params, data });
    },

    delete(documentId: string, params = {}) {
      return strapi.documents.delete(uid, documentId, params);
    },
  };
};

export default createCollectionTypeService;
