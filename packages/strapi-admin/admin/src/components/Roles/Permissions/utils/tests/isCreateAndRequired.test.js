import isCreateAndRequired from '../isCreateAndRequired';
import { CONTENT_MANAGER_PREFIX } from '../permissonsConstantsActions';

describe('ADMIN | COMPONENTS | ROLE | UTILS | isCreateAndRequired', () => {
  it('should return true if the attribute is required and the action is create', () => {
    expect(
      isCreateAndRequired({ required: true }, `${CONTENT_MANAGER_PREFIX}.create`)
    ).toBeTruthy();
  });

  it('should return false if the attribute is required and the action is not create', () => {
    expect(isCreateAndRequired({ required: true }, `${CONTENT_MANAGER_PREFIX}.read`)).toBeFalsy();
  });

  it('should return false if the attribute is not required and the action is create', () => {
    expect(
      isCreateAndRequired({ required: false }, `${CONTENT_MANAGER_PREFIX}.create`)
    ).toBeFalsy();
  });

  it('should return false if the attribute is not required and the action is not create', () => {
    expect(isCreateAndRequired({ required: false }, `${CONTENT_MANAGER_PREFIX}.read`)).toBeFalsy();
  });
});
