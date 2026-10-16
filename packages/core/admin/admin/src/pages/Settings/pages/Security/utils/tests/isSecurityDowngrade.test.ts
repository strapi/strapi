import {
  isPasskeysDisable,
  isSecurityDowngrade,
  isTrustedDevicesDowngrade,
  requiresPasskeysCredentials,
} from '../isSecurityDowngrade';

import type { MfaEnforcementSettings } from '../../../../../../../../shared/contracts/security-settings';

const base: MfaEnforcementSettings = { mode: 'optional', graceDays: 7, requiredRoles: ['1', '2'] };

describe('isSecurityDowngrade (mirror of the server rule)', () => {
  it('is false for an identical object', () => {
    expect(isSecurityDowngrade(base, { ...base, requiredRoles: ['2', '1'] })).toBe(false);
  });

  it.each([
    ['required', 'optional'],
    ['required', 'off'],
    ['optional', 'off'],
  ] as const)('lowering the mode %s -> %s is a downgrade', (from, to) => {
    expect(isSecurityDowngrade({ ...base, mode: from }, { ...base, mode: to })).toBe(true);
  });

  it.each([
    ['off', 'optional'],
    ['optional', 'required'],
    ['off', 'required'],
  ] as const)('raising the mode %s -> %s is not a downgrade', (from, to) => {
    expect(isSecurityDowngrade({ ...base, mode: from }, { ...base, mode: to })).toBe(false);
  });

  it('removing a required role is a downgrade while the resulting mode is not required', () => {
    expect(isSecurityDowngrade(base, { ...base, requiredRoles: ['1'] })).toBe(true);
    expect(
      isSecurityDowngrade({ ...base, mode: 'off' }, { ...base, mode: 'off', requiredRoles: [] })
    ).toBe(true);
  });

  it('removing a required role on the same move that raises to required is not a downgrade', () => {
    expect(isSecurityDowngrade(base, { ...base, mode: 'required', requiredRoles: [] })).toBe(false);
  });

  it('adding a required role is not a downgrade', () => {
    expect(isSecurityDowngrade(base, { ...base, requiredRoles: ['1', '2', '3'] })).toBe(false);
  });

  it('a longer grace period is a downgrade; a shorter or equal one is not', () => {
    expect(isSecurityDowngrade(base, { ...base, graceDays: 8 })).toBe(true);
    expect(isSecurityDowngrade(base, { ...base, graceDays: 7 })).toBe(false);
    expect(isSecurityDowngrade(base, { ...base, graceDays: 1 })).toBe(false);
  });
});

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

// Mirrors the server's password-less exemption in `updateSettings`: a password-less actor is
// exempted only when `disablesPasskeys` is the ONLY term that tripped. Combined with either of
// the other two, or for a password-holding actor, credentials are still demanded.
describe('requiresPasskeysCredentials', () => {
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
