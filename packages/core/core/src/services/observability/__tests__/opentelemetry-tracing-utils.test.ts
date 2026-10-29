import {
  inferDbOperation,
  mapDatabaseClientToDbSystem,
  truncateSql,
} from '../opentelemetry-tracing-utils';

describe('opentelemetry tracing utils', () => {
  it('truncateSql caps length', () => {
    const sql = 'a'.repeat(100);
    expect(truncateSql(sql, 20)).toHaveLength('a'.repeat(20).length + 1); // ellipsis
    expect(truncateSql('short')).toBe('short');
  });

  it('inferDbOperation prefers Knex method', () => {
    expect(inferDbOperation(undefined, 'select')).toBe('select');
    expect(inferDbOperation('INVALID', 'insert')).toBe('insert');
  });

  it('inferDbOperation falls back to first SQL keyword', () => {
    expect(inferDbOperation('SELECT * FROM t', undefined)).toBe('select');
    expect(inferDbOperation('  UPDATE x ', 'raw')).toBe('update');
  });

  it('mapDatabaseClientToDbSystem normalizes aliases', () => {
    expect(mapDatabaseClientToDbSystem('postgres')).toBe('postgresql');
    expect(mapDatabaseClientToDbSystem('pg')).toBe('postgresql');
    expect(mapDatabaseClientToDbSystem('mysql2')).toBe('mysql');
    expect(mapDatabaseClientToDbSystem('sqlite3')).toBe('sqlite');
    expect(mapDatabaseClientToDbSystem(undefined)).toBe('other_sql');
  });
});
