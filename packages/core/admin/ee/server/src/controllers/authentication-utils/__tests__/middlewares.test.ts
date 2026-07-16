import { redirectWithAuth } from '../middlewares';

const buildSessionMetadataFromContext = jest.fn().mockReturnValue({
  deviceName: 'Chrome on macOS',
  loginAt: '2026-07-01T12:00:00.000Z',
});

jest.mock('../utils', () => ({
  __esModule: true,
  default: {
    getPrefixedRedirectUrls: () => ({
      success: '/admin/auth/login/success',
      error: '/admin/auth/login/error',
    }),
  },
}));

jest.mock('../../../utils', () => ({
  getService: () => ({
    sanitizeUser: (user: { id: number }) => user,
  }),
}));

jest.mock('../../../../../../shared/utils/session-auth', () => ({
  getSessionManager: jest.fn(),
  generateDeviceId: jest.fn(() => 'sso-device-id'),
  buildCookieOptionsWithExpiry: jest.fn(() => ({})),
  buildSessionMetadataFromContext: (ctx: unknown) => buildSessionMetadataFromContext(ctx),
  getAccessCookieName: jest.fn(() => 'jwtToken'),
  REFRESH_COOKIE_NAME: 'strapi_admin_refresh',
}));

const { getSessionManager } = jest.requireMock('../../../../../../shared/utils/session-auth');

describe('redirectWithAuth', () => {
  const generateRefreshToken = jest.fn();
  const generateAccessToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      config: {
        get(key: string) {
          if (key === 'admin.auth.cookie.secure') return false;
          if (key === 'admin.auth.domain') return undefined;
          return undefined;
        },
      },
      log: { error: jest.fn() },
      eventHub: { emit: jest.fn() },
    } as any;

    getSessionManager.mockReturnValue(() => ({
      generateRefreshToken,
      generateAccessToken,
    }));

    generateRefreshToken.mockResolvedValue({
      token: 'refresh-token',
      absoluteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    generateAccessToken.mockResolvedValue({ token: 'access-token' });
  });

  test('stores session metadata from the SSO callback request', async () => {
    const ctx = {
      params: { provider: 'google' },
      state: { user: { id: 42 } },
      request: {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      cookies: { set: jest.fn() },
      redirect: jest.fn(),
    } as any;

    await redirectWithAuth(ctx, jest.fn());

    expect(buildSessionMetadataFromContext).toHaveBeenCalledWith(ctx);
    expect(generateRefreshToken).toHaveBeenCalledWith('42', 'sso-device-id', {
      type: 'refresh',
      metadata: {
        deviceName: 'Chrome on macOS',
        loginAt: '2026-07-01T12:00:00.000Z',
      },
    });
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/auth/login/success');
  });
});
