import { describe, test, expect } from 'vitest';
import { isAllowedRedirectUri, isRegisteredRedirectUri } from '../redirect-uri';

describe('redirect-uri', () => {
  describe('isAllowedRedirectUri', () => {
    test.each([
      ['https://example.com/callback'],
      ['https://example.com/callback?foo=bar'],
      ['http://localhost/callback'],
      ['http://localhost:33418/callback'],
      ['http://127.0.0.1:8080/cb'],
      ['http://[::1]:8080/cb'],
      ['http://app.localhost/cb'],
      ['myapp://oauth/callback'],
      ['com.example.app:/callback'],
    ])('allows %s', (uri) => {
      expect(isAllowedRedirectUri(uri)).toBe(true);
    });

    test.each([
      ['http://example.com/callback'], // plain http off loopback
      ['http://localhost.evil.com/cb'],
      ['https://example.com/callback#fragment'],
      // eslint-disable-next-line no-script-url
      ['javascript:alert(1)'],
      ['data:text/html,x'],
      ['file:///etc/passwd'],
      ['vbscript:x'],
      ['blob:https://example.com/x'],
      ['not a url'],
      [''],
      [undefined],
      [42],
    ])('rejects %s', (uri) => {
      expect(isAllowedRedirectUri(uri)).toBe(false);
    });
  });

  describe('isRegisteredRedirectUri', () => {
    const registered = ['https://example.com/cb', 'myapp://callback'];

    test('requires an exact string match', () => {
      expect(isRegisteredRedirectUri(registered, 'https://example.com/cb')).toBe(true);
      expect(isRegisteredRedirectUri(registered, 'https://example.com/cb/')).toBe(false);
      expect(isRegisteredRedirectUri(registered, 'https://example.com/cb?x=1')).toBe(false);
      expect(isRegisteredRedirectUri(registered, 'HTTPS://EXAMPLE.COM/CB')).toBe(false);
    });

    test('rejects non-array registrations and non-string requests', () => {
      expect(isRegisteredRedirectUri('https://example.com/cb', 'https://example.com/cb')).toBe(
        false
      );
      expect(isRegisteredRedirectUri(registered, undefined)).toBe(false);
    });
  });
});
