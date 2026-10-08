import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStrapiMock } from '../../../tests/utils';
import { createMockContext } from './utils';
import authController from '../auth';
import { createOAuthConnectMiddleware } from '../../utils/oauth-connect';

const oauthMiddleware = vi.hoisted(() => vi.fn());
vi.mock('../../utils/oauth-connect', () => ({
  createOAuthConnectMiddleware: vi.fn(() => oauthMiddleware),
}));

const createContext = (body: Record<string, unknown> = {}) =>
  createMockContext({
    params: {},
    query: {},
    request: { body, headers: { 'user-agent': 'test-client' }, header: {} },
    state: { auth: {} },
    cookies: { get: vi.fn(), set: vi.fn() },
    send: vi.fn(),
    redirect: vi.fn(),
    notFound: vi.fn(),
    badRequest: vi.fn(),
    unauthorized: vi.fn(),
  });

let strapi: ReturnType<typeof createFixture>['strapi'];
let controller: ReturnType<typeof createFixture>['controller'];
let user: ReturnType<typeof createFixture>['user'];
let userService: ReturnType<typeof createFixture>['userService'];
let query: ReturnType<typeof createFixture>['query'];
let settings: ReturnType<typeof createFixture>['settings'];
let services: ReturnType<typeof createFixture>['services'];
let sessionManager: ReturnType<typeof createFixture>['sessionManager'];

const createFixture = () => {
  const user = {
    id: 1,
    email: 'alice@example.com',
    username: 'alice',
    password: 'hashed' as string | null,
    provider: 'local',
    confirmed: true,
    blocked: false,
  };
  const userService = {
    validatePassword: vi.fn().mockResolvedValue(true),
    edit: vi.fn().mockResolvedValue(user),
    add: vi.fn().mockResolvedValue(user),
    fetchAll: vi.fn().mockResolvedValue([user]),
    sendConfirmationEmail: vi.fn(),
  };
  const query = { findOne: vi.fn().mockResolvedValue(user), count: vi.fn().mockResolvedValue(0) };
  const settings = {
    grant: { email: { enabled: true }, github: { enabled: true } },
    advanced: {
      allow_register: true,
      default_role: 'authenticated',
      unique_email: true,
      email_confirmation: false,
      email_reset_password: 'https://example.com/reset',
      email_confirmation_redirection: undefined as string | undefined,
    },
    email: {
      reset_password: {
        options: {
          message: 'Reset <%= TOKEN %>',
          object: 'Reset password',
          from: { name: 'App', email: 'app@example.com' },
          response_email: 'help@example.com',
        },
      },
    },
  };
  const services = {
    user: userService,
    jwt: { issue: vi.fn().mockReturnValue('legacy-jwt') },
    providers: { connect: vi.fn().mockResolvedValue(user) },
    'users-permissions': { template: vi.fn((text: string) => `rendered:${text}`) },
    email: { send: vi.fn() },
  };
  const sessionManager = {
    generateRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh-token' }),
    generateAccessToken: vi.fn().mockResolvedValue({ token: 'access-token' }),
    invalidateRefreshToken: vi.fn(),
    rotateRefreshToken: vi.fn().mockResolvedValue({ token: 'rotated' }),
  };
  const validateCallback = vi.fn();
  const strapi = createStrapiMock({
    db: { query: vi.fn(() => query) },
    store: vi.fn((options: { key?: keyof typeof settings }) => ({
      get: vi.fn(
        (params?: { key: keyof typeof settings }) =>
          settings[params?.key || options.key || 'advanced']
      ),
    })),
    config: {
      server: { url: 'https://example.com' },
      get: vi.fn((path: string, defaultValue?: unknown) =>
        path === 'plugin::users-permissions' ? { register: {} } : defaultValue
      ),
    },
    getModel: vi.fn(() => ({ uid: 'plugin::users-permissions.user' })),
    plugin: vi.fn(() => ({
      service: (name: keyof typeof services) => services[name],
      config: () => ({ validate: validateCallback }),
    })),
    contentAPI: {
      sanitize: {
        output: vi.fn((record: { id: number; email: string }) => ({
          id: record.id,
          email: record.email,
        })),
      },
    },
    sessionManager: vi.fn(() => sessionManager),
    log: { error: vi.fn(), warn: vi.fn() },
  });
  vi.stubGlobal('strapi', undefined);
  const controller = authController({ strapi });
  return { strapi, controller, user, userService, query, settings, services, sessionManager };
};

