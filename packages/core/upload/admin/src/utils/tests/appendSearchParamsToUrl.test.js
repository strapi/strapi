import { appendSearchParamsToUrl } from '..';

describe('appendSearchParamsToUrl', () => {
  const urlString = 'https://example.com/';
  const updateTime = '2023-07-19T03:00:00.000Z';

  test('returns undefined for undefined url string', () => {
    expect(appendSearchParamsToUrl({})).toBeUndefined();
    expect(appendSearchParamsToUrl({ url: undefined, params: { updatedAt: updateTime }})).toBeUndefined();
  });

  test('returns original string with no update time', () => {
    expect(appendSearchParamsToUrl({ url: urlString, params: undefined })).toEqual(urlString);
    expect(appendSearchParamsToUrl({ url: urlString, params: 'notAnObject' })).toEqual(urlString);
    expect(appendSearchParamsToUrl({ url: urlString, params: { updatedAt: undefined } })).toEqual(urlString);
  });

  test('appends update time to string with no search params', () => {
    const expected = `${urlString}?updatedAt=${updateTime.replaceAll(':', '%3A')}`;

    expect(appendSearchParamsToUrl({ url: urlString, params: { updatedAt: updateTime } })).toEqual(expected);
  });

  test('appends update time to string with search params', () => {
    const urlWithQuery = `${urlString}?query=test`;
    const expected = `${urlWithQuery}&updatedAt=${updateTime.replaceAll(':', '%3A')}`;

    expect(appendSearchParamsToUrl({ url: urlWithQuery, params: { updatedAt: updateTime } })).toEqual(expected);
  });

  test('appends multiple search params', () => {
    const param1 = 'example1';
    const param2 = 'example2';
    const expected = `${urlString}?param1=${param1}&param2=${param2}`;

    expect(appendSearchParamsToUrl({ url: urlString, params: { param1, param2 } })).toEqual(expected);
  });
});
