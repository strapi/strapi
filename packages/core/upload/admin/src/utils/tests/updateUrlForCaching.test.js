import { updateUrlForCaching } from '..';

describe('updateUrlForCaching', () => {
  const urlString = 'https://example.com/';
  const updateTime = '2023-07-19T03:00:00.000Z';

  test('returns null for null url string', () => {
    expect(updateUrlForCaching(null, undefined)).toBeNull();
  });

  test('throws error for null url string with updateAt', () => {
    expect(() => updateUrlForCaching(null, updateTime)).toThrowError();
  });

  test('returns original string with no update time', () => {
    expect(updateUrlForCaching(urlString, undefined)).toEqual(urlString);
  });

  test('appends update time to string with no query params', () => {
    const expected = `${urlString}?updatedAt=${updateTime.replaceAll(':', '%3A')}`;

    expect(updateUrlForCaching(urlString, updateTime)).toEqual(expected);
  });

  test('appends update time to string with query params', () => {
    const urlWithQuery = `${urlString}?query=test`;
    const expected = `${urlWithQuery}&updatedAt=${updateTime.replaceAll(':', '%3A')}`;

    expect(updateUrlForCaching(urlWithQuery, updateTime)).toEqual(expected);
  });
});