beforeEach(() => {
  ({ strapi, controller, user, userService, query, settings, services, sessionManager } =
    createFixture());
});

afterEach(() => vi.unstubAllGlobals());

const enableRefresh = (sessions: Record<string, unknown> = {}) => {
  strapi.config.get.mockImplementation((path: string, defaultValue?: unknown) => {
    if (path.endsWith('jwtManagement')) return 'refresh';
    if (path.endsWith('sessions')) return sessions;
    if (path === 'plugin::users-permissions') return { register: {} };
    return defaultValue;
  });
};

describe('login', () => {
  const credentials = { identifier: 'ALICE@example.com', password: 'password' };

  test('normalizes email matching and returns only sanitized user data', async () => {
    const ctx = createContext(credentials);
    await controller.callback(ctx);
    expect(query.findOne).toHaveBeenCalledWith({
      where: {
        provider: 'local',
        $or: [{ email: 'alice@example.com' }, { username: 'ALICE@example.com' }],
      },
    });
    expect(userService.validatePassword).toHaveBeenCalledWith('password', 'hashed');
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'legacy-jwt',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('refuses disabled providers before querying users', async () => {
    settings.grant.email.enabled = false;
    await expect(controller.callback(createContext(credentials))).rejects.toThrow(
      'This provider is disabled'
    );
    expect(query.findOne).not.toHaveBeenCalled();
  });

  test.each(['missing', 'passwordless', 'incorrect-password'])(
    'does not disclose whether credentials belong to a %s account',
    async (scenario) => {
      if (scenario === 'missing') query.findOne.mockResolvedValue(null);
      if (scenario === 'passwordless') user.password = null;
      if (scenario === 'incorrect-password') userService.validatePassword.mockResolvedValue(false);
      await expect(controller.callback(createContext(credentials))).rejects.toThrow(
        'Invalid identifier or password'
      );
      expect(services.jwt.issue).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['unconfirmed', 'Your account email is not confirmed'],
    ['blocked', 'Your account has been blocked by an administrator'],
  ])('refuses %s accounts', async (scenario, message) => {
    if (scenario === 'unconfirmed') {
      settings.advanced.email_confirmation = true;
      user.confirmed = false;
    }
    if (scenario === 'blocked') user.blocked = true;
    await expect(controller.callback(createContext(credentials))).rejects.toThrow(message);
    expect(services.jwt.issue).not.toHaveBeenCalled();
  });

  test('requires a completed OAuth session', async () => {
    const ctx = createContext();
    ctx.params.provider = 'github';
    await expect(controller.callback(ctx)).rejects.toThrow(
      'OAuth authentication requires a completed provider session'
    );
    expect(services.providers.connect).not.toHaveBeenCalled();
  });

  test('uses the trusted OAuth grant response', async () => {
    const response = { access_token: 'grant-token' };
    const ctx = createContext({ access_token: 'untrusted' });
    ctx.params.provider = 'github';
    ctx.session = { grant: { response } };
    await controller.callback(ctx);
    expect(services.providers.connect).toHaveBeenCalledWith('github', response, {
      grantResponse: response,
    });
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'legacy-jwt',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('rejects blocked OAuth accounts', async () => {
    user.blocked = true;
    const ctx = createContext();
    ctx.params.provider = 'github';
    ctx.session = { grant: { response: {} } };
    await expect(controller.callback(ctx)).rejects.toThrow(
      'Your account has been blocked by an administrator'
    );
  });

  test('issues refresh tokens for OAuth logins', async () => {
    enableRefresh();
    const ctx = createContext();
    ctx.params.provider = 'github';
    ctx.session = { grant: { response: {} } };
    await controller.callback(ctx);
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('keeps OAuth refresh-mode session failures unwrapped', async () => {
    enableRefresh();
    const failure = new Error('session store unavailable');
    sessionManager.generateRefreshToken.mockRejectedValue(failure);
    const ctx = createContext();
    ctx.params.provider = 'github';
    ctx.session = { grant: { response: {} } };
    await expect(controller.callback(ctx)).rejects.toBe(failure);
  });

  test('issues device-specific refresh tokens with request metadata', async () => {
    enableRefresh();
    const ctx = createContext({ ...credentials, deviceId: 'browser-1' });
    await controller.callback(ctx);
    expect(sessionManager.generateRefreshToken).toHaveBeenCalledWith('1', 'browser-1', {
      type: 'refresh',
      metadata: expect.objectContaining({ loginAt: expect.any(String) }),
    });
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('allows clients to request httpOnly refresh cookies', async () => {
    enableRefresh();
    const ctx = createContext(credentials);
    ctx.request.header['x-strapi-refresh-cookie'] = 'httpOnly';
    await controller.callback(ctx);
    expect(ctx.cookies.set).toHaveBeenCalledWith(
      'strapi_up_refresh',
      'refresh-token',
      expect.objectContaining({ httpOnly: true })
    );
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'access-token',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('keeps refresh tokens in configured httpOnly cookies', async () => {
    enableRefresh({ httpOnly: true, cookie: { name: 'refresh_cookie', sameSite: 'strict' } });
    const ctx = createContext(credentials);
    await controller.callback(ctx);
    expect(ctx.cookies.set).toHaveBeenCalledWith(
      'refresh_cookie',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'access-token',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('does not return credentials if access token generation fails', async () => {
    enableRefresh();
    sessionManager.generateAccessToken.mockResolvedValue({ error: 'invalid' });
    const ctx = createContext(credentials);
    await expect(controller.callback(ctx)).rejects.toThrow('Invalid credentials');
    expect(ctx.send).not.toHaveBeenCalled();
  });
});

describe('registration', () => {
  const body = { username: 'alice', email: 'ALICE@example.com', password: 'password' };

  test('refuses registration when disabled', async () => {
    settings.advanced.allow_register = false;
    await expect(controller.register(createContext(body))).rejects.toThrow(
      'Register action is currently disabled'
    );
    expect(userService.add).not.toHaveBeenCalled();
  });

  test('fails when the configured default role is missing', async () => {
    query.findOne.mockResolvedValue(null);
    await expect(controller.register(createContext(body))).rejects.toThrow(
      'Impossible to find the default role'
    );
  });

  test.each(['local', 'other-provider'])(
    'rejects conflicting identifiers from %s',
    async (provider) => {
      query.count.mockResolvedValueOnce(provider === 'local' ? 1 : 0).mockResolvedValueOnce(1);
      await expect(controller.register(createContext(body))).rejects.toThrow(
        'Email or Username are already taken'
      );
      expect(userService.add).not.toHaveBeenCalled();
    }
  );

  test('normalizes email and assigns the configured role', async () => {
    query.findOne.mockResolvedValue({ id: 2 });
    const ctx = createContext(body);
    await controller.register(ctx);
    expect(userService.add).toHaveBeenCalledWith({
      ...body,
      email: 'alice@example.com',
      provider: 'local',
      confirmed: true,
      role: 2,
    });
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'legacy-jwt',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('creates refresh credentials with a generated device identifier after registration', async () => {
    enableRefresh();
    const ctx = createContext(body);
    await controller.register(ctx);
    expect(sessionManager.generateRefreshToken).toHaveBeenCalledWith('1', expect.any(String), {
      type: 'refresh',
      metadata: expect.objectContaining({ loginAt: expect.any(String) }),
    });
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test('does not return registration credentials after token generation fails', async () => {
    enableRefresh();
    sessionManager.generateAccessToken.mockResolvedValue({ error: 'invalid' });
    const ctx = createContext(body);
    await expect(controller.register(ctx)).rejects.toThrow('Invalid credentials');
    expect(ctx.send).not.toHaveBeenCalled();
  });

  test('withholds tokens until email confirmation', async () => {
    settings.advanced.email_confirmation = true;
    const ctx = createContext(body);
    await controller.register(ctx);
    expect(userService.sendConfirmationEmail).toHaveBeenCalledWith({
      id: 1,
      email: 'alice@example.com',
    });
    expect(ctx.send).toHaveBeenCalledWith({ user: { id: 1, email: 'alice@example.com' } });
    expect(services.jwt.issue).not.toHaveBeenCalled();
  });

  test('reports confirmation email failures without issuing credentials', async () => {
    settings.advanced.email_confirmation = true;
    userService.sendConfirmationEmail.mockRejectedValue(new Error('mail unavailable'));
    await expect(controller.register(createContext(body))).rejects.toThrow(
      'Error sending confirmation email'
    );
    expect(services.jwt.issue).not.toHaveBeenCalled();
  });
});

describe('OAuth connection', () => {
  test('rejects disabled providers before entering the OAuth middleware', async () => {
    settings.grant.github.enabled = false;
    const ctx = createContext();
    ctx.request.url = '/connect/github';
    oauthMiddleware.mockClear();
    await expect(controller.connect(ctx, vi.fn())).rejects.toThrow('This provider is disabled');
    expect(oauthMiddleware).not.toHaveBeenCalled();
  });

  test('validates and persists custom callbacks across the provider redirect', async () => {
    const ctx = createContext();
    ctx.request.url = '/connect/github?callback=https://app.example.com';
    ctx.query = { callback: 'https://app.example.com' };
    const next = vi.fn();
    await controller.connect(ctx, next);
    expect(strapi.plugin().config().validate).toHaveBeenCalledWith(
      'https://app.example.com',
      settings.grant.github
    );
    expect(ctx.session.grant.dynamic.callback).toBe('https://app.example.com');
    expect(ctx.state.oauthConnect).toEqual({ callback: 'https://app.example.com' });
    expect(createOAuthConnectMiddleware).toHaveBeenCalledWith(strapi);
    expect(oauthMiddleware).toHaveBeenCalledWith(ctx, next);
  });

  test('rejects invalid callback URLs without entering the OAuth middleware', async () => {
    strapi.plugin().config().validate.mockRejectedValue(new Error('Untrusted origin'));
    const ctx = createContext();
    ctx.request.url = '/connect/github';
    ctx.query = { callback: 'https://untrusted.example.com' };
    oauthMiddleware.mockClear();
    await expect(controller.connect(ctx, vi.fn())).rejects.toThrow('Invalid callback URL provided');
    expect(oauthMiddleware).not.toHaveBeenCalled();
  });

  test('revalidates callback URLs restored from the provider session', async () => {
    const ctx = createContext();
    ctx.request.url = '/connect/github/callback';
    ctx.session = { grant: { dynamic: { callback: 'https://app.example.com' } } };
    await controller.connect(ctx, vi.fn());
    expect(strapi.plugin().config().validate).toHaveBeenCalledWith(
      'https://app.example.com',
      settings.grant.github
    );
  });

  test('warns about relative server URLs while allowing configured providers', async () => {
    strapi.config.server.url = '/';
    const ctx = createContext();
    ctx.request.url = '/connect/github';
    await controller.connect(ctx, vi.fn());
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('absolute url'));
  });
});

describe('password and email flows', () => {
  test('requires authentication to change passwords', async () => {
    await expect(controller.changePassword(createContext())).rejects.toThrow(
      'You must be authenticated to reset your password'
    );
    expect(userService.edit).not.toHaveBeenCalled();
  });

  test.each(['missing', 'blocked'])(
    'does not disclose %s accounts during password recovery',
    async (scenario) => {
      if (scenario === 'missing') query.findOne.mockResolvedValue(null);
      else user.blocked = true;
      const ctx = createContext({ email: 'alice@example.com' });
      await controller.forgotPassword(ctx);
      expect(ctx.send).toHaveBeenCalledWith({ ok: true });
      expect(userService.edit).not.toHaveBeenCalled();
      expect(services.email.send).not.toHaveBeenCalled();
    }
  );

  test('persists a random reset token before sending the recovery email', async () => {
    const ctx = createContext({ email: 'ALICE@example.com' });
    await controller.forgotPassword(ctx);
    expect(query.findOne).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
    expect(userService.edit).toHaveBeenCalledWith(1, {
      resetPasswordToken: expect.stringMatching(/^[a-f0-9]{128}$/),
    });
    expect(userService.edit.mock.invocationCallOrder[0]).toBeLessThan(
      services.email.send.mock.invocationCallOrder[0]
    );
    expect(services.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        from: 'App <app@example.com>',
        replyTo: 'help@example.com',
        subject: 'rendered:Reset password',
      })
    );
    expect(ctx.send).toHaveBeenCalledWith({ ok: true });
  });

  test('rejects unknown email confirmation tokens', async () => {
    userService.fetchAll.mockResolvedValue([]);
    const ctx = createContext();
    ctx.query = { confirmation: 'token' };
    await expect(controller.emailConfirmation(ctx)).rejects.toThrow('Invalid token');
    expect(userService.edit).not.toHaveBeenCalled();
  });

  test('clears the confirmation token before returning the user', async () => {
    const ctx = createContext();
    ctx.query = { confirmation: 'token' };
    await controller.emailConfirmation(ctx, undefined, true);
    expect(userService.edit).toHaveBeenCalledWith(1, { confirmed: true, confirmationToken: null });
    expect(ctx.send).toHaveBeenCalledWith({
      jwt: 'legacy-jwt',
      user: { id: 1, email: 'alice@example.com' },
    });
  });

  test.each([undefined, 'https://example.com/confirmed'])(
    'redirects confirmed accounts to %s',
    async (redirect) => {
      settings.advanced.email_confirmation_redirection = redirect;
      const ctx = createContext();
      ctx.query = { confirmation: 'token' };
      await controller.emailConfirmation(ctx);
      expect(ctx.redirect).toHaveBeenCalledWith(redirect || '/');
    }
  );

  test('does not disclose absent accounts when resending confirmation', async () => {
    query.findOne.mockResolvedValue(null);
    const ctx = createContext({ email: 'unknown@example.com' });
    await controller.sendEmailConfirmation(ctx);
    expect(ctx.send).toHaveBeenCalledWith({ email: 'unknown@example.com', sent: true });
  });

  test.each([
    [true, false, 'Already confirmed'],
    [false, true, 'User blocked'],
  ])(
    'rejects confirmation for confirmed=%s and blocked=%s',
    async (confirmed, blocked, message) => {
      Object.assign(user, { confirmed, blocked });
      await expect(
        controller.sendEmailConfirmation(createContext({ email: user.email }))
      ).rejects.toThrow(message);
      expect(userService.sendConfirmationEmail).not.toHaveBeenCalled();
    }
  );

  test('resends confirmation to an eligible account', async () => {
    user.confirmed = false;
    const ctx = createContext({ email: user.email });
    await controller.sendEmailConfirmation(ctx);
    expect(userService.sendConfirmationEmail).toHaveBeenCalledWith(user);
    expect(ctx.send).toHaveBeenCalledWith({ email: user.email, sent: true });
  });
});

describe('token refresh', () => {
  test.each(['rotation', 'access'])('rejects %s failures', async (failure) => {
    enableRefresh();
    sessionManager[
      failure === 'rotation' ? 'rotateRefreshToken' : 'generateAccessToken'
    ].mockResolvedValue({ error: 'invalid' });
    const ctx = createContext({ refreshToken: 'token' });
    await controller.refresh(ctx);
    expect(ctx.unauthorized).toHaveBeenCalledWith('Invalid refresh token');
    expect(ctx.send).not.toHaveBeenCalled();
  });

  test('rotates httpOnly cookies without returning refresh tokens in the body', async () => {
    enableRefresh({ httpOnly: true, cookie: { name: 'refresh_cookie' } });
    const ctx = createContext();
    ctx.cookies.get.mockReturnValue('cookie-token');
    await controller.refresh(ctx);
    expect(ctx.cookies.set).toHaveBeenCalledWith(
      'refresh_cookie',
      'rotated',
      expect.objectContaining({ httpOnly: true })
    );
    expect(ctx.send).toHaveBeenCalledWith({ jwt: 'access-token' });
  });

  test('prioritizes the refresh cookie over the request body', async () => {
    enableRefresh();
    const ctx = createContext({ refreshToken: 'body-token' });
    ctx.cookies.get.mockReturnValue('cookie-token');
    await controller.refresh(ctx);
    expect(sessionManager.rotateRefreshToken).toHaveBeenCalledWith('cookie-token');
    expect(ctx.send).toHaveBeenCalledWith({ jwt: 'access-token', refreshToken: 'rotated' });
  });
});
