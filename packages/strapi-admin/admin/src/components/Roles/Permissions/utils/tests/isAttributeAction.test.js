import isAttributeAction from '../isAttributeAction';

describe('ADMIN | COMPONENTS | ROLE | UTILS | isAttributeAction', () => {
  it('should return true for the create action', () => {
    expect(isAttributeAction('create')).toBeTruthy();
  });

  it('should return false for the delete action', () => {
    expect(isAttributeAction('delete')).toBeFalsy();
  });
});
