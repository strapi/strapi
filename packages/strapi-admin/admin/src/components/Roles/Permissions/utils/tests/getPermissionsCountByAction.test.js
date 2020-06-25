import { permissions, contentTypes } from './data';
import getPermissionsCountByAction from '../getPermissionsCountByAction';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getPermissionsCountByAction', () => {
  it('should return the number of attributes for all content types', () => {
    const actual = getPermissionsCountByAction(
      contentTypes,
      permissions.contentTypesPermissions,
      'plugins::content-manager.explorer.create'
    );
    expect(actual).toEqual(7);
  });
});
