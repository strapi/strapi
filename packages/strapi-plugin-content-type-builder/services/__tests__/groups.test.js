const { createSchema, createGroupUID } = require('../Groups');

describe('Group Service', () => {
  describe('createSchema', () => {
    test('Formats schema and create default values', () => {
      const input = {
        name: 'Some name',
        attributes: {},
      };

      const expected = {
        info: {
          name: 'Some name',
          description: '',
        },
        connection: 'default',
        collectionName: 'groups_some_names',
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

  describe('createGroupUID', () => {
    test('Generats normalized uids', () => {
      expect(createGroupUID('some char')).toBe('some_char');
      expect(createGroupUID('some-char')).toBe('some_char');
      expect(createGroupUID('Some Char')).toBe('some_char');
    });
  });
});
