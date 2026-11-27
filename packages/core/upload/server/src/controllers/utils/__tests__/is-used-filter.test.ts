import { errors } from '@strapi/utils';

import { extractIsUsedFilter } from '../is-used-filter';

const folderScope = { folder: { id: { $null: true } } };

describe('extractIsUsedFilter', () => {
  test.each([
    ['$eq', 'true', true],
    ['$eq', true, true],
    ['$ne', 'false', true],
    ['$ne', false, true],
    ['$eq', 'false', false],
    ['$eq', false, false],
    ['$ne', 'true', false],
    ['$ne', true, false],
  ])('maps %s %p to isUsed %p', (operator, value, expected) => {
    const query = { filters: { $and: [folderScope, { isUsed: { [operator]: value } }] } };

    expect(extractIsUsedFilter(query)).toEqual({
      query: { filters: { $and: [folderScope] } },
      isUsed: expected,
    });
  });

  test('returns the query untouched when there is no isUsed clause', () => {
    const query = { page: '1', filters: { $and: [folderScope, { mime: { $contains: 'image' } }] } };

    expect(extractIsUsedFilter(query)).toEqual({ query, isUsed: undefined });
  });

  test('returns the query untouched when there are no filters', () => {
    const query = { page: '1' };

    expect(extractIsUsedFilter(query)).toEqual({ query, isUsed: undefined });
  });

  test('keeps the other keys of the clause that holds isUsed', () => {
    const query = {
      filters: { $and: [{ isUsed: { $eq: 'true' }, mime: { $contains: 'image' } }] },
    };

    expect(extractIsUsedFilter(query)).toEqual({
      query: { filters: { $and: [{ mime: { $contains: 'image' } }] } },
      isUsed: true,
    });
  });

  test('removes the filters when isUsed was the only clause', () => {
    const query = { page: '1', filters: { $and: [{ isUsed: { $eq: 'true' } }] } };

    expect(extractIsUsedFilter(query)).toEqual({ query: { page: '1' }, isUsed: true });
  });

  test('keeps the other top-level filters when isUsed was the only $and clause', () => {
    const query = {
      filters: { $and: [{ isUsed: { $eq: 'true' } }], mime: { $contains: 'image' } },
    };

    expect(extractIsUsedFilter(query)).toEqual({
      query: { filters: { mime: { $contains: 'image' } } },
      isUsed: true,
    });
  });

  test('does not mutate the incoming query', () => {
    const query = { filters: { $and: [folderScope, { isUsed: { $eq: 'true' } }] } };
    const snapshot = structuredClone(query);

    extractIsUsedFilter(query);

    expect(query).toEqual(snapshot);
  });

  test.each([
    ['at the top level', { isUsed: { $eq: 'true' } }],
    ['inside $or', { $and: [{ $or: [{ isUsed: { $eq: 'true' } }, folderScope] }] }],
    ['inside a nested $and', { $and: [{ $and: [{ isUsed: { $eq: 'true' } }] }] }],
    ['inside $not', { $and: [{ $not: { isUsed: { $eq: 'true' } } }] }],
    ['inside a relation', { $and: [{ folder: { isUsed: { $eq: 'true' } } }] }],
    [
      'next to a supported clause',
      { $and: [{ isUsed: { $eq: 'true' }, $or: [{ isUsed: { $eq: 'false' } }] }] },
    ],
  ])('throws a ValidationError when isUsed is %s', (_, filters) => {
    expect(() => extractIsUsedFilter({ filters })).toThrow(errors.ValidationError);
  });

  test.each([
    ['an unsupported operator', { $in: ['true'] }],
    ['a non boolean value', { $eq: 'yes' }],
    ['no operator', 'true'],
    ['several operators', { $eq: 'true', $ne: 'false' }],
  ])('throws a ValidationError for %s', (_, isUsed) => {
    const query = { filters: { $and: [{ isUsed }] } };

    expect(() => extractIsUsedFilter(query)).toThrow(errors.ValidationError);
  });

  test('throws a ValidationError when isUsed is given more than once', () => {
    const query = { filters: { $and: [{ isUsed: { $eq: 'true' } }, { isUsed: { $eq: 'true' } }] } };

    expect(() => extractIsUsedFilter(query)).toThrow(errors.ValidationError);
  });
});
