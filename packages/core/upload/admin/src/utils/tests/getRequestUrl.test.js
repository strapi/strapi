import getRequestUrl from '../getRequestUrl';

describe('upload || utils || getRequestUrl', () => {
  test('return right format url if argument starts with /', () => {
    const result = getRequestUrl('/test');
    const expected = '/upload/test';

    expect(result).toEqual(expected);
  });

  test('return right format url if argument does not start with /', () => {
    const result = getRequestUrl('test');
    const expected = '/upload/test';

    expect(result).toEqual(expected);
  });
});
