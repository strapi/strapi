import { describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth/minimal';
import type { Core } from '@strapi/types';

import { defineAuth } from '../define-auth';
import { buildAuthOptions } from '../create-engine';
import {
  emailSenders,
  sendEmailOtp,
  sendMagicLinkEmail,
  strapiEmail,
  twoFactorOptions,
} from '../plugins/strapi-email';

const SECRET = 'test-secret-at-least-32-characters-long';
const PASSWORD = 'Passw0rd!long';

type TemplateSender = (
  key: string,
  to: string,
  data: Record<string, unknown>,
  options: { locale?: string }
) => Promise<void>;

interface Settings {
  requireEmailVerification?: boolean;
  redirects?: {
    emailVerified?: string | null;
    passwordReset?: string | null;
    error?: string | null;
  };
}

const setup = ({ requireEmailVerification = false, redirects = {} }: Settings = {}) => {
  const sendTemplate = vi.fn<TemplateSender>().mockResolvedValue(undefined);
  const get = vi.fn(async () => ({
    signUp: { enabled: true, requireEmailVerification },
    redirects: { emailVerified: null, passwordReset: null, error: null, ...redirects },
  }));
  const warn = vi.fn();
  const config: Record<string, unknown> = {
    // What `buildAuthOptions` reads
    'plugin::end-users.secret': SECRET,
    'server.absoluteUrl': 'http://localhost:1337',
  };
  const strapi = {
    plugin: (name: string) => ({
      service: () => (name === 'email' ? { sendTemplate } : { get }),
    }),
    config: {
      get: (path: string, fallback?: unknown) => (path in config ? config[path] : fallback),
    },
    log: { warn },
  } as unknown as Core.Strapi;

  return { strapi, sendTemplate, warn, config };
};

const calls = (sendTemplate: ReturnType<typeof vi.fn>, key: string) =>
  sendTemplate.mock.calls.filter((call) => call[0] === key);

/** Better Auth's real hooks and endpoints over its memory adapter, with the plugin's senders. */
const engine = (settings: Settings = {}) => {
  const { strapi, sendTemplate, warn } = setup(settings);
  const senders = emailSenders(strapi);
  const db = { user: [], session: [], account: [], verification: [] };

  const auth = betterAuth({
    secret: SECRET,
    baseURL: 'http://localhost:1337',
    telemetry: { enabled: false },
    database: memoryAdapter(db),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: settings.requireEmailVerification ?? false,
      ...senders.emailAndPassword,
    },
    emailVerification: senders.emailVerification,
    user: { changeEmail: { enabled: true } },
    socialProviders: { github: { clientId: 'id', clientSecret: 'secret' } },
    plugins: [strapiEmail(strapi)],
  });

  const signUp = (email = 'ann@example.com', extra: Record<string, unknown> = {}) =>
    auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: 'Ann', ...extra } as never,
      returnHeaders: true,
    });

  return { auth, signUp, sendTemplate, warn, strapi, db };
};

const tokenOf = (url: string) => new URL(url).searchParams.get('token') as string;

