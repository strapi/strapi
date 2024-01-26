import type { LoadedStrapi as Strapi, Common } from '@strapi/types';
import type { DocumentMetadata } from '../../../shared/contracts/collection-types-v5';

export interface DocumentVersionSelector {
  id: string;
  locale: string;
  publishedAt: string | null | Date;
  status?: string;
}

/**
 * Controls the metadata properties to be returned
 *
 * If `availableLocales` is set to `true` (default), the returned metadata will include
 * the available locales of the document for its current status.
 *
 * If `availableStatus` is set to `true` (default), the returned metadata will include
 * the available status of the document for its current locale.
 */
export interface GetMetadataOptions {
  availableLocales?: boolean;
  availableStatus?: boolean;
}

export default ({ strapi }: { strapi: Strapi }) => ({
  /**
   * Returns available locales of a document for the current status
   */
  async getAvailableLocales(uid: Common.UID.ContentType, document: DocumentVersionSelector) {
    if (!document.locale) return [];

    // TODO: Use document service instead of query engine
    // Find other locales of the document in the same status
    return strapi.db.query(uid).findMany({
      where: {
        documentId: document.id,
        // Omit current one
        locale: { $ne: document.locale },
        // Find locales of the same status
        publishedAt: document.status === 'published' ? { $ne: null } : null,
      },
      select: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableLocales'];
  },

  async getAvailableStatus(uid: Common.UID.ContentType, document: DocumentVersionSelector) {
    if (!document.locale) return null;

    // Find if the other status of the document is available
    const otherStatus = document.status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findOne(document.id, {
      locale: document.locale,
      status: otherStatus,
      fields: ['id', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableStatus'][0] | null;
  },

  // TODO: Modified status
  async getStatus(uid: Common.UID.ContentType, document: DocumentVersionSelector) {
    if (document.publishedAt) return 'published';
    return 'draft';
  },

  async getMetadata(
    uid: Common.UID.ContentType,
    document: DocumentVersionSelector,
    { availableLocales = true, availableStatus = true }: GetMetadataOptions = {}
  ) {
    const documentWithMetadata = {
      ...document,
      status: await this.getStatus(uid, document),
    } as any;

    const [availableLocalesResult, availableStatusResult] = await Promise.all([
      availableLocales ? this.getAvailableLocales(uid, documentWithMetadata) : [],
      availableStatus ? this.getAvailableStatus(uid, documentWithMetadata) : null,
    ]);

    return {
      availableLocales: availableLocalesResult,
      availableStatus: availableStatusResult ? [availableStatusResult] : [],
    };
  },

  /**
   * Returns associated metadata of a document:
   * - Available locales of the document for the current status
   * - Available status of the document for the current locale
   */
  async formatDocumentWithMetadata(
    uid: Common.UID.ContentType,
    document: DocumentVersionSelector,
    opts: GetMetadataOptions = {}
  ) {
    if (!document) return document;

    // TODO: Sanitize output of metadata
    // @ts-expect-error -  TODO: Return { data, meta } format when UI is ready
    document.__meta__ = await this.getMetadata(uid, document, opts);

    return document;
  },
});
