import getFieldsActionMatchingPermissions from '../getFieldsActionMatchingPermissions';
import { permissions } from '../../../../testUtils';

describe('CONTENT MANAGER | CONTAINERS | EditView | utils | getFieldsActionMatchingPermissions', () => {
  it('should return an object with all the allowed action for the fields', () => {
    const expected = {
      createActionAllowedFields: [],
      readActionAllowedFields: ['name', 'description', 'test'],
      updateActionAllowedFields: ['name', 'description'],
    };

    expect(getFieldsActionMatchingPermissions(permissions, 'application::article.article')).toEqual(
      expected
    );
  });
});
