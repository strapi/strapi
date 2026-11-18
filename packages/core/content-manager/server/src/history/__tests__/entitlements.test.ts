import { registerHistoryEntitlements } from '../entitlements';

const resolveWith = (feature: unknown, overrideDays?: number) => {
  const register = jest.fn();
  const strapi = {
    ee: { entitlements: { register } },
    config: {
      get: jest.fn((key: string) =>
        key === 'admin.history.retentionDays' ? overrideDays : undefined
      ),
    },
  } as any;

  registerHistoryEntitlements(strapi);

  const [{ feature: name, limits }] = register.mock.calls[0];
  expect(name).toBe('cms-content-history');
  expect(limits[0]).toMatchObject({ key: 'retentionDays', unit: 'days' });
  return limits[0].get(feature);
};

describe('content history entitlements', () => {
  // The card shows the retention the delete job uses, which caps an unconfigured instance at
  // 90 days even when the license allows far more.
  it('reports 90 days for a license ceiling the instance has not opted into', () => {
    expect(resolveWith({ name: 'cms-content-history', options: { retentionDays: 99999 } })).toBe(
      90
    );
  });

  it('reports a configured retention up to the license ceiling', () => {
    expect(
      resolveWith({ name: 'cms-content-history', options: { retentionDays: 99999 } }, 365)
    ).toBe(365);
  });

  it('reports a license value below the default', () => {
    expect(resolveWith({ name: 'cms-content-history', options: { retentionDays: 30 } }, 60)).toBe(
      30
    );
  });

  it('falls back to the configured value or the default without a license value', () => {
    expect(resolveWith(undefined)).toBe(90);
    expect(resolveWith({ name: 'cms-content-history', options: {} }, 14)).toBe(14);
  });
});
