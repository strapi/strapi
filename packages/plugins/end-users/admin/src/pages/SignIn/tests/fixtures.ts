import { http, HttpResponse } from 'msw';

import { server } from '../../../../tests/server';

import type { SettingsResponse } from '../../../../../shared/contracts/settings';

export const SETTINGS: SettingsResponse = {
  data: {
    signUp: {
      enabled: true,
      defaultRoles: ['p1'],
      requireEmailVerification: false,
      registrationFields: ['displayName'],
    },
    redirects: { emailVerified: '/welcome', passwordReset: null, error: null },
    passwords: { minLength: 8, maxLength: 128, requireMixedClasses: false },
    lockout: { enabled: true, maxAttempts: 5, durationMinutes: 15 },
    methods: {
      emailPassword: true,
      username: false,
      twoFactor: false,
      magicLink: false,
      emailOtp: false,
      passkey: false,
    },
  },
  meta: {
    installedMethods: ['emailPassword', 'username'],
    breachedCheckInstalled: false,
    config: {
      secret: { set: true, tooShort: true },
      trustedOrigins: ['https://app.example.com'],
      cookies: { crossSite: false, domain: null },
      session: { expiresIn: '7d', updateAge: '1d', cookieCache: false },
      rateLimit: { enabled: true, window: 10, max: 100, storage: 'database' },
      compat: { usersPermissions: false, legacyJwtUntil: null },
      explain: false,
      auth: { plugins: ['username'], senders: ['end-users.welcome'] },
    },
  },
};

/** Serves the settings, and the profile's fields, and records what a save sends */
export const serveSettings = (settings: SettingsResponse = SETTINGS) => {
  const saved: unknown[] = [];

  server.use(
    http.get('/end-users/settings', () => HttpResponse.json(settings)),
    http.put('/end-users/settings', async ({ request }) => {
      saved.push(await request.json());

      return HttpResponse.json(settings);
    }),
    http.get('/content-manager/content-types', () =>
      HttpResponse.json({
        data: [
          {
            uid: 'plugin::end-users.profile',
            attributes: {
              user: { type: 'relation' },
              displayName: { type: 'string' },
              bio: { type: 'text' },
              avatar: { type: 'media' },
              notes: { type: 'string', private: true },
            },
          },
        ],
      })
    )
  );

  return saved;
};

/** The answer of a save the server refused on one field, as the admin API sends it */
export const refuseOn = (path: string[], message: string) =>
  http.put('/end-users/settings', () =>
    HttpResponse.json(
      {
        error: {
          status: 400,
          name: 'ValidationError',
          message,
          details: { errors: [{ path, message, name: 'ValidationError' }] },
        },
      },
      { status: 400 }
    )
  );
