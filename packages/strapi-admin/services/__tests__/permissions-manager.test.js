'use strict';

const { defineAbility } = require('@casl/ability');
const { buildStrapiQuery } = require('../permission/permissions-manager/query-builers');
const createPermissionsManager = require('../permission/permissions-manager');

describe('Permissions Manager', () => {
  describe('get Query', () => {
    test('It should returns an empty query when no conditions are defined', async () => {
      const ability = defineAbility(can => can('read', 'foo'));
      const pm = createPermissionsManager(ability, 'read', 'foo');

      expect(pm.query).toStrictEqual({});
    });

    test('It should returns a valid query from the ability', () => {
      const ability = defineAbility(can => can('read', 'foo', ['bar'], { john: 'doe' }));
      const pm = createPermissionsManager(ability, 'read', 'foo');

      const expected = { _or: [{ john: 'doe' }] };

      expect(pm.query).toStrictEqual(expected);
    });
  });

  describe('get isAllowed', () => {
    const ability = defineAbility(can => can('read', 'foo'));

    test('It should grants access', () => {
      const pm = createPermissionsManager(ability, 'read', 'foo');

      expect(pm.isAllowed).toBeTruthy();
    });

    test('It should deny access', () => {
      const pm = createPermissionsManager(ability, 'read', 'bar');

      expect(pm.isAllowed).toBeFalsy();
    });
  });

  describe('toSubject', () => {
    const attr = '__caslSubjectType__';
    const ability = defineAbility(can => can('read', 'foo'));
    const pm = createPermissionsManager(ability, 'read', 'foo');

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
    const ability = defineAbility(can => {
      can('read', 'article', ['title'], { title: 'foo' });
      can('edit', 'article', ['title'], { title: { $in: ['john', 'doe'] } });
    });
    const pm = createPermissionsManager(ability, 'read', 'article');

    global.strapi = {
      getModel() {
        return {
          privateAttributes: [],
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

    test('Pick all fields (output) using default model', () => {
      const input = { title: 'foo' };
      const res = pm.pickPermittedFieldsOf(input);

      expect(res).toStrictEqual(input);
    });

    test(`Pick 0 fields (output) using custom model`, () => {
      const input = { title: 'foo' };
      const res = pm.pickPermittedFieldsOf(input, { action: 'edit' });

      expect(res).toStrictEqual({});
    });

    test('Sanitize an array of objects', () => {
      const input = [{ title: 'foo' }, { title: 'john' }];
      const expected = [{ title: 'foo' }, {}];

      const res = pm.pickPermittedFieldsOf(input);

      expect(res).toStrictEqual(expected);
    });
  });

  describe('queryFrom', () => {
    const ability = defineAbility(can => can('read', 'article', ['title'], { title: 'foo' }));
    const pm = createPermissionsManager(ability, 'read', 'article');
    const pmQuery = { _or: [{ title: 'foo' }] };

    test('Create query from simple object', () => {
      const query = { _limit: 100 };
      const expected = { _limit: 100, _where: [pmQuery] };

      const res = pm.queryFrom(query);

      expect(res).toStrictEqual(expected);
    });

    test('Create query from complex object', () => {
      const query = { _limit: 100, _where: [{ a: 'b' }, { c: 'd' }] };
      const expected = {
        _limit: 100,
        _where: [pmQuery, { a: 'b' }, { c: 'd' }],
      };

      const res = pm.queryFrom(query);

      expect(res).toStrictEqual(expected);
    });
  });

  describe('buildStrapiQuery', () => {
    const tests = [
      ['No transform', { foo: 'bar' }, { foo: 'bar' }],
      ['Simple op', { foo: { $eq: 'bar' } }, { foo_eq: 'bar' }],
      ['Nested property', { foo: { nested: 'bar' } }, { 'foo.nested': 'bar' }],
      [
        'Deeply nested property',
        { foo: { nested: { again: 'bar' } } },
        { 'foo.nested.again': 'bar' },
      ],
      ['Op with array', { foo: { $in: ['bar', 'rab'] } }, { foo_in: ['bar', 'rab'] }],
      ['Removable op', { foo: { $elemMatch: { a: 'b' } } }, { 'foo.a': 'b' }],
      [
        'Combination of removable and basic ops',
        { foo: { $elemMatch: { a: { $in: [1, 2, 3] } } } },
        { 'foo.a_in': [1, 2, 3] },
      ],
      [
        'Decoupling of nested properties with/without op',
        { foo: { $elemMatch: { a: { $in: [1, 2, 3] }, b: 'c' } } },
        { 'foo.a_in': [1, 2, 3], 'foo.b': 'c' },
      ],
      [
        'OR op and properties decoupling',
        { $or: [{ foo: { a: 2 } }, { foo: { b: 3 } }] },
        { _or: [{ 'foo.a': 2 }, { 'foo.b': 3 }] },
      ],
      [
        'OR op with nested properties & ops',
        { $or: [{ foo: { a: 2 } }, { foo: { b: { $in: [1, 2, 3] } } }] },
        { _or: [{ 'foo.a': 2 }, { 'foo.b_in': [1, 2, 3] }] },
      ],
      [
        'Nested OR op',
        { $or: [{ $or: [{ a: 2 }, { a: 3 }] }] },
        { _or: [{ _or: [{ a: 2 }, { a: 3 }] }] },
      ],
      [
        'OR op with nested AND op',
        { $or: [{ a: 2 }, [{ a: 3 }, { $or: [{ b: 1 }, { b: 4 }] }]] },
        { _or: [{ a: 2 }, [{ a: 3 }, { _or: [{ b: 1 }, { b: 4 }] }]] },
      ],
      [
        'OR op with nested AND op and nested properties',
        { _or: [{ a: 2 }, [{ a: 3 }, { b: { c: 'foo' } }]] },
        { _or: [{ a: 2 }, [{ a: 3 }, { 'b.c': 'foo' }]] },
      ],
      [
        'Literal nested property with removable op',
        {
          'created_by.roles': {
            $elemMatch: {
              id: {
                $in: [1, 2, 3],
              },
            },
          },
        },
        {
          'created_by.roles.id_in': [1, 2, 3],
        },
      ],
    ];

    test.each(tests)(`Test n°%#: %s`, (name, input, expected) => {
      expect(buildStrapiQuery(input)).toStrictEqual(expected);
    });
  });
});
