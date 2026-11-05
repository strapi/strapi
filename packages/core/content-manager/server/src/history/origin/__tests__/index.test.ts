import { resolveHistoryOrigin, type RequestContext } from '..';

const createCtx = (pluginName: string, strategyName: string) =>
  ({
    state: {
      user: { id: 1, username: 'kai', email: 'kai@test.com' },
      route: { info: { pluginName, type: 'admin' } },
      auth: { strategy: { name: strategyName } },
    },
  }) as unknown as RequestContext;

describe('resolveHistoryOrigin', () => {
  it.each([
    ['an admin session on a Content Manager route', 'content-manager', 'admin', 'admin-panel'],
    ['an admin token on a Content Manager route', 'content-manager', 'admin-token', 'admin-api'],
  ])('resolves %s', (_, pluginName, strategyName, source) => {
    expect(resolveHistoryOrigin(createCtx(pluginName, strategyName))).toEqual({
      source,
      author: { type: 'person', name: 'kai', model: 'admin::user', id: '1' },
    });
  });

  it('resolves nothing on another admin route', () => {
    expect(resolveHistoryOrigin(createCtx('admin', 'admin'))).toBeNull();
  });

  it('resolves nothing without a request context', () => {
    expect(resolveHistoryOrigin(undefined)).toBeNull();
  });
});
