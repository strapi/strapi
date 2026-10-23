import type { Core, Struct, Modules } from '@strapi/types';

import {
  getPaginationInfo,
  shouldCount,
  isPagedPagination,
  transformPaginationResponse,
} from './pagination';

import { CoreService } from './core-service';

/**
 * @internal Exported so apps can extend it. Not a stable API yet: it may change in a minor release.
 */
export class CollectionTypeService
  extends CoreService<Struct.CollectionTypeSchema>
  implements Core.CoreAPI.Service.CollectionType
{
  async find(params = {}) {
    const { uid } = this.contentType;

    const fetchParams = this.getFetchParams(params);

    const paginationInfo = getPaginationInfo(this.strapi, fetchParams);
    const isPaged = isPagedPagination(fetchParams.pagination);

    const results = await this.strapi.documents(uid).findMany({
      ...fetchParams,
      ...paginationInfo,
    });

    if (shouldCount(this.strapi, fetchParams)) {
      const count = await this.strapi.documents(uid).count({ ...fetchParams, ...paginationInfo });

      if (typeof count !== 'number') {
        throw new Error('Count should be a number');
      }

      return {
        results,
        pagination: transformPaginationResponse(paginationInfo, count, isPaged),
      };
    }

    return {
      results,
      pagination: transformPaginationResponse(paginationInfo, undefined, isPaged),
    };
  }

  findOne(documentId: Modules.Documents.ID, params = {}) {
    const { uid } = this.contentType;

    return this.strapi.documents(uid).findOne({
      ...this.getFetchParams(params),
      documentId,
    });
  }

  async create(params = { data: {} }) {
    const { uid } = this.contentType;

    return this.strapi.documents(uid).create(this.getFetchParams(params));
  }

  update(documentId: Modules.Documents.ID, params = { data: {} }) {
    const { uid } = this.contentType;

    return this.strapi.documents(uid).update({
      ...this.getFetchParams(params),
      documentId,
    });
  }

  async delete(documentId: Modules.Documents.ID, params = {}) {
    const { uid } = this.contentType;

    const { entries } = await this.strapi.documents(uid).delete({
      ...this.getFetchParams(params),
      documentId,
    });

    return { deletedEntries: entries.length };
  }
}
