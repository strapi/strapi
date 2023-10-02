'use strict';

const { AbilityBuilder, Ability } = require('@casl/ability');
const { pick } = require('lodash/fp');
const sift = require('sift');
const { buildStrapiQuery } = require('../permission/permissions-manager/query-builders');
const createPermissionsManager = require('../permission/permissions-manager');

const allowedOperations = [
  '$or',
  '$and',
  '$eq',
  '$ne',
  '$in',
  '$nin',
  '$lt',
  '$lte',
  '$gt',
  '$gte',
  '$exists',
  '$elemMatch',
];

const operations = pick(allowedOperations, sift);

const conditionsMatcher = (conditions) => {
  return sift.createQueryTester(conditions, { operations });
};

const defineAbility = (register) => {
  const { can, build } = new AbilityBuilder(Ability);

  register(can);

  return build({ conditionsMatcher });
};

describe('Permissions Manager', () => {
  beforeEach(() => {
    global.strapi = {
      getModel() {
        return {};
      },
    };
  });

  describe('get Query', () => {
    test('It should returns an empty query when no conditions are defined', async () => {
      const ability = defineAbility((can) => can('read', 'foo'));
      const pm = createPermissionsManager({
        ability,
        action: 'read',
        model: 'foo',
      });

      expect(pm.getQuery()).toStrictEqual({});
    });

    test('It should returns a valid query from the ability', () => {
      const ability = defineAbility((can) => can('read', 'foo', ['bar'], { kai: 'doe' }));
      const pm = createPermissionsManager({
        ability,
        action: 'read',
        model: 'foo',
      });

      const expected = { $or: [{ kai: 'doe' }] };

      expect(pm.getQuery()).toStrictEqual(expected);
    });

    test('It should throw if no action is defined', () => {
      const ability = defineAbility((can) => can('read', 'foo', ['bar'], { kai: 'doe' }));
      const pm = createPermissionsManager({
        ability,
        model: 'foo',
      });

      expect(() => pm.getQuery()).toThrowError();
    });
  });

  describe('get isAllowed', () => {
    const ability = defineAbility((can) => can('read', 'foo'));

    test('It should grants access', () => {
      const pm = createPermissionsManager({
        ability,
        action: 'read',
        model: 'foo',
      });

      expect(pm.isAllowed).toBeTruthy();
    });

    test('It should deny access', () => {
      const pm = createPermissionsManager({
        ability,
        action: 'read',
        model: 'bar',
      });

      expect(pm.isAllowed).toBeFalsy();
    });
  });

  describe('toSubject', () => {
    global.strapi = {
      getModel() {
        return {};
      },
    };

    const attr = '__caslSubjectType__';
    const ability = defineAbility((can) => can('read', 'foo'));
    const pm = createPermissionsManager({
      ability,
      action: 'read',
      model: 'foo',
    });

    test('It should transform an object to a subject using default model', () => {
      const input = { foo: 'bar' };
      const sub = pm.toSubject(input);

      expect(sub[attr]).toBeDefined();
      expect(sub[attr]).toEqual('foo');
      expect(sub).toStrictEqual(input);
    });

    test('It should transform an object to a subject using the given model', () => {
      const input = { foo: 'bar' };
      const newSubjectName = 'another_subject';
      const sub = pm.toSubject(input, newSubjectName);

      expect(sub[attr]).toBeDefined();
      expect(sub[attr]).toEqual(newSubjectName);
      expect(sub).toStrictEqual(input);
    });
  });

  describe('pickPermittedFieldsOf', () => {
    global.strapi = {
      getModel() {
        return {
          attributes: {
            title: {
              type: 'text',
              private: false,
            },
          },
          primaryKey: 'id',
          options: {},
        };
      },
      config: {
        get: jest.fn,
      },
    };

    const ability = defineAbility((can) => {
      can('read', 'article', ['title'], { title: 'foo' });
      can('edit', 'article', ['title'], { title: { $in: ['kai', 'doe'] } });
    });

    const pm = createPermissionsManager({
      ability,
      action: 'read',
      model: 'article',
    });

    test('Pick all fields (output) using default model', async () => {
      const input = { title: 'foo' };
      const res = await pm.pickPermittedFieldsOf(input);

      expect(res).toStrictEqual(input);
    });

    test(`Pick 0 fields (output) using custom model`, async () => {
      const input = { title: 'foo' };
      const res = await pm.pickPermittedFieldsOf(input, { action: 'edit' });

      expect(res).toStrictEqual({});
    });

    test('Sanitize an array of objects', async () => {
      const input = [{ title: 'foo' }, { title: 'kai' }];
      const expected = [{ title: 'foo' }, {}];

      const res = await pm.pickPermittedFieldsOf(input);

      expect(res).toStrictEqual(expected);
    });
  });

  describe('addPermissionsQueryTo', () => {
    const ability = defineAbility((can) =>
      can('read', 'article', ['title'], { $and: [{ title: 'foo' }] })
    );
    const pm = createPermissionsManager({
      ability,
      action: 'read',
      model: 'article',
    });

    const pmQuery = { $or: [{ $and: [{ title: 'foo' }] }] };

    test('Create query from simple object', () => {
      const query = { limit: 100 };
      const expected = { limit: 100, filters: pmQuery };

      const res = pm.addPermissionsQueryTo(query);

      expect(res).toStrictEqual(expected);
    });

    test('Create query from complex object', () => {
      const query = { limit: 100, filters: { $and: [{ a: 'b' }, { c: 'd' }] } };
      const expected = {
        limit: 100,
        filters: {
          $and: [query.filters, pmQuery],
        },
      };

      const res = pm.addPermissionsQueryTo(query);

      expect(res).toStrictEqual(expected);
    });
  });

  describe('buildStrapiQuery', () => {
    const tests = [
      ['No transform', { foo: 'bar' }, { foo: 'bar' }],
      ['Simple op', { foo: { $eq: 'bar' } }, { foo: { $eq: 'bar' } }],
      ['Nested property', { 'foo.nested': 'bar' }, { foo: { nested: 'bar' } }],
      [
        'Nested property + $eq',
        { 'foo.nested': { $eq: 'bar' } },
        { foo: { nested: { $eq: 'bar' } } },
      ],
      [
        'Nested property + $elementMatch',
        { 'foo.nested': { $elemMatch: 'bar' } },
        { foo: { nested: 'bar' } },
      ],
      [
        'Deeply nested property',
        { 'foo.nested.again': 'bar' },
        { foo: { nested: { again: 'bar' } } },
      ],
      ['Op with array', { foo: { $in: ['bar', 'rab'] } }, { foo: { $in: ['bar', 'rab'] } }],
      ['Removable op', { foo: { $elemMatch: { a: 'b' } } }, { foo: { a: 'b' } }],
      [
        'Combination of removable and basic ops',
        { foo: { $elemMatch: { a: { $in: [1, 2, 3] } } } },
        { foo: { a: { $in: [1, 2, 3] } } },
      ],
      [
        'Decoupling of nested properties with/without op',
        { foo: { $elemMatch: { a: { $in: [1, 2, 3] }, b: 'c' } } },
        { foo: { a: { $in: [1, 2, 3] }, b: 'c' } },
      ],
      [
        'OR op and properties decoupling',
        { $or: [{ foo: { a: 2 } }, { foo: { b: 3 } }] },
        { $or: [{ foo: { a: 2 } }, { foo: { b: 3 } }] },
      ],
      [
        'OR op with nested properties & ops',
        { $or: [{ foo: { a: 2 } }, { foo: { b: { $in: [1, 2, 3] } } }] },
        { $or: [{ foo: { a: 2 } }, { foo: { b: { $in: [1, 2, 3] } } }] },
      ],
      [
        'Nested OR op',
        { $or: [{ $or: [{ a: 2 }, { a: 3 }] }] },
        { $or: [{ $or: [{ a: 2 }, { a: 3 }] }] },
      ],
      [
        'OR op with nested AND op',
        { $or: [{ a: 2 }, [{ a: 3 }, { $or: [{ b: 1 }, { b: 4 }] }]] },
        { $or: [{ a: 2 }, [{ a: 3 }, { $or: [{ b: 1 }, { b: 4 }] }]] },
      ],
      [
        'OR op with nested AND op and nested properties',
        { $or: [{ a: 2 }, [{ a: 3 }, { b: { c: 'foo' } }]] },
        { $or: [{ a: 2 }, [{ a: 3 }, { b: { c: 'foo' } }]] },
      ],
      [
        'Literal nested property with removable op',
        {
          created_by: {
            roles: {
              $elemMatch: {
                id: {
                  $in: [1, 2, 3],
                },
              },
            },
          },
        },
        {
          created_by: {
            roles: {
              id: {
                $in: [1, 2, 3],
              },
            },
          },
        },
      ],
    ];

    test.each(tests)(`Test n°%#: %s`, (name, input, expected) => {
      expect(buildStrapiQuery(input)).toStrictEqual(expected);
    });
  });
});
