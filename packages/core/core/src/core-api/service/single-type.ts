import type { Schema, CoreApi } from '@strapi/types';
import { CoreService } from './core-service';

export class SingleTypeService extends CoreService implements CoreApi.Service.SingleType {
  private contentType: Schema.SingleType;

  constructor(contentType: Schema.SingleType) {
    super();

    this.contentType = contentType;
  }

  async getDocumentId(opts = {}) {
    const { uid } = this.contentType;

    return strapi
      .documents(uid)
      .findFirst(opts)
      .then((document) => document?.documentId as string);
  }

  async find(params = {}) {
    const { uid } = this.contentType;

    return strapi.documents(uid).findFirst(this.getFetchParams(params));
  }

  async createOrUpdate(params = {}) {
    const { uid } = this.contentType;

    const fetchParams = this.getFetchParams(params);
    const documentId = await this.getDocumentId({ status: fetchParams.status });

    if (documentId) {
      return strapi.documents(uid).update(documentId, this.getFetchParams(params));
    }

    return strapi.documents(uid).create(this.getFetchParams(params));
  }

  async delete(params = {}) {
    const { uid } = this.contentType;

    const documentId = await this.getDocumentId();
    if (!documentId) return { deletedEntries: 0 };

    return strapi.documents(uid).delete(documentId, this.getFetchParams(params));
  }
}

const createSingleTypeService = (contentType: Schema.SingleType): CoreApi.Service.SingleType => {
  return new SingleTypeService(contentType);
};

export { createSingleTypeService };
