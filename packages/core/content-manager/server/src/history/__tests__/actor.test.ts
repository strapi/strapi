import { resolveHistoryAuthor } from '../actor';

const buildRequestContext = (state: Record<string, unknown>) => ({ state }) as any;

describe('resolveHistoryAuthor', () => {
  it('returns undefined without a request context', () => {
    expect(resolveHistoryAuthor(undefined)).toBeUndefined();
  });

  it('describes an admin user and keeps its id as createdBy', () => {
    const requestContext = buildRequestContext({ user: { id: 1 } });

    expect(resolveHistoryAuthor(requestContext)).toEqual({
      actor: { type: 'admin-user' },
      createdBy: 1,
    });
  });

  it('describes a content API token without createdBy', () => {
    const requestContext = buildRequestContext({
      auth: {
        strategy: { name: 'content-api-token' },
        credentials: { id: 7, name: 'Mobile app', accessKey: 'secret' },
      },
    });

    expect(resolveHistoryAuthor(requestContext)).toEqual({
      actor: { type: 'api-token', token: { id: 7, name: 'Mobile app' } },
    });
  });

  it('describes an end user without createdBy and without the email', () => {
    const requestContext = buildRequestContext({
      user: { id: 3 },
      auth: {
        strategy: { name: 'users-permissions' },
        credentials: { id: 3, username: 'jdoe', email: 'jdoe@example.com' },
      },
    });

    expect(resolveHistoryAuthor(requestContext)).toEqual({
      actor: { type: 'end-user', user: { id: 3, username: 'jdoe' } },
    });
  });

  it('describes a public request as unknown', () => {
    const requestContext = buildRequestContext({
      auth: { strategy: { name: 'users-permissions' }, credentials: null },
    });

    expect(resolveHistoryAuthor(requestContext)).toEqual({ actor: { type: 'unknown' } });
  });

  it('describes a route without authentication as unknown', () => {
    expect(resolveHistoryAuthor(buildRequestContext({}))).toEqual({ actor: { type: 'unknown' } });
  });
});
