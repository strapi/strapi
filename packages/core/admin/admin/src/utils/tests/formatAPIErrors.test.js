import formatAPIErrors from '../formatAPIErrors';

describe('ADMIN | utils | formatAPIErrors', () => {
  it('should return an empty object', () => {
    expect(formatAPIErrors({ data: {} })).toEqual({});
  });

  it('should return an empty object in case of error', () => {
    expect(formatAPIErrors({})).toEqual({});
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

    expect(formatAPIErrors({ data })).toEqual(expected);
  });
});
