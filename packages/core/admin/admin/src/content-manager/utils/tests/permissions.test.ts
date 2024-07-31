import { permissions } from '../../tests/data';
import { getFieldsActionMatchingPermissions } from '../permissions';

describe('permissions', () => {
  describe('getFieldsActionMatchingPermissions', () => {
    it('should return an object with all the allowed action for the fields', () => {
      const expected = {
        createActionAllowedFields: [],
        readActionAllowedFields: ['name', 'description', 'test'],
        updateActionAllowedFields: ['name', 'description'],
      };

      expect(getFieldsActionMatchingPermissions(permissions, 'api::article.article')).toEqual(
        expected
      );
    });
  });
});
