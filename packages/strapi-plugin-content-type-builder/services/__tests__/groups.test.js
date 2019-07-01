const { createSchema, updateSchema, createGroupUID } = require('../Groups');

describe('Group Service', () => {
  describe('createSchema', () => {
    test('Formats schema and create default values', () => {
      const input = {
        name: 'Some name',
        attributes: {},
      };

      const expected = {
        name: 'Some name',
        connection: 'default',
        collectionName: 'some_names',
        attributes: {},
      };

      expect(createSchema(input)).toStrictEqual(expected);
    });

    test('Accepts overrides', () => {
      const input = {
        name: 'Some name',
        connection: 'custom',
        collectionName: 'collection_name',
        attributes: {},
      };

      const expected = {
        name: 'Some name',
        connection: 'custom',
        collectionName: 'collection_name',
        attributes: {},
      };

      expect(createSchema(input)).toStrictEqual(expected);
    });
  });

  describe('createGroupUID', () => {
    test('Generats normalized uids', () => {
      expect(createGroupUID('some char')).toBe('some_char');
      expect(createGroupUID('some-char')).toBe('some_char');
      expect(createGroupUID('Some Char')).toBe('some_char');
    });
  });

  describe('updateSchema', () => {
    test('Overrides values currently', () => {
      const oldSchema = {
        name: 'oldName',
        connection: 'oldConnection',
        collectionName: 'oldCollectionName',
        attributes: {},
      };

      expect(
        updateSchema(oldSchema, {
          name: 'new Name',
          connection: 'newConnection',
        })
      ).toStrictEqual({
        name: 'new Name',
        connection: 'newConnection',
        collectionName: 'oldCollectionName',
        attributes: {},
      });
    });

    test('Ingores extra fields', () => {
      const oldSchema = {
        name: 'oldName',
        connection: 'oldConnection',
        collectionName: 'oldCollectionName',
        attributes: {},
      };

      expect(
        updateSchema(oldSchema, {
          extraField: 'ingore',
        })
      ).toStrictEqual(oldSchema);
    });
  });
});
