import getExistingActions from '../getExistingActions';
import data from './data';

describe('ADMIN | utils | getExistingActions', () => {
  it('should return the existing actions', () => {
    const existingActions = getExistingActions(data.contentTypesPermissions);

    expect(existingActions).toEqual([
      'plugins::content-manager.explorer.create',
      'plugins::content-manager.explorer.update',
      'plugins::content-manager.explorer.read',
      'plugins::content-manager.explorer.delete',
    ]);
  });
});
