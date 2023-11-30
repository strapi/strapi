import { getDisplayName } from '../users';

const mockFormatMessage = jest.fn((message, values) => {
  return `${values.firstname} ${values.lastname}`;
});

describe('getDisplayName', () => {
  it('should return username if username is defined', () => {
    expect(
      getDisplayName(
        {
          username: 'johnDoe',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@doe.com',
        },
        mockFormatMessage
      )
    ).toEqual('johnDoe');
  });

  it('should return firstname and lastname if firstname is defined', () => {
    expect(
      getDisplayName(
        {
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@doe.com',
        },
        mockFormatMessage
      )
    ).toEqual('John Doe');
  });

  it('should return email if username and firstname are not defined', () => {
    expect(
      getDisplayName(
        {
          email: 'john@doe.com',
        },
        mockFormatMessage
      )
    ).toEqual('john@doe.com');
  });
});
