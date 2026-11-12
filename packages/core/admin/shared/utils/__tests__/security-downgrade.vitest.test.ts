import { describe, expect, it } from 'vitest';

import {
  enforcedRoleIds,
  isPasskeysDisable,
  isSecurityDowngrade,
  isTrustedDevicesDowngrade,
} from '../security-downgrade';

import type { MfaEnforcementSettings } from '../../contracts/security-settings';

const base: MfaEnforcementSettings = { mode: 'optional', graceDays: 7, requiredRoles: ['1', '2'] };

describe('isSecurityDowngrade', () => {
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
  });

  it('dropping a flag kept under off is not a downgrade: under off it required nobody', () => {
    const off = { ...base, mode: 'off' as const };
    expect(isSecurityDowngrade(off, { ...off, requiredRoles: [] })).toBe(false);
    expect(isSecurityDowngrade(off, { ...base, requiredRoles: ['3'] })).toBe(false);
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

describe('enforcedRoleIds', () => {
  it('is empty under off, whatever flags are kept', () => {
    expect(enforcedRoleIds({ mode: 'off', requiredRoles: ['1'] })).toEqual([]);
  });

  it('is the flagged roles otherwise', () => {
    expect(enforcedRoleIds({ mode: 'optional', requiredRoles: ['1'] })).toEqual(['1']);
  });
});
