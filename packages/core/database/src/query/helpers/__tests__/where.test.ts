import createKnex from 'knex';
import type { Knex } from 'knex';

import { applyWhere } from '../where';

// Strapi maps its sqlite/mysql/postgres clients onto these knex clients
// (see src/connection.ts). We only compile queries here (`toSQL`), so no
// database driver is ever loaded.
const CLIENTS = {
  postgres: 'pg',
  mysql: 'mysql2',
  sqlite: 'better-sqlite3',
} as const;

describe('applyWhere - LIKE operator escaping', () => {
  const instances: Knex[] = [];

  const compile = (client: string, where: Record<string, unknown>) => {
    const knex = createKnex({ client, useNullAsDefault: true });
    instances.push(knex);

    const qb = knex('t');
    applyWhere(qb, where);

    return { sql: qb.toSQL().sql, bindings: qb.toSQL().bindings };
  };

  afterAll(async () => {
    await Promise.all(instances.map((knex) => knex.destroy().catch(() => {})));
  });

  describe.each(Object.entries(CLIENTS))('%s', (_name, client) => {
    const isSqlite = client === 'better-sqlite3';
    const isPostgres = client === 'pg';

    test('$eqi compiles to case-insensitive equality, never LIKE', () => {
      const { sql, bindings } = compile(client, { handle: { $eqi: 'a_c' } });

      expect(sql).toContain('= LOWER(');
      expect(sql).not.toMatch(/LIKE/i);
      expect(sql).not.toMatch(/ESCAPE/i);
      // value is bound as-is: equality cannot wildcard, so no escaping is needed
      expect(bindings).toContain('a_c');
    });

    test('$nei compiles to case-insensitive inequality, never LIKE', () => {
      const { sql, bindings } = compile(client, { handle: { $nei: 'a_c' } });

      expect(sql).toContain('<> LOWER(');
      expect(sql).not.toMatch(/LIKE/i);
      expect(bindings).toContain('a_c');
    });

    test('$eqi with a trailing backslash produces valid SQL (no trailing escape char)', () => {
      const { sql, bindings } = compile(client, { handle: { $eqi: 'Cutting\\' } });

      expect(sql).not.toMatch(/LIKE/i);
      expect(bindings).toContain('Cutting\\');
    });

    test('$containsi escapes %, _ and \\ in the value', () => {
      const { bindings } = compile(client, { handle: { $containsi: '50%_a\\b' } });

      expect(bindings).toContain('%50\\%\\_a\\\\b%');
    });

    test('$startsWith escapes the value and keeps only the trailing wildcard', () => {
      const { sql, bindings } = compile(client, { handle: { $startsWith: '100%' } });

      expect(sql).toMatch(/LIKE/i);
      expect(bindings).toContain('100\\%%');
    });

    test('$endsWith escapes the value and keeps only the leading wildcard', () => {
      const { bindings } = compile(client, { handle: { $endsWith: 'a_c' } });

      expect(bindings).toContain('%a\\_c');
    });

    test('$notContains compiles to NOT LIKE with an escaped value', () => {
      const { sql, bindings } = compile(client, { handle: { $notContains: '%' } });

      expect(sql).toMatch(/NOT LIKE/i);
      expect(bindings).toContain('%\\%%');
    });

    test(`${isSqlite ? 'adds' : 'omits'} an explicit ESCAPE clause for LIKE operators`, () => {
      const { sql } = compile(client, { handle: { $containsi: 'x' } });

      if (isSqlite) {
        expect(sql).toContain("ESCAPE '\\'");
      } else {
        expect(sql).not.toMatch(/ESCAPE/i);
      }
    });

    test(`case-insensitive operators ${isPostgres ? 'cast' : 'do not cast'} the column`, () => {
      const { sql } = compile(client, { handle: { $containsi: 'x' } });

      expect(sql).toMatch(/LOWER\(/i);
      if (isPostgres) {
        expect(sql).toMatch(/CAST\(.*AS VARCHAR\)/i);
      } else {
        expect(sql).not.toMatch(/CAST/i);
      }
    });
  });
});
