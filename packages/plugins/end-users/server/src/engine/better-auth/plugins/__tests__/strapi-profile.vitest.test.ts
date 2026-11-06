import { describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth/minimal';
import { admin, twoFactor } from 'better-auth/plugins';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID } from '../../../../constants';
import { takePendingProfile } from '../../../../utils/pending-profile';
import { strapiProfile } from '../strapi-profile';

const SECRET = 'test-secret-at-least-32-characters-long';
const PASSWORD = 'Passw0rd!long';

/** Better Auth's real hook machinery over its memory adapter, with the plugin under test. */
const setup = ({
  signUpFields = ['company'] as string[],
  state = {} as Record<string, unknown> | null,
  signUpEnabled = true,
} = {}) => {
  const db = {
    user: [],
    session: [],
    account: [],
    verification: [],
    twoFactor: [],
  } as Record<string, Array<Record<string, unknown>>>;

  const getSignUpFields = vi.fn(async () => signUpFields);
  const settings = { signUp: { enabled: signUpEnabled } };
  const service = vi.fn(() => ({ getSignUpFields, get: async () => settings }));
  const plugin = vi.fn(() => ({ service }));
  const profileType = { uid: PROFILE_UID };
  const contentType = vi.fn(() => profileType);
  const validateEntityCreation = vi.fn(async () => ({}));
  const requestContext = { get: () => (state ? { state } : undefined) };

  const strapi = {
    plugin,
    contentType,
    entityValidator: { validateEntityCreation },
    requestContext,
  } as unknown as Core.Strapi;

  const auth = betterAuth({
    secret: SECRET,
    baseURL: 'http://localhost:1337',
    telemetry: { enabled: false },
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    // A user field a project's Better Auth plugin (or the plugin itself) declares
    user: { additionalFields: { locale: { type: 'string', required: false } } },
    // `admin` and `twoFactor` are what the engine installs: they declare the `input: false` user fields
    plugins: [admin(), twoFactor(), strapiProfile(strapi)],
  });

  const signUp = (body: Record<string, unknown>) =>
    auth.api.signUpEmail({
      body: { email: 'new@example.com', password: PASSWORD, name: 'A', ...body } as never,
    });

  return {
    auth,
    db,
    signUp,
    plugin,
    service,
    getSignUpFields,
    settings,
    contentType,
    profileType,
    validateEntityCreation,
    strapi,
    state,
  };
};

