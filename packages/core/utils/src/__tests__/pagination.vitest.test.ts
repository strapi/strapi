import { describe, expect, expectTypeOf, test } from 'vitest';

import { withDefaultPagination } from '../pagination';

/**
 * Pagination values come from the query string, so they arrive as strings at runtime
 * (e.g. `?pagination[page]=2&pagination[pageSize]=10`).
 */
describe('withDefaultPagination with query string values', () => {
  test('accepts string page and pageSize and returns numeric start and limit', () => {
    const result = withDefaultPagination({ page: '2', pageSize: '10' });

    expect(result).toEqual({ start: 10, limit: 10 });
    expectTypeOf(result.start).toEqualTypeOf<number>();
    expectTypeOf(result.limit).toEqualTypeOf<number>();
  });

  test('accepts string start and limit and returns numeric start and limit', () => {
    const result = withDefaultPagination({ start: '5', limit: '10' });

    expect(result).toEqual({ start: 5, limit: 10 });
    expectTypeOf(result.start).toEqualTypeOf<number>();
    expectTypeOf(result.limit).toEqualTypeOf<number>();
  });

  test('accepts string values for every pagination attribute', () => {
    type QueryStringPagination = {
      page?: string;
      pageSize?: string;
      start?: string;
      limit?: string;
    };

    expectTypeOf<QueryStringPagination>().toMatchTypeOf<
      Parameters<typeof withDefaultPagination>[0]
    >();
  });
});
