import { keyBy } from 'lodash';
import type { Data } from '@strapi/types';
import type { Database } from '@strapi/database';

export type TargetStatus = 'draft' | 'published';
type DatabaseQueryBuilder = ReturnType<Database['getConnection']>;
type DatabaseTransaction = Parameters<DatabaseQueryBuilder['transacting']>[0];

const entryKey = (entry: { document_id: unknown; locale: unknown }) =>
  `${String(entry.document_id)}:${String(entry.locale)}`;

/**
 * Maps row ids to the ids of the rows with the same documentId and locale in the given status.
 */
export const getCounterparts = async (
  trx: DatabaseTransaction,
  tableName: string,
  idsToResolve: unknown[],
  status: TargetStatus
): Promise<Record<string, Data.ID>> => {
  const ids = [...new Set(idsToResolve.map((id) => String(id)))];

  if (ids.length === 0) {
    return {};
  }

  const drafts = await strapi.db
    .getConnection()
    .select('id', 'document_id', 'locale')
    .from(tableName)
    .whereIn('id', ids)
    .transacting(trx);

  if (drafts.length === 0) {
    return {};
  }

  const documentIds = [
    ...new Set(drafts.map((entry: { document_id: Data.ID }) => entry.document_id)),
  ];

  const counterpartsQuery = strapi.db
    .getConnection()
    .select('id', 'document_id', 'locale')
    .from(tableName)
    .whereIn('document_id', documentIds)
    .transacting(trx);

  const counterparts =
    status === 'published'
      ? await counterpartsQuery.whereNotNull('published_at')
      : await counterpartsQuery.whereNull('published_at');

  const counterpartByDocument = keyBy(counterparts, entryKey);

  return drafts.reduce(
    (
      acc: Record<string, Data.ID>,
      draft: { id: Data.ID; document_id: unknown; locale: unknown }
    ) => {
      const counterpart = counterpartByDocument[entryKey(draft)];

      if (counterpart) {
        acc[String(draft.id)] = counterpart.id;
      }

      return acc;
    },
    {}
  );
};
