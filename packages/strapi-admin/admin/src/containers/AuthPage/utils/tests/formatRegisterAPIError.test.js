import formatRegisterAPIError from '../formatRegisterAPIError';

describe('ADMIN | CONTAINERS | AuthPage | utils | formatRegisterAPIError', () => {
  it('should return an empty object', () => {
    expect(formatRegisterAPIError({ data: {} })).toEqual({});
  });

  it('should return an empty object in case of error', () => {
    expect(formatRegisterAPIError({})).toEqual({});
  });

  it('should return a formatted object', () => {
    const data = {
      'userInfo.password': ['password must contain at least one number'],
    };
    const expected = {
      'userInfo.password': {
        id: 'password must contain at least one number',
        defaultMessage: 'password must contain at least one number',
      },
    };

    expect(formatRegisterAPIError({ data })).toEqual(expected);
  });
});
