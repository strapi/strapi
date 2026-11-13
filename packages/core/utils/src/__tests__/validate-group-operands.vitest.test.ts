import { describe, test, expect } from 'vitest';

import { ValidationError } from '../errors';
import { validators } from '../validate';
import { articleModel, getModel } from './test-fixtures';

/**
 * The database layer reads a `$and` / `$or` operand as a group only when it is a list, and has no
 * attribute level `$and` / `$or`. It fails on any other operand, and REST answers with a 500.
 */
describe('validateFilters - $or and $and operands keyed by operators', () => {
  const ctx = { schema: articleModel, getModel };

  const validate = (filters: unknown) =>
    validators.validateFilters(ctx, filters, ['nonAttributesOperators']);

  test.each([
    ['$or holding $eq', { $or: { $eq: 'alpha' } }, '$or', '$or'],
    ['$and holding $not', { $and: { $not: { title: 'x' } } }, '$and', '$and'],
    ['$and holding a $or list', { $and: { $or: [{ title: 'x' }] } }, '$and', '$and'],
    ['$or in a relation filter', { createdBy: { $or: { $eq: 1 } } }, '$or', 'createdBy.$or'],
    ['$and under $not', { $not: { $and: { $eq: 'a' } } }, '$and', '$not.$and'],
    ['$or inside an $and list', { $and: [{ $or: { $eq: 'a' } }] }, '$or', '$and[0].$or'],
    [
      'the operator map of $and on a scalar attribute',
      { title: { $and: { $eq: 'x' } } },
      '$and',
      'title.$and',
    ],
    [
      'the operator map of $or on a scalar attribute',
      { title: { $or: { $eq: 'x', $ne: 'y' } } },
      '$or',
      'title.$or',
    ],
    // A value that is not a plain object holds a condition, even when it is null or empty
    ['$or holding $eq with a null value', { $or: { $eq: null } }, '$or', '$or'],
    ['$and holding $in with an empty list', { $and: { $in: [] } }, '$and', '$and'],
    ['$or holding $gt with a Date', { $or: { $gt: new Date('2026-01-01') } }, '$or', '$or'],
    [
      '$and holding empty objects next to a condition',
      { title: { $and: { $not: {}, $eq: 'x' } } },
      '$and',
      'title.$and',
    ],
  ])('throws on %s', async (_, filters, key, path) => {
    const error = await validate(filters).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: `Invalid operand for ${key} at ${path}: expected a list of filters, at the root of the filters or under a relation, not an object`,
      details: { key, path },
    });
  });

  // REST `filters[$or][$eq][0]=alpha&filters[$or][$eq][100]=x`: the object operand check of a root
  // operator sees the index-keyed `$eq` operand first, and names the arrayLimit
  test('throws on $or holding $eq with an index-keyed operand', async () => {
    const error = await validate({ $or: { $eq: { 0: 'alpha', 100: 'x' } } }).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: `Invalid operand for $eq at $or: the list has more items than the query parser's arrayLimit. Send fewer items, or raise arrayLimit in the strapi::query middleware config`,
      details: { key: '$eq', path: '$or' },
    });
  });

  test.each([
    ['a $or list of operator filters', { $or: [{ $not: { title: 'a' } }, { title: 'b' }] }],
    ['the operator map of $not on a scalar attribute', { title: { $not: { $eq: 'x' } } }],
    // Empty objects hold no condition and are sanitized out
    ['an empty operand', { $or: {}, createdBy: { $and: {} } }],
    ['an operand holding only empty objects', { $and: { $eq: {} }, title: { $or: { $eq: {} } } }],
    [
      'an operand holding only nested empty objects',
      { $or: { $not: { $eq: {} } }, title: { $and: { $not: { $not: {} } } } },
    ],
    // Left to query conversion, which reads a $null / $notNull operand as a boolean
    ['$or holding $eq in a $null operand', { title: { $null: { $or: { $eq: 1 } } } }],
    ['$and holding $not in a $notNull operand', { createdBy: { $notNull: { $and: { $not: 1 } } } }],
  ])('accepts %s', async (_, filters) => {
    await expect(validate(filters)).resolves.toEqual(filters);
  });
});
