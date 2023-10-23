import { appendSearchParamsToUrl } from '..';

describe('appendSearchParamsToUrl', () => {
  const updateTime = '2023-07-19T03:00:00.000Z';

  test('returns undefined for undefined url string', () => {
    expect(appendSearchParamsToUrl({})).toBeUndefined();
    expect(
      appendSearchParamsToUrl({ url: undefined, params: { updatedAt: updateTime } })
    ).toBeUndefined();
  });

  describe('absoluteURL', () => {
    const url = 'https://example.com/';

    test('returns original string with no update time', () => {
      expect(appendSearchParamsToUrl({ url, params: undefined })).toMatchInlineSnapshot(
        `"https://example.com/"`
      );
      expect(appendSearchParamsToUrl({ url, params: 'notAnObject' })).toMatchInlineSnapshot(
        `"https://example.com/"`
      );
      expect(
        appendSearchParamsToUrl({ url, params: { updatedAt: undefined } })
      ).toMatchInlineSnapshot(`"https://example.com/"`);
    });

    test('appends update time to string with no search params', () => {
      expect(
        appendSearchParamsToUrl({ url, params: { updatedAt: updateTime } })
      ).toMatchInlineSnapshot(`"https://example.com/?updatedAt=2023-07-19T03%3A00%3A00.000Z"`);
    });

    test('appends update time to string with search params', () => {
      expect(
        appendSearchParamsToUrl({ url: `${url}?query=test`, params: { updatedAt: updateTime } })
      ).toMatchInlineSnapshot(
        `"https://example.com/?query=test&updatedAt=2023-07-19T03%3A00%3A00.000Z"`
      );
    });

    test('appends multiple search params', () => {
      expect(
        appendSearchParamsToUrl({ url, params: { param1: 'example1', param2: 'example2' } })
      ).toMatchInlineSnapshot(`"https://example.com/?param1=example1&param2=example2"`);
    });
  });

  describe('relativeURL', () => {
    let originalBackendURL;

    beforeAll(() => {
      /**
       * internally, we append whatever URL you pass to appendSearchParamsToUrl
       * with the backendURL from the strapi window object, here we overwrite it
       * just so it's clear what the expected output is.
       */
      originalBackendURL = window.strapi.backendURL;
      window.strapi.backendURL = 'https://appending-search-params.com';
    });

    afterAll(() => {
      if (originalBackendURL) {
        window.strapi.backendURL = originalBackendURL;
      }
    });

    const url = '/uploads/image.jpg';

    test('returns original string with no update time', () => {
      expect(appendSearchParamsToUrl({ url, params: undefined })).toMatchInlineSnapshot(
        `"/uploads/image.jpg"`
      );
      expect(appendSearchParamsToUrl({ url, params: 'notAnObject' })).toMatchInlineSnapshot(
        `"/uploads/image.jpg"`
      );
      expect(
        appendSearchParamsToUrl({ url, params: { updatedAt: undefined } })
      ).toMatchInlineSnapshot(`"https://appending-search-params.com/uploads/image.jpg"`);
    });

    test('appends update time to string with no search params', () => {
      expect(
        appendSearchParamsToUrl({ url, params: { updatedAt: updateTime } })
      ).toMatchInlineSnapshot(
        `"https://appending-search-params.com/uploads/image.jpg?updatedAt=2023-07-19T03%3A00%3A00.000Z"`
      );
    });

    test('appends update time to string with search params', () => {
      expect(
        appendSearchParamsToUrl({ url: `${url}?query=test`, params: { updatedAt: updateTime } })
      ).toMatchInlineSnapshot(
        `"https://appending-search-params.com/uploads/image.jpg?query=test&updatedAt=2023-07-19T03%3A00%3A00.000Z"`
      );
    });

    test('appends multiple search params', () => {
      expect(
        appendSearchParamsToUrl({ url, params: { param1: 'example1', param2: 'example2' } })
      ).toMatchInlineSnapshot(
        `"https://appending-search-params.com/uploads/image.jpg?param1=example1&param2=example2"`
      );
    });
  });
});
