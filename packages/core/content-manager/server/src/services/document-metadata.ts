import { groupBy, pick } from 'lodash/fp';

import { contentTypes } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

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

/**
 * Operator types for version comparison.
 */
type Operator = 'lt' | 'gt';

/**
 * Compares the update time of a document version against other document statuses based on the operator.
 */
const versionComparison = (
  version: DocumentVersion,
  otherDocumentStatuses: DocumentMetadata['availableStatus'],
  operator: Operator
): boolean => {
  if (!version || !version.updatedAt) {
    return false;
  }

  const versionUpdatedAt = version?.updatedAt ? new Date(version.updatedAt).getTime() : 0;

  return otherDocumentStatuses.every((otherStatus) => {
    const otherUpdatedAt = otherStatus?.updatedAt ? new Date(otherStatus.updatedAt).getTime() : 0;

    switch (operator) {
      case 'lt':
        return versionUpdatedAt < otherUpdatedAt;
      case 'gt':
        return versionUpdatedAt > otherUpdatedAt;
      default:
        return false;
    }
  });
};

/**
 * Checks if the provided document version has been modified after all other versions.
 */
const getIsVersionLatestModification = (
  version: DocumentVersion,
  otherDocumentStatuses: DocumentMetadata['availableStatus']
): boolean => versionComparison(version, otherDocumentStatuses, 'gt');

/**
 * Checks if there are any versions that have been modified after the provided document version.
 */
const getAnyLaterModifications = (
  version: DocumentVersion,
  otherDocumentStatuses: DocumentMetadata['availableStatus']
): boolean => versionComparison(version, otherDocumentStatuses, 'lt');

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Returns available locales of a document for the current status
   */
  getAvailableLocales(
    uid: UID.ContentType,
    version: DocumentVersion,
    allVersions: DocumentVersion[]
  ) {
    // Group all versions by locale
    const versionsByLocale = groupBy('locale', allVersions);

    // Delete the current locale
    delete versionsByLocale[version.locale];

    // For each locale, get the ones with the same status
    return (
      Object.values(versionsByLocale)
        .map((localeVersions: DocumentVersion[]) => {
          // There will not be a draft and a version counterpart if the content type does not have draft and publish
          if (!contentTypes.hasDraftAndPublish(strapi.getModel(uid))) {
            return pick(AVAILABLE_LOCALES_FIELDS, localeVersions[0]);
          }

          const draftVersion = localeVersions.find((v) => v.publishedAt === null);
          const otherVersions = localeVersions.filter((v) => v.id !== draftVersion?.id);

          if (!draftVersion) return;

          return {
            ...pick(AVAILABLE_LOCALES_FIELDS, draftVersion),
            status: this.getStatus(draftVersion, otherVersions as any),
          };
        })
        // Filter just in case there is a document with no drafts
        .filter(Boolean)
    );
  },

  /**
   * Returns available status of a document for the current locale
   */
  getAvailableStatus(version: DocumentVersion, allVersions: DocumentVersion[]) {
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
  async getManyAvailableStatus(uid: UID.ContentType, documents: DocumentVersion[]) {
    if (!documents.length) return [];

    // The status and locale of all documents should be the same
    const status = documents[0].publishedAt !== null ? 'published' : 'draft';
    const locale = documents[0]?.locale;
    const otherStatus = status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findMany({
      filters: {
        documentId: { $in: documents.map((d) => d.documentId).filter(Boolean) },
      },
      status: otherStatus,
      locale,
      fields: ['documentId', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableStatus'];
  },

  getStatus(version: DocumentVersion, otherDocumentStatuses?: DocumentMetadata['availableStatus']) {
    const isDraft = version.publishedAt === null;

    if (!otherDocumentStatuses?.length) {
      // If there are no other versions, the current version is the latest
      return isDraft ? CONTENT_MANAGER_STATUS.DRAFT : CONTENT_MANAGER_STATUS.PUBLISHED;
    }

    if (isDraft) {
      const hasPublished = otherDocumentStatuses.some((d) => d.publishedAt !== null);
      if (!hasPublished) {
        // If there are no published versions, the draft is considered the latest
        return CONTENT_MANAGER_STATUS.DRAFT;
      }
    }

    /*
     * If the current version is a draft, the document is modified if this version is
     * the latest modification.
     *
     * If the current version is published, the document is modified if any
     * other version has been updated more recently.
     */
    const isModified = isDraft
      ? getIsVersionLatestModification(version, otherDocumentStatuses)
      : getAnyLaterModifications(version, otherDocumentStatuses);

    return isModified ? CONTENT_MANAGER_STATUS.MODIFIED : CONTENT_MANAGER_STATUS.PUBLISHED;
  },

  async getMetadata(
    uid: UID.ContentType,
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

    const availableLocalesResult = availableLocales
      ? this.getAvailableLocales(uid, version, versions)
      : [];

    const availableStatusResult = availableStatus
      ? this.getAvailableStatus(version, versions)
      : null;

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
    uid: UID.ContentType,
    document: DocumentVersion,
    opts: GetMetadataOptions = {}
  ) {
    if (!document) return document;

    const hasDraftAndPublish = contentTypes.hasDraftAndPublish(strapi.getModel(uid));

    // Ignore available status if the content type does not have draft and publish
    if (!hasDraftAndPublish) {
      opts.availableStatus = false;
    }

    const meta = await this.getMetadata(uid, document, opts);

    // TODO: Sanitize output of metadata
    return {
      data: {
        ...document,
        // Add status to the document only if draft and publish is enabled
        status: hasDraftAndPublish
          ? this.getStatus(document, meta.availableStatus as any)
          : undefined,
      },
      meta,
    };
  },
});
