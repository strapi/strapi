import { getDisplayName } from '../users';

describe('getDisplayName', () => {
  it('should return username if username is defined', () => {
    expect(
      getDisplayName({
        username: 'johnDoe',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@doe.com',
      })
    ).toEqual('johnDoe');
  });

  it('should return firstname and lastname if firstname is defined', () => {
    expect(
      getDisplayName({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@doe.com',
      })
    ).toEqual('John Doe');
  });

  it('should return email if username and firstname are not defined', () => {
    expect(
      getDisplayName({
        email: 'john@doe.com',
      })
    ).toEqual('john@doe.com');
  });
});
