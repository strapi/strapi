import type { ID } from '../types';

/**
 * MySQL/MariaDB inserts do not use RETURNING. Knex reports only the first
 * auto-increment id of a multi-row INSERT (`[insertId]`), while InnoDB assigns
 * the rest `auto_increment_increment` apart. Postgres and SQLite already
 * return one id per row.
 */
const idsFromInsertResult = (
  chunkResult: unknown,
  rowCount: number,
  useReturning: boolean,
  increment = 1
): ID[] => {
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

  const step = Number.isSafeInteger(increment) && increment > 0 ? increment : 1;

  return Array.from({ length: rowCount }, (_, index) => first + index * step);
};

/**
 * MySQL only reports the first id of a multi-row insert. The rest are
 * `auto_increment_increment` apart, which is 1 unless the server is configured
 * otherwise (Group Replication, Galera).
 */
const readAutoIncrementStep = async (db: {
  connection: { raw: (sql: string) => Promise<unknown> };
}): Promise<number> => {
  try {
    const result = await db.connection.raw('SELECT @@auto_increment_increment AS step');
    const rows = Array.isArray(result) ? result[0] : (result as { rows?: unknown }).rows;
    const step = Number(
      Array.isArray(rows) ? (rows[0] as { step?: unknown } | undefined)?.step : undefined
    );

    if (Number.isSafeInteger(step) && step > 0) {
      return step;
    }
  } catch {
    // Drivers that cannot read the setting keep the consecutive-id default.
  }

  return 1;
};

/**
 * Rows that already carry a primary key must keep those ids. MySQL reports
 * one insert id for the whole statement, and expanding it invents the rest.
 */
const idsForInsertedRows = (
  rows: Array<Record<string, unknown>>,
  chunkResult: unknown,
  useReturning: boolean,
  increment = 1
): ID[] => {
  if (!useReturning && rows.length > 0 && rows.every((row) => row.id != null)) {
    return rows.map((row) => row.id as ID);
  }

  return idsFromInsertResult(chunkResult, rows.length, useReturning, increment);
};

export { idsForInsertedRows, idsFromInsertResult, readAutoIncrementStep };
