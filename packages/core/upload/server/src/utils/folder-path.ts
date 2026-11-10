/**
 * SQL value that swaps the leading `oldPath` of a materialized path column for `newPath`.
 *
 * Only the prefix may change. `REPLACE()` would also rewrite a later segment that starts with the
 * same characters: moving `/1` to `/2/1` would turn its child `/1/10` into `/2/1/2/10`.
 */
const replacePathPrefix = (columnName: string, oldPath: string, newPath: string) => {
  let replaceQuery;
  switch (strapi.db.dialect.client) {
    case 'sqlite':
      replaceQuery = '? || SUBSTRING(??, ?)';
      break;
    case 'postgres':
      replaceQuery = 'CONCAT(?::TEXT, SUBSTRING(??, ?::INTEGER))';
      break;
    default:
      replaceQuery = 'CONCAT(?, SUBSTRING(??, ?))';
  }

  return strapi.db.connection.raw(replaceQuery, [newPath, columnName, oldPath.length + 1]);
};

export { replacePathPrefix };