describe('strapi-email: the senders', () => {
  const user = { name: 'Ann', email: 'ann@example.com', preferredLocale: 'fr' };

  it("sends verify-email with the user and the link, in the user's preferred locale", async () => {
    const { strapi, sendTemplate } = setup();

    await emailSenders(strapi).emailVerification.sendVerificationEmail({
      user,
      url: 'http://x/verify',
      token: 'not-a-jwt',
    });

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.verify-email',
      'ann@example.com',
      { user: { name: 'Ann', email: 'ann@example.com' }, url: 'http://x/verify' },
      { locale: 'fr' }
    );
  });

  it('sends reset-password with the user and the link', async () => {
    const { strapi, sendTemplate } = setup();

    await emailSenders(strapi).emailAndPassword.sendResetPassword({ user, url: 'http://x/reset' });

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.reset-password',
      'ann@example.com',
      { user: { name: 'Ann', email: 'ann@example.com' }, url: 'http://x/reset' },
      { locale: 'fr' }
    );
  });

  it('sends change-email to the new address, naming the address it replaces', async () => {
    const { strapi, sendTemplate } = setup();
    const payload = { email: 'ann@example.com', updateTo: 'new@example.com' };
    const token = `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

    await emailSenders(strapi).emailVerification.sendVerificationEmail({
      user: { ...user, email: 'new@example.com' },
      url: 'http://x/change',
      token,
    });

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.change-email',
      'new@example.com',
      {
        user: { name: 'Ann', email: 'ann@example.com' },
        newEmail: 'new@example.com',
        url: 'http://x/change',
      },
      { locale: 'fr' }
    );
  });

  it('sends magic-link with the address and the link', async () => {
    const { strapi, sendTemplate } = setup();

    vi.stubGlobal('strapi', strapi);
    await sendMagicLinkEmail({ email: 'ann@example.com', url: 'http://x/magic' });
    vi.unstubAllGlobals();

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.magic-link',
      'ann@example.com',
      { email: 'ann@example.com', url: 'http://x/magic' },
      { locale: undefined }
    );
  });

  it('sends email-otp with the address, the code and the type', async () => {
    const { strapi, sendTemplate } = setup();

    vi.stubGlobal('strapi', strapi);
    await sendEmailOtp({ email: 'ann@example.com', otp: '123456', type: 'sign-in' });
    vi.unstubAllGlobals();

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.email-otp',
      'ann@example.com',
      { email: 'ann@example.com', otp: '123456', type: 'sign-in' },
      { locale: undefined }
    );
  });

  it('sends two-factor-otp with the name and the code', async () => {
    const { strapi, sendTemplate } = setup();

    await twoFactorOptions(strapi).otpOptions.sendOTP({ user, otp: '654321' });

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.two-factor-otp',
      'ann@example.com',
      { user: { name: 'Ann' }, otp: '654321' },
      { locale: 'fr' }
    );
  });

  it('has the two-factor plugin store the emailed code hashed', () => {
    const { strapi } = setup();

    expect(twoFactorOptions(strapi).otpOptions.storeOTP).toBe('hashed');
  });

  it('leaves a locale the email plugin would refuse to the default', async () => {
    const { strapi, sendTemplate } = setup();

    await emailSenders(strapi).emailAndPassword.sendResetPassword({
      user: { ...user, preferredLocale: 'not a locale!' },
      url: 'http://x/reset',
    });

    expect(sendTemplate.mock.calls[0][3]).toEqual({ locale: undefined });
  });

  describe('the two-factor issuer', () => {
    it('is the appName of the plugin configuration', () => {
      const { strapi, config } = setup();

      config['plugin::end-users.appName'] = 'Acme';
      config['info.name'] = 'acme-backend';

      expect(twoFactorOptions(strapi).issuer).toBe('Acme');
    });

    it('is the name in the project package.json without an appName', () => {
      const { strapi, config } = setup();

      config['info.name'] = 'acme-backend';

      expect(twoFactorOptions(strapi).issuer).toBe('acme-backend');
    });
  });
});

describe('strapi-email: in the engine options', () => {
  it('keeps a sender the project set in config/plugins.ts', async () => {
    const { strapi } = setup();
    const sendResetPassword = vi.fn();
    const sendVerificationEmail = vi.fn();
    const options = buildAuthOptions(
      strapi,
      defineAuth({
        emailAndPassword: { sendResetPassword },
        emailVerification: { sendVerificationEmail },
      })
    );

    // The reset sender is the project's, behind the check that mails no banned user
    const input = { user: { id: 'u1', email: 'user@example.com', banned: false }, url: 'u' };

    const sendReset = options.emailAndPassword?.sendResetPassword;

    expect(typeof sendReset).toBe('function');
    await (sendReset as (data: unknown) => Promise<void>)(input);
    expect(sendResetPassword).toHaveBeenCalledWith(input, undefined);
    expect(options.emailVerification?.sendVerificationEmail).toBe(sendVerificationEmail);
  });

  it('sends through the templates when the project sets nothing, and allows changing the email', () => {
    const { strapi } = setup();
    const options = buildAuthOptions(strapi);

    expect(options.emailAndPassword?.sendResetPassword).toEqual(expect.any(Function));
    expect(options.emailVerification?.sendVerificationEmail).toEqual(expect.any(Function));
    expect(options.user?.changeEmail?.enabled).toBe(true);
  });
});

describe('strapi-email: redirects', () => {
  it('fills redirectTo from the settings when the request has none', async () => {
    const { auth, signUp, sendTemplate } = engine({ redirects: { passwordReset: '/reset-done' } });

    await signUp();
    await auth.api.requestPasswordReset({ body: { email: 'ann@example.com' } });

    const [[, , { url }]] = calls(sendTemplate, 'end-users.reset-password') as unknown as [
      [string, string, { url: string }],
    ];

    expect(new URL(url).searchParams.get('callbackURL')).toBe('/reset-done');
  });

  it('keeps the redirectTo the request sent', async () => {
    const { auth, signUp, sendTemplate } = engine({ redirects: { passwordReset: '/reset-done' } });

    await signUp();
    await auth.api.requestPasswordReset({
      body: { email: 'ann@example.com', redirectTo: '/mine' },
    });

    const [[, , { url }]] = calls(sendTemplate, 'end-users.reset-password') as unknown as [
      [string, string, { url: string }],
    ];

    expect(new URL(url).searchParams.get('callbackURL')).toBe('/mine');
  });

  it('fills the verification callbackURL from the settings, at sign-up', async () => {
    const { signUp, sendTemplate } = engine({
      requireEmailVerification: true,
      redirects: { emailVerified: '/verified' },
    });

    await signUp();

    const [[, , { url }]] = calls(sendTemplate, 'end-users.verify-email') as unknown as [
      [string, string, { url: string }],
    ];

    expect(new URL(url).searchParams.get('callbackURL')).toBe('/verified');
  });

  it('adds nothing when the setting is empty', async () => {
    const { signUp, sendTemplate } = engine({ requireEmailVerification: true });

    await signUp();

    const [[, , { url }]] = calls(sendTemplate, 'end-users.verify-email') as unknown as [
      [string, string, { url: string }],
    ];

    expect(new URL(url).searchParams.get('callbackURL')).toBe('/');
  });
});

describe('strapi-email: the error redirect', () => {
  /** What the flow remembers of the request: Better Auth keeps it in the verification row. */
  const stateOf = (db: { verification: Array<Record<string, unknown>> }) =>
    JSON.parse(String(db.verification.at(-1)?.value)) as { errorURL?: string; callbackURL: string };

  it('gives a social sign-in the error redirect of the settings when the request has none', async () => {
    const { auth, db } = engine({ redirects: { error: 'https://app.example.com/oops' } });

    await auth.api.signInSocial({ body: { provider: 'github', callbackURL: '/after' } });

    expect(stateOf(db).errorURL).toBe('https://app.example.com/oops');
    expect(stateOf(db).callbackURL).toBe('/after');
  });

  it('keeps the errorCallbackURL the request sent', async () => {
    const { auth, db } = engine({ redirects: { error: '/oops' } });

    await auth.api.signInSocial({
      body: { provider: 'github', callbackURL: '/after', errorCallbackURL: '/mine' },
    });

    expect(stateOf(db).errorURL).toBe('/mine');
  });

  it('adds nothing when the setting is empty', async () => {
    const { auth, db } = engine();

    await auth.api.signInSocial({ body: { provider: 'github', callbackURL: '/after' } });

    expect(stateOf(db).errorURL).toBeUndefined();
  });

  it('gives linking an account the same redirect', async () => {
    const { auth, signUp, db } = engine({ redirects: { error: '/oops' } });
    const { headers } = await signUp();
    const cookie = (headers.getSetCookie() as string[]).map((c) => c.split(';')[0]).join('; ');

    await auth.api.linkSocialAccount({
      body: { provider: 'github', callbackURL: '/after' },
      headers: new Headers({ cookie }),
    });

    expect(stateOf(db).errorURL).toBe('/oops');
  });
});

describe('strapi-email: change of address', () => {
  it('sends change-email to the new address', async () => {
    const { auth, signUp, sendTemplate } = engine();
    const { headers } = await signUp();
    const cookie = (headers.getSetCookie() as string[]).map((c) => c.split(';')[0]).join('; ');

    await auth.api.changeEmail({
      body: { newEmail: 'new@example.com' },
      headers: new Headers({ cookie }),
    });

    expect(calls(sendTemplate, 'end-users.change-email')).toHaveLength(1);
    expect(calls(sendTemplate, 'end-users.change-email')[0].slice(0, 3)).toEqual([
      'end-users.change-email',
      'new@example.com',
      expect.objectContaining({
        newEmail: 'new@example.com',
        user: { name: 'Ann', email: 'ann@example.com' },
      }),
    ]);
  });
});

describe('strapi-email: the welcome', () => {
  const welcomes = (sendTemplate: ReturnType<typeof vi.fn>) =>
    calls(sendTemplate, 'end-users.welcome');

  it('is sent once, on verification, when sign-up needs it', async () => {
    const { auth, signUp, sendTemplate } = engine({ requireEmailVerification: true });

    await signUp();
    expect(welcomes(sendTemplate)).toHaveLength(0);

    const [[, , { url }]] = calls(sendTemplate, 'end-users.verify-email') as unknown as [
      [string, string, { url: string }],
    ];

    await auth.api.verifyEmail({ query: { token: tokenOf(url) } });
    // The link used a second time verifies nothing new
    await auth.api.verifyEmail({ query: { token: tokenOf(url) } });

    expect(welcomes(sendTemplate)).toHaveLength(1);
    expect(welcomes(sendTemplate)[0].slice(0, 3)).toEqual([
      'end-users.welcome',
      'ann@example.com',
      { user: { name: 'Ann', email: 'ann@example.com' } },
    ]);
  });

  it('is sent at sign-up when verification is not required, and not again on verification', async () => {
    const { auth, signUp, sendTemplate } = engine({ requireEmailVerification: false });

    await signUp();
    expect(welcomes(sendTemplate)).toHaveLength(1);

    await auth.api.sendVerificationEmail({ body: { email: 'ann@example.com' } });

    const [[, , { url }]] = calls(sendTemplate, 'end-users.verify-email') as unknown as [
      [string, string, { url: string }],
    ];

    await auth.api.verifyEmail({ query: { token: tokenOf(url) } });

    expect(welcomes(sendTemplate)).toHaveLength(1);
  });

  it('is not sent for a verified change of address', async () => {
    const { strapi, sendTemplate } = setup({ requireEmailVerification: true });
    const payload = { email: 'ann@example.com', updateTo: 'new@example.com' };
    const token = `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

    await emailSenders(strapi).emailVerification.afterEmailVerification(
      { name: 'Ann', email: 'new@example.com' },
      new Request(`http://localhost:1337/api/auth/verify-email?token=${token}`)
    );

    expect(welcomes(sendTemplate)).toHaveLength(0);
  });

  it('does not fail the sign-up when the email cannot be sent', async () => {
    const { signUp, sendTemplate, warn } = engine();

    sendTemplate.mockRejectedValueOnce(new Error('smtp down'));

    await expect(signUp()).resolves.toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('smtp down'));
  });
});

