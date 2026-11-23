import { describe, expect, it } from 'vitest';

import { createRepository } from '../entity-repository';
import type { Database } from '../..';

const TAGS = [{ id: 1 }, { id: 2 }, { id: 3 }];

type LoadQuery = { limit: number; offset: number; count?: boolean };

// Mirrors entityManager.load: null for a missing entity, { count } for a count query
const fakeDb = ({ entityExists }: { entityExists: boolean }) => {
  const queries: LoadQuery[] = [];

  const db = {
    metadata: {
      get: () => ({ attributes: { tags: { type: 'relation', relation: 'manyToMany' } } }),
    },
    entityManager: {
      async load(_uid: string, _entity: unknown, _field: string, query: LoadQuery) {
        queries.push(query);

        if (entityExists === false) {
          return null;
        }

        if (query.count === true) {
          return { count: TAGS.length };
        }

        return TAGS.slice(query.offset, query.offset + query.limit);
      },
    },
  } as unknown as Database;

  return { db, queries };
};

describe('entity repository loadPages', () => {
  it('returns a page of the relation', async () => {
    const { db } = fakeDb({ entityExists: true });

    const res = await createRepository('api::article.article', db).loadPages({ id: 1 }, 'tags', {
      page: 1,
      pageSize: 2,
    });

    expect(res).toEqual({
      results: [{ id: 1 }, { id: 2 }],
      pagination: { page: 1, pageSize: 2, pageCount: 2, total: 3 },
    });
  });

  it('only counts in the total query when the params carry a count key', async () => {
    const { db, queries } = fakeDb({ entityExists: true });
    // A params object that is reused from elsewhere can carry a count key
    const params = { page: 1, pageSize: 2, count: true };

    const res = await createRepository('api::article.article', db).loadPages(
      { id: 1 },
      'tags',
      params
    );

    expect(res.results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(res.pagination.total).toBe(3);
    expect(queries[0]).not.toHaveProperty('count');
  });

  it('returns an empty page when the entity does not exist', async () => {
    const { db } = fakeDb({ entityExists: false });

    const res = await createRepository('api::article.article', db).loadPages({ id: 999 }, 'tags', {
      page: 2,
      pageSize: 5,
    });

    expect(res).toEqual({
      results: [],
      pagination: { page: 2, pageSize: 5, pageCount: 0, total: 0 },
    });
  });
});
