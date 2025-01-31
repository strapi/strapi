import { groupBy, pick, uniq } from 'lodash/fp';

import { async, contentTypes } from '@strapi/utils';
import type { Core, UID, Modules } from '@strapi/types';

import type { DocumentMetadata } from '../../../shared/contracts/collection-types';
import { getPopulateForValidation } from './utils/populate';

export interface DocumentVersion {
  id: string | number;
  documentId: Modules.Documents.ID;
  locale?: string;
  localizations?: DocumentVersion[];
  updatedAt?: string | null | Date;
  publishedAt?: string | null | Date;
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
  'publishedAt',
  'documentId',
];

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
 * Checks if the provided document version has been modified after all other versions.
 */
const getIsVersionLatestModification = (
  version?: DocumentVersion,
  otherVersion?: DocumentVersion
): boolean => {
  if (!version || !version.updatedAt) {
    return false;
  }

  const versionUpdatedAt = version?.updatedAt ? new Date(version.updatedAt).getTime() : 0;

  const otherUpdatedAt = otherVersion?.updatedAt ? new Date(otherVersion.updatedAt).getTime() : 0;

  return versionUpdatedAt > otherUpdatedAt;
};

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
    if (version.locale) {
      delete versionsByLocale[version.locale];
    }

    // For each locale, get the ones with the same status
    // There will not be a draft and a version counterpart if the content
    // type does not have draft and publish
    const model = strapi.getModel(uid);

    const mappingResult = await async.map(
      Object.values(versionsByLocale),
      async (localeVersions: DocumentVersion[]) => {
        if (!contentTypes.hasDraftAndPublish(model)) {
          return localeVersions[0];
        }

        const draftVersion = localeVersions.find((v) => v.publishedAt === null);
        const otherVersions = localeVersions.filter((v) => v.id !== draftVersion?.id);

        if (!draftVersion) {
          return;
        }

        return {
          ...draftVersion,
          status: this.getStatus(draftVersion, otherVersions as any),
        };
      }
    );

    return (
      mappingResult
        // Filter just in case there is a document with no drafts
        .filter(Boolean) as unknown as DocumentMetadata['availableLocales']
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
    const locales = documents.map((d) => d.locale).filter(Boolean);

    const where: Record<string, any> = {
      documentId: { $in: documents.map((d) => d.documentId).filter(Boolean) },
      publishedAt: { $null: status === 'published' },
    };

    // If there is any locale to filter (if i18n is enabled)
    if (locales.length) {
      where.locale = { $in: locales };
    }

    return strapi.query(uid).findMany({
      where,
      select: ['id', 'documentId', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    });
  },

  getStatus(version: DocumentVersion, otherDocumentStatuses?: DocumentMetadata['availableStatus']) {
    let draftVersion: DocumentVersion | undefined;
    let publishedVersion: DocumentVersion | undefined;

    if (version.publishedAt) {
      publishedVersion = version;
    } else {
      draftVersion = version;
    }

    const otherVersion = otherDocumentStatuses?.at(0);
    if (otherVersion?.publishedAt) {
      publishedVersion = otherVersion;
    } else if (otherVersion) {
      draftVersion = otherVersion;
    }

    if (!draftVersion) return CONTENT_MANAGER_STATUS.PUBLISHED;
    if (!publishedVersion) return CONTENT_MANAGER_STATUS.DRAFT;

    /*
     * The document is modified if the draft version has been updated more
     * recently than the published version.
     */
    const isDraftModified = getIsVersionLatestModification(draftVersion, publishedVersion);
    return isDraftModified ? CONTENT_MANAGER_STATUS.MODIFIED : CONTENT_MANAGER_STATUS.PUBLISHED;
  },

  // TODO is it necessary to return metadata on every page of the CM
  // We could refactor this so the locales are only loaded when they're
  // needed. e.g. in the bulk locale action modal.
  async getMetadata(
    uid: UID.ContentType,
    version: DocumentVersion,
    { availableLocales = true, availableStatus = true }: GetMetadataOptions = {}
  ) {
    // TODO: Ignore publishedAt if availableStatus=false, and ignore locale if
    // i18n is disabled
    const { populate = {}, fields = [] } = getPopulateForValidation(uid);

    const params = {
      populate: {
        ...populate,
        // NOTE: creator fields are selected in this way to avoid exposing sensitive data
        createdBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
        updatedBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
      },
      fields: uniq([...AVAILABLE_LOCALES_FIELDS, ...fields]),
      filters: {
        documentId: version.documentId,
      },
    };

    const dbParams = strapi.get('query-params').transform(uid, params);
    const versions = await strapi.db.query(uid).findMany(dbParams);

    // TODO: Remove use of available locales and use localizations instead
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
    if (!document) {
      return {
        data: document,
        meta: {
          availableLocales: [],
          availableStatus: [],
        },
      };
    }

    const hasDraftAndPublish = contentTypes.hasDraftAndPublish(strapi.getModel(uid));

    // Ignore available status if the content type does not have draft and publish
    if (!hasDraftAndPublish) {
      opts.availableStatus = false;
    }

    const meta = await this.getMetadata(uid, document, opts);

    // Populate localization statuses
    if (document.localizations) {
      const otherStatus = await this.getManyAvailableStatus(uid, document.localizations);

      document.localizations = document.localizations.map((d) => {
        const status = otherStatus.find((s) => s.documentId === d.documentId);
        return {
          ...d,
          status: this.getStatus(d, status ? [status] : []),
        };
      });
    }

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
