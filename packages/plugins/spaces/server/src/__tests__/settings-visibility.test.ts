import {
  decideWritableInSpace,
  describeWorkspaceAccess,
  isScopeAllRequestForTests,
} from '../settings-visibility';

describe('decideWritableInSpace', () => {
  it('is always writable from the default workspace', () => {
    expect(decideWritableInSpace([], 'default')).toEqual({ writable: true });
    expect(decideWritableInSpace(['acme', 'globex'], 'default')).toEqual({ writable: true });
  });

  it('is writable from a sub-workspace only when bound to it alone', () => {
    expect(decideWritableInSpace(['acme'], 'acme')).toEqual({ writable: true });
    expect(decideWritableInSpace([], 'acme')).toEqual({ writable: false, reason: 'platform-wide' });
    expect(decideWritableInSpace(['acme', 'globex'], 'acme')).toEqual({
      writable: false,
      reason: 'multi-bound',
    });
    expect(decideWritableInSpace(['globex'], 'acme')).toEqual({
      writable: false,
      reason: 'multi-bound',
    });
  });

  it('describes the access for the admin', () => {
    expect(describeWorkspaceAccess([], 'acme')).toEqual({
      readOnly: true,
      reason: 'platform-wide',
      boundSlugs: [],
    });
    expect(describeWorkspaceAccess(['acme'], 'acme')).toEqual({
      readOnly: false,
      boundSlugs: ['acme'],
    });
  });
});

describe('isScopeAllRequest', () => {
  const makeStrapi = (query: Record<string, unknown>, spaceSlug?: string) =>
    ({
      requestContext: { get: () => ({ request: { query }, state: { spaceSlug } }) },
    }) as any;

  it('honours ?scope=all from default and headerless callers only', () => {
    expect(isScopeAllRequestForTests(makeStrapi({ scope: 'all' }))).toBe(true);
    expect(isScopeAllRequestForTests(makeStrapi({ scope: 'all' }, 'default'))).toBe(true);
    expect(isScopeAllRequestForTests(makeStrapi({ scope: 'all' }, 'acme'))).toBe(false);
    expect(isScopeAllRequestForTests(makeStrapi({}, 'default'))).toBe(false);
  });
});
