const createDefaults = require('../create-defaults');

test('createDefaults', () => {
  const input = {
    field: {
      type: 'text',
      default: 'someVal',
    },
    relation: {
      model: 'model',
      via: 'field',
      default: null, // should be in the defaults
    },
    groupes: {
      type: 'group',
      default: 'azdaz',
    },
    boolField: {
      type: 'boolean',
      default: false,
    },
    azdaz: {
      type: 'invalidType',
      default: 'azdaz',
    },
  };

  const expected = {
    boolField: false,
    field: 'someVal',
  };

  expect(createDefaults(input)).toEqual(expected);
});
