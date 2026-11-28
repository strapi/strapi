import { MFA_NOTICE_SEVERITY, hasRiskyNotice } from '../mfaNoticeSeverity';

describe('MFA_NOTICE_SEVERITY', () => {
  it('classifies every notice type the way the design asks', () => {
    expect(MFA_NOTICE_SEVERITY).toEqual({
      // Risky: wrong code, recovery-code login, passkey added, authenticator replaced, new recovery
      // codes, 2FA disabled or reset, and 2FA enabled by another login.
      challenge_failed: 'risky',
      recovery_code_used: 'risky',
      passkey_registered: 'risky',
      authenticator_replaced: 'risky',
      recovery_codes_regenerated: 'risky',
      disabled: 'risky',
      reset: 'risky',
      enabled: 'risky',
      // Info: device trusted, trusted devices removed, passkey removed, unlocked, now required, and
      // the lock that comes with the unlock.
      device_trusted: 'info',
      device_trust_revoked: 'info',
      passkey_removed: 'info',
      unlocked: 'info',
      grace_started: 'info',
      locked: 'info',
    });
  });
});

describe('hasRiskyNotice', () => {
  it('is true when at least one notice is risky', () => {
    expect(hasRiskyNotice([{ type: 'device_trusted' }, { type: 'recovery_code_used' }])).toBe(true);
  });

  it('is false when every notice is info, and for no notices', () => {
    expect(hasRiskyNotice([{ type: 'device_trusted' }, { type: 'unlocked' }])).toBe(false);
    expect(hasRiskyNotice([])).toBe(false);
  });
});
