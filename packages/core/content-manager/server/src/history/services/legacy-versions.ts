import type {
  HistoryVersionAuthor,
  HistoryVersionSource,
} from '../../../../shared/contracts/history-versions';
import { getAdminUserAuthor, type AdminUser } from '../origin/authors';
import { type AuthorColumns, toAuthor } from './utils';

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
  createdBy: AdminUser | null;
};

export const getVersionOrigin = (
  version: StoredVersionOrigin
): { source: HistoryVersionSource; author: HistoryVersionAuthor | null } => {
  if (version.source === null) {
    return {
      source: LEGACY_SOURCE,
      author: version.createdBy ? getAdminUserAuthor(version.createdBy) : null,
    };
  }

  return { source: version.source, author: toAuthor(version) };
};
