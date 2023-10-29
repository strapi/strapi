import { cacheBustUrl } from '../cacheBustUrl';

describe('cacheBustUrl', () => {
  const timestamp = '2023-10-19T15:39:24Z';

  const url = 'https://example.com/image.jpg';

  test('returns undefined for undefined url string', () => {
    const result = cacheBustUrl({ url: undefined, timestamp });
    expect(result).toBeUndefined();
  });

  test('appends updatedAt to URL', () => {
    const result = cacheBustUrl({ url, timestamp });
    const expectedUrl = `${url}?updatedAt=${encodeURIComponent(timestamp)}`;
    expect(result).toBe(expectedUrl);
  });

});
