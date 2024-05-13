import { UID } from '@strapi/types';
import { async } from '@strapi/utils';

import { getService } from '../../utils';

import { DocumentVersion, GetMetadataOptions } from '../../services/document-metadata';

import type {
  AvailableLocaleDocument,
  AvailableStatusDocument,
} from '../../../../shared/contracts/collection-types';

/**
 * Format a document with metadata. Making sure the metadata response is
 * correctly sanitized for the current user
 */
export const formatDocumentWithMetadata = async (
  permissionChecker: any,
  uid: UID.ContentType,
  document: DocumentVersion,
  opts: GetMetadataOptions = {}
) => {
  const documentMetadata = getService('document-metadata');

  const serviceOutput = await documentMetadata.formatDocumentWithMetadata(uid, document, opts);

  let {
    meta: { availableLocales, availableStatus },
  } = serviceOutput;

  const metadataSanitizer = permissionChecker.sanitizeOutput;

  availableLocales = await async.map(
    availableLocales,
    async (localeDocument: AvailableLocaleDocument) => metadataSanitizer(localeDocument)
  );

  availableStatus = await async.map(
    availableStatus,
    async (statusDocument: AvailableStatusDocument) => metadataSanitizer(statusDocument)
  );

  return {
    ...serviceOutput,
    meta: {
      availableLocales,
      availableStatus,
    },
  };
};
