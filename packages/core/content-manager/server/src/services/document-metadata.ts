import { groupBy, pick } from 'lodash/fp';

import { async, contentTypes, traverseEntity } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import type { DocumentMetadata } from '../../../shared/contracts/collection-types';
import { getDeepPopulate } from './utils/populate';

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
const AVAILABLE_LOCALES_FIELDS = [
  'id',
  'locale',
  'updatedAt',
  'createdAt',
  'status',
  'publishedAt',
  'documentId',
];

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
const areDatesEqual = (
  date1: Date | string | null,
  date2: Date | string | null,
  threshold: number
): boolean => {
  if (!date1 || !date2) {
    return false;
  }

  const time1 = new Date(date1).getTime();
  const time2 = new Date(date2).getTime();
  const difference = Math.abs(time1 - time2);

  return difference <= threshold;
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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Returns available locales of a document for the current status
   */
  async getAvailableLocales(
    uid: UID.ContentType,
    version: DocumentVersion,
    allVersions: DocumentVersion[]
  ) {
    // Group all versions by locale
    const versionsByLocale = groupBy('locale', allVersions);

    // Delete the current locale
    delete versionsByLocale[version.locale];

    // For each locale, get the ones with the same status
    // There will not be a draft and a version counterpart if the content
    // type does not have draft and publish
    const mappingResult = await async.map(
      Object.values(versionsByLocale),
      async (localeVersions: DocumentVersion[]) => {
        const model = strapi.getModel(uid);

        const mappedLocaleVersions: DocumentVersion[] = await async.map(
          localeVersions,
          async (localeVersion: DocumentVersion) =>
            traverseEntity(
              ({ key, attribute }, { remove }) => {
                if (AVAILABLE_LOCALES_FIELDS.includes(key)) {
                  // Keep the value if it is a field to pick
                  return;
                }

                const requiresValidation =
                  attribute.required ||
                  attribute.unique ||
                  Object.prototype.hasOwnProperty.call(attribute, 'max') ||
                  Object.prototype.hasOwnProperty.call(attribute, 'min') ||
                  Object.prototype.hasOwnProperty.call(attribute, 'maxLength') ||
                  Object.prototype.hasOwnProperty.call(attribute, 'minLength');

                if (requiresValidation) {
                  // Keep the value if it requires any kind of validation
                  return;
                }

                // Otherwise remove this key from the data
                remove(key);
              },
              { schema: model, getModel: strapi.getModel.bind(strapi) },
              // @ts-expect-error fix types
              localeVersion
            )
        );

        if (!contentTypes.hasDraftAndPublish(model)) {
          return mappedLocaleVersions[0];
        }

        const draftVersion = mappedLocaleVersions.find((v) => v.publishedAt === null);
        const otherVersions = mappedLocaleVersions.filter((v) => v.id !== draftVersion?.id);

        if (!draftVersion) return;

        return {
          ...draftVersion,
          status: this.getStatus(draftVersion, otherVersions as any),
        };
      }
    );

    return (
      mappingResult
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
      // It there are no other versions we take the current version status
      return isDraft ? CONTENT_MANAGER_STATUS.DRAFT : CONTENT_MANAGER_STATUS.PUBLISHED;
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
    uid: UID.ContentType,
    version: DocumentVersion,
    { availableLocales = true, availableStatus = true }: GetMetadataOptions = {}
  ) {
    // TODO: Ignore publishedAt if availableStatus=false, and ignore locale if i18n is disabled
    // TODO: Sanitize createdBy

    const versions = await strapi.db.query(uid).findMany({
      where: { documentId: version.documentId },
      populate: {
        ...getDeepPopulate(uid),
        createdBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
        updatedBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
      },
    });

    const availableLocalesResult = availableLocales
      ? await this.getAvailableLocales(uid, version, versions)
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
