import { emitAudit } from '@strapi/utils';

import { emitLoginFailure, isRecordedLoginFailure, registerAuthAuditEvents } from '../auth';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(async () => {}),
}));

const getRegistrations = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};
  const options: Record<string, any> = {};

  registerAuthAuditEvents({
    registerEvent(name: string, transform: any, opts?: unknown) {
      transformers[name] = transform;
      options[name] = opts;
    },
  });

  return { transformers, options };
};

describe('authentication audit events', () => {
  const resource = { type: 'admin-user', id: 7, email: 'ana@acme.com' };

  test('registers the failed login with an unknown actor and the auto-registration without', () => {
    const { transformers, options } = getRegistrations();

    expect(Object.keys(transformers).sort()).toEqual([
      'admin.auth.autoRegistration',
      'admin.auth.error',
    ]);
    expect(options['admin.auth.error']).toEqual({
      alwaysUnknownActor: true,
      shouldRecord: isRecordedLoginFailure,
    });
    expect(options['admin.auth.autoRegistration']).toBeUndefined();
  });

  test('a failed login records the provider, the reason and the account, never the error', () => {
    const transform = getRegistrations().transformers['admin.auth.error'];
    const error = new Error('password hunter2 rejected');

    const shape = transform({
      error,
      provider: 'local',
      reason: 'invalid_credentials',
      user: { id: 7, email: 'ana@acme.com' },
    });

    expect(shape).toEqual({
      resource,
      outcome: 'failure',
      details: { provider: 'local', reason: 'invalid_credentials' },
    });
    expect(JSON.stringify(shape)).not.toContain('hunter2');
  });

  test('a failed login without a known account has no resource', () => {
    const transform = getRegistrations().transformers['admin.auth.error'];

    expect(
      transform({ error: new Error(), provider: 'okta', reason: 'sso_role_misconfigured' })
    ).toEqual({
      outcome: 'failure',
      details: { provider: 'okta', reason: 'sso_role_misconfigured' },
    });
  });

  test('an auto-registration records the provider and the sorted role ids of the new user', () => {
    const transform = getRegistrations().transformers['admin.auth.autoRegistration'];

    expect(
      transform({
        provider: 'okta',
        user: {
          id: 7,
          email: 'ana@acme.com',
          password: null,
          registrationToken: null,
          roles: [{ id: 5 }, { id: 3 }],
        },
      })
    ).toEqual({ resource, details: { provider: 'okta', roles: [3, 5] } });
  });

  test.each([
    ['local, account known', { provider: 'local', reason: 'invalid_credentials', user: {} }, true],
    ['local, no account', { provider: 'local', reason: 'invalid_credentials' }, false],
    [
      'local unexpected error, no account',
      { provider: 'local', reason: 'unexpected_error' },
      false,
    ],
    ['sso connection error', { provider: 'okta', reason: 'sso_connection_error' }, false],
    ['sso registration disabled', { provider: 'okta', reason: 'sso_registration_disabled' }, true],
    ['sso role misconfigured', { provider: 'okta', reason: 'sso_role_misconfigured' }, true],
  ])('records a failure when it passed a verification: %s', (_, event, expected) => {
    expect(isRecordedLoginFailure(event as any)).toBe(expected);
  });

  test('emitLoginFailure keeps error and provider and passes only the account id and email', async () => {
    const strapi = {} as any;
    const error = new Error('boom');

    await emitLoginFailure(
      { strapi },
      {
        error,
        provider: 'local',
        reason: 'account_inactive',
        user: { id: 7, email: 'ana@acme.com', password: 'hash' } as any,
      }
    );

    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error,
      provider: 'local',
      reason: 'account_inactive',
      user: { id: 7, email: 'ana@acme.com' },
    });
  });
});
