import getFullName from '../getFullName';

describe('ADMIN | utils | getFullName', () => {
  it('should return names separated with a space', () => {
    const fullName = getFullName('fn', 'ln');
    expect(fullName).toEqual('fn ln');
  });

  it('should return firstname without trailing spaces', () => {
    const fullName = getFullName('fn', '');
    expect(fullName).toEqual('fn');
  });

  it('should return firstname without trailing spaces', () => {
    const fullName = getFullName('fn', null);
    expect(fullName).toEqual('fn');
  });
});
