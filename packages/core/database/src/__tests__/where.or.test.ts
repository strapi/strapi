import knex from 'knex';
import createQueryBuilder from '../query/query-builder';
import type { Database } from '..';

describe('$or operator behavior', () => {
  let db: Database;

  beforeEach(() => {
    const connection = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    db = {
      connection,
      getConnection: () => connection,
      dialect: {
        useReturning: () => false,
      },
      metadata: {
        get: () => ({
          tableName: 'test_table',
          attributes: {
            id: { type: 'integer' },
          },
        }),
      },
    } as unknown as Database;
  });

  it('should handle OR conditions correctly', () => {
    const qb = createQueryBuilder('test', db);

    qb.where({
      $or: [{ id: 1 }, { id: 2 }],
    });

    expect(qb.state.where).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $or: expect.any(Array),
        }),
      ])
    );
  });
});
