import type { LoadedStrapi as Strapi, Common, Schema } from '@strapi/types';
import { groupBy, pick } from 'lodash/fp';
import type { DocumentMetadata } from '../../../shared/contracts/collection-types';

export interface DocumentVersion {
  id: string;
  documentId: string;
  locale: string;
  updatedAt: string | null | Date;
  publishedAt: string | null | Date;
}

const AVAILABLE_STATUS_FIELDS = [
  'id',
  'locale',
  'updatedAt',
  'createdAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'status',
];
const AVAILABLE_LOCALES_FIELDS = ['id', 'locale', 'updatedAt', 'createdAt', 'status'];

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
  async getAvailableLocales(version: DocumentVersion, allVersions: DocumentVersion[]) {
    // Group all versions by locale
    const versionsByLocale = groupBy('locale', allVersions);

    // Delete the current locale
    delete versionsByLocale[version.locale];

    // For each locale, get the ones with the same status
    return Object.values(versionsByLocale).map((localeVersions: DocumentVersion[]) => {
      const draftVersion = localeVersions.find((v) => v.publishedAt === null);
      const otherVersions = localeVersions.filter((v) => v.documentId !== draftVersion?.documentId);

      if (!draftVersion) return;

      return {
        ...pick(AVAILABLE_LOCALES_FIELDS, draftVersion),
        status: this.getStatus(draftVersion, otherVersions as any),
      };
    });
  },

  /**
   * Returns available status of a document for the current locale
   */
  async getAvailableStatus(version: DocumentVersion, allVersions: DocumentVersion[]) {
    // Find the other status of the document
    const status =
      version.publishedAt !== null
        ? CONTENT_MANAGER_STATUS.DRAFT
        : CONTENT_MANAGER_STATUS.PUBLISHED;

    // Get version that match the current locale and not match the current status
    const availableStatus = allVersions.find((v) => {
      const matchLocale = v.locale === version.locale;
      const matchStatus = status === 'published' ? v.publishedAt !== null : v.publishedAt === null;
      return matchLocale && matchStatus;
    });

    if (!availableStatus) return availableStatus;

    // Pick status fields (at fields, status, by fields), use lodash fp
    return pick(AVAILABLE_STATUS_FIELDS, availableStatus);
  },
  /**
   * Get the available status of many documents, useful for batch operations
   * @param uid
   * @param documents
   * @returns
   */
  async getManyAvailableStatus(uid: Common.UID.SingleType, documents: DocumentVersion[]) {
    if (!documents.length) return [];

    // The status of all documents should be the same
    const status = documents[0].publishedAt !== null ? 'published' : 'draft';
    const otherStatus = status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findMany({
      filters: {
        id: { $in: documents.map((d) => d.documentId) },
      },
      status: otherStatus,
      fields: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableStatus'];
  },

  getStatus(version: DocumentVersion, otherDocumentStatuses?: DocumentMetadata['availableStatus']) {
    const isDraft = version.publishedAt === null;

    // It can only be a draft if there are no other versions
    if (!otherDocumentStatuses?.length) {
      return CONTENT_MANAGER_STATUS.DRAFT;
    }

    // Check if there is only a draft version
    if (isDraft) {
      const publishedVersion = otherDocumentStatuses?.find((d) => d.publishedAt !== null);
      if (!publishedVersion) {
        return CONTENT_MANAGER_STATUS.DRAFT;
      }
    }

    // The draft version is the same as the published version
    if (areDatesEqual(version.updatedAt, otherDocumentStatuses.at(0)?.updatedAt, 500)) {
      return CONTENT_MANAGER_STATUS.PUBLISHED;
    }

    // The draft version is newer than the published version
    return CONTENT_MANAGER_STATUS.MODIFIED;
  },

  async getMetadata(
    uid: Common.UID.ContentType,
    version: DocumentVersion,
    { availableLocales = true, availableStatus = true }: GetMetadataOptions = {}
  ) {
    // TODO: Ignore publishedAt if availableStatus=false, and ignore locale if i18n is disabled
    // TODO: Sanitize createdBy
    const versions = await strapi.db.query(uid).findMany({
      where: { documentId: version.documentId },
      select: ['createdAt', 'updatedAt', 'locale', 'publishedAt', 'documentId'],
      populate: {
        createdBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
        updatedBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
      },
    });

    const [availableLocalesResult, availableStatusResult] = await Promise.all([
      availableLocales ? this.getAvailableLocales(version, versions) : [],
      availableStatus ? this.getAvailableStatus(version, versions) : null,
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
    document: DocumentVersion,
    opts: GetMetadataOptions = {}
  ) {
    if (!document) return document;

    const meta = await this.getMetadata(uid, document, opts);

    // TODO: Sanitize output of metadata
    return {
      data: {
        ...document,
        // Add status to the document
        status: this.getStatus(document, meta.availableStatus as any),
      },
      meta,
    };
  },
});
