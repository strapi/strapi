/**
 * The auth cookie must be marked Secure when (and only when) the page itself
 * is served over TLS. jsdom pins the page URL per test environment, so the
 * https half of that behaviour lives in this separate file; the http half is
 * asserted in cookies.test.ts at the preset's default http URL.
 *
 * @jest-environment-options {"url": "https://cms.strapi.test/admin", "customExportConditions": [""]}
 */

describe('cookie writes on an https page', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const collectWrites = (fn: (mod: typeof import('../cookies')) => void): string[] => {
    const writes: string[] = [];
    const spy = jest
      .spyOn(document, 'cookie', 'set')
      .mockImplementation((value: string) => writes.push(value));
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        fn(require('../cookies'));
      });
    } finally {
      spy.mockRestore();
    }
    return writes;
  };

  it('marks the token Secure on set', () => {
    const writes = collectWrites((mod) => mod.setCookie('jwtToken', 'abc'));

    const setWrite = writes.find((w) => w.startsWith('jwtToken=abc'));
    expect(setWrite).toContain('; Secure');
  });

  it('keeps expiry writes flag-free (deletion targets the key, not the flag)', () => {
    const writes = collectWrites((mod) => mod.deleteCookie('jwtToken'));

    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every((w) => !w.includes('Secure'))).toBe(true);
  });
});
