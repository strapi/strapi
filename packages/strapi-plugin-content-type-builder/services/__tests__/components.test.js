const { createSchema, createComponentUID } = require('../Components');

describe('Component Service', () => {
  describe('createSchema', () => {
    test('Formats schema and create default values', () => {
      const input = {
        category: 'default',
        name: 'Some name',
        attributes: {},
      };

      global.strapi = {
        config: {
          defaultEnvironment: {
            database: {
              defaultConnection: 'default',
            },
          },
        },
      };

      const expected = {
        info: {
          name: 'Some name',
          description: '',
        },
        connection: 'default',
        collectionName: 'components_default_some_names',
        attributes: {},
      };

      expect(createSchema(input)).toEqual(expected);
    });

    test('Accepts overrides', () => {
      const input = {
        name: 'Some name',
        connection: 'custom',
        collectionName: 'collection_name',
        attributes: {},
      };

      const expected = {
        info: {
          name: 'Some name',
          description: '',
        },
        connection: 'custom',
        collectionName: 'collection_name',
        attributes: {},
      };

      expect(createSchema(input)).toEqual(expected);
    });
  });

  describe('createComponentUID', () => {
    test('Generats normalized uids', () => {
      expect(
        createComponentUID({ category: 'default', name: 'some char' })
      ).toBe('default.some_char');

      expect(
        createComponentUID({ category: 'default', name: 'some-char' })
      ).toBe('default.some_char');

      expect(
        createComponentUID({ category: 'default', name: 'Some Char' })
      ).toBe('default.some_char');
    });
  });
});
