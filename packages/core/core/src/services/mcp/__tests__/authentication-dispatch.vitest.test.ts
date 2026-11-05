import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';
import { createMcpAuthenticationStrategy } from '../authentication';

describe('createMcpAuthenticationStrategy', () => {
  let authenticateAdminToken: Mock;
  let oauthAuthenticate: Mock;
  let isOAuthEnabled: Mock;
  let strategy: ReturnType<typeof createMcpAuthenticationStrategy>;

  beforeEach(() => {
    authenticateAdminToken = vi.fn().mockResolvedValue({
      authenticated: true,
      credentials: { id: 1 },
      user: { id: 1 },
      ability: {},
    });
    oauthAuthenticate = vi.fn().mockResolvedValue({
      authenticated: true,
      credentials: { id: 2 },
      user: { id: 2 },
      ability: {},
    });
    isOAuthEnabled = vi.fn().mockReturnValue(true);

    strategy = createMcpAuthenticationStrategy(
      {
        admin: { services: { 'api-token-admin': { authenticateAdminToken } } },
      } as unknown as Core.Strapi,
      {
        isOAuthEnabled,
        oauthAuthenticator: { authenticate: oauthAuthenticate },
      }
    );
  });

  const makeCtx = (authorization?: string) =>
    ({
      request: {
        header: authorization === undefined ? {} : { authorization },
      },
    }) as any;

  const JWT_SHAPED = 'aaaa.bbbb.cccc';
  const HEX_TOKEN = 'deadbeef'.repeat(32);

  test('returns missing_token without a bearer header', async () => {
    await expect(strategy.authenticate(makeCtx())).resolves.toEqual({
      authenticated: false,
      reason: 'missing_token',
    });
    expect(authenticateAdminToken).not.toHaveBeenCalled();
    expect(oauthAuthenticate).not.toHaveBeenCalled();
  });

  test('routes JWT-shaped tokens to the OAuth authenticator when OAuth is enabled', async () => {
    const result = await strategy.authenticate(makeCtx(`Bearer ${JWT_SHAPED}`));

    expect(result).toMatchObject({ authenticated: true, user: { id: 2 } });
    expect(oauthAuthenticate).toHaveBeenCalledWith(JWT_SHAPED);
    expect(authenticateAdminToken).not.toHaveBeenCalled();
  });

  test('routes hex admin API tokens to the admin token authenticator', async () => {
    const result = await strategy.authenticate(makeCtx(`Bearer ${HEX_TOKEN}`));

    expect(result).toMatchObject({ authenticated: true, user: { id: 1 } });
    expect(authenticateAdminToken).toHaveBeenCalledWith(HEX_TOKEN);
    expect(oauthAuthenticate).not.toHaveBeenCalled();
  });

  test('ignores JWT-shaped tokens when OAuth is disabled', async () => {
    isOAuthEnabled.mockReturnValue(false);
    authenticateAdminToken.mockResolvedValue({ authenticated: false, error: new Error('nope') });

    const result = await strategy.authenticate(makeCtx(`Bearer ${JWT_SHAPED}`));

    expect(result).toMatchObject({ authenticated: false, reason: 'invalid_token' });
    expect(oauthAuthenticate).not.toHaveBeenCalled();
    expect(authenticateAdminToken).toHaveBeenCalledWith(JWT_SHAPED);
  });
});
