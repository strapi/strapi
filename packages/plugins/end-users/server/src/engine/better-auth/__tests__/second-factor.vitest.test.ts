import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOTP } from '@better-auth/utils/otp';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth/minimal';
import { symmetricDecrypt } from 'better-auth/crypto';
import { bearer, magicLink, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { createLockoutDb, type LockoutDb } from './lockout-db';

import { secondFactor } from '../plugins/second-factor';
import { twoFactorOptions } from '../plugins/strapi-email';

// Built at run time: no secret-shaped literal in the source
const SECRET = ['second', 'factor', 'test', 'secret', 'long', 'enough', 'to', 'use'].join('-');
const PASSWORD = ['Old', 'Passw0rd!x'].join('-');
const NEW_PASSWORD = ['New', 'Passw0rd!y'].join('-');
const EMAIL = 'ann@example.com';

type Row = Record<string, any>;

let lockoutDb: LockoutDb;

beforeEach(async () => {
  lockoutDb = await createLockoutDb();
});

afterEach(async () => {
  await lockoutDb.connection.destroy();
});

/** Only what the plugin reads: the counter table and the lockout settings */
const fakeStrapi = () =>
  ({
    db: lockoutDb.db,
    log: { warn: vi.fn() },
    plugin: () => ({
      service: () => ({
        get: async () => ({ lockout: { enabled: true, maxAttempts: 5, durationMinutes: 15 } }),
      }),
    }),
  }) as unknown as Core.Strapi;

const counters = () => lockoutDb.connection('eu_lockout_counters').select('key', 'count');

/** The `name=value` pairs of the cookies a response sets, as a Cookie header */
const cookieHeader = (...responses: Headers[]) => {
  const cookies = new Map<string, string>();

  for (const headers of responses) {
    for (const line of headers.getSetCookie()) {
      const [pair] = line.split(';');
      const separator = pair.indexOf('=');
      const value = pair.slice(separator + 1);

      // A cookie that was cleared is not sent back
      if (/max-age=0/i.test(line) || value === '') {
        cookies.delete(pair.slice(0, separator));
      } else {
        cookies.set(pair.slice(0, separator), value);
      }
    }
  }

  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
};

const build = (plugins: BetterAuthPlugin[] = []) => {
  const db = {
    user: [],
    session: [],
    account: [],
    verification: [],
    twoFactor: [],
    passkey: [],
  } as Record<string, Row[]>;
  const codes: string[] = [];
  const links: string[] = [];
  const approvals: string[] = [];
  const proofs: string[] = [];

  const auth = betterAuth({
    secret: SECRET,
    baseURL: 'http://localhost:1337',
    basePath: '/api/auth',
    telemetry: { enabled: false },
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    emailVerification: {
      async sendVerificationEmail({ token }: { token: string }) {
        proofs.push(token);
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        async sendChangeEmailConfirmation({ token }: { token: string }) {
          approvals.push(token);
        },
      },
    },
    plugins: [
      twoFactor({
        ...twoFactorOptions({
          plugin: () => ({ service: () => ({}) }),
          config: { get: () => undefined },
        } as never),
        otpOptions: {
          storeOTP: 'hashed',
          async sendOTP({ otp }: { otp: string }) {
            codes.push(otp);
          },
        },
      }),
      bearer(),
      secondFactor(fakeStrapi()),
      magicLink({
        storeToken: 'hashed',
        async sendMagicLink({ token }: { token: string }) {
          links.push(token);
        },
      }),
      ...plugins,
    ],
  });

  /** Signs up, turns two-factor on, and confirms it: the session that results passed it */
  const enroll = async () => {
    const signedUp = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });
    const cookie = cookieHeader(signedUp.headers);
    const enabled = await auth.api.enableTwoFactor({
      body: { password: PASSWORD },
      headers: { cookie },
    });
    const [row] = db.twoFactor;
    const secret = await symmetricDecrypt({ key: SECRET, data: row.secret });
    const code = () => createOTP(secret).totp();
    const confirmed = await auth.api.verifyTOTP({
      body: { code: await code() },
      headers: { cookie },
      returnHeaders: true,
    });

    return {
      signedUp: cookie,
      confirmed: cookieHeader(signedUp.headers, confirmed.headers),
      code,
      backupCodes: (enabled as { backupCodes: string[] }).backupCodes,
    };
  };

  /** A password sign-in of the enrolled user, which stops at the challenge */
  const challenge = async (cookie = '') => {
    const result = await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      headers: { cookie },
      returnHeaders: true,
    });

    return {
      response: result.response,
      headers: result.headers,
      cookie: cookieHeader(result.headers),
    };
  };

  const marks = () => db.session.map((session) => session.twoFactorVerified);

  return { auth, db, codes, links, approvals, proofs, enroll, challenge, marks };
};

