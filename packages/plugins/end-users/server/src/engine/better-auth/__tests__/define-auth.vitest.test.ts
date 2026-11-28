import { describe, expect, it, vi } from 'vitest';

import { defineAuth, isDefineAuthResult } from '../define-auth';
import * as publicAuth from '../public/auth';
import * as publicPlugins from '../public/plugins';
import * as publicPasskey from '../public/passkey';

const fakeSecondaryStorage = () => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  getAndDelete: vi.fn(),
  increment: vi.fn(),
});

describe('defineAuth', () => {
  it('refuses project additional user fields', () => {
    expect(() =>
      // @ts-expect-error the type refuses it too
      defineAuth({ user: { additionalFields: { credits: { type: 'number' } } } })
    ).toThrow(/profile/);
  });

  it('names the profile type in the refusal', () => {
    expect(() =>
      // @ts-expect-error the type refuses it too
      defineAuth({ user: { additionalFields: { credits: { type: 'number' } } } })
    ).toThrow(
      'The end-user type is locked. Add custom fields to plugin::end-users.profile instead.'
    );
  });

  it('refuses the options the plugin owns', () => {
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ database: {} })).toThrow(/database/);
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ secret: 'x'.repeat(32) })).toThrow(/secret/);
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ secrets: [] })).toThrow(/secret/);
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ baseURL: 'https://evil.example' })).toThrow(/baseURL.*Host/s);
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ basePath: '/auth' })).toThrow(/basePath/);
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ advanced: { database: { generateId: 'uuid' } } })).toThrow(
      /advanced\.database/
    );
  });

  describe('the names of the engine tables and attributes are fixed', () => {
    // `fields` and `modelName` rename attributes and tables (email -> mail): the email rule,
    // ctx.state.user, the compat routes and the migration all rely on the names
    it.each(['user', 'session', 'account', 'verification'] as const)(
      'refuses %s.fields and %s.modelName',
      (group) => {
        expect(() => defineAuth({ [group]: { fields: { email: 'mail' } } } as never)).toThrow(
          new RegExp(`${group}\\.fields`)
        );
        expect(() => defineAuth({ [group]: { modelName: 'People' } } as never)).toThrow(
          new RegExp(`${group}\\.modelName`)
        );
      }
    );

    it('refuses them in the type too', () => {
      // never called: what matters is that tsc accepts each @ts-expect-error
      const refusedByTheType = () => {
        // @ts-expect-error user.fields
        defineAuth({ user: { fields: { email: 'mail' } } });
        // @ts-expect-error user.modelName
        defineAuth({ user: { modelName: 'People' } });
        // @ts-expect-error session.fields
        defineAuth({ session: { fields: { token: 'secret' } } });
        // @ts-expect-error account.modelName
        defineAuth({ account: { modelName: 'Links' } });
        // @ts-expect-error verification.fields
        defineAuth({ verification: { fields: { value: 'v' } } });
      };

      expect(refusedByTheType).toBeTypeOf('function');
    });

    it('says why', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ user: { fields: { email: 'mail' } } })).toThrow(/fixed names/);
    });

    it('still takes the other options of those groups', () => {
      expect(() =>
        defineAuth({
          user: { changeEmail: { enabled: true } },
          session: { expiresIn: 60, updateAge: 30 },
          account: { accountLinking: { enabled: true } },
          verification: { disableCleanup: true },
        })
      ).not.toThrow();
    });
  });

  describe('the options that would let a locked table be skipped', () => {
    // The two-factor reset deletes trusted-device rows from the verification table, and the engine's
    // tables are read by name. Each of these would move or hide data from that code.
    it('refuses to hash the identifiers of verification values', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ verification: { storeIdentifier: 'hashed' } })).toThrow(
        /verification\.storeIdentifier/
      );
      expect(() =>
        defineAuth({
          // @ts-expect-error the type refuses it too
          verification: { storeIdentifier: { default: 'plain', overrides: { 'x-': 'hashed' } } },
        })
      ).toThrow(/verification\.storeIdentifier/);
      expect(() =>
        // @ts-expect-error the type refuses it too
        defineAuth({ verification: { storeIdentifier: { default: 'hashed' } } })
      ).toThrow(/verification\.storeIdentifier/);
    });

    it('says why the identifiers stay as they are', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ verification: { storeIdentifier: 'hashed' } })).toThrow(
        /two-factor|trusted device/i
      );
    });

    it('takes the default spelled out, which changes nothing', () => {
      // @ts-expect-error the type has no such option; a JavaScript project could still write it
      expect(() => defineAuth({ verification: { storeIdentifier: 'plain' } })).not.toThrow();
    });

    // With secondary storage Better Auth keeps sessions (and other values) there, unless told
    // otherwise, so the engine's revoke, ban and two-factor reset cleanups, which delete through the
    // database adapter, would miss them. No combination of options is accepted in v1.
    it('refuses secondary storage outright', () => {
      const secondaryStorage = fakeSecondaryStorage();

      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ secondaryStorage })).toThrow(/secondaryStorage/);
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ secondaryStorage, verification: {} })).toThrow(/secondaryStorage/);
      expect(() =>
        // @ts-expect-error the type refuses it too
        defineAuth({ secondaryStorage, verification: { storeInDatabase: false } })
      ).toThrow(/secondaryStorage/);
    });

    it('refuses it even with verification values and sessions kept in the database too', () => {
      const secondaryStorage = fakeSecondaryStorage();

      expect(() =>
        // @ts-expect-error the type refuses it too
        defineAuth({ secondaryStorage, verification: { storeInDatabase: true } })
      ).toThrow(/secondaryStorage/);
      expect(() =>
        defineAuth({
          // @ts-expect-error the type refuses it too
          secondaryStorage,
          verification: { storeInDatabase: true },
          session: { storeSessionInDatabase: true },
        })
      ).toThrow(/secondaryStorage/);
    });

    it('says why, and that it is not supported yet', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ secondaryStorage: fakeSecondaryStorage() })).toThrow(
        "secondaryStorage isn't supported yet: sessions and verification values must live in the database so Strapi can revoke them"
      );
    });

    it('refuses it in the type too', () => {
      // never called: what matters is that tsc accepts the @ts-expect-error
      const refusedByTheType = () => {
        // @ts-expect-error secondaryStorage
        defineAuth({ secondaryStorage: fakeSecondaryStorage() });
      };

      expect(refusedByTheType).toBeTypeOf('function');
    });

    it('refuses the rate limit store that lives in secondary storage, which would then be nowhere', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ rateLimit: { storage: 'secondary-storage' } })).toThrow(
        /rateLimit\.storage.*secondaryStorage/s
      );
    });

    it('refuses to rename the rate limit table or its attributes', () => {
      expect(() => defineAuth({ rateLimit: { modelName: 'limits' } } as never)).toThrow(
        /rateLimit\.modelName/
      );
      expect(() => defineAuth({ rateLimit: { fields: { key: 'k' } } } as never)).toThrow(
        /rateLimit\.fields/
      );
    });

    it('refuses them in the type too', () => {
      // never called: what matters is that tsc accepts each @ts-expect-error
      const refusedByTheType = () => {
        // @ts-expect-error rateLimit.modelName
        defineAuth({ rateLimit: { modelName: 'limits' } });
        // @ts-expect-error rateLimit.fields
        defineAuth({ rateLimit: { fields: { key: 'k' } } });
        // @ts-expect-error verification.storeIdentifier
        defineAuth({ verification: { storeIdentifier: 'hashed' } });
      };

      expect(refusedByTheType).toBeTypeOf('function');
    });

    it('still takes the other rate limit options', () => {
      expect(() =>
        defineAuth({ rateLimit: { enabled: true, window: 60, max: 20, storage: 'memory' } })
      ).not.toThrow();
    });
  });

  describe('the origins and the checks on them belong to the plugin configuration', () => {
    it('refuses trustedOrigins, as a list, an empty list or a function', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ trustedOrigins: ['https://app.example.com'] })).toThrow(
        /trustedOrigins/
      );
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ trustedOrigins: [] })).toThrow(/trustedOrigins/);
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ trustedOrigins: () => ['https://app.example.com'] })).toThrow(
        /trustedOrigins/
      );
    });

    it('says where trustedOrigins goes instead, where it is checked', () => {
      // @ts-expect-error the type refuses it too
      expect(() => defineAuth({ trustedOrigins: ['*'] })).toThrow(
        /config\/plugins.*end-users\.config\.trustedOrigins/s
      );
    });

    it('lets a project that leaves trustedOrigins unset call it', () => {
      expect(() =>
        defineAuth({ trustedOrigins: undefined } as unknown as Parameters<typeof defineAuth>[0])
      ).not.toThrow();
    });

    it('refuses to turn the origin check or the CSRF check off', () => {
      expect(() => defineAuth({ advanced: { disableOriginCheck: true } } as never)).toThrow(
        /advanced\.disableOriginCheck.*trustedOrigins/s
      );
      expect(() => defineAuth({ advanced: { disableCSRFCheck: true } } as never)).toThrow(
        /advanced\.disableCSRFCheck.*trustedOrigins/s
      );
    });

    it('refuses any other value that turns them off, such as a list of paths', () => {
      expect(() => defineAuth({ advanced: { disableOriginCheck: ['/sign-in'] } } as never)).toThrow(
        /advanced\.disableOriginCheck/
      );
      expect(() => defineAuth({ advanced: { disableCSRFCheck: 1 } } as never)).toThrow(
        /advanced\.disableCSRFCheck/
      );
    });

    it('takes them spelled out as false, which changes nothing', () => {
      expect(() =>
        defineAuth({ advanced: { disableOriginCheck: false, disableCSRFCheck: false } })
      ).not.toThrow();
      expect(() => defineAuth({ advanced: { disableOriginCheck: undefined } })).not.toThrow();
    });

    it('refuses them in the type too', () => {
      // never called: what matters is that tsc accepts each @ts-expect-error
      const refusedByTheType = () => {
        // @ts-expect-error trustedOrigins
        defineAuth({ trustedOrigins: [] });
        // @ts-expect-error advanced.disableOriginCheck
        defineAuth({ advanced: { disableOriginCheck: true } });
        // @ts-expect-error advanced.disableCSRFCheck
        defineAuth({ advanced: { disableCSRFCheck: true } });
      };

      expect(refusedByTheType).toBeTypeOf('function');
    });

    it('still takes the other advanced options', () => {
      expect(() =>
        defineAuth({ advanced: { useSecureCookies: true, ipAddress: { disableIpTracking: true } } })
      ).not.toThrow();
    });
  });

  it('refuses telemetry: there is no hosted service to report to', () => {
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ telemetry: { enabled: true } })).toThrow(/telemetry/);
  });

  it.each([
    ['emailAndPassword', 'requireEmailVerification', true],
    ['emailAndPassword', 'minPasswordLength', 12],
    ['emailAndPassword', 'maxPasswordLength', 64],
    ['emailAndPassword', 'disableSignUp', true],
    ['emailVerification', 'sendOnSignUp', true],
  ])('refuses %s.%s, naming the Sign-in page', (group, key, value) => {
    expect(() => defineAuth({ [group]: { [key]: value } } as never)).toThrow(
      new RegExp(`${group}\\.${key}.*Settings › End users › Sign-in`)
    );
  });

  it('points the secret at the plugin config', () => {
    // @ts-expect-error the type refuses it too
    expect(() => defineAuth({ secret: 'x'.repeat(32) })).toThrow(/END_USERS_SECRET|config/);
  });

  it('accepts other user options and every other option group', () => {
    expect(() =>
      defineAuth({
        user: { changeEmail: { enabled: true } },
        session: { expiresIn: 60 },
        advanced: { useSecureCookies: true },
        emailAndPassword: { autoSignIn: false },
        emailVerification: { expiresIn: 600 },
        plugins: [],
      })
    ).not.toThrow();
  });

  it('accepts additional fields on the session and the account', () => {
    expect(() =>
      defineAuth({
        session: { additionalFields: { deviceName: { type: 'string', required: false } } },
        account: { additionalFields: { note: { type: 'string', required: false } } },
      })
    ).not.toThrow();
  });

  it('returns the options under a brand the engine recognizes', () => {
    const options = { session: { expiresIn: 60 } };
    const result = defineAuth(options);

    expect(isDefineAuthResult(result)).toBe(true);
    expect(result.options).toEqual(options);
  });

  it('does not take any other value for a result', () => {
    expect(isDefineAuthResult(undefined)).toBe(false);
    expect(isDefineAuthResult(null)).toBe(false);
    expect(isDefineAuthResult({})).toBe(false);
    expect(isDefineAuthResult({ options: {} })).toBe(false);
    expect(isDefineAuthResult({ kind: 'something-else', options: {} })).toBe(false);
  });
});

describe('public entry points', () => {
  it('auth exports defineAuth', () => {
    expect(publicAuth.defineAuth).toBe(defineAuth);
  });

  it('plugins re-exports every Better Auth plugin a project may opt into', () => {
    const names = [
      'magicLink',
      'emailOTP',
      'phoneNumber',
      'jwt',
      'oneTap',
      'anonymous',
      'multiSession',
      'oneTimeToken',
      'openAPI',
      'captcha',
      'haveIBeenPwned',
      'genericOAuth',
    ] as const;

    for (const name of names) {
      expect(typeof publicPlugins[name], name).toBe('function');
    }
  });

  it('plugins does not hand out the plugins the engine already installs', () => {
    const exported = Object.keys(publicPlugins);

    for (const name of ['bearer', 'username', 'twoFactor', 'admin']) {
      expect(exported).not.toContain(name);
    }
  });

  it('passkey re-exports passkey from @better-auth/passkey', () => {
    expect(typeof publicPasskey.passkey).toBe('function');
  });
});
