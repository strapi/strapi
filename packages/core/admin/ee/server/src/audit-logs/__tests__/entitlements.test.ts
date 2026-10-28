import { registerAuditLogsEntitlements } from '../entitlements';

const resolveWith = (feature: unknown, overrideDays?: number) => {
  const register = jest.fn();
  const strapi = {
    ee: { entitlements: { register } },
    config: {
      get: jest.fn((key: string) =>
        key === 'admin.auditLogs.retentionDays' ? overrideDays : undefined
      ),
    },
  } as any;

  registerAuditLogsEntitlements(strapi);

  const [{ feature: name, limits }] = register.mock.calls[0];
  expect(name).toBe('audit-logs');
  expect(limits[0]).toMatchObject({ key: 'retentionDays', unit: 'days' });
  return limits[0].get(feature);
};

describe('audit-logs entitlements', () => {
  // The card shows the retention the daily delete job uses, not the raw license value.
  it('reports the 90-day default when the license grants unlimited retention', () => {
    expect(resolveWith({ name: 'audit-logs', options: { retentionDays: null } })).toBe(90);
  });

  it('reports an admin override that is below the license value', () => {
    expect(resolveWith({ name: 'audit-logs', options: { retentionDays: 30 } }, 7)).toBe(7);
  });

  it('does not let an admin override raise the license value', () => {
    expect(resolveWith({ name: 'audit-logs', options: { retentionDays: 30 } }, 60)).toBe(30);
  });

  it('reports an admin override when the license sets no retention', () => {
    expect(resolveWith({ name: 'audit-logs', options: {} }, 365)).toBe(365);
  });

  it('falls back to the default for a feature with no options at all', () => {
    expect(resolveWith(undefined)).toBe(90);
    expect(resolveWith('audit-logs')).toBe(90);
  });
});
