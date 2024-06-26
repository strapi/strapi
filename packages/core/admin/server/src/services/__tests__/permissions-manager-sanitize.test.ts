import { AbilityBuilder, Ability } from '@casl/ability';
import { pick } from 'lodash/fp';
import sift from 'sift';
import createSanitizeHelpers from '../permission/permissions-manager/sanitize';

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

const conditionsMatcher = (conditions: any) => {
  // @ts-expect-error
  return sift.createQueryTester(conditions, { operations });
};

const defineAbility = (register: any) => {
  const { can, build } = new AbilityBuilder(Ability);

  register(can);

  return build({ conditionsMatcher });
};

const fooModel = {
  uid: 'api::foo.foo',
  attributes: {
    a: {
      type: 'string',
    },
    b: {
      type: 'password',
    },
    c: {
      type: 'string',
    },
  },
  config: {
    attributes: {
      a: {
        hidden: true,
      },
    },
  },
};

const sanitizeHelpers = {
  sanitizeOutput: null,
  sanitizeInput: null,
};

describe('Permissions Manager - Sanitize', () => {
  beforeAll(() => {
    global.strapi = {
      getModel() {
        return fooModel;
      },
    } as any;

    Object.assign(
      sanitizeHelpers,
      createSanitizeHelpers({
        action: 'read',
        model: fooModel,
        ability: defineAbility((can: any) => can('read', 'api::foo.foo')),
      })
    );
  });

  describe('Sanitize Output', () => {
    it('Removes hidden fields', async () => {
      const data = { a: 'Foo', c: 'Bar' };
      // @ts-expect-error
      const result = await sanitizeHelpers.sanitizeOutput(data, { subject: fooModel.uid });

      expect(result).toEqual({ c: 'Bar' });
    });
  });

  describe('Sanitize Input', () => {
    it('Removes hidden fields', async () => {
      const data = { a: 'Foo', c: 'Bar' };
      // @ts-expect-error
      const result = await sanitizeHelpers.sanitizeInput(data, { subject: fooModel.uid });

      expect(result).toEqual({ c: 'Bar' });
    });
  });

  describe('Sanitize Query', () => {
    it('Removes hidden fields on filters, sort, populate and fields', async () => {
      const data = {
        filters: { a: 'Foo', c: 'Bar' },
        sort: { a: 'asc', c: 'desc' },
        populate: { a: true, c: true },
        fields: ['a', 'c'],
      };
      // @ts-expect-error
      const result = await sanitizeHelpers.sanitizeQuery(data, { subject: fooModel.uid });

      expect(result.filters).toEqual({ c: 'Bar' });
      expect(result.sort).toEqual({ c: 'desc' });
      expect(result.populate).toEqual({ c: true });
      expect(result.fields).toEqual([undefined, 'c']);
    });
  });
});
