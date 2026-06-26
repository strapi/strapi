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

const adminUserModel = {
  uid: 'admin::user',
  attributes: {
    id: { type: 'integer' },
    firstname: { type: 'string' },
    lastname: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'email' },
    isActive: { type: 'boolean' },
    password: { type: 'password' },
    resetPasswordToken: { type: 'string' },
    registrationToken: { type: 'string' },
    blocked: { type: 'boolean' },
  },
  config: {
    attributes: {},
  },
};

const articleModel = {
  uid: 'api::article.article',
  attributes: {
    id: { type: 'integer' },
    title: { type: 'string' },
    content: { type: 'text' },
    createdBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
    updatedBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
  },
  config: {
    attributes: {},
  },
};

const validateHelpers = {
  validateQuery: null,
  validateInput: null,
};

const models: Record<string, any> = {
  'api::foo.foo': fooModel,
  'admin::user': adminUserModel,
  'api::article.article': articleModel,
};

describe('Permissions Manager - Validate', () => {
  beforeAll(() => {
    global.strapi = {
      getModel(uid: string) {
        return models[uid] || fooModel;
      },
      db: {
        metadata: {
          get(uid: string) {
            const model = models[uid] || fooModel;
            return {
              columnToAttribute: model.config?.attributes || {},
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

  describe('Validate Query blocks sensitive admin::user fields in relations', () => {
    let articleValidateHelpers: any;

    beforeAll(() => {
      articleValidateHelpers = createValidateHelpers({
        action: 'read',
        model: articleModel.uid,
        ability: defineAbility((can: any) => can('read', 'api::article.article')),
      });
    });

    describe('Filters', () => {
      it('throws when filtering on createdBy.password', async () => {
        const query = {
          filters: {
            createdBy: {
              password: { $startsWith: '$2b$' },
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key password');
      });

      it('throws when filtering on updatedBy.resetPasswordToken', async () => {
        const query = {
          filters: {
            updatedBy: {
              resetPasswordToken: { $startsWith: 'abc' },
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key resetPasswordToken');
      });

      it('throws when filtering on createdBy.registrationToken', async () => {
        const query = {
          filters: {
            createdBy: {
              registrationToken: { $contains: 'token' },
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key registrationToken');
      });

      it('throws when filtering on updatedBy.blocked', async () => {
        const query = {
          filters: {
            updatedBy: {
              blocked: true,
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key blocked');
      });

      it('allows filtering on createdBy.firstname', async () => {
        const query = {
          filters: {
            createdBy: {
              firstname: 'John',
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).resolves.toBe(true);
      });

      it('allows filtering on updatedBy.lastname', async () => {
        const query = {
          filters: {
            updatedBy: {
              lastname: 'Doe',
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).resolves.toBe(true);
      });
    });

    describe('Sort', () => {
      it('throws when sorting by createdBy.password', async () => {
        const query = {
          sort: {
            createdBy: { password: 'asc' },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key password');
      });

      it('throws when sorting by updatedBy.resetPasswordToken', async () => {
        const query = {
          sort: {
            updatedBy: { resetPasswordToken: 'desc' },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key resetPasswordToken');
      });

      it('allows sorting by createdBy.firstname', async () => {
        const query = {
          sort: {
            createdBy: { firstname: 'asc' },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).resolves.toBe(true);
      });
    });

    describe('Populate', () => {
      it('throws when populating with password field filters', async () => {
        const query = {
          populate: {
            createdBy: {
              filters: {
                password: { $startsWith: '$2b$' },
              },
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key password');
      });

      it('throws when populating with disallowed admin user field filters', async () => {
        const query = {
          populate: {
            updatedBy: {
              filters: {
                resetPasswordToken: { $contains: 'token' },
              },
            },
          },
        };

        await expect(
          articleValidateHelpers.validateQuery(query, { subject: articleModel.uid })
        ).rejects.toThrow('Invalid key resetPasswordToken');
      });
    });
  });
});