describe('strapi-profile', () => {
  it('is a Better Auth plugin named strapi-profile', () => {
    expect(strapiProfile({} as Core.Strapi).id).toBe('strapi-profile');
  });

  describe('when sign-up is off', () => {
    it('refuses /sign-up/email with 403 SIGN_UP_DISABLED, and creates nothing', async () => {
      const { signUp, db } = setup({ signUpEnabled: false });

      await expect(signUp({})).rejects.toMatchObject({
        statusCode: 403,
        body: { code: 'SIGN_UP_DISABLED' },
      });
      expect(db.user).toHaveLength(0);
    });

    it('refuses before it looks at the profile fields', async () => {
      const { signUp, getSignUpFields } = setup({ signUpEnabled: false });

      await expect(signUp({ company: 'Acme', unknown: 1 })).rejects.toMatchObject({
        body: { code: 'SIGN_UP_DISABLED' },
      });
      expect(getSignUpFields).not.toHaveBeenCalled();
    });

    it('refuses a new user that arrives any other way (an OAuth callback, a magic link), with the same code', async () => {
      const { auth, db } = setup({ signUpEnabled: false });
      const { internalAdapter } = await auth.$context;

      await expect(
        internalAdapter.createUser({ email: 'oauth@example.com', name: 'O', emailVerified: true }, {
          method: 'oauth',
        } as never)
      ).rejects.toMatchObject({ statusCode: 403, body: { code: 'SIGN_UP_DISABLED' } });
      expect(db.user).toHaveLength(0);
    });

    it('lets a user who already exists sign in: nothing is created', async () => {
      const { auth, settings } = setup();

      await auth.api.signUpEmail({
        body: { email: 'old@example.com', password: PASSWORD, name: 'Old' },
      });
      settings.signUp.enabled = false;

      const signedIn = await auth.api.signInEmail({
        body: { email: 'old@example.com', password: PASSWORD },
      });

      expect(signedIn.user.email).toBe('old@example.com');
    });

    it('is read on every request: turning it back on lets sign-ups through at once', async () => {
      const { signUp, settings, db } = setup({ signUpEnabled: false });

      await expect(signUp({})).rejects.toMatchObject({ body: { code: 'SIGN_UP_DISABLED' } });

      settings.signUp.enabled = true;
      await signUp({});

      expect(db.user).toHaveLength(1);
    });
  });

  describe('a sign-up with no profile fields', () => {
    it('is left alone: no list is read, nothing is checked, nothing is carried', async () => {
      const { signUp, getSignUpFields, validateEntityCreation, strapi, db } = setup();

      const { user } = await signUp({});

      expect(user.email).toBe('new@example.com');
      expect(db.user).toHaveLength(1);
      expect(getSignUpFields).not.toHaveBeenCalled();
      expect(validateEntityCreation).not.toHaveBeenCalled();
      expect(takePendingProfile(strapi)).toBeUndefined();
    });

    it('may carry everything Better Auth reads: its keys and the user fields it declares', async () => {
      const { signUp, getSignUpFields, db } = setup();

      await signUp({
        image: 'https://x.io/a.png',
        callbackURL: '/welcome',
        rememberMe: false,
        locale: 'fr',
      });

      expect(db.user).toHaveLength(1);
      expect(db.user[0]).toMatchObject({ locale: 'fr' });
      expect(getSignUpFields).not.toHaveBeenCalled();
    });
  });

  describe('a sign-up with a field on the registration list', () => {
    it('goes through, and the field is left on the request for the profile', async () => {
      const { signUp, strapi, db } = setup();

      const { user } = await signUp({ company: 'Acme' });

      expect(user.email).toBe('new@example.com');
      expect(db.user).toHaveLength(1);
      expect(takePendingProfile(strapi)).toEqual({ fields: { company: 'Acme' } });
    });

    it('carries only the profile fields, not the keys Better Auth reads', async () => {
      const { signUp, strapi } = setup({ signUpFields: ['company', 'newsletter'] });

      await signUp({ company: 'Acme', newsletter: true, locale: 'fr', callbackURL: '/x' });

      expect(takePendingProfile(strapi)).toEqual({ fields: { company: 'Acme', newsletter: true } });
    });

    it('asks the settings of this plugin which fields a sign-up can write', async () => {
      const { signUp, plugin, service, getSignUpFields } = setup();

      await signUp({ company: 'Acme' });

      expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
      expect(service).toHaveBeenCalledWith('settings');
      expect(getSignUpFields).toHaveBeenCalledTimes(1);
    });

    it('is checked against the profile`s own rules before anything is created', async () => {
      const { signUp, validateEntityCreation, contentType, profileType } = setup();

      await signUp({ company: 'Acme' });

      expect(contentType).toHaveBeenCalledWith(PROFILE_UID);
      expect(validateEntityCreation).toHaveBeenCalledTimes(1);
      expect(validateEntityCreation).toHaveBeenCalledWith(profileType, { company: 'Acme' });
    });
  });

  describe('a sign-up with a field that is not on the list', () => {
    it('is refused with a 400 that names the field, and creates nothing', async () => {
      const { signUp, db, strapi } = setup();

      await expect(signUp({ newsletter: true })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'newsletter is not allowed at sign-up' },
      });

      expect(db.user).toHaveLength(0);
      expect(db.session).toHaveLength(0);
      expect(takePendingProfile(strapi)).toBeUndefined();
    });

    it('is refused when a field is listed beside it: one that is not allowed spoils the sign-up', async () => {
      const { signUp, db } = setup();

      await expect(signUp({ company: 'Acme', newsletter: true })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'newsletter is not allowed at sign-up' },
      });
      expect(db.user).toHaveLength(0);
    });

    it('is refused for a key that is no profile field at all', async () => {
      const { signUp, db } = setup();

      await expect(signUp({ isAdmin: true })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'isAdmin is not allowed at sign-up' },
      });
      expect(db.user).toHaveLength(0);
    });

    it('is refused when the list is empty, which is what it is until an administrator sets it', async () => {
      const { signUp } = setup({ signUpFields: [] });

      await expect(signUp({ company: 'Acme' })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'company is not allowed at sign-up' },
      });
    });

    it('is refused for `user`, whatever the list says: it is never a field a sign-up can write', async () => {
      // The settings never offer it, so the list a hook sees cannot hold it
      const { signUp } = setup({ signUpFields: ['company'] });

      await expect(signUp({ user: 'someone-else' })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'user is not allowed at sign-up' },
      });
    });

    it('is refused with a code a client can tell', async () => {
      const { signUp } = setup();

      await expect(signUp({ newsletter: true })).rejects.toMatchObject({
        body: { code: 'FIELD_NOT_ALLOWED_AT_SIGN_UP' },
      });
    });
  });

  describe('a sign-up with a user field Better Auth keeps out of client input', () => {
    // Better Auth would not refuse these: it replaces an `input: false` field that has a default
    // with the default, so the sign-up would go through as if the key had not been sent.
    it.each([
      ['banned', true],
      ['banned', false],
      ['twoFactorEnabled', true],
      ['role', 'admin'],
      ['banReason', 'because'],
      ['banExpires', 1893456000000],
      ['emailVerified', true],
    ])('is refused with a 400 naming %s (%j), and creates nothing', async (field, value) => {
      const { signUp, db, getSignUpFields, strapi } = setup();

      await expect(signUp({ [field]: value })).rejects.toMatchObject({
        statusCode: 400,
        body: {
          message: `${field} is not allowed at sign-up`,
          code: 'FIELD_NOT_ALLOWED_AT_SIGN_UP',
        },
      });

      expect(db.user).toHaveLength(0);
      expect(db.session).toHaveLength(0);
      expect(getSignUpFields).not.toHaveBeenCalled();
      expect(takePendingProfile(strapi)).toBeUndefined();
    });

    it('is refused even when the registration list names it: the list cannot widen it', async () => {
      const { signUp, db } = setup({ signUpFields: ['company', 'banned'] });

      await expect(signUp({ company: 'Acme', banned: true })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'banned is not allowed at sign-up' },
      });
      expect(db.user).toHaveLength(0);
    });

    it('is refused beside a listed profile field, which then writes nothing', async () => {
      const { signUp, db, strapi, validateEntityCreation } = setup();

      await expect(signUp({ company: 'Acme', banned: true })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'banned is not allowed at sign-up' },
      });
      expect(db.user).toHaveLength(0);
      expect(validateEntityCreation).not.toHaveBeenCalled();
      expect(takePendingProfile(strapi)).toBeUndefined();
    });

    it('does not touch a user field a client may set (input is not false)', async () => {
      const { signUp, db } = setup();

      await signUp({ locale: 'fr' });

      expect(db.user).toHaveLength(1);
      expect(db.user[0]).toMatchObject({ locale: 'fr', banned: false });
    });
  });

  describe('a value the profile refuses', () => {
    it('is a 400 with the profile`s message, and creates nothing', async () => {
      const { signUp, validateEntityCreation, db, strapi } = setup();

      validateEntityCreation.mockRejectedValueOnce(
        new errors.ValidationError('company must be at most 20 characters')
      );

      await expect(signUp({ company: 'x'.repeat(50) })).rejects.toMatchObject({
        statusCode: 400,
        body: { message: 'company must be at most 20 characters', code: 'INVALID_PROFILE_FIELD' },
      });
      expect(db.user).toHaveLength(0);
      expect(takePendingProfile(strapi)).toBeUndefined();
    });

    it('is not a 400 when the check itself failed: that is a fault, and is not hidden', async () => {
      const { signUp, validateEntityCreation, db } = setup();

      validateEntityCreation.mockRejectedValueOnce(new Error('database is locked'));

      await expect(signUp({ company: 'Acme' })).rejects.toThrow('database is locked');
      expect(db.user).toHaveLength(0);
    });
  });

  describe('a sign-up that is not part of a request', () => {
    it('is refused rather than dropping what the user sent, and creates nothing', async () => {
      const { signUp, db } = setup({ state: null });

      await expect(signUp({ company: 'Acme' })).rejects.toMatchObject({
        statusCode: 500,
        body: { code: 'NO_REQUEST_FOR_PROFILE_FIELDS' },
      });
      expect(db.user).toHaveLength(0);
    });

    it('is fine when it carries no profile fields', async () => {
      const { signUp, db } = setup({ state: null });

      await signUp({});

      expect(db.user).toHaveLength(1);
    });
  });

  it('looks at sign-up only: signing in with an extra key is Better Auth`s business', async () => {
    const { auth, signUp, getSignUpFields } = setup();

    await signUp({});
    await auth.api.signInEmail({
      body: { email: 'new@example.com', password: PASSWORD, newsletter: true } as never,
    });

    expect(getSignUpFields).not.toHaveBeenCalled();
  });
});
