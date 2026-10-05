import { getRedirectTo } from '../utils';

describe('Auth | getRedirectTo', () => {
  it('returns the decoded `redirectTo` param', () => {
    expect(getRedirectTo('?redirectTo=%2Fsettings')).toBe('/settings');
  });

  it('preserves the search params of the redirect target', () => {
    expect(getRedirectTo('?redirectTo=%2Fprotected%3Fhello%3Dworld')).toBe(
      '/protected?hello=world'
    );
  });

  // `URLSearchParams` already decodes, so decoding again would turn the encoded `&` into a
  // real delimiter and split one query value into two.
  it('keeps encoded delimiters inside the redirect target intact', () => {
    expect(getRedirectTo('?redirectTo=%2Ffoo%3Fvalue%3Da%2526b')).toBe('/foo?value=a%26b');
  });

  it.each([
    ['no search string', ''],
    ['an unrelated param', '?foo=bar'],
    ['an empty `redirectTo`', '?redirectTo='],
  ])('falls back to the home page with %s', (_label, search) => {
    expect(getRedirectTo(search)).toBe('/');
  });

  it('falls back to the home page when `redirectTo` is malformed', () => {
    expect(getRedirectTo('?redirectTo=%E0%A4%A')).toBe('/');
  });

  // react-router's history calls `window.location.assign(href)` when `pushState` throws, and
  // `pushState` throws on a cross-origin href, so anything resolving off-app must be rejected.
  it.each([
    ['an absolute https URL', '?redirectTo=https%3A%2F%2Fevil.com'],
    ['a protocol-relative URL', '?redirectTo=%2F%2Fevil.com'],
    ['a double-encoded protocol-relative URL', '?redirectTo=%252F%252Fevil.com'],
    ['a backslash-prefixed URL', '?redirectTo=%2F%5Cevil.com'],
    ['a javascript: URL', '?redirectTo=javascript%3Aalert(1)'],
    ['a relative path', '?redirectTo=settings'],
  ])('rejects open-redirect via %s', (_label, search) => {
    expect(getRedirectTo(search)).toBe('/');
  });
});
