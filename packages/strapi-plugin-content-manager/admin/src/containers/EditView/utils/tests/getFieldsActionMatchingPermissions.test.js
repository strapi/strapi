import getFieldsActionMatchingPermissions from '../getFieldsActionMatchingPermissions';
import { testData } from '../../../../testUtils';

const { permissions } = testData;

describe('CONTENT MANAGER | CONTAINERS | EditViewDataManager | utils | getFieldsActionMatchingPermissions', () => {
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
