/* eslint-env jest */

import { defaultEvents } from '../lifecycles';

import type { MfaEventType } from '../../../../../../shared/contracts/mfa';

/**
 * `notify` emits every MFA notice on the event hub as `admin.mfa.<type>` with `_` replaced by
 * `.`, and the hub is the only mechanism EE audit logging can observe any of them through. The
 * allow-list in `lifecycles.ts` is written out by hand in its own dotted form, so adding a notice
 * type without adding it there means that notice is silently never audited -- a gap nobody would
 * notice until an auditor asked for a trail that does not exist.
 *
 * This pins the two together without coupling them: the allow-list stays the audit feature's own
 * registry, spelled its own way, and this test derives what it must contain.
 */
const hubName = (type: string) => `admin.mfa.${type.replace(/_/g, '.')}`;

// Every persisted row type, from the contract that declares them.
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
  'trusted_device_used',
  'passkey_registered',
  'passkey_removed',
];

/**
 * Deliberately unaudited. `recovery_code_used` and `recovery_codes_issued` are about the codes
 * themselves and say nothing an auditor needs that `disabled`/`reset` does not; `grace_started`
 * is a consequence of policy already audited through `admin.security-settings.update`.
 */
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

  // Emitted on the hub but never persisted as a row, so it is not in `MfaEventType` and would be
  // missed by a check derived from row types alone.
  test('passkey_used is audited even though it has no row', () => {
    expect(defaultEvents).toContain('admin.mfa.passkey.used');
  });

  test('the deliberately unaudited types are genuinely absent, not forgotten', () => {
    for (const type of NOT_AUDITED) {
      expect(defaultEvents).not.toContain(hubName(type));
    }
  });
});
