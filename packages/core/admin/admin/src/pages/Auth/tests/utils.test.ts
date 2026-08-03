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

  it.each([
    ['no search string', ''],
    ['an unrelated param', '?foo=bar'],
    ['an empty `redirectTo`', '?redirectTo='],
  ])('falls back to the home page with %s', (_label, search) => {
    expect(getRedirectTo(search)).toBe('/');
  });

  it('falls back to the home page when `redirectTo` is malformed', () => {
    // `decodeURIComponent` throws a URIError on incomplete percent-encoding
    expect(getRedirectTo('?redirectTo=%E0%A4%A')).toBe('/');
  });
});