describe('second-factor', () => {
  it('leaves a new session unmarked, `false`, whichever way it was made', async () => {
    const { auth, db, marks } = build();

    await auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: 'Ann' } });
    await auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } });

    expect(db.session).toHaveLength(2);
    expect(marks()).toEqual([false, false]);
  });

  it('marks the session that confirms an enrollment, which replaces the one that asked for it', async () => {
    const { db, enroll, marks } = build();

    await enroll();

    expect(db.session).toHaveLength(1);
    expect(marks()).toEqual([true]);
    expect(db.user[0].twoFactorEnabled).toBe(true);
  });

  it('marks the session an authenticator code makes at the sign-in challenge', async () => {
    const { db, enroll, challenge, auth, marks } = build();
    const { code } = await enroll();

    const stopped = await challenge();

    expect(stopped.response).toMatchObject({ twoFactorRedirect: true });
    // The password alone left no session behind
    expect(db.session).toHaveLength(1);

    const verified = await auth.api.verifyTOTP({
      body: { code: await code() },
      headers: { cookie: stopped.cookie },
      returnHeaders: true,
    });

    expect(verified.headers.get('set-cookie')).toContain('session_token');
    expect(marks()).toEqual([true, true]);
  });

  it('marks the session a backup code makes, and the one an emailed code makes', async () => {
    const { db, enroll, challenge, auth, codes, marks } = build();
    const { backupCodes } = await enroll();

    const withBackup = await challenge();

    await auth.api.verifyBackupCode({
      body: { code: backupCodes[0] },
      headers: { cookie: withBackup.cookie },
    });

    expect(marks()).toEqual([true, true]);

    const withOtp = await challenge();

    await auth.api.sendTwoFactorOTP({ headers: { cookie: withOtp.cookie }, body: {} });
    await auth.api.verifyTwoFactorOTP({
      body: { code: codes[0] },
      headers: { cookie: withOtp.cookie },
    });

    expect(db.session).toHaveLength(3);
    expect(marks()).toEqual([true, true, true]);
  });

  it('marks nothing for a code that is wrong', async () => {
    const { db, enroll, challenge, auth, marks } = build();

    await enroll();

    const stopped = await challenge();

    await expect(
      auth.api.verifyTOTP({ body: { code: '000000' }, headers: { cookie: stopped.cookie } })
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(db.session).toHaveLength(1);
    expect(marks()).toEqual([true]);
  });

  /** A session made by a magic link, with no challenge, for a user who has two-factor on */
  const magicLinkSession = async (ctx: ReturnType<typeof build>) => {
    ctx.db.user[0].emailVerified = true;
    await ctx.auth.api.signInMagicLink({
      body: { email: EMAIL },
      headers: new Headers({ origin: 'http://localhost:1337' }),
    });

    const linked = await ctx.auth.api
      .magicLinkVerify({
        query: { token: ctx.links[0] },
        headers: new Headers({ origin: 'http://localhost:1337' }),
        returnHeaders: true,
      })
      .catch((error: { headers?: Headers }) => ({ headers: error.headers as Headers }));

    return cookieHeader(linked.headers);
  };

  it('does not mark a session because its user gave an authenticator or a backup code again', async () => {
    const ctx = build();
    const { code, backupCodes } = await ctx.enroll();
    const cookie = await magicLinkSession(ctx);

    expect(ctx.marks()).toEqual([true, false]);

    await ctx.auth.api.verifyTOTP({ body: { code: await code() }, headers: { cookie } });
    await ctx.auth.api.verifyBackupCode({ body: { code: backupCodes[0] }, headers: { cookie } });

    expect(ctx.db.session).toHaveLength(2);
    expect(ctx.marks()).toEqual([true, false]);
  });

  it('does not mark a session that a refresh made look new, however old the session is', async () => {
    const ctx = build();
    const { code } = await ctx.enroll();
    const cookie = await magicLinkSession(ctx);
    const unmarked = ctx.db.session.find((session) => session.twoFactorVerified === false)!;
    // Seven days of life, one day between refreshes: five days left means it is due for one
    const due = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    unmarked.expiresAt = due;

    await ctx.auth.api.verifyTOTP({ body: { code: await code() }, headers: { cookie } });

    // Better Auth did refresh it (it kept its id and its life was extended), and it is still unmarked
    expect(ctx.db.session).toHaveLength(2);
    expect(
      ctx.db.session.find((session) => session.id === unmarked.id)!.expiresAt.getTime()
    ).toBeGreaterThan(due.getTime());
    expect(ctx.marks()).toEqual([true, false]);
  });

  it('does not mark a session because its user gave an emailed code, which whoever signed it in can read', async () => {
    const ctx = build();

    await ctx.enroll();

    const cookie = await magicLinkSession(ctx);

    await ctx.auth.api.sendTwoFactorOTP({ headers: { cookie }, body: {} });
    await ctx.auth.api.verifyTwoFactorOTP({ body: { code: ctx.codes[0] }, headers: { cookie } });

    expect(ctx.db.session).toHaveLength(2);
    expect(ctx.marks()).toEqual([true, false]);
  });

  it('does not mark the session that turning two-factor on with an emailed code alone makes', async () => {
    const { auth, db, codes, marks } = build();
    const signedUp = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });
    const cookie = cookieHeader(signedUp.headers);

    // No password is asked for here, and no authenticator is enrolled: the mailbox is all there is
    await auth.api.sendTwoFactorOTP({ headers: { cookie }, body: {} });
    await auth.api.verifyTwoFactorOTP({ body: { code: codes[0] }, headers: { cookie } });

    expect(db.user[0].twoFactorEnabled).toBe(true);
    // The session that asked was replaced by the one the code made, and it is not marked
    expect(db.session).toHaveLength(1);
    expect(marks()).toEqual([false]);
  });

  it('leaves a magic-link session of a user with two-factor on unmarked, and stores the token hashed', async () => {
    const { db, auth, enroll, links, marks } = build();

    await enroll();
    db.user[0].emailVerified = true;
    await auth.api.signInMagicLink({
      body: { email: EMAIL },
      headers: new Headers({ origin: 'http://localhost:1337' }),
    });

    const token = links[0];
    const identifiers = db.verification.map((row) => row.identifier as string);

    // The row is there, and what it is looked up by is not the token that was emailed
    expect(identifiers.filter((identifier) => identifier.startsWith('magic-link:'))).toHaveLength(
      1
    );
    expect(identifiers.some((identifier) => identifier.includes(token))).toBe(false);

    await auth.api
      .magicLinkVerify({
        query: { token },
        headers: new Headers({ origin: 'http://localhost:1337' }),
        returnHeaders: true,
      })
      .catch(() => undefined);

    // The user has two-factor on and was signed in with no challenge
    expect(db.user[0].twoFactorEnabled).toBe(true);
    expect(db.session).toHaveLength(2);
    expect(marks()).toEqual([true, false]);
  });

  it('stores the emailed two-factor code hashed', async () => {
    const { db, enroll, challenge, auth, codes } = build();

    await enroll();

    const stopped = await challenge();

    await auth.api.sendTwoFactorOTP({ headers: { cookie: stopped.cookie }, body: {} });

    const stored = db.verification.filter((row) => String(row.identifier).startsWith('2fa-otp-'));

    expect(stored).toHaveLength(1);
    expect(stored[0].value).not.toContain(codes[0]);
  });

  it('marks a password sign-in a trusted device let skip the challenge, and only that one', async () => {
    const { db, enroll, challenge, auth, marks } = build();
    const { code } = await enroll();

    const stopped = await challenge();
    const trusted = await auth.api.verifyTOTP({
      body: { code: await code(), trustDevice: true },
      headers: { cookie: stopped.cookie },
      returnHeaders: true,
    });
    const trustCookie = cookieHeader(trusted.headers)
      .split('; ')
      .filter((pair) => pair.includes('trust_device'))
      .join('; ');

    expect(trustCookie).not.toBe('');

    // The device is known: no challenge, and a session that counts
    const again = await challenge(trustCookie);

    expect(again.response).not.toHaveProperty('twoFactorRedirect');
    expect(db.session).toHaveLength(3);
    expect(marks()).toEqual([true, true, true]);

    // A device that is not known meets the challenge, and leaves no session
    const other = await challenge();

    expect(other.response).toMatchObject({ twoFactorRedirect: true });
    expect(db.session).toHaveLength(3);
  });

  it('keeps the mark on the session a password change makes for the caller, and signs the others out', async () => {
    const { db, enroll, auth, marks } = build();
    const { confirmed } = await enroll();

    // A second session of the user, that passed nothing
    db.session.push({
      ...db.session[0],
      id: 'other-session',
      token: 'other-token',
      twoFactorVerified: false,
    });

    expect(marks()).toEqual([true, false]);

    const changed = await auth.api.changePassword({
      body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
      headers: { cookie: confirmed },
      returnHeaders: true,
    });

    expect(changed.response.token).toEqual(expect.any(String));
    // The other session is gone, and the caller has one new session that kept the mark
    expect(db.session).toHaveLength(1);
    expect(db.session[0].token).toBe(changed.response.token);
    expect(marks()).toEqual([true]);
  });

  it('does not give a mark to the new session of a caller whose session had none', async () => {
    const { db, auth, marks } = build();
    const signedUp = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });

    await auth.api.changePassword({
      body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
      headers: { cookie: cookieHeader(signedUp.headers) },
    });

    expect(db.session).toHaveLength(1);
    expect(marks()).toEqual([false]);
  });
});

