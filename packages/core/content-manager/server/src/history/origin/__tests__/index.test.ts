import { resolveHistoryOrigin, type RequestContext } from '..';

const createCtx = (pluginName: string, strategyName: string) =>
  ({
    state: {
      user: { id: 1 },
      route: { info: { pluginName, type: 'admin' } },
      auth: { strategy: { name: strategyName }, credentials: { id: 2 } },
    },
  }) as unknown as RequestContext;

describe('resolveHistoryOrigin', () => {
  it('resolves an admin session on a Content Manager route to the admin', () => {
    expect(resolveHistoryOrigin(createCtx('content-manager', 'admin'))).toEqual({
      source: 'admin-panel',
      author: { type: 'person', model: 'admin::user', id: '1' },
    });
  });

  it('resolves an admin token on a Content Manager route to the token, not its owner', () => {
    expect(resolveHistoryOrigin(createCtx('content-manager', 'admin-token'))).toEqual({
      source: 'admin-api',
      author: { type: 'token', model: 'admin::api-token', id: '2' },
    });
  });

  it('resolves nothing on another admin route', () => {
    expect(resolveHistoryOrigin(createCtx('admin', 'admin'))).toBeNull();
  });

  it('resolves nothing without a request context', () => {
    expect(resolveHistoryOrigin(undefined)).toBeNull();
  });
});
