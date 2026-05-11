import type { Struct, Core } from '@strapi/types';

import { withDocumentServiceObservation } from '../../services/observability/opentelemetry-tracing';

import { CoreService } from './core-service';

export class SingleTypeService extends CoreService implements Core.CoreAPI.Service.SingleType {
  private contentType: Struct.SingleTypeSchema;

  constructor(contentType: Struct.SingleTypeSchema) {
    super();

    this.contentType = contentType;
  }

  async getDocumentId() {
    const { uid } = this.contentType;

    return strapi.db
      .query(uid)
      .findOne()
      .then((document) => document?.documentId as string);
  }

  async find(params = {}) {
    const { uid } = this.contentType;

    return withDocumentServiceObservation(strapi as Core.Strapi, 'findFirst', uid, () =>
      strapi.documents(uid).findFirst(this.getFetchParams(params))
    );
  }

  async createOrUpdate(params = {}) {
    const { uid } = this.contentType;

    const documentId = await this.getDocumentId();

    if (documentId) {
      return withDocumentServiceObservation(strapi as Core.Strapi, 'update', uid, () =>
        strapi.documents(uid).update({
          ...this.getFetchParams(params),
          documentId,
        })
      );
    }

    return withDocumentServiceObservation(strapi as Core.Strapi, 'create', uid, () =>
      strapi.documents(uid).create(this.getFetchParams(params))
    );
  }

  async delete(params = {}) {
    const { uid } = this.contentType;

    const documentId = await this.getDocumentId();
    if (!documentId) return { deletedEntries: 0 };

    const { entries } = await withDocumentServiceObservation(
      strapi as Core.Strapi,
      'delete',
      uid,
      () =>
        strapi.documents(uid).delete({
          ...this.getFetchParams(params),
          documentId,
        })
    );

    return { deletedEntries: entries.length };
  }
}

const createSingleTypeService = (
  contentType: Struct.SingleTypeSchema
): Core.CoreAPI.Service.SingleType => {
  return new SingleTypeService(contentType);
};

export { createSingleTypeService };
