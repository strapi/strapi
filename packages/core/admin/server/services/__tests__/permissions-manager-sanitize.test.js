'use strict';

const { AbilityBuilder, Ability } = require('@casl/ability');
const { pick } = require('lodash/fp');
const sift = require('sift');

const createSanitizeHelpers = require('../permission/permissions-manager/sanitize');

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
    };

    Object.assign(
      sanitizeHelpers,
      createSanitizeHelpers({
        action: 'read',
        model: fooModel,
        ability: defineAbility((can) => can('read', 'api::foo.foo')),
      })
    );
  });

  describe('Sanitize Output', () => {
    it('Removes hidden fields', async () => {
      const data = { a: 'Foo', c: 'Bar' };
      const result = await sanitizeHelpers.sanitizeOutput(data, { subject: fooModel.uid });

      expect(result).toEqual({ c: 'Bar' });
    });
  });

  describe('Sanitize Input', () => {
    it('Removes hidden fields', async () => {
      const data = { a: 'Foo', c: 'Bar' };
      const result = await sanitizeHelpers.sanitizeInput(data, { subject: fooModel.uid });

      expect(result).toEqual({ c: 'Bar' });
    });
  });
});
