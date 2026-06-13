import type { Core } from '@strapi/types';
import { createMcpAdminTokenAuthenticator } from '../authentication';

describe('createMcpAdminTokenAuthenticator', () => {
  let authenticateAdminToken: jest.Mock;
  let authenticator: ReturnType<typeof createMcpAdminTokenAuthenticator>;

  beforeEach(() => {
    authenticateAdminToken = jest.fn();
    authenticator = createMcpAdminTokenAuthenticator({
      admin: {
        services: {
          'api-token-admin': {
            authenticateAdminToken,
          },
        },
      },
    } as unknown as Core.Strapi);
  });

  const makeCtx = (authorization?: string) =>
    ({
      request: {
        header: authorization === undefined ? {} : { authorization },
      },
    }) as any;

  test('returns missing_token when authorization header is absent', async () => {
    const result = await authenticator.authenticate(makeCtx());

    expect(result).toEqual({ authenticated: false, reason: 'missing_token' });
    expect(authenticateAdminToken).not.toHaveBeenCalled();
  });

  test('returns missing_token when authorization header is malformed', async () => {
    const result = await authenticator.authenticate(makeCtx('Token abc123'));

    expect(result).toEqual({ authenticated: false, reason: 'missing_token' });
    expect(authenticateAdminToken).not.toHaveBeenCalled();
  });

  test('returns invalid_token when admin token authentication fails', async () => {
    authenticateAdminToken.mockResolvedValue({
      authenticated: false,
      error: new Error('Invalid token'),
    });

    const result = await authenticator.authenticate(makeCtx('Bearer bad-token'));

    expect(result).toEqual({
      authenticated: false,
      reason: 'invalid_token',
      error: expect.any(Error),
    });
    expect(authenticateAdminToken).toHaveBeenCalledWith('bad-token');
  });

  test('returns authenticated user context when admin token is valid', async () => {
    const ability = { can: jest.fn() };
    authenticateAdminToken.mockResolvedValue({
      authenticated: true,
      credentials: { id: 42 },
      user: { id: 42 },
      ability,
    });

    const result = await authenticator.authenticate(makeCtx('Bearer good-token'));

    expect(result).toEqual({
      authenticated: true,
      credentials: { id: 42 },
      user: { id: 42 },
      ability,
    });
    expect(authenticateAdminToken).toHaveBeenCalledWith('good-token');
  });
});
