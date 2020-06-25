import { permissions, contentTypes } from './data';
import getAllAttributesActionsSize from '../getAllAttributesActionsSize';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getAllAttributesActionsSize', () => {
  it('should return the number of actions for a content type', () => {
    const actual = getAllAttributesActionsSize(
      contentTypes[0].uid,
      permissions.contentTypesPermissions
    );

    expect(actual).toEqual(9);
  });
});
