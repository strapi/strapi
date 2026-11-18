import PostgresDialect from '../postgresql';
import MysqlDialect from '../mysql';

/**
 * Unit coverage for the dialect branches the rename migration helpers use to
 * keep index / constraint names in line with a renamed table or column. The
 * real-database coverage lives in `migrations/__tests__/fresh-db-rename.test.ts`
 * (Postgres and MySQL run there only when a server is reachable).
 */

type Row = Record<string, unknown>;

const createTrx = (answer: (sql: string, bindings: unknown[]) => Row[]) => {
  const statements: Array<{ sql: string; bindings: unknown[] }> = [];
  const raw = jest.fn(async (sql: string, bindings: unknown[] = []) => {
    statements.push({ sql, bindings });
    return answer(sql, bindings);
  });
  return { trx: { raw } as any, statements };
};

const ddl = (statements: Array<{ sql: string; bindings: unknown[] }>) =>
  statements
    .filter(({ sql }) => /^(ALTER|DROP)/.test(sql.trim()))
    .map(({ sql, bindings }) => [sql, bindings]);

describe('PostgresDialect.renameSchemaObject', () => {
  const dialect = new PostgresDialect({} as any);

  /** Simulates pg_constraint / pg_indexes holding the given names. */
  const pg = ({ constraints = [], indexes = [] }: { constraints?: string[]; indexes?: string[] }) =>
    createTrx((sql, [, name]) => {
      const pool = sql.includes('pg_constraint') ? constraints : indexes;
      return { rows: pool.includes(name as string) ? [{}] : [] } as any;
    });

  it('renames an FK constraint and then its same-named index', async () => {
    const { trx, statements } = pg({ constraints: ['a_lnk_fk'], indexes: ['a_lnk_fk'] });

    const renamed = await dialect.renameSchemaObject(trx, {
      table: 'b_lnk',
      from: 'a_lnk_fk',
      to: 'b_lnk_fk',
    });

    expect(renamed).toBe(true);
    expect(ddl(statements)).toEqual([
      ['ALTER TABLE ?? RENAME CONSTRAINT ?? TO ??', ['b_lnk', 'a_lnk_fk', 'b_lnk_fk']],
      ['ALTER INDEX ?? RENAME TO ??', ['a_lnk_fk', 'b_lnk_fk']],
    ]);
  });

  it('renames a plain index', async () => {
    const { trx, statements } = pg({ indexes: ['a_idx'] });

    expect(await dialect.renameSchemaObject(trx, { table: 't', from: 'a_idx', to: 'b_idx' })).toBe(
      true
    );
    expect(ddl(statements)).toEqual([['ALTER INDEX ?? RENAME TO ??', ['a_idx', 'b_idx']]]);
  });

  it('does nothing when neither a constraint nor an index has the old name', async () => {
    const { trx, statements } = pg({});

    expect(await dialect.renameSchemaObject(trx, { table: 't', from: 'a', to: 'b' })).toBe(false);
    expect(ddl(statements)).toEqual([]);
  });

  it('does not rename onto a name that is already taken', async () => {
    const { trx, statements } = pg({ constraints: ['a', 'b'], indexes: ['a', 'b'] });

    expect(await dialect.renameSchemaObject(trx, { table: 't', from: 'a', to: 'b' })).toBe(false);
    expect(ddl(statements)).toEqual([]);
  });
});

describe('MysqlDialect.dropSchemaObject', () => {
  const dialect = new MysqlDialect({} as any);

  /** Simulates information_schema holding the given names (mysql2 returns [rows, fields]). */
  const mysql = ({
    foreignKeys = [],
    indexes = [],
  }: {
    foreignKeys?: string[];
    indexes?: string[];
  }) =>
    createTrx((sql, [, name]) => {
      const pool = sql.includes('table_constraints') ? foreignKeys : indexes;
      return [pool.includes(name as string) ? [{}] : [], []] as any;
    });

  it('drops the FK constraint before the same-named index', async () => {
    const { trx, statements } = mysql({ foreignKeys: ['a_lnk_fk'], indexes: ['a_lnk_fk'] });

    expect(await dialect.dropSchemaObject(trx, { table: 'b_lnk', name: 'a_lnk_fk' })).toBe(true);
    expect(ddl(statements)).toEqual([
      ['ALTER TABLE ?? DROP FOREIGN KEY ??', ['b_lnk', 'a_lnk_fk']],
      ['ALTER TABLE ?? DROP INDEX ??', ['b_lnk', 'a_lnk_fk']],
    ]);
  });

  it('drops a plain index', async () => {
    const { trx, statements } = mysql({ indexes: ['a_idx'] });

    expect(await dialect.dropSchemaObject(trx, { table: 't', name: 'a_idx' })).toBe(true);
    expect(ddl(statements)).toEqual([['ALTER TABLE ?? DROP INDEX ??', ['t', 'a_idx']]]);
  });

  it('does nothing when nothing has that name', async () => {
    const { trx, statements } = mysql({});

    expect(await dialect.dropSchemaObject(trx, { table: 't', name: 'a_idx' })).toBe(false);
    expect(ddl(statements)).toEqual([]);
  });
});
