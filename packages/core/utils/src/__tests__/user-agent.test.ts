import { parseUserAgent, getDeviceName } from '../user-agent';

describe('parseUserAgent', () => {
  it('returns an empty object for missing or invalid input', () => {
    expect(parseUserAgent(undefined)).toEqual({});
    expect(parseUserAgent(null)).toEqual({});
    expect(parseUserAgent('')).toEqual({});
    // @ts-expect-error testing runtime guard
    expect(parseUserAgent(123)).toEqual({});
  });

  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      { browser: 'Chrome', os: 'macOS', deviceName: 'Chrome on macOS' },
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      { browser: 'Edge', os: 'Windows', deviceName: 'Edge on Windows' },
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      { browser: 'Firefox', os: 'Windows', deviceName: 'Firefox on Windows' },
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      { browser: 'Safari', os: 'iOS', deviceName: 'Safari on iOS' },
    ],
    [
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      { browser: 'Chrome', os: 'Android', deviceName: 'Chrome on Android' },
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      { browser: 'Safari', os: 'macOS', deviceName: 'Safari on macOS' },
    ],
  ])('parses %s', (ua, expected) => {
    expect(parseUserAgent(ua)).toEqual(expected);
  });

  it('falls back to OS-only or browser-only labels', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0)')).toEqual({
      os: 'Windows',
      deviceName: 'Windows',
    });
  });

  it('returns undefined deviceName for unrecognized agents', () => {
    expect(getDeviceName('node-superagent/3.8.3')).toBeUndefined();
    expect(getDeviceName('curl/8.1.2')).toBeUndefined();
  });
});