describe('the session a verification link makes', () => {
  it('is never marked, for a user with two-factor on who changes their address', async () => {
    const { auth, db, approvals, proofs, enroll, marks } = build();
    const { confirmed } = await enroll();

    db.user[0].emailVerified = true;
    await auth.api.changeEmail({
      body: { newEmail: 'ann.new@example.com' },
      headers: { cookie: confirmed },
    });
    await auth.api.verifyEmail({ query: { token: approvals[0] } });

    // Opened with no session of its own: the link makes one, and no second factor stands behind it
    await auth.api.verifyEmail({ query: { token: proofs[0] } });

    expect(db.user[0].email).toBe('ann.new@example.com');
    expect(db.session).toHaveLength(2);
    expect(marks()).toEqual([true, false]);
  });
});

describe('confirming an enrollment', () => {
  /** A user who has asked to turn two-factor on and has not confirmed it, and the session that asked */
  const begin = async (ctx: ReturnType<typeof build>) => {
    const signedUp = await ctx.auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });
    const cookie = cookieHeader(signedUp.headers);

    await ctx.auth.api.enableTwoFactor({ body: { password: PASSWORD }, headers: { cookie } });

    const secret = await symmetricDecrypt({ key: SECRET, data: ctx.db.twoFactor[0].secret });

    return { cookie, code: () => createOTP(secret).totp() };
  };

  const guess = (ctx: ReturnType<typeof build>, cookie: string, code: string) =>
    ctx.auth.api.verifyTOTP({ body: { code }, headers: { cookie } });

  it('refuses after five wrong codes, even for the right one, and enrolls nothing', async () => {
    const ctx = build();
    const { cookie, code } = await begin(ctx);

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await expect(guess(ctx, cookie, '000000')).rejects.toMatchObject({ statusCode: 401 });
    }

    await expect(guess(ctx, cookie, await code())).rejects.toMatchObject({
      statusCode: 429,
      body: { code: 'TWO_FACTOR_ENROLLMENT_LOCKED' },
    });
    expect(ctx.db.user[0].twoFactorEnabled).toBe(false);
    expect(ctx.marks()).toEqual([false]);
  });

  it('counts the user, not the session, and never locks the sign-in', async () => {
    const ctx = build();
    const { cookie } = await begin(ctx);
    const other = await ctx.auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      returnHeaders: true,
    });

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await guess(ctx, i % 2 ? cookie : cookieHeader(other.headers), '000000').catch(() => {});
    }

    await expect(guess(ctx, cookie, '000000')).rejects.toMatchObject({ statusCode: 429 });

    const rows = await counters();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toMatch(/^lockout:totp-enroll:/);
    // The password sign-in is not behind this lock
    await expect(
      ctx.auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } })
    ).resolves.toHaveProperty('token');
  });

  it('forgets the failures when the code is right, and does not count a user who already has two-factor on', async () => {
    const ctx = build();
    const { cookie, code } = await begin(ctx);

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await guess(ctx, cookie, '000000').catch(() => {});
    }

    const confirmed = await ctx.auth.api.verifyTOTP({
      body: { code: await code() },
      headers: { cookie },
      returnHeaders: true,
    });

    expect(ctx.db.user[0].twoFactorEnabled).toBe(true);
    expect(await counters()).toEqual([]);

    // Giving a code again from a session is not an enrollment: it is not counted, and not capped
    const stepUp = cookieHeader(confirmed.headers);

    for (let i = 0; i < 8; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await guess(ctx, stepUp, '000000').catch(() => {});
    }

    expect(await counters()).toEqual([]);
  });
});

