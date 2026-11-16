import { describe, expect, expectTypeOf, it } from 'vitest';

import { createRepository } from '../entity-repository';
import type { Database } from '../..';
import type { PaginatedResult } from '../types';

const fakeDb = () =>
  ({
    metadata: {
      get: () => ({ attributes: { tags: { type: 'relation', relation: 'manyToMany' } } }),
    },
    entityManager: {
      load: async (_uid: string, _entity: unknown, _field: string, query: { count?: boolean }) =>
        query.count ? { count: 3 } : [{ id: 1 }, { id: 2 }],
    },
  }) as unknown as Database;

// The @ts-expect-error lines run with `yarn test:ts`, which type-checks this file
describe('repository loadPages', () => {
  const repository = createRepository('api::article.article', fakeDb());

  it('accepts an explicit field type argument and returns a typed page', async () => {
    const page = await repository.loadPages<'tags'>({ id: 1 }, 'tags', { page: 1, pageSize: 2 });

    expectTypeOf(page).toEqualTypeOf<PaginatedResult>();
    expect(page).toEqual({
      results: [{ id: 1 }, { id: 2 }],
      pagination: { page: 1, pageSize: 2, pageCount: 2, total: 3 },
    });
  });

  it('rejects an array of fields', async () => {
    // @ts-expect-error loadPages takes a single field
    await expect(repository.loadPages({ id: 1 }, ['tags'], {})).rejects.toThrow(
      'Expected tags to be a string'
    );
  });

  it('requires params', async () => {
    // @ts-expect-error the page defaults are read from params
    await expect(repository.loadPages({ id: 1 }, 'tags')).rejects.toThrow(TypeError);
  });
});
