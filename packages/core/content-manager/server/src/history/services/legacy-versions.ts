import type { Data } from '@strapi/types';

import type { HistoryVersionSource } from '../../../../shared/contracts/history-versions';
import { getAdminUserAuthor } from '../origin/authors';
import { type AuthorColumns, type StoredAuthorReference, toAuthorReference } from './utils';

/**
 * Versions saved before the source and the author existed have a `null` source.
 * We do not backfill them as the data migration can be very slow at startup
 * on MySQL. They expire with the retention.
 */

/**
 * Show all versions as originating from the `admin-panel`, even though it is wrong
 * for `admin-tokens` write. We have no way to recover this information.
 */
const LEGACY_SOURCE: HistoryVersionSource = 'admin-panel';

export type StoredVersionOrigin = AuthorColumns & {
  source: HistoryVersionSource | null;
  createdBy: { id: Data.ID } | null;
};

// Only admins wrote versions before, so a version without `createdBy` lost its admin
const DELETED_ADMIN_USER: StoredAuthorReference = {
  type: 'person',
  model: 'admin::user',
  id: null,
};

export const getVersionOrigin = (
  version: StoredVersionOrigin
): { source: HistoryVersionSource; author: StoredAuthorReference | null } => {
  if (version.source === null) {
    return {
      source: LEGACY_SOURCE,
      author: version.createdBy ? getAdminUserAuthor(version.createdBy) : DELETED_ADMIN_USER,
    };
  }

  return { source: version.source, author: toAuthorReference(version) };
};
