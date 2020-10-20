import { permissions, contentTypes } from './data';
import getAllAttributesActions from '../getAllAttributesActions';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getAllAttributesActions', () => {
  it('should return the number of actions for a content type', () => {
    const actual = getAllAttributesActions(contentTypes[0].uid, permissions.contentTypesPermissions)
      .length;

    expect(actual).toEqual(9);
  });
});
