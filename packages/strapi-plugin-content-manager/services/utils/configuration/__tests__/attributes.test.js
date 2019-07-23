const {
  isSortable,
  // isEditable,
  // hasEditableAttribute,
  // hasListableAttribute,
  // hasRelationAttribute,
} = require('../attributes');

describe('attributesUtils', () => {
  describe('isSortable', () => {
    test('The id attribute is always sortable', () => {
      expect(isSortable({}, 'id')).toBe(true);
    });
  });
});
