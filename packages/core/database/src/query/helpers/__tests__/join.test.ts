import createKnex from 'knex';

import { applyJoin } from '../join';
import type { Join } from '../join';

describe('applyJoin', () => {
  const knex = createKnex({ client: 'pg' });
  const join: Join = {
    alias: 't1',
    referencedTable: 'tags',
    referencedColumn: 'id',
    rootColumn: 'tag_id',
    rootTable: 't0',
    on: { field: 'tag' },
  };

  const sqlOf = (value: Join) => {
    const qb = knex('articles as t0');
    applyJoin(qb, value);

    return qb.toSQL().sql;
  };

  afterAll(() => knex.destroy());

  test('without onKnex, joins on the root column and the on values only', () => {
    expect(sqlOf(join)).toBe(
      'select * from "articles" as "t0" left join "tags" as "t1" on "t0"."tag_id" = "t1"."id" and "t1"."field" = ?'
    );
  });

  test('with onKnex, adds its condition to the ON clause', () => {
    expect(sqlOf({ ...join, onKnex: (inner) => inner.andOnNull('t1.space_id') })).toBe(
      'select * from "articles" as "t0" left join "tags" as "t1" on "t0"."tag_id" = "t1"."id" and "t1"."field" = ? and "t1"."space_id" is null'
    );
  });
});
