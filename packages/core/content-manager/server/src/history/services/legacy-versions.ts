import type { HistoryVersionSource } from '../../../../shared/contracts/history-versions';
import { type AuthorColumns, type StoredAuthorReference, toAuthorReference } from './utils';

/**
 * Versions saved before the source and the author existed have a `null` source.
 * We do not backfill them as the data migration can be very slow at startup
 * on MySQL. They expire with the retention, which has no maximum when the license sets
 * no limit, so they can stay for a long time.
 */

/**
 * Show all versions as originating from the `admin-panel`, even though it is wrong
 * for `admin-tokens` write. We have no way to recover this information.
 */
const LEGACY_SOURCE: HistoryVersionSource = 'admin-panel';

export type StoredVersionOrigin = AuthorColumns & {
  source: HistoryVersionSource | null;
  createdBy: { documentId: string } | null;
};

// Every version without a source was written by an admin,
// so a missing `createdBy` means the admin was deleted
const toLegacyAuthor = (createdBy: StoredVersionOrigin['createdBy']): StoredAuthorReference => ({
  type: 'person',
  model: 'admin::user',
  id: createdBy?.documentId ?? null,
});

export const getVersionOrigin = (
  version: StoredVersionOrigin
): { source: HistoryVersionSource; author: StoredAuthorReference | null } => {
  if (version.source === null) {
    return {
      source: LEGACY_SOURCE,
      author: toLegacyAuthor(version.createdBy),
    };
  }

  return { source: version.source, author: toAuthorReference(version) };
};
