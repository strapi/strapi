import type { ID } from '../types';

/**
 * MySQL/MariaDB inserts do not use RETURNING. Knex reports only the first
 * auto-increment id of a multi-row INSERT (`[insertId]`), while InnoDB assigns
 * the rest consecutively. Postgres and SQLite already return one id per row.
 */
const idsFromInsertResult = (chunkResult: unknown, rowCount: number, useReturning: boolean): ID[] => {
  const list = Array.isArray(chunkResult) ? chunkResult : [chunkResult];
  const ids = list.map((entry) => {
    if (entry && typeof entry === 'object' && 'id' in entry) {
      return (entry as { id: ID }).id;
    }

    return entry as ID;
  });

  if (useReturning || ids.length !== 1 || rowCount <= 1) {
    return ids;
  }

  const first = Number(ids[0]);
  if (!Number.isSafeInteger(first) || first <= 0) {
    return ids;
  }

  return Array.from({ length: rowCount }, (_, index) => first + index);
};

export { idsFromInsertResult };
