import type { CoreApi, Schema, Documents } from '@strapi/types';

import { getPaginationInfo, shouldCount, transformPaginationResponse } from './pagination';

import { CoreService } from './core-service';

export class CollectionTypeService extends CoreService implements CoreApi.Service.CollectionType {
  private contentType: Schema.CollectionType;

  constructor(contentType: Schema.CollectionType) {
    super();

    this.contentType = contentType;
  }

  async find(params = {}) {
    const { uid } = this.contentType;

    const fetchParams = this.getFetchParams(params);

    const paginationInfo = getPaginationInfo(fetchParams);

    const results = await strapi.documents(uid).findMany({
      ...fetchParams,
      ...paginationInfo,
    });

    if (shouldCount(fetchParams)) {
      const count = await strapi.documents(uid).count({ ...fetchParams, ...paginationInfo });

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
  }

  findOne(documentId: Documents.ID, params = {}) {
    const { uid } = this.contentType;

    return strapi.documents(uid).findOne(documentId, this.getFetchParams(params));
  }

  async create(params = { data: {} }) {
    const { uid } = this.contentType;

    return strapi.documents(uid).create(this.getFetchParams(params));
  }

  update(docId: Documents.ID, params = { data: {} }) {
    const { uid } = this.contentType;

    return strapi.documents(uid).update(docId, this.getFetchParams(params));
  }

  async delete(docId: Documents.ID, params = {}) {
    const { uid } = this.contentType;

    return strapi.documents(uid).delete(docId, this.getFetchParams(params));
  }
}

/**
 *
 * Returns a collection type service to handle default core-api actions
 */

const createCollectionTypeService = (
  contentType: Schema.CollectionType
): CoreApi.Service.CollectionType => {
  return new CollectionTypeService(contentType);
};

export { createCollectionTypeService };
