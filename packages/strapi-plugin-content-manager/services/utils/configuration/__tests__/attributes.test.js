const {
  isSortable,
  isEditable,
  hasEditableAttribute,
  hasListableAttribute,
  hasRelationAttribute,
} = require('../attributes');

describe('attributesUtils', () => {
  describe('isSortable', () => {
    test('The id attribute is always sortable', () => {
      expect(isSortable({}, 'id')).toBe(true);
    });

    test('Group fields are not sortable', () => {
      expect(
        isSortable(
          {
            allAttributes: {
              someGroup: {
                type: 'group',
              },
            },
          },
          'someGroup'
        )
      ).toBe(false);
    });

    test('Json fields are not sortable', () => {
      expect(
        isSortable(
          {
            allAttributes: {
              jsonInput: {
                type: 'json',
              },
            },
          },
          'jsonInput'
        )
      ).toBe(false);
    });

    test('Relations are not sortable', () => {
      expect(
        isSortable(
          {
            allAttributes: {
              oneWayRel: {
                model: 'someModel',
              },
            },
          },
          'oneWayRel'
        )
      ).toBe(false);

      expect(
        isSortable(
          {
            allAttributes: {
              manyWayRel: {
                collection: 'someModel',
              },
            },
          },
          'manyWayRel'
        )
      ).toBe(false);
    });
  });

  describe('isEditable', () => {
    test('Check if the attribute is in a model attributes', () => {
      expect(
        isEditable(
          {
            attributes: {
              field: {
                type: 'string',
              },
            },
          },
          'field'
        )
      ).toBe(true);

      expect(
        isEditable(
          {
            attributes: {
              field: {
                type: 'string',
              },
            },
          },
          'createdAt'
        )
      ).toBe(false);
    });
  });

  describe('hasEditableAttribute', () => {
    test('Check if the attribute exists and is not a relation', () => {
      const model = {
        allAttributes: {
          rel1: {
            model: 'someModel',
          },
          rel2: {
            collection: 'someModel',
          },
          title: {
            type: 'string',
          },
        },
      };

      expect(hasEditableAttribute(model, 'rel1')).toBe(false);
      expect(hasEditableAttribute(model, 'rel2')).toBe(false);
      expect(hasEditableAttribute(model, 'unkown')).toBe(false);
      expect(hasEditableAttribute(model, 'title')).toBe(true);
    });
  });

  describe('hasListableAttribute', () => {
    test('Ids are listable', () => {
      expect(hasListableAttribute({}, 'id')).toBe(true);
    });

    test('Unknown attributes are not listable', () => {
      const model = {
        allAttributes: {
          rel1: {
            model: 'someModel',
          },
          rel2: {
            collection: 'someModel',
          },
          title: {
            type: 'string',
          },
        },
      };

      expect(hasListableAttribute(model, 'unkown')).toBe(false);
    });

    test('Group attributes are not listable', () => {
      const model = {
        allAttributes: {
          someGroup: {
            type: 'group',
          },
        },
      };

      expect(hasListableAttribute(model, 'someGroup')).toBe(false);
    });

    test('JSON attributes are not listable', () => {
      const model = {
        allAttributes: {
          someJson: {
            type: 'json',
          },
        },
      };

      expect(hasListableAttribute(model, 'someJson')).toBe(false);
    });

    test('Relations are not listable', () => {
      const model = {
        allAttributes: {
          rel1: {
            model: 'someModel',
          },
          rel2: {
            collection: 'someModel',
          },
          title: {
            type: 'string',
          },
        },
      };

      expect(hasListableAttribute(model, 'rel1')).toBe(false);
      expect(hasListableAttribute(model, 'rel2')).toBe(false);
      expect(hasListableAttribute(model, 'title')).toBe(true);
    });
  });

  describe('hasRelationAttribute', () => {
    test('Only validate relational attributes', () => {
      const model = {
        allAttributes: {
          rel1: {
            model: 'someModel',
          },
          rel2: {
            collection: 'someModel',
          },
          title: {
            type: 'string',
          },
        },
      };

      expect(hasRelationAttribute(model, 'rel1')).toBe(true);
      expect(hasRelationAttribute(model, 'rel2')).toBe(true);
      expect(hasRelationAttribute(model, 'unkown')).toBe(false);
      expect(hasRelationAttribute(model, 'title')).toBe(false);
    });
  });
});
