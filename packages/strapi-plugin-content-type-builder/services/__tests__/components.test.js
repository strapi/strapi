const { createSchema, createComponentUID } = require('../Components');

describe('Component Service', () => {
  describe('createSchema', () => {
    test('Formats schema and create default values', () => {
      const input = {
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
        collectionName: 'components_some_names',
        attributes: {},
      };

      expect(createSchema('some_name', input)).toEqual(expected);
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

      expect(createSchema('some_name', input)).toEqual(expected);
    });
  });

  describe('createComponentUID', () => {
    test('Generats normalized uids', () => {
      expect(createComponentUID('some char')).toBe('some_char');
      expect(createComponentUID('some-char')).toBe('some_char');
      expect(createComponentUID('Some Char')).toBe('some_char');
    });
  });
});
