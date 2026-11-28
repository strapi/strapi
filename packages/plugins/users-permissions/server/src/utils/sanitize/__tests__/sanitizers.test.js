'use strict';

const { sanitizeUserRelationFromRoleEntities, defaultSanitizeOutput } = require('../sanitizers');

describe('users-permissions sanitizers', () => {
  const schema = {
    uid: 'plugin::users-permissions.role',
    attributes: {
      name: { type: 'string' },
      users: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::users-permissions.user',
      },
    },
  };
  const previousStrapi = global.strapi;

  beforeEach(() => {
    global.strapi = { getModel: jest.fn() };
  });

  afterEach(() => {
    global.strapi = previousStrapi ?? {};
  });

  it.each([sanitizeUserRelationFromRoleEntities, defaultSanitizeOutput])(
    'supports direct and curried calls while removing role users',
    async (sanitize) => {
      const users = [{ id: 2 }];
      const entity = Object.freeze({ id: 1, name: 'Public', users });
      const expected = { id: 1, name: 'Public' };

      await expect(sanitize(schema, entity)).resolves.toEqual(expected);
      await expect(sanitize(schema)(entity)).resolves.toEqual(expected);
      expect(entity.users).toBe(users);
    }
  );
});
