import { describe, expect, test, vi } from 'vitest';

import {
  MFA_NOTICE_EVENTS,
  MFA_REQUIRED_EVENT,
  SECURITY_SETTINGS_UPDATE_EVENT,
  diffSecuritySettings,
  registerMfaAuditEvents,
} from '../mfa';

import type { MfaAuditOnlyNotice, MfaEventType } from '../../../../shared/contracts/mfa';

const register = (users: Record<string, { id: number; email: string }> = {}) => {
  const transformers: Record<string, (...args: any[]) => any> = {};
  const options: Record<string, unknown> = {};
  const findOne = vi.fn(async ({ where }: { where: { id: string | number } }) => {
    return users[String(where.id)] ?? null;
  });

  registerMfaAuditEvents(
    {
      registerEvent(name: string, transform: any, opts?: unknown) {
        transformers[name] = transform;
        options[name] = opts;
      },
    },
    { strapi: { db: { query: () => ({ findOne }) } } as any }
  );

  return { transformers, options, findOne };
};

/** `notify`'s naming rule: `admin.mfa.<type, underscores as dots>`. */
const hubName = (type: string) => `admin.mfa.${type.replace(/_/g, '.')}`;

/**
 * The notice list is hand-written, so a notice type added without it is silently never audited --
 * a gap nobody finds until an auditor asks for a trail that does not exist. This derives what the
 * list must contain from the row types, without coupling to how it is written.
 */
describe('every second-factor notice reaches the audit log', () => {
  const ROW_TYPES: MfaEventType[] = [
    'enabled',
    'disabled',
    'reset',
    'challenge_failed',
    'recovery_code_used',
    'recovery_codes_issued',
    'grace_started',
    'locked',
    'unlocked',
    'authenticator_replaced',
    'device_trusted',
    'device_trust_revoked',
    'passkey_registered',
    'passkey_removed',
  ];

  /** Deliberately unaudited: the recovery-code types say nothing `disabled`/`reset` does not, and
   * `grace_started` follows from a policy change that is itself audited. */
  const NOT_AUDITED: MfaEventType[] = [
    'recovery_code_used',
    'recovery_codes_issued',
    'grace_started',
  ];

  test.each(ROW_TYPES.filter((type) => !NOT_AUDITED.includes(type)))('%s is registered', (type) => {
    expect(MFA_NOTICE_EVENTS).toContain(hubName(type));
  });

  // Emitted on the hub but never persisted, so a check derived from row types alone misses them.
  test.each<MfaAuditOnlyNotice>(['trusted_device_used', 'passkey_used'])(
    '%s is registered even though it has no row',
    (type) => {
      expect(MFA_NOTICE_EVENTS).toContain(hubName(type));
    }
  );

  test('the deliberately unaudited types are genuinely absent, not forgotten', () => {
    for (const type of NOT_AUDITED) {
      expect(MFA_NOTICE_EVENTS).not.toContain(hubName(type));
    }
  });

  test('every listed notice, and the two other events, is actually registered', () => {
    const { transformers } = register();

    expect(Object.keys(transformers).sort()).toEqual(
      [...MFA_NOTICE_EVENTS, MFA_REQUIRED_EVENT, SECURITY_SETTINGS_UPDATE_EVENT].sort()
    );
  });
});

describe('the actor', () => {
  /**
   * The old fallback put an actorless `admin.mfa.*` row on the account holder's name, so a failed
   * guess by an attacker on `/login/mfa` read as the victim's own action. With a session the
   * session user is the actor; without one it is `unknown`, and the account is the resource.
   */
  test('notices allow an unknown actor rather than inventing one', () => {
    const { options } = register();

    for (const name of MFA_NOTICE_EVENTS) {
      expect(options[name]).toEqual({ allowUnknownActor: true });
    }
  });

  test('a demand for a second factor is a login that has not completed, so never attributed', () => {
    const { options } = register();

    expect(options[MFA_REQUIRED_EVENT]).toEqual({ alwaysUnknownActor: true });
  });

  test('a settings save requires its actor', () => {
    const { options } = register();

    expect(options[SECURITY_SETTINGS_UPDATE_EVENT]).toBeUndefined();
  });
});

describe('notice shape', () => {
  test('names the account by id and email, and carries who acted and how many', async () => {
    const { transformers } = register({ '1': { id: 1, email: 'ana@acme.com' } });

    await expect(
      transformers['admin.mfa.device.trust.revoked']({ userId: '1', byUserId: '9', count: 3 })
    ).resolves.toEqual({
      resource: { type: 'admin-user', id: 1, email: 'ana@acme.com' },
      details: { byUserId: '9', count: 3 },
    });
  });

  test('omits what the notice did not carry, rather than recording undefined', async () => {
    const { transformers } = register({ '1': { id: 1, email: 'ana@acme.com' } });

    await expect(transformers['admin.mfa.enabled']({ userId: '1' })).resolves.toEqual({
      resource: { type: 'admin-user', id: 1, email: 'ana@acme.com' },
      details: {},
    });
  });

  test('a deleted account still records its id', async () => {
    const { transformers } = register();

    await expect(transformers['admin.mfa.reset']({ userId: '42' })).resolves.toEqual({
      resource: { type: 'admin-user', id: '42' },
      details: {},
    });
  });
});

describe('the gated-login notice', () => {
  test('records the account and the provider', () => {
    const { transformers } = register();

    expect(
      transformers[MFA_REQUIRED_EVENT]({
        user: { id: 7, email: 'ana@acme.com' },
        provider: 'local',
      })
    ).toEqual({
      resource: { type: 'admin-user', id: 7, email: 'ana@acme.com' },
      details: { provider: 'local' },
    });
  });
});

describe('security settings changes', () => {
  const base = {
    mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1', '2'] },
    trustedDevices: { enabled: true, days: 30 },
    passkeys: { enabled: true },
  };

  test('only the fields that moved, as before and after', () => {
    expect(
      diffSecuritySettings(base, {
        ...base,
        mfa: { ...base.mfa, mode: 'required' },
        passkeys: { enabled: false },
      })
    ).toEqual({
      'mfa.mode': { before: 'optional', after: 'required' },
      'passkeys.enabled': { before: true, after: false },
    });
  });

  test('the same roles in another order are not a change', () => {
    expect(
      diffSecuritySettings(base, { ...base, mfa: { ...base.mfa, requiredRoles: ['2', '1'] } })
    ).toEqual({});
  });

  test('the registered shape names the settings and carries the changes', () => {
    const { transformers } = register();

    expect(
      transformers[SECURITY_SETTINGS_UPDATE_EVENT]({
        previous: base,
        next: { ...base, trustedDevices: { enabled: true, days: 14 } },
      })
    ).toEqual({
      resource: { type: 'security-settings' },
      details: { changes: { 'trustedDevices.days': { before: 30, after: 14 } } },
    });
  });
});
