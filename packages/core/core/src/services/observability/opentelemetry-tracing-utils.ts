export const MAX_DB_STATEMENT_LENGTH = 4096;

export function truncateSql(sql: string, maxLen = MAX_DB_STATEMENT_LENGTH): string {
  if (sql.length <= maxLen) {
    return sql;
  }

  return `${sql.slice(0, maxLen)}…`;
}

export function inferDbOperation(sql: string | undefined, knexMethod: string | undefined): string {
  if (knexMethod && knexMethod !== 'raw') {
    return knexMethod;
  }

  if (!sql) {
    return 'query';
  }

  const first = sql.trim().split(/\s+/)[0];
  return first ? first.toLowerCase() : 'query';
}

/** Maps Knex `client` (`database.connection.client`) to OpenTelemetry `db.system`. */
export function mapDatabaseClientToDbSystem(client: string | undefined): string {
  switch (client) {
    case 'postgres':
    case 'pg':
      return 'postgresql';
    case 'mysql':
    case 'mysql2':
      return 'mysql';
    case 'sqlite':
    case 'sqlite3':
      return 'sqlite';
    default:
      return client && client.length > 0 ? client : 'other_sql';
  }
}
