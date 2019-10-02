const { isSortable, isVisible } = require('../attributes');

const createMockSchema = (attrs, { timestamps = true, options } = {}) => {
  return {
    options: {
      timestamps: timestamps ? ['createdAt', 'updatedAt'] : false,
      ...options,
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
              type: 'timestampUpdate',
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
      const customIdSchema = createMockSchema(
        {
          customId: {
            type: 'integer',
          },
        },
        {
          options: {
            idAttribute: 'customId',
            idAttributeType: 'integer',
          },
        }
      );
      expect(isSortable(customIdSchema, 'customId')).toBe(true);
    });

    test('Timestamps are sortable', () => {
      expect(
        isSortable(createMockSchema({}, { timestamps: true }), 'createdAt')
      ).toBe(true);
      expect(
        isSortable(createMockSchema({}, { timestamps: true }), 'updatedAt')
      ).toBe(true);
      expect(
        isSortable(createMockSchema({}, { timestamps: false }), 'createdAt')
      ).toBe(false);
    });

    test('Group fields are not sortable', () => {
      const schema = createMockSchema({
        someGroup: {
          type: 'group',
        },
      });

      expect(isSortable(schema, 'someGroup')).toBe(false);
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
