import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';
import { createMcpAdminTokenAuthenticator } from '../authentication';

describe('createMcpAdminTokenAuthenticator', () => {
  let authenticateAdminToken: Mock;
  let authenticator: ReturnType<typeof createMcpAdminTokenAuthenticator>;

  beforeEach(() => {
    authenticateAdminToken = vi.fn();
    authenticator = createMcpAdminTokenAuthenticator({
      service: (uid: string) =>
        uid === 'admin::api-token-admin' ? { authenticateAdminToken } : undefined,
    } as unknown as Core.Strapi);
  });

  test('uses the admin api-token service from the services registry, so extensions apply', async () => {
    // The services registry returns the extended service; `strapi.admin.services` keeps the
    // original one, because `extend()` writes only to the registry
    const originalAuthenticateAdminToken = vi.fn();
    const extendedAuthenticateAdminToken = vi.fn().mockResolvedValue({
      authenticated: false,
      error: new Error('Rejected by the extension'),
    });
    const extendedAuthenticator = createMcpAdminTokenAuthenticator({
      admin: {
        services: {
          'api-token-admin': { authenticateAdminToken: originalAuthenticateAdminToken },
        },
      },
      service: (uid: string) =>
        uid === 'admin::api-token-admin'
          ? { authenticateAdminToken: extendedAuthenticateAdminToken }
          : undefined,
    } as unknown as Core.Strapi);

    const result = await extendedAuthenticator.authenticate(makeCtx('Bearer some-token'));

    expect(result).toEqual({
      authenticated: false,
      reason: 'invalid_token',
      error: expect.any(Error),
    });
    expect(extendedAuthenticateAdminToken).toHaveBeenCalledWith('some-token');
    expect(originalAuthenticateAdminToken).not.toHaveBeenCalled();
  });

  const makeCtx = (authorization?: string) =>
    ({
      request: {
        header: authorization === undefined ? {} : { authorization },
      },
    } as any);

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
    const ability = { can: vi.fn() };
    authenticateAdminToken.mockResolvedValue({
      authenticated: true,
      credentials: { id: 7, adminUserOwner: { id: 42 } },
      user: { id: 42 },
      ability,
    });

    const result = await authenticator.authenticate(makeCtx('Bearer good-token'));

    expect(result).toEqual({
      authenticated: true,
      credentials: { id: 7, adminUserOwner: { id: 42 } },
      user: { id: 42 },
      ability,
    });
    expect(authenticateAdminToken).toHaveBeenCalledWith('good-token');
  });
});
