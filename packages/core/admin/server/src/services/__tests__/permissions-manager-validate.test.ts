import { AbilityBuilder, Ability } from '@casl/ability';
import { pick } from 'lodash/fp';
import sift from 'sift';

import createValidateHelpers from '../permission/permissions-manager/validate';

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

const validateHelpers = {
  validateQuery: null,
  validateInput: null,
};

describe('Permissions Manager - Validate', () => {
  beforeAll(() => {
    global.strapi = {
      getModel() {
        return fooModel;
      },
      db: {
        metadata: {
          get() {
            return {
              columnToAttribute: fooModel.config.attributes,
            };
          },
        },
      },
    } as any;

    Object.assign(
      validateHelpers,
      createValidateHelpers({
        action: 'read',
        model: fooModel,
        ability: defineAbility((can: any) => can('read', 'api::foo.foo')),
      })
    );
  });

  describe('Validate Input', () => {
    it('Passes valid input', async () => {
      const data = { c: 'Bar' };
      // @ts-expect-error
      const result = await validateHelpers.validateInput(data, { subject: fooModel.uid });

      expect(result).toEqual({ c: 'Bar' });
    });

    it('Throws on hidden fields', async () => {
      const data = { a: 'Foo', c: 'Bar' };
      expect(async () => {
        // @ts-expect-error
        await validateHelpers.validateInput(data, { subject: fooModel.uid });
      }).rejects.toThrow('Invalid key a');
    });
  });

  describe('Validate Query', () => {
    it.each([
      ['filters', 'password', { filters: { c: 'Foo', b: 'Bar' } }, 'b'],
      ['sort', 'password', { sort: { c: 'Foo', b: 'Bar' } }, 'b'],
      ['fields', 'password', { fields: ['c', 'b'] }, 'b'],
    ])('Throws on %s with %s', async (key, type, data, invalidParam) => {
      expect(async () => {
        // @ts-expect-error
        await validateHelpers.validateQuery(data, { subject: fooModel.uid });
      }).rejects.toThrow(`Invalid key ${invalidParam}`);
    });
  });
});
