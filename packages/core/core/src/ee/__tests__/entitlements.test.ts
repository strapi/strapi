import { createEntitlementsRegistry, UNLIMITED_ENTITLEMENT_THRESHOLD } from '../entitlements';

describe('entitlements registry', () => {
  it('registers a feature and lists its resolved limits', () => {
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'review-workflows',
      limits: [{ key: 'numberOfWorkflows', unit: 'count', get: () => 200 }],
    });

    expect(registry.list()).toEqual([
      {
        feature: 'review-workflows',
        limits: [{ key: 'numberOfWorkflows', unit: 'count', value: 200 }],
      },
    ]);
  });

  it('normalizes a "stupid high" value (>= threshold) to null (unlimited)', () => {
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'audit-logs',
      limits: [{ key: 'retentionDays', unit: 'days', get: () => UNLIMITED_ENTITLEMENT_THRESHOLD }],
    });

    expect(registry.list()[0].limits[0].value).toBeNull();
  });

  it('normalizes nullish resolved values to null', () => {
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'x',
      limits: [{ key: 'k', get: () => undefined }],
    });
    expect(registry.list()[0].limits[0].value).toBeNull();
  });

  it('upserts by feature (re-register replaces, never duplicates)', () => {
    const registry = createEntitlementsRegistry();
    registry.register({ feature: 'f', limits: [{ key: 'k', get: () => 1 }] });
    registry.register({ feature: 'f', limits: [{ key: 'k', get: () => 2 }] });

    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].limits[0].value).toBe(2);
  });

  it('resolves getters lazily on each list() call', () => {
    const registry = createEntitlementsRegistry();
    let current = 3;
    registry.register({ feature: 'f', limits: [{ key: 'k', get: () => current }] });
    expect(registry.list()[0].limits[0].value).toBe(3);
    current = 7;
    expect(registry.list()[0].limits[0].value).toBe(7);
  });
});
