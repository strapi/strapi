import type { LoadedStrapi as Strapi, Common } from '@strapi/types';
import type { DocumentMetadata } from '../../../shared/contracts/collection-types';

export interface DocumentVersionSelector {
  id: string;
  locale: string;
  updatedAt: string | null | Date;
  publishedAt: string | null | Date;
}

const CONTENT_MANAGER_STATUS = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
  MODIFIED: 'modified',
};

/**
 * TODO: Remove this and make updatedAt dates be equal when publishing on the document-engine
 * Compares two dates and returns true if the absolute difference between them is less than or equal to the specified threshold.
 * @param date1 The first date to compare.
 * @param date2 The second date to compare.
 * @param threshold The threshold in milliseconds.
 * @returns True if the absolute difference between the dates is less than or equal to the threshold, false otherwise.
 */
function areDatesEqual(
  date1: Date | string | null,
  date2: Date | string | null,
  threshold: number
): boolean {
  if (!date1 || !date2) {
    return false;
  }

  const time1 = new Date(date1).getTime();
  const time2 = new Date(date2).getTime();
  const difference = Math.abs(time1 - time2);

  return difference <= threshold;
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

    const status = document.publishedAt !== null ? 'published' : 'draft';

    // TODO: Use document service instead of query engine
    // Find other locales of the document in the same status
    return strapi.db.query(uid).findMany({
      where: {
        documentId: document.id,
        // Omit current one
        locale: { $ne: document.locale },
        // Find locales of the same status
        publishedAt: status === 'published' ? { $ne: null } : null,
      },
      select: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableLocales'];
  },

  async getAvailableStatus(uid: Common.UID.ContentType, document: DocumentVersionSelector) {
    // Find if the other status of the document is available
    const status = document.publishedAt !== null ? 'published' : 'draft';
    const otherStatus = status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findOne(document.id, {
      // TODO: Do not filter by locale if i18n is disabled
      locale: document.locale,
      status: otherStatus,
      fields: ['id', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableStatus'][0] | null;
  },

  /**
   * Get the available status of many documents, useful for batch operations
   * @param uid
   * @param documents
   * @returns
   */
  async getManyAvailableStatus(uid: Common.UID.ContentType, documents: DocumentVersionSelector[]) {
    if (!documents.length) return [];

    // The status of all documents should be the same
    const status = documents[0].publishedAt !== null ? 'published' : 'draft';
    const otherStatus = status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findMany({
      filters: {
        id: { $in: documents.map((d) => d.id) },
      },
      status: otherStatus,
      fields: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableStatus'];
  },

  getStatus(
    document: DocumentVersionSelector,
    otherDocumentStatuses?: DocumentMetadata['availableStatus']
  ) {
    const isPublished = document.publishedAt !== null;

    // Status should be published when returning the published data
    if (isPublished) {
      return CONTENT_MANAGER_STATUS.PUBLISHED;
    }

    // Document is a draft version
    const publishedVersion = otherDocumentStatuses?.find((d) => d.publishedAt !== null);

    // There is only a draft version
    if (!publishedVersion) {
      return CONTENT_MANAGER_STATUS.DRAFT;
    }

    // The draft version is the same as the published version
    if (areDatesEqual(document.updatedAt, publishedVersion.updatedAt, 500)) {
      return CONTENT_MANAGER_STATUS.PUBLISHED;
    }

    // The draft version is newer than the published version
    return CONTENT_MANAGER_STATUS.MODIFIED;
  },

  async getMetadata(
    uid: Common.UID.ContentType,
    document: DocumentVersionSelector,
    { availableLocales = true, availableStatus = true }: GetMetadataOptions = {}
  ) {
    const [availableLocalesResult, availableStatusResult] = await Promise.all([
      availableLocales ? this.getAvailableLocales(uid, document) : [],
      availableStatus ? this.getAvailableStatus(uid, document) : null,
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

    const meta = await this.getMetadata(uid, document, opts);

    // TODO: Sanitize output of metadata
    return {
      data: {
        ...document,
        // Add status to the document
        status: this.getStatus(document, meta.availableStatus),
      },
      meta,
    };
  },
});
