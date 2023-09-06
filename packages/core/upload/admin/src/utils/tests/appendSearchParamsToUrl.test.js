import { appendSearchParamsToUrl } from '..';

describe('appendSearchParamsToUrl', () => {
  const absoluteUrlString = 'https://example.com/';
  const relativeUrlString = '/uploads/image.jpg';
  const updateTime = '2023-07-19T03:00:00.000Z';

  test('returns undefined for undefined url string', () => {
    expect(appendSearchParamsToUrl({})).toBeUndefined();
    expect(
      appendSearchParamsToUrl({ url: undefined, params: { updatedAt: updateTime } })
    ).toBeUndefined();
  });

  test('returns original string with no update time', () => {
    expect(appendSearchParamsToUrl({ url: absoluteUrlString, params: undefined })).toEqual(
      absoluteUrlString
    );
    expect(appendSearchParamsToUrl({ url: relativeUrlString, params: undefined })).toEqual(
      relativeUrlString
    );
    expect(appendSearchParamsToUrl({ url: absoluteUrlString, params: 'notAnObject' })).toEqual(
      absoluteUrlString
    );
    expect(appendSearchParamsToUrl({ url: relativeUrlString, params: 'notAnObject' })).toEqual(
      relativeUrlString
    );
    expect(
      appendSearchParamsToUrl({ url: absoluteUrlString, params: { updatedAt: undefined } })
    ).toEqual(absoluteUrlString);
    expect(
      appendSearchParamsToUrl({ url: relativeUrlString, params: { updatedAt: undefined } })
    ).toEqual(relativeUrlString);
  });

  test('appends update time to string with no search params', () => {
    const expectedAbsolute = `${absoluteUrlString}?updatedAt=${updateTime.replaceAll(':', '%3A')}`;
    const expectedRelative = `${relativeUrlString}?updatedAt=${updateTime.replaceAll(':', '%3A')}`;

    expect(
      appendSearchParamsToUrl({ url: absoluteUrlString, params: { updatedAt: updateTime } })
    ).toEqual(expectedAbsolute);
    expect(
      appendSearchParamsToUrl({ url: relativeUrlString, params: { updatedAt: updateTime } })
    ).toEqual(expectedRelative);
  });

  test('appends update time to string with search params', () => {
    const absoluteUrlWithQuery = `${absoluteUrlString}?query=test`;
    const expectedAbsolute = `${absoluteUrlWithQuery}&updatedAt=${updateTime.replaceAll(
      ':',
      '%3A'
    )}`;
    const relativeUrlWithQuery = `${relativeUrlString}?query=test`;
    const expectedRelative = `${relativeUrlWithQuery}&updatedAt=${updateTime.replaceAll(
      ':',
      '%3A'
    )}`;

    expect(
      appendSearchParamsToUrl({ url: absoluteUrlWithQuery, params: { updatedAt: updateTime } })
    ).toEqual(expectedAbsolute);
    expect(
      appendSearchParamsToUrl({ url: relativeUrlWithQuery, params: { updatedAt: updateTime } })
    ).toEqual(expectedRelative);
  });

  test('appends multiple search params', () => {
    const param1 = 'example1';
    const param2 = 'example2';
    const expectedAbsolute = `${absoluteUrlString}?param1=${param1}&param2=${param2}`;
    const expectedRelative = `${relativeUrlString}?param1=${param1}&param2=${param2}`;

    expect(appendSearchParamsToUrl({ url: absoluteUrlString, params: { param1, param2 } })).toEqual(
      expectedAbsolute
    );
    expect(appendSearchParamsToUrl({ url: relativeUrlString, params: { param1, param2 } })).toEqual(
      expectedRelative
    );
  });
});
