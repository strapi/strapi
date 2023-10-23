import { cacheBustUrl } from '../cacheBustUrl';

describe('cacheBustUrl', () => {
  const timestamp = '2023-10-19T15:39:24Z';

  const urlWithoutTimestamp = 'https://example.com/image.jpg';
  const urlWithUnixTimestamp = 'https://example.com/image.jpg?timestamp=1634645967';
  const urlWithExistingTimestamp = 'https://example.com/image.jpg?updatedAt=2023-10-19T15:39:24Z';
  const urlWithExistingTimestampNoHyphens = 'https://example.com/image.jpg?X-Amz-Date=20231023T093645Z';

  test('returns undefined for undefined url string', () => {
    const result = cacheBustUrl({ url: undefined, timestamp });
    expect(result).toBeUndefined();
  });

  test('appends updatedAt to URL without a timestamp in query params', () => {
    const result = cacheBustUrl({ url: urlWithoutTimestamp, timestamp });
    const expectedUrl = `${urlWithoutTimestamp}?updatedAt=${encodeURIComponent(timestamp)}`;
    expect(result).toBe(expectedUrl);
  });

  test('appends updatedAt to URL with a UNIX timestamp in query params', () => {
    const result = cacheBustUrl({ url: urlWithUnixTimestamp, timestamp });
    const expectedUrl = `https://example.com/image.jpg?timestamp=1634645967&updatedAt=${encodeURIComponent(timestamp)}`;
    expect(result).toBe(expectedUrl);
  });

  test('does not append updatedAt if an ISO 8601 timestamp exists in query params', () => {
    const result = cacheBustUrl({ url: urlWithExistingTimestamp, timestamp });
    expect(result).toBe(urlWithExistingTimestamp);
  });

  test('does not append updatedAt if an ISO 8601 timestamp with milliseconds exists in query params', () => {
    const urlWithMillisecondsTimestamp = 'https://example.com/image.jpg?updatedAt=2023-10-19T15:39:24.123Z';
    const result = cacheBustUrl({ url: urlWithMillisecondsTimestamp, timestamp });
    expect(result).toBe(urlWithMillisecondsTimestamp);
  });

  test('does not append updatedAt if an ISO 8601 timestamp with hyphens exists in query params', () => {
    const result = cacheBustUrl({ url: urlWithExistingTimestampNoHyphens, timestamp });
    expect(result).toBe(urlWithExistingTimestampNoHyphens);
  });
});
