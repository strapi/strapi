import { describe, it, expect, expectTypeOf, beforeAll } from 'vitest';
import { AbilityBuilder, Ability } from '@casl/ability';
import { pick } from 'lodash';

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

const operations = pick(sift, allowedOperations);

const conditionsMatcher = (conditions: any) => {
  // @ts-expect-error sift operation map is intentionally narrowed for tests
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
    related: { type: 'relation', relation: 'oneToOne', target: 'api::article.article' },
  },
  config: {
    attributes: {},
  },
};

const sanitizeHelpers = {
  sanitizeOutput: null,
  sanitizeInput: null,
  sanitizeQuery: null,
};

const models: Record<string, any> = {
  'api::foo.foo': fooModel,
  'admin::user': adminUserModel,
  'api::article.article': articleModel,
};

describe('Permissions Manager - Sanitize', () => {
  beforeAll(() => {
    global.strapi = {
      getModel(uid: string) {
        return models[uid] || fooModel;
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
      // @ts-expect-error helpers are assigned during test setup
      const result = await sanitizeHelpers.sanitizeOutput(data, { subject: fooModel.uid });

      expect(result).toEqual({ c: 'Bar' });
    });
  });

  describe('Sanitize Input', () => {
    it('Removes hidden fields', async () => {
      const data = { a: 'Foo', c: 'Bar' };
      // @ts-expect-error helpers are assigned during test setup
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
      // @ts-expect-error helpers are assigned during test setup
      const result = await sanitizeHelpers.sanitizeQuery(data, { subject: fooModel.uid });

      expect(result.filters).toEqual({ c: 'Bar' });
      expect(result.sort).toEqual({ c: 'desc' });
      expect(result.populate).toEqual({ c: true });
      expect(result.fields).toEqual(['c']);
    });
  });

  describe('Sanitize Query fields keep only strings', () => {
    let restrictedSanitizeHelpers: any;

    beforeAll(() => {
      restrictedSanitizeHelpers = createSanitizeHelpers({
        action: 'read',
        model: articleModel.uid,
        ability: defineAbility((can: any) => can('read', 'api::article.article', ['title'])),
      });
    });

    it('removes a field the role cannot read without leaving a hole', async () => {
      const result = await restrictedSanitizeHelpers.sanitizeQuery(
        { fields: ['title', 'content'] },
        { subject: articleModel.uid }
      );

      expect(result.fields).toEqual(['title']);
    });

    it('removes a field the role cannot read from a comma separated string', async () => {
      const result = await restrictedSanitizeHelpers.sanitizeQuery(
        { fields: 'content,title' },
        { subject: articleModel.uid }
      );

      expect(result.fields).toEqual(['title']);
    });

    it('drops null entries before removing a field the role cannot read', async () => {
      const result = await restrictedSanitizeHelpers.sanitizeQuery(
        { fields: [null, 'content', 'title'] },
        { subject: articleModel.uid }
      );

      expect(result.fields).toEqual(['title']);
    });

    it('drops every non-string entry before removing a field the role cannot read', async () => {
      const result = await restrictedSanitizeHelpers.sanitizeQuery(
        { fields: [undefined, 1, {}, ['content'], 'content', 'title'] },
        { subject: articleModel.uid }
      );

      expect(result.fields).toEqual(['title']);
    });

    it('drops null entries inside populate before removing a field the role cannot read', async () => {
      const relatedSanitizeHelpers = createSanitizeHelpers({
        action: 'read',
        model: articleModel.uid,
        ability: defineAbility((can: any) =>
          can('read', 'api::article.article', ['title', 'related'])
        ),
      });

      const result: any = await relatedSanitizeHelpers.sanitizeQuery(
        { populate: { related: { fields: [null, 'content', 'title'] } } },
        { subject: articleModel.uid }
      );

      expect(result.populate.related.fields).toEqual(['title']);
    });

    it('returns an empty array when every requested field is removed', async () => {
      const result = await restrictedSanitizeHelpers.sanitizeQuery(
        { fields: ['content'] },
        { subject: articleModel.uid }
      );

      expect(result.fields).toEqual([]);
    });

    it('removes disallowed fields inside populate without leaving a hole', async () => {
      const fullReadSanitizeHelpers = createSanitizeHelpers({
        action: 'read',
        model: articleModel.uid,
        ability: defineAbility((can: any) => can('read', 'api::article.article')),
      });

      const result: any = await fullReadSanitizeHelpers.sanitizeQuery(
        { populate: { createdBy: { fields: ['password', 'firstname'] } } },
        { subject: articleModel.uid }
      );

      expect(result.populate.createdBy.fields).toEqual(['firstname']);
    });
  });

  describe('Result types', () => {
    const createFooHelpers = () =>
      createSanitizeHelpers({
        action: 'read',
        model: fooModel.uid,
        ability: defineAbility((can: any) => can('read', 'api::foo.foo')),
      });

    it('sanitizeInput and sanitizeOutput keep the type of the data', async () => {
      const helpers = createFooHelpers();
      const data = { a: 'Foo', c: 'Bar' };

      const input = helpers.sanitizeInput(data, { subject: fooModel.uid });
      const output = helpers.sanitizeOutput(data, { subject: fooModel.uid });

      expectTypeOf(input).toEqualTypeOf<Promise<{ a: string; c: string }>>();
      expectTypeOf(output).toEqualTypeOf<Promise<{ a: string; c: string }>>();
      expect(await input).toEqual({ c: 'Bar' });
      expect(await output).toEqual({ c: 'Bar' });
    });

    it('sanitizeInput and sanitizeOutput keep the type of an array of data', async () => {
      const helpers = createFooHelpers();
      const data = [{ a: 'Foo', c: 'Bar' }];

      const input = helpers.sanitizeInput(data, { subject: fooModel.uid });
      const output = helpers.sanitizeOutput(data, { subject: fooModel.uid });

      expectTypeOf(input).toEqualTypeOf<Promise<{ a: string; c: string }[]>>();
      expectTypeOf(output).toEqualTypeOf<Promise<{ a: string; c: string }[]>>();
      expect(await input).toEqual([{ c: 'Bar' }]);
      expect(await output).toEqual([{ c: 'Bar' }]);
    });

    it('sanitizeInput and sanitizeOutput keep unknown data unknown', () => {
      const helpers = createFooHelpers();
      const data: unknown = { c: 'Bar' };

      expectTypeOf(helpers.sanitizeInput(data)).toEqualTypeOf<Promise<unknown>>();
      expectTypeOf(helpers.sanitizeOutput(data)).toEqualTypeOf<Promise<unknown>>();
    });

    it('sanitizeInput and sanitizeOutput return any for any data', () => {
      const helpers = createFooHelpers();
      const data: any = { c: 'Bar' };

      expectTypeOf(helpers.sanitizeInput(data)).toEqualTypeOf<Promise<any>>();
      expectTypeOf(helpers.sanitizeOutput(data)).toEqualTypeOf<Promise<any>>();
    });

    it('sanitizeQuery keeps an unknown result', () => {
      const helpers = createFooHelpers();
      const query = { filters: { c: 'Bar' } };

      expectTypeOf(helpers.sanitizeQuery(query)).toEqualTypeOf<Promise<unknown>>();
    });
  });

  describe('Sanitize Query removes sensitive admin::user fields in relations', () => {
    let articleSanitizeHelpers: any;

    beforeAll(() => {
      articleSanitizeHelpers = createSanitizeHelpers({
        action: 'read',
        model: articleModel.uid,
        ability: defineAbility((can: any) => can('read', 'api::article.article')),
      });
    });

    describe('Filters', () => {
      it('removes password field from createdBy filter', async () => {
        const query = {
          filters: {
            createdBy: {
              password: { $startsWith: '$2b$' },
              firstname: 'John',
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.filters).toEqual({ createdBy: { firstname: 'John' } });
      });

      it('removes resetPasswordToken from updatedBy filter', async () => {
        const query = {
          filters: {
            updatedBy: {
              resetPasswordToken: { $startsWith: 'abc' },
              lastname: 'Doe',
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.filters).toEqual({ updatedBy: { lastname: 'Doe' } });
      });

      it('removes registrationToken from createdBy filter', async () => {
        const query = {
          filters: {
            createdBy: {
              registrationToken: { $contains: 'token' },
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.filters).toEqual({});
      });

      it('removes blocked field from updatedBy filter', async () => {
        const query = {
          filters: {
            updatedBy: {
              blocked: true,
              firstname: 'Jane',
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.filters).toEqual({ updatedBy: { firstname: 'Jane' } });
      });

      it('keeps allowed fields', async () => {
        const query = {
          filters: {
            createdBy: {
              firstname: 'John',
              lastname: 'Doe',
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.filters).toEqual({
          createdBy: {
            firstname: 'John',
            lastname: 'Doe',
          },
        });
      });

      it('removes all sensitive fields, keeps only allowed ones', async () => {
        const query = {
          filters: {
            updatedBy: {
              password: { $startsWith: '$2b$' },
              resetPasswordToken: { $contains: 'reset' },
              registrationToken: { $contains: 'reg' },
              blocked: true,
              firstname: 'John',
              lastname: 'Doe',
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.filters).toEqual({
          updatedBy: {
            firstname: 'John',
            lastname: 'Doe',
          },
        });
      });
    });

    describe('Sort', () => {
      it('removes password from sort', async () => {
        const query = {
          sort: {
            createdBy: { password: 'asc', firstname: 'desc' },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.sort).toEqual({ createdBy: { firstname: 'desc' } });
      });

      it('removes resetPasswordToken from sort', async () => {
        const query = {
          sort: {
            updatedBy: { resetPasswordToken: 'desc' },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.sort).toEqual({});
      });

      it('keeps allowed fields in sort', async () => {
        const query = {
          sort: {
            createdBy: { firstname: 'asc' },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.sort).toEqual({ createdBy: { firstname: 'asc' } });
      });
    });

    describe('Populate', () => {
      it('removes sensitive fields from populate filters', async () => {
        const query = {
          populate: {
            createdBy: {
              filters: {
                password: { $startsWith: '$2b$' },
                firstname: 'John',
              },
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.populate.createdBy.filters).toEqual({ firstname: 'John' });
      });

      it('removes disallowed admin user fields from populate filters', async () => {
        const query = {
          populate: {
            updatedBy: {
              filters: {
                resetPasswordToken: { $contains: 'token' },
                blocked: true,
              },
            },
          },
        };

        const result = await articleSanitizeHelpers.sanitizeQuery(query, {
          subject: articleModel.uid,
        });

        expect(result.populate.updatedBy.filters).toEqual({});
      });
    });
  });

  describe('Sanitize Output removes sensitive admin::user fields', () => {
    let articleSanitizeHelpers: any;

    beforeAll(() => {
      articleSanitizeHelpers = createSanitizeHelpers({
        action: 'read',
        model: articleModel.uid,
        ability: defineAbility((can: any) => can('read', 'api::article.article')),
      });
    });

    it('removes sensitive fields from createdBy in output', async () => {
      const data = {
        id: 1,
        title: 'Test Article',
        createdBy: {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          password: '$2b$hashedpassword',
          resetPasswordToken: 'secret-token',
          registrationToken: 'reg-token',
          blocked: false,
          isActive: true,
        },
      };

      const result = await articleSanitizeHelpers.sanitizeOutput(data, {
        subject: articleModel.uid,
      });

      expect(result.createdBy).toEqual({
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        isActive: true,
      });
      expect(result.createdBy.password).toBeUndefined();
      expect(result.createdBy.resetPasswordToken).toBeUndefined();
      expect(result.createdBy.registrationToken).toBeUndefined();
      expect(result.createdBy.blocked).toBeUndefined();
    });

    it('removes sensitive fields from updatedBy in output', async () => {
      const data = {
        id: 1,
        title: 'Test Article',
        updatedBy: {
          id: 2,
          firstname: 'Jane',
          lastname: 'Smith',
          username: 'jsmith',
          email: 'jane@example.com',
          password: '$2b$anotherhashedpassword',
          resetPasswordToken: null,
          blocked: true,
          isActive: false,
        },
      };

      const result = await articleSanitizeHelpers.sanitizeOutput(data, {
        subject: articleModel.uid,
      });

      expect(result.updatedBy).toEqual({
        id: 2,
        firstname: 'Jane',
        lastname: 'Smith',
        username: 'jsmith',
        email: 'jane@example.com',
        isActive: false,
      });
      expect(result.updatedBy.password).toBeUndefined();
      expect(result.updatedBy.resetPasswordToken).toBeUndefined();
      expect(result.updatedBy.blocked).toBeUndefined();
    });
  });
});