describe('strapi-email: compat links', () => {
  const user = { name: 'Ann', email: 'ann@example.com' };

  it('builds ?code= and ?confirmation= links only with compat on', async () => {
    const off = setup({ redirects: { passwordReset: 'https://app.example.com/reset' } });

    await emailSenders(off.strapi).emailAndPassword.sendResetPassword({
      user,
      url: 'http://x/reset',
      token: 'abc',
    });
    await emailSenders(off.strapi).emailVerification.sendVerificationEmail({
      user,
      url: 'http://x/verify',
      token: 'def',
    });

    expect(off.sendTemplate.mock.calls.map((call) => call[2].url)).toEqual([
      'http://x/reset',
      'http://x/verify',
    ]);

    const on = setup({ redirects: { passwordReset: 'https://app.example.com/reset' } });

    on.config['plugin::end-users.compat.usersPermissions'] = true;

    await emailSenders(on.strapi).emailAndPassword.sendResetPassword({
      user,
      url: 'http://x/reset',
      token: 'abc',
    });
    await emailSenders(on.strapi).emailVerification.sendVerificationEmail({
      user,
      url: 'http://x/verify',
      token: 'def',
    });

    expect(on.sendTemplate.mock.calls.map((call) => call[2].url)).toEqual([
      'https://app.example.com/reset?code=abc',
      'http://localhost:1337/api/auth/email-confirmation?confirmation=def',
    ]);
  });

  it('uses the API reset path when the settings name no reset page', async () => {
    const { strapi, sendTemplate, config } = setup();

    config['plugin::end-users.compat.usersPermissions'] = true;

    await emailSenders(strapi).emailAndPassword.sendResetPassword({
      user,
      url: 'http://x/reset',
      token: 'abc',
    });

    expect(sendTemplate.mock.calls[0][2].url).toBe(
      'http://localhost:1337/api/auth/reset-password?code=abc'
    );
  });
});

describe('strapi-email: compat reset page as a path', () => {
  it('puts a reset page given as a path on this server', async () => {
    const { strapi, sendTemplate, config } = setup({ redirects: { passwordReset: '/reset' } });

    config['plugin::end-users.compat.usersPermissions'] = true;

    await emailSenders(strapi).emailAndPassword.sendResetPassword({
      user: { name: 'Ann', email: 'ann@example.com' },
      url: 'http://x/reset',
      token: 'abc',
    });

    expect(sendTemplate.mock.calls[0][2].url).toBe('http://localhost:1337/reset?code=abc');
  });
});
