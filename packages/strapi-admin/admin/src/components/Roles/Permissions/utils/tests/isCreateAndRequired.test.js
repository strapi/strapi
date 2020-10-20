import isCreateAndRequired from '../isCreateAndRequired';
import { contentManagerPermissionPrefix } from '../permissonsConstantsActions';

describe('ADMIN | COMPONENTS | ROLE | UTILS | isCreateAndRequired', () => {
  it('should return true if the attribute is required and the action is create', () => {
    expect(
      isCreateAndRequired({ required: true }, `${contentManagerPermissionPrefix}.create`)
    ).toBeTruthy();
  });

  it('should return false if the attribute is required and the action is not create', () => {
    expect(
      isCreateAndRequired({ required: true }, `${contentManagerPermissionPrefix}.read`)
    ).toBeFalsy();
  });

  it('should return false if the attribute is not required and the action is create', () => {
    expect(
      isCreateAndRequired({ required: false }, `${contentManagerPermissionPrefix}.create`)
    ).toBeFalsy();
  });

  it('should return false if the attribute is not required and the action is not create', () => {
    expect(
      isCreateAndRequired({ required: false }, `${contentManagerPermissionPrefix}.read`)
    ).toBeFalsy();
  });
});
