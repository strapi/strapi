'use strict';

const { isSortable, isVisible } = require('../attributes');

const createMockSchema = (attrs, timestamps = true) => {
  return {
    options: {
      timestamps: timestamps ? ['createdAt', 'updatedAt'] : false,
    },
    attributes: {
      id: {
        type: 'integer',
      },
      ...attrs,
      ...(timestamps
        ? {
            createdAt: {
              type: 'timestamp',
            },
            updatedAt: {
              type: 'timestamp',
            },
          }
        : {}),
    },
  };
};

describe('attributesUtils', () => {
  describe('isSortable', () => {
    test('The id attribute is always sortable', () => {
      expect(isSortable(createMockSchema({}), 'id')).toBe(true);
    });

    test('Timestamps are sortable', () => {
      expect(isSortable(createMockSchema({}, true), 'createdAt')).toBe(true);
      expect(isSortable(createMockSchema({}, true), 'updatedAt')).toBe(true);
      expect(isSortable(createMockSchema({}, false), 'createdAt')).toBe(false);
    });

    test('Component fields are not sortable', () => {
      const schema = createMockSchema({
        someComponent: {
          type: 'component',
        },
      });

      expect(isSortable(schema, 'someComponent')).toBe(false);
    });

    test('Json fields are not sortable', () => {
      const schema = createMockSchema({
        jsonInput: {
          type: 'json',
        },
      });

      expect(isSortable(schema, 'jsonInput')).toBe(false);
    });

    test('Relations are not sortable', () => {
      const schema = createMockSchema({
        oneWayRel: {
          type: 'relation',
          targetModel: 'someModel',
        },
        manyWayRel: {
          type: 'relation',
          targetModel: 'someModel',
        },
      });

      expect(isSortable(schema, 'oneWayRel')).toBe(false);
      expect(isSortable(schema, 'manyWayRel')).toBe(false);
    });
  });

  describe('isVisible', () => {
    test('Check if the attribute is in a model attributes', () => {
      expect(
        isVisible(
          createMockSchema({
            field: {
              type: 'string',
            },
          }),
          'field'
        )
      ).toBe(true);

      expect(isVisible(createMockSchema({}), 'createdAt')).toBe(false);
    });
  });
});
