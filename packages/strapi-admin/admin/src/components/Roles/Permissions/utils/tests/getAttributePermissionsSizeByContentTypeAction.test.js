import { permissions, contentTypes } from './data';
import getAttributePermissionsSizeByContentTypeAction from '../getAttributePermissionsSizeByContentTypeAction';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getAttributePermissionsSizeByContentTypeAction', () => {
  it('should return the number of permissions of a content type by action', () => {
    const actual = getAttributePermissionsSizeByContentTypeAction(
      permissions.contentTypesPermissions,
      contentTypes[0].uid,
      'plugins::content-manager.explorer.read'
    );

    expect(actual).toEqual(4);
  });
});
