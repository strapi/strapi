import { permissions } from '../../../../testUtils';
import getFieldsActionMatchingPermissions from '../getFieldsActionMatchingPermissions';

describe('CONTENT MANAGER | CONTAINERS | EditView | utils | getFieldsActionMatchingPermissions', () => {
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
