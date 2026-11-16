import createKnex from 'knex';
import type { Knex } from 'knex';

import { applyWhere, processWhere } from '../where';

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

    test.each(['$in', '$notIn'])('%s keeps a snapshot of the provided values', (operator) => {
      const knex = createKnex({ client, useNullAsDefault: true });
      instances.push(knex);
      const values = [1, 2];
      const qb = knex('t');

      applyWhere(qb, { id: { [operator]: values } });
      values.push(3);

      expect(qb.toSQL().bindings).toEqual([1, 2]);
    });

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

    // Issue #26468: endsWith=100% must not become LIKE %100% (trailing % as wildcard).
    test('$endsWith escapes a trailing % in the value (#26468)', () => {
      const { sql, bindings } = compile(client, { handle: { $endsWith: '100%' } });

      expect(sql).toMatch(/LIKE/i);
      expect(bindings).toContain('%100\\%');
      expect(bindings).not.toContain('%100%');
    });

    test('$contains escapes _ so it is not a single-character wildcard', () => {
      const { bindings } = compile(client, { handle: { $contains: 'a_c' } });

      expect(bindings).toContain('%a\\_c%');
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

describe('processWhere - boolean filter values', () => {
  const ctx = {
    db: { metadata: { get: () => ({ attributes: { flag: { type: 'boolean' } } }) } },
    qb: { aliasColumn: (column: string) => column },
    uid: 'api::article.article',
  } as unknown as Parameters<typeof processWhere>[1];

  test.each([
    [true, true],
    ['true', true],
    ['t', true],
    ['1', true],
    [1, true],
    [false, false],
    ['false', false],
    ['f', false],
    ['0', false],
    [0, false],
    ['TRUE', true],
    ['T', true],
    ['FALSE', false],
    ['F', false],
  ])('casts %p to %p', (input, expected) => {
    expect(processWhere({ flag: { $eq: input } }, ctx)).toEqual({ flag: { $eq: expected } });
  });

  test('keeps null', () => {
    expect(processWhere({ flag: { $eq: null } }, ctx)).toEqual({ flag: { $eq: null } });
  });

  test('casts every value of $in', () => {
    expect(processWhere({ flag: { $in: ['t', '0'] } }, ctx)).toEqual({
      flag: { $in: [true, false] },
    });
  });

  test.each(['$null', '$notNull'])('does not cast %s values', (operator) => {
    expect(processWhere({ flag: { [operator]: 'true' } }, ctx)).toEqual({
      flag: { [operator]: 'true' },
    });
  });

  test.each(['yes', 'no', '', 2, 'on'])('rejects unrecognised value %p', (input) => {
    expect(() => processWhere({ flag: { $eq: input } }, ctx)).toThrow(
      expect.objectContaining({ name: 'InvalidBooleanFormat' })
    );
  });
});

describe('applyWhere - $null and $notNull operands', () => {
  const knex = createKnex({ client: 'better-sqlite3', useNullAsDefault: true });

  afterAll(async () => {
    await knex.destroy().catch(() => {});
  });

  const compile = (where: Record<string, unknown>) => {
    const qb = knex('t');
    applyWhere(qb, where);

    return qb.toSQL().sql;
  };

  test.each([true, 'true', 't', '1', 1, 'TRUE', 'True', 'T'])('reads %p as true', (operand) => {
    expect(compile({ price: { $null: operand } })).toMatch(/`price` is null$/);
    expect(compile({ price: { $notNull: operand } })).toMatch(/`price` is not null$/);
  });

  // `null` and `undefined` keep the loose reading (false), as optional flags pass them.
  test.each([false, 'false', 'f', '0', 0, 'FALSE', 'False', 'F', null, undefined])(
    'reads %p as false',
    (operand) => {
      expect(compile({ price: { $null: operand } })).toMatch(/`price` is not null$/);
      expect(compile({ price: { $notNull: operand } })).toMatch(/`price` is null$/);
    }
  );

  test.each(['no', 'yes', '', ' true ', 2, ['no'], { anything: 'anything' }])(
    'rejects unrecognised operand %p',
    (operand) => {
      for (const operator of ['$null', '$notNull']) {
        expect(() => compile({ price: { [operator]: operand } })).toThrow(
          expect.objectContaining({ name: 'InvalidBooleanFormat' })
        );
      }
    }
  );
});

describe('processWhere - $not on a relation', () => {
  const joinColumn = (name: string) => ({ name, referencedColumn: 'id' });
  const metas: Record<string, unknown> = {
    'api::note.note': {
      attributes: {
        title: { type: 'string' },
        category: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::category.category',
          joinColumn: joinColumn('category_id'),
        },
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::author.author',
          joinColumn: joinColumn('author_id'),
        },
      },
    },
    'api::category.category': {
      tableName: 'categories',
      attributes: { id: { type: 'increments' }, name: { type: 'string' } },
    },
    'api::author.author': {
      tableName: 'authors',
      attributes: { id: { type: 'increments' }, name: { type: 'string' } },
    },
  };

  // Each join gets the next alias: t1, t2, ...
  const createCtx = () => {
    let aliasCount = 0;

    return {
      db: { metadata: { get: (uid: string) => metas[uid] } },
      qb: {
        alias: 't0',
        aliasColumn: (column: string, alias: string) => `${alias}.${column}`,
        getAlias() {
          aliasCount += 1;
          return `t${aliasCount}`;
        },
        join() {},
      },
      alias: 't0',
      uid: 'api::note.note',
    } as unknown as Parameters<typeof processWhere>[1];
  };

  test('applies a nested filter to the related rows', () => {
    expect(processWhere({ category: { $not: { name: 'x' } } }, createCtx())).toEqual({
      $not: { 't1.name': 'x' },
    });
  });

  // An object holds one value per key, so a second condition under the same key goes to $and
  test('keeps both $not filters of two relations', () => {
    expect(
      processWhere(
        { category: { $not: { name: 'x' } }, author: { $not: { name: 'p' } } },
        createCtx()
      )
    ).toEqual({
      $not: { 't1.name': 'x' },
      $and: [{ $not: { 't2.name': 'p' } }],
    });
  });

  test('keeps a root $not beside a relation $not', () => {
    expect(
      processWhere({ $not: { title: 'a2' }, category: { $not: { name: 'x' } } }, createCtx())
    ).toEqual({
      $not: { 't0.title': 'a2' },
      $and: [{ $not: { 't1.name': 'x' } }],
    });
  });

  test('keeps a relation $not before a root $not', () => {
    expect(
      processWhere({ category: { $not: { name: 'x' } }, $not: { title: 'a2' } }, createCtx())
    ).toEqual({
      $not: { 't1.name': 'x' },
      $and: [{ $not: { 't0.title': 'a2' } }],
    });
  });

  test('keeps both $or lists of two relations', () => {
    expect(
      processWhere(
        { category: { $or: [{ name: 'x' }] }, author: { $or: [{ name: 'p' }] } },
        createCtx()
      )
    ).toEqual({
      $or: [{ 't1.name': 'x' }],
      $and: [{ $or: [{ 't2.name': 'p' }] }],
    });
  });

  test('joins a relation $and list and a root $and list', () => {
    expect(
      processWhere({ category: { $and: [{ name: 'x' }] }, $and: [{ title: 'a1' }] }, createCtx())
    ).toEqual({
      $and: [{ 't1.name': 'x' }, { 't0.title': 'a1' }],
    });
  });
});
