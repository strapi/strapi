import { isSecurityDowngrade } from '../isSecurityDowngrade';

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
