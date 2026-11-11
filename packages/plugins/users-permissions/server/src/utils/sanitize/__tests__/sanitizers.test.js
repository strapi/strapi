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

  describe('nested role entities', () => {
    const models = {
      'plugin::users-permissions.role': schema,
      'plugin::users-permissions.user': {
        uid: 'plugin::users-permissions.user',
        attributes: {
          username: { type: 'string' },
          role: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'plugin::users-permissions.role',
          },
        },
      },
      'plugin::upload.file': {
        uid: 'plugin::upload.file',
        attributes: {
          name: { type: 'string' },
          related: { type: 'relation', relation: 'morphToMany' },
        },
      },
      'shared.byline': {
        uid: 'shared.byline',
        attributes: {
          writer: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'plugin::users-permissions.user',
          },
        },
      },
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          title: { type: 'string' },
          author: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'plugin::users-permissions.user',
          },
          cover: { type: 'media' },
          byline: { type: 'component', component: 'shared.byline' },
          blocks: { type: 'dynamiczone', components: ['shared.byline'] },
        },
      },
    };
    const article = models['api::article.article'];

    beforeEach(() => {
      global.strapi = { getModel: jest.fn((uid) => models[uid]) };
    });

    it('returns entities without role users as they are', async () => {
      const entity = {
        title: 'Hello',
        author: { username: 'jane', role: { name: 'Authenticated' } },
        cover: { name: 'cover.png' },
        byline: { writer: { username: 'joe' } },
        blocks: [{ __component: 'shared.byline', writer: null }],
      };

      await expect(defaultSanitizeOutput(article, entity)).resolves.toBe(entity);
    });

    it.each([
      ['a relation', { author: { username: 'jane', role: { name: 'A', users: [{ id: 1 }] } } }],
      ['a component', { byline: { writer: { role: { name: 'A', users: [{ id: 1 }] } } } }],
      [
        'a dynamic zone',
        { blocks: [{ __component: 'shared.byline', writer: { role: { name: 'A', users: [] } } }] },
      ],
      [
        'a morph relation',
        {
          cover: {
            name: 'cover.png',
            related: [{ __type: 'plugin::users-permissions.role', name: 'A', users: null }],
          },
        },
      ],
    ])('removes role users nested in %s', async (_, entity) => {
      const sanitized = await defaultSanitizeOutput(article, entity);

      expect(JSON.stringify(sanitized)).not.toContain('"users"');
      expect(JSON.stringify(entity)).toContain('"users"');
    });
  });
});
