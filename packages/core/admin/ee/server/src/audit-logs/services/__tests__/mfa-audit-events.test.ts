/* eslint-env jest */

import { defaultEvents } from '../lifecycles';

import type { MfaAuditOnlyNotice, MfaEventType } from '../../../../../../shared/contracts/mfa';

/**
 * The allow-list in `lifecycles.ts` is hand-written in its own dotted form, so a notice type added
 * without it is silently never audited -- a gap nobody finds until an auditor asks for a trail
 * that does not exist. This derives what it must contain without coupling to it.
 */
const hubName = (type: string) => `admin.mfa.${type.replace(/_/g, '.')}`;

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
 * `grace_started` follows from a policy change already audited. */
const NOT_AUDITED: MfaEventType[] = [
  'recovery_code_used',
  'recovery_codes_issued',
  'grace_started',
];

describe('mfa events reach the audit log', () => {
  test.each(ROW_TYPES.filter((type) => !NOT_AUDITED.includes(type)))(
    '%s is in the audit-log allow-list',
    (type) => {
      expect(defaultEvents).toContain(hubName(type));
    }
  );

  // Emitted on the hub but never persisted, so a check derived from row types alone misses them.
  test.each<MfaAuditOnlyNotice>(['trusted_device_used', 'passkey_used'])(
    '%s is audited even though it has no row',
    (type) => {
      expect(defaultEvents).toContain(hubName(type));
    }
  );

  test('the deliberately unaudited types are genuinely absent, not forgotten', () => {
    for (const type of NOT_AUDITED) {
      expect(defaultEvents).not.toContain(hubName(type));
    }
  });
});
