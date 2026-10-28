import type { Struct, Core } from '@strapi/types';
import { CoreService } from './core-service';

/**
 * @internal Exported so apps can extend it. Not a stable API yet: it may change in a minor release.
 */
export class SingleTypeService
  extends CoreService<Struct.SingleTypeSchema>
  implements Core.CoreAPI.Service.SingleType
{
  async getDocumentId() {
    const { uid } = this.contentType;

    return this.strapi.db
      .query(uid)
      .findOne()
      .then((document) => document?.documentId as string);
  }

  async find(params = {}) {
    const { uid } = this.contentType;

    return this.strapi.documents(uid).findFirst(this.getFetchParams(params));
  }

  async createOrUpdate(params = {}) {
    const { uid } = this.contentType;

    const documentId = await this.getDocumentId();

    if (documentId) {
      return this.strapi.documents(uid).update({
        ...this.getFetchParams(params),
        documentId,
      });
    }

    return this.strapi.documents(uid).create(this.getFetchParams(params));
  }

  async delete(params = {}) {
    const { uid } = this.contentType;

    const documentId = await this.getDocumentId();
    if (!documentId) return { deletedEntries: 0 };

    const { entries } = await this.strapi.documents(uid).delete({
      ...this.getFetchParams(params),
      documentId,
    });

    return { deletedEntries: entries.length };
  }
}
