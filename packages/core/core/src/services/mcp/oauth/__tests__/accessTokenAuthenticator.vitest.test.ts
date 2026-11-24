import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';
import { createMcpOAuthTokenAuthenticator } from '../accessTokenAuthenticator';

describe('createMcpOAuthTokenAuthenticator', () => {
  let validateAccessToken: Mock;
  let isSessionActive: Mock;
  let findOne: Mock;
  let generateUserAbility: Mock;
  let authenticator: ReturnType<typeof createMcpOAuthTokenAuthenticator>;

  beforeEach(() => {
    validateAccessToken = vi.fn();
    isSessionActive = vi.fn();
    findOne = vi.fn();
    generateUserAbility = vi.fn();

    const strapi = {
      sessionManager: vi.fn(() => ({ validateAccessToken, isSessionActive })),
      db: { query: vi.fn(() => ({ findOne })) },
      service: (uid: string) =>
        uid === 'admin::permission' ? { engine: { generateUserAbility } } : undefined,
    } as unknown as Core.Strapi;

    authenticator = createMcpOAuthTokenAuthenticator(strapi);
  });

  const validPayload = { userId: '42', sessionId: 'session-1', type: 'access' };

  test('rejects a token that fails JWT validation', async () => {
    validateAccessToken.mockReturnValue({ isValid: false, payload: null });

    await expect(authenticator.authenticate('bad')).resolves.toEqual({
      authenticated: false,
      reason: 'invalid_token',
    });
    expect(isSessionActive).not.toHaveBeenCalled();
  });

  test('rejects a token whose session is gone (revoked grant)', async () => {
    validateAccessToken.mockReturnValue({ isValid: true, payload: validPayload });
    isSessionActive.mockResolvedValue(false);

    await expect(authenticator.authenticate('token')).resolves.toEqual({
      authenticated: false,
      reason: 'invalid_token',
    });
    expect(isSessionActive).toHaveBeenCalledWith('session-1');
    expect(findOne).not.toHaveBeenCalled();
  });

  test.each([
    ['missing', null],
    ['deactivated', { id: 42, isActive: false, blocked: false }],
    ['blocked', { id: 42, isActive: true, blocked: true }],
  ])('rejects a token whose user is %s', async (_label, user) => {
    validateAccessToken.mockReturnValue({ isValid: true, payload: validPayload });
    isSessionActive.mockResolvedValue(true);
    findOne.mockResolvedValue(user);

    await expect(authenticator.authenticate('token')).resolves.toEqual({
      authenticated: false,
      reason: 'invalid_token',
    });
    expect(generateUserAbility).not.toHaveBeenCalled();
  });

  test('returns the user and a freshly computed ability on success', async () => {
    const ability = { can: vi.fn() };
    const user = { id: 42, isActive: true, blocked: false };

    validateAccessToken.mockReturnValue({ isValid: true, payload: validPayload });
    isSessionActive.mockResolvedValue(true);
    findOne.mockResolvedValue(user);
    generateUserAbility.mockResolvedValue(ability);

    await expect(authenticator.authenticate('token')).resolves.toEqual({
      authenticated: true,
      credentials: { id: 42 },
      user: { id: 42 },
      ability,
    });
    // The numeric userId string is coerced for the database lookup
    expect(findOne).toHaveBeenCalledWith({ where: { id: 42 }, populate: ['roles'] });
    expect(generateUserAbility).toHaveBeenCalledWith(user);
  });

  test('computes the ability with the permission service from the services registry, so extensions apply', async () => {
    // `extend()` writes only to the registry; `strapi.admin.services` keeps the original service
    const originalGenerateUserAbility = vi.fn();
    const extendedAbility = { can: vi.fn() };
    const extendedGenerateUserAbility = vi.fn().mockResolvedValue(extendedAbility);
    const user = { id: 42, isActive: true, blocked: false };

    validateAccessToken.mockReturnValue({ isValid: true, payload: validPayload });
    isSessionActive.mockResolvedValue(true);
    findOne.mockResolvedValue(user);

    const extendedAuthenticator = createMcpOAuthTokenAuthenticator({
      sessionManager: vi.fn(() => ({ validateAccessToken, isSessionActive })),
      db: { query: vi.fn(() => ({ findOne })) },
      admin: {
        services: { permission: { engine: { generateUserAbility: originalGenerateUserAbility } } },
      },
      service: (uid: string) =>
        uid === 'admin::permission'
          ? { engine: { generateUserAbility: extendedGenerateUserAbility } }
          : undefined,
    } as unknown as Core.Strapi);

    await expect(extendedAuthenticator.authenticate('token')).resolves.toMatchObject({
      authenticated: true,
      ability: extendedAbility,
    });
    expect(extendedGenerateUserAbility).toHaveBeenCalledWith(user);
    expect(originalGenerateUserAbility).not.toHaveBeenCalled();
  });
});
