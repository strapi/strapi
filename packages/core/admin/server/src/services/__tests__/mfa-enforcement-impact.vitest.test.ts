import { describe, expect, test, vi } from 'vitest';

import createMfaService from '../mfa';

type Row = {
  id: number;
  password: string | null;
  mfaEnabledAt: string | null;
  mfaSecret: string | null;
  roles: Array<{ id: number; mfaRequired?: boolean }>;
};

const build = (
  rows: Row[],
  { ssoLockedRoles = [] as string[], storedMode = undefined as string | undefined } = {}
) => {
  const findMany = vi.fn(async () => rows.map((row) => ({ ...row, roles: [...row.roles] })));
  const storeGet = vi.fn(async ({ key }: { key: string }) =>
    key === 'security-settings'
      ? { mfa: storedMode ? { mode: storedMode } : {} }
      : { providers: { ssoLockedRoles } }
  );

  const strapi = {
    db: { query: () => ({ findMany }) },
    ee: { features: { isEnabled: (name: string) => name === 'sso' && ssoLockedRoles.length > 0 } },
    store: () => ({ get: storeGet }),
    config: { get: (_key: string, fallback: unknown) => fallback },
    log: { warn: vi.fn(), error: vi.fn() },
    features: { future: { isEnabled: () => true } },
  };

  const service = createMfaService({
    strapi: strapi as any,
    encryption: { encrypt: (v: string) => v, decrypt: (v: string) => v } as any,
    auth: { validatePassword: vi.fn(), hashPassword: vi.fn() } as any,
  });

  return { service, findMany, storeGet };
};

const enrolled = { mfaEnabledAt: '2026-09-01T00:00:00.000Z', mfaSecret: 'enc:x' };
const notEnrolled = { mfaEnabledAt: null, mfaSecret: null };

/**
 * The numbers the "require two-factor authentication?" confirmation shows before a raise is
 * saved. They must agree with who `isMfaRequiredFor` would actually put on the clock, or the
 * dialog misreports exactly the blast radius it exists to show.
 */
describe('enforcementImpact', () => {
  const rows: Row[] = [
    { id: 1, password: 'hash', ...enrolled, roles: [{ id: 1 }] },
    { id: 2, password: 'hash', ...notEnrolled, roles: [{ id: 2 }] },
    { id: 3, password: 'hash', ...notEnrolled, roles: [{ id: 1 }, { id: 2 }] },
    // No local password: signs in through SSO only, so enforcement never applies.
    { id: 4, password: null, ...notEnrolled, roles: [{ id: 1 }] },
  ];

  test('off affects nobody, without reading a single user', async () => {
    const { service, findMany } = build(rows);

    await expect(service.enforcementImpact({ mode: 'off', requiredRoles: [] })).resolves.toEqual({
      affected: 0,
      enrolled: 0,
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  test('required covers every active account with a local password', async () => {
    const { service, findMany } = build(rows);

    await expect(
      service.enforcementImpact({ mode: 'required', requiredRoles: [] })
    ).resolves.toEqual({ affected: 3, enrolled: 1 });
    // Inactive accounts cannot sign in, so they are nobody's problem here.
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
  });

  test('optional covers the proposed roles, each account counted once', async () => {
    const { service } = build(rows);

    // Role 2 is held by accounts 2 and 3; account 3 also holds role 1 and must not be counted twice.
    await expect(
      service.enforcementImpact({ mode: 'optional', requiredRoles: ['2'] })
    ).resolves.toEqual({ affected: 2, enrolled: 0 });
    await expect(
      service.enforcementImpact({ mode: 'optional', requiredRoles: ['1', '2'] })
    ).resolves.toEqual({ affected: 3, enrolled: 1 });
  });

  test('an account holding an SSO-locked role is exempt, as at login', async () => {
    const { service } = build(rows, { ssoLockedRoles: ['2'] });

    // Accounts 2 and 3 hold the locked role; account 4 has no password. Only account 1 remains.
    await expect(
      service.enforcementImpact({ mode: 'required', requiredRoles: [] })
    ).resolves.toEqual({ affected: 1, enrolled: 1 });
  });

  /**
   * Review item 32: with Editor already required, requiring Author (no users) reported Editor's
   * enrolled user as "1 user will be asked ... and 1 of them already has it". The count is of the
   * accounts the change adds, not of everyone the proposal covers.
   */
  test('reads the SSO-locked roles once, not once per user', async () => {
    const { service, storeGet } = build(rows, { ssoLockedRoles: ['2'] });

    await service.enforcementImpact({ mode: 'required', requiredRoles: [] });

    expect(storeGet.mock.calls.filter(([{ key }]) => key === 'auth')).toHaveLength(1);
  });

  test('counts only the accounts the change adds, not those already required', async () => {
    const withFlags: Row[] = [
      { id: 1, password: 'hash', ...enrolled, roles: [{ id: 2, mfaRequired: true }] },
      { id: 2, password: 'hash', ...notEnrolled, roles: [{ id: 4, mfaRequired: false }] },
    ];
    const { service } = build(withFlags, { storedMode: 'optional' });

    // Role 3 has no users: requiring it alongside role 2 adds nobody.
    await expect(
      service.enforcementImpact({ mode: 'optional', requiredRoles: ['2', '3'] })
    ).resolves.toEqual({ affected: 0, enrolled: 0 });
    // Role 4 adds account 2 only; account 1 was already required through role 2.
    await expect(
      service.enforcementImpact({ mode: 'optional', requiredRoles: ['2', '4'] })
    ).resolves.toEqual({ affected: 1, enrolled: 0 });
    // Everyone: account 1 is already required, so only account 2 is new.
    await expect(
      service.enforcementImpact({ mode: 'required', requiredRoles: [] })
    ).resolves.toEqual({ affected: 1, enrolled: 0 });
  });

  test('nobody is added while everyone is already required', async () => {
    const { service, findMany } = build(rows, { storedMode: 'required' });

    await expect(
      service.enforcementImpact({ mode: 'required', requiredRoles: [] })
    ).resolves.toEqual({ affected: 0, enrolled: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });
});