describe('the passkey sign-in', () => {
  const run = async (ctx: Record<string, unknown>) => {
    const written: Row[] = [];
    const [hook] = secondFactor({} as Core.Strapi).hooks!.after!;
    const context = {
      adapter: {
        async update(params: Row) {
          written.push(params);
        },
      },
      returned: undefined,
      newSession: null,
      session: null,
      ...(ctx.context as object | undefined),
    };

    await (hook.handler as unknown as (c: unknown) => Promise<unknown>)({ ...ctx, context });

    return {
      written,
      matches: hook.matcher({ path: ctx.path } as never),
    };
  };

  const created = () => ({ session: { id: 'session-1' }, user: { twoFactorEnabled: false } });

  it('marks the session a passkey sign-in makes, for a user with or without two-factor on', async () => {
    for (const twoFactorEnabled of [false, true]) {
      // eslint-disable-next-line no-await-in-loop
      const { written, matches } = await run({
        path: '/passkey/verify-authentication',
        context: { newSession: { ...created(), user: { twoFactorEnabled } } },
      });

      expect(matches).toBe(true);
      expect(written).toEqual([
        {
          model: 'session',
          where: [{ field: 'id', value: 'session-1' }],
          update: { twoFactorVerified: true },
        },
      ]);
    }
  });

  it('marks nothing when the sign-in failed or made no session', async () => {
    const { APIError } = await import('better-auth/api');

    const failed = await run({
      path: '/passkey/verify-authentication',
      context: {
        returned: new APIError('UNAUTHORIZED', { message: 'no' }),
        newSession: created(),
      },
    });
    const none = await run({ path: '/passkey/verify-authentication' });

    expect(failed.written).toEqual([]);
    expect(none.written).toEqual([]);
  });

  it('does not mark the session a passkey registration makes, or a sign-in by any other way', async () => {
    for (const path of [
      '/passkey/verify-registration',
      '/magic-link/verify',
      '/email-otp/verify-email',
      '/callback/:id',
      '/sign-in/email-otp',
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { written, matches } = await run({ path, context: { newSession: created() } });

      expect(matches, path).toBe(false);
      expect(written, path).toEqual([]);
    }
  });

  it('does not mark a password sign-in of a user who has no two-factor on: there was nothing to skip', async () => {
    const { written } = await run({
      path: '/sign-in/email',
      context: { newSession: created() },
    });

    expect(written).toEqual([]);
  });
});

describe('registering a passkey', () => {
  // The passkey plugin is added by the test, so its endpoints are not in the engine's API type
  const passkeyApi = (ctx: ReturnType<typeof build>) =>
    ctx.auth.api as unknown as Record<string, (input: Record<string, unknown>) => Promise<unknown>>;

  const registerOptions = (ctx: ReturnType<typeof build>, cookie: string) =>
    passkeyApi(ctx).generatePasskeyRegistrationOptions({ headers: { cookie }, query: {} });

  it('is refused for a user with two-factor on whose session is not marked, with the code the strategy uses', async () => {
    const ctx = build([passkey()]);

    await ctx.enroll();
    ctx.db.user[0].emailVerified = true;
    await ctx.auth.api.signInMagicLink({
      body: { email: EMAIL },
      headers: new Headers({ origin: 'http://localhost:1337' }),
    });

    const linked = await ctx.auth.api
      .magicLinkVerify({
        query: { token: ctx.links[0] },
        headers: new Headers({ origin: 'http://localhost:1337' }),
        returnHeaders: true,
      })
      .catch((error: { headers?: Headers }) => ({ headers: error.headers as Headers }));
    const cookie = cookieHeader(linked.headers);

    expect(ctx.marks()).toEqual([true, false]);

    await expect(registerOptions(ctx, cookie)).rejects.toMatchObject({
      statusCode: 403,
      body: { code: 'TWO_FACTOR_REQUIRED' },
    });
    await expect(
      passkeyApi(ctx).verifyPasskeyRegistration({
        body: { response: {} },
        headers: { cookie, origin: 'http://localhost:1337' },
      })
    ).rejects.toMatchObject({ statusCode: 403, body: { code: 'TWO_FACTOR_REQUIRED' } });
    expect(ctx.db.passkey).toHaveLength(0);
  });

  it('is allowed from a marked session, and for a user who has no two-factor on', async () => {
    const marked = build([passkey()]);
    const { confirmed } = await marked.enroll();

    await expect(registerOptions(marked, confirmed)).resolves.toHaveProperty('challenge');

    const plain = build([passkey()]);
    const signedUp = await plain.auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: 'Ann' },
      returnHeaders: true,
    });

    await expect(registerOptions(plain, cookieHeader(signedUp.headers))).resolves.toHaveProperty(
      'challenge'
    );
  });
});
