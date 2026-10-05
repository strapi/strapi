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

  it('normalizes a NaN resolved value to null', () => {
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'x',
      limits: [{ key: 'k', get: () => NaN }],
    });
    expect(registry.list()[0].limits[0].value).toBeNull();
  });

  // License options are untyped JSON, and the registry ships some limits as strings (an
  // audit-logs licence carried `retentionDays: "90"`). Enforcement coerces them, so dropping
  // them here made a 90-day cap read as "Unlimited".
  it('reads a numeric string from the license as its number', () => {
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'audit-logs',
      limits: [{ key: 'retentionDays', unit: 'days', get: () => '90' as unknown as number }],
    });
    expect(registry.list()[0].limits[0].value).toBe(90);
  });

  it('normalizes a numeric string at/above the threshold to null (unlimited)', () => {
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'cms-content-history',
      limits: [{ key: 'retentionDays', unit: 'days', get: () => '99999' as unknown as number }],
    });
    expect(registry.list()[0].limits[0].value).toBeNull();
  });

  it.each(['', '   ', 'ninety', '90 days'])(
    'normalizes the non-numeric string %p to null',
    (value) => {
      const registry = createEntitlementsRegistry();
      registry.register({
        feature: 'x',
        limits: [{ key: 'k', get: () => value as unknown as number }],
      });
      expect(registry.list()[0].limits[0].value).toBeNull();
    }
  );

  it('upserts by feature (re-register replaces, never duplicates)', () => {
    const registry = createEntitlementsRegistry();
    registry.register({ feature: 'f', limits: [{ key: 'k', get: () => 1 }] });
    registry.register({ feature: 'f', limits: [{ key: 'k', get: () => 2 }] });

    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].limits[0].value).toBe(2);
  });

  it('passes each resolver the feature the lookup returns for it', () => {
    // The same resolvers serve the live license and a lapsed license's retained snapshot, so
    // they read options from the feature they are handed rather than looking it up themselves.
    const registry = createEntitlementsRegistry();
    registry.register({
      feature: 'audit-logs',
      limits: [
        {
          key: 'retentionDays',
          unit: 'days',
          get: (feature) =>
            (typeof feature === 'object' ? feature.options?.retentionDays : undefined) ?? 90,
        },
      ],
    });

    const lookup = (name: string) =>
      name === 'audit-logs' ? { name, options: { retentionDays: 30 } } : undefined;

    expect(registry.list(lookup)[0].limits[0].value).toBe(30);
    expect(registry.list(() => undefined)[0].limits[0].value).toBe(90);
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
