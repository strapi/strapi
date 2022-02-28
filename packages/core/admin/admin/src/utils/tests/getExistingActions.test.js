import getExistingActions from '../getExistingActions';
import data from './data';

describe('ADMIN | utils | getExistingActions', () => {
  it('should return the existing actions', () => {
    const existingActions = getExistingActions(data.contentTypesPermissions);

    expect(existingActions).toEqual([
      'plugin::content-manager.explorer.create',
      'plugin::content-manager.explorer.update',
      'plugin::content-manager.explorer.read',
      'plugin::content-manager.explorer.delete',
    ]);
  });
});
