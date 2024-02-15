import type { Schema, CoreApi } from '@strapi/types';
import { CoreService } from './core-service';

export class SingleTypeService extends CoreService implements CoreApi.Service.SingleType {
  private contentType: Schema.SingleType;

  constructor(contentType: Schema.SingleType) {
    super();

    this.contentType = contentType;
  }

  async find(params = {}) {
    const { uid } = this.contentType;

    return strapi.documents<Schema.SingleType>(uid).find(this.getFetchParams(params));
  }

  async createOrUpdate(params = {}) {
    const { uid } = this.contentType;

    return strapi.documents<Schema.SingleType>(uid).update(this.getFetchParams(params));
  }

  async delete(params = {}) {
    const { uid } = this.contentType;

    return strapi.documents<Schema.SingleType>(uid).delete(this.getFetchParams(params));
  }
}

const createSingleTypeService = (contentType: Schema.SingleType): CoreApi.Service.SingleType => {
  return new SingleTypeService(contentType);
};

export { createSingleTypeService };
