import { isEnforcementRaise, requiresPasskeysCredentials } from '../isSecurityDowngrade';

// The downgrade rules themselves are shared with the server and tested in
// shared/utils/__tests__/security-downgrade.vitest.test.ts.

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

describe('isEnforcementRaise', () => {
  const optional = { mode: 'optional' as const, graceDays: 7, requiredRoles: ['1'] };

  it.each([
    ['off to optional', { ...optional, mode: 'off' as const }, optional],
    ['optional to required', optional, { ...optional, mode: 'required' as const }],
    ['a role added under optional', optional, { ...optional, requiredRoles: ['1', '2'] }],
  ])('%s puts someone new on the clock', (_label, previous, next) => {
    expect(isEnforcementRaise(previous, next)).toBe(true);
  });

  it.each([
    ['nothing changed', optional, optional],
    ['a shorter grace period', optional, { ...optional, graceDays: 3 }],
    ['a role dropped', optional, { ...optional, requiredRoles: [] }],
    ['a move to off', optional, { ...optional, mode: 'off' as const }],
    [
      'a role added while already required',
      { ...optional, mode: 'required' as const },
      { ...optional, mode: 'required' as const, requiredRoles: ['1', '2'] },
    ],
  ])('%s does not', (_label, previous, next) => {
    expect(isEnforcementRaise(previous, next)).toBe(false);
  });
});
