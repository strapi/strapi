import {
  isPasskeysDisable,
  isTrustedDevicesDowngrade,
  requiresPasskeysCredentials,
} from '../utils/isSecurityDowngrade';

describe('isTrustedDevicesDowngrade', () => {
  const on30 = { enabled: true, days: 30 };
  const off30 = { enabled: false, days: 30 };

  it('enabling trust is a downgrade', () => {
    expect(isTrustedDevicesDowngrade(off30, on30)).toBe(true);
  });

  it('raising days while enabled is a downgrade', () => {
    expect(isTrustedDevicesDowngrade(on30, { enabled: true, days: 60 })).toBe(true);
  });

  it('raising days while disabled is not', () => {
    expect(isTrustedDevicesDowngrade(off30, { enabled: false, days: 60 })).toBe(false);
  });

  it('lowering days, disabling, or saving the same values is not', () => {
    expect(isTrustedDevicesDowngrade(on30, { enabled: true, days: 7 })).toBe(false);
    expect(isTrustedDevicesDowngrade(on30, off30)).toBe(false);
    expect(isTrustedDevicesDowngrade(on30, { enabled: false, days: 60 })).toBe(false);
    expect(isTrustedDevicesDowngrade(on30, on30)).toBe(false);
  });
});

describe('isPasskeysDisable', () => {
  it('turning passkeys off needs credentials', () => {
    expect(isPasskeysDisable({ enabled: true }, { enabled: false })).toBe(true);
  });

  it('turning passkeys on, or saving the same value, does not', () => {
    expect(isPasskeysDisable({ enabled: false }, { enabled: true })).toBe(false);
    expect(isPasskeysDisable({ enabled: true }, { enabled: true })).toBe(false);
    expect(isPasskeysDisable({ enabled: false }, { enabled: false })).toBe(false);
  });
});

// Fix-wave (final review finding 1): mirrors the server's password-less exemption in
// `updateSettings` (`security-settings.ts:326-335`) exactly --
//   if (!actorRow.password && (lowersEnforcement || widensTrust)) { throw ...; }
//   if (actorRow.password) { // demand credentials }
// -- a password-less actor is exempted only when `disablesPasskeys` is the ONLY term that
// tripped; combined with either of the other two, or for a password-holding actor, credentials
// are still demanded.
describe('requiresPasskeysCredentials (fix-wave finding 1: mirrors the server exemption)', () => {
  it('a password-less administrator turning passkeys off alone needs no credentials', () => {
    expect(requiresPasskeysCredentials(false, true)).toBe(false);
  });

  it('a password-holding administrator turning passkeys off still needs credentials', () => {
    expect(requiresPasskeysCredentials(true, true)).toBe(true);
  });

  it('combined with lowering enforcement or widening trust, credentials are still demanded even without a password', () => {
    expect(requiresPasskeysCredentials(false, true, true, false)).toBe(true);
    expect(requiresPasskeysCredentials(false, true, false, true)).toBe(true);
  });

  it('is false when nothing actually changed', () => {
    expect(requiresPasskeysCredentials(false, false)).toBe(false);
    expect(requiresPasskeysCredentials(true, false)).toBe(false);
  });
});
