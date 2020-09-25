import { permissions, contentTypes } from './data';
import getContentTypesActionsSize from '../getContentTypesActionsSize';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getContentTypesActionsSize', () => {
  it('should return the number of content type actions', () => {
    const actual = getContentTypesActionsSize(
      contentTypes,
      permissions.contentTypesPermissions,
      'plugins::content-manager.explorer.delete'
    );

    expect(actual).toEqual(1);
  });
});
