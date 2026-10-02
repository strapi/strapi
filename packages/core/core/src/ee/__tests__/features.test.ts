import { cloneDeep } from 'lodash';

import { LEGACY_FEATURES, getFeature, listFeatures, resolveFeatures } from '../features';

const GOLD_FEATURES = [
  { name: 'sso' },
  { name: 'audit-logs', options: { retentionDays: null } },
  { name: 'review-workflows' },
  { name: 'cms-content-releases' },
  { name: 'cms-content-history', options: { retentionDays: 99999 } },
  { name: 'cms-advanced-preview' },
];

describe('resolveFeatures', () => {
  it('returns the features of the license as they are', () => {
    const features = ['sso', { name: 'review-workflows', numberOfWorkflows: 3 }];

    expect(resolveFeatures({ type: 'gold', features })).toBe(features);
    expect(resolveFeatures({ type: 'gold', features: [] })).toEqual([]);
  });

  it.each([undefined, null, '', 0, false])(
    'returns the legacy gold features when features is %p',
    (features) => {
      expect(resolveFeatures({ type: 'gold', features: features as never })).toBe(
        LEGACY_FEATURES.gold
      );
    }
  );

  it.each(['silver', 'bronze'] as const)('returns no features for a %s license', (type) => {
    expect(resolveFeatures({ type })).toEqual([]);
  });

  it('returns undefined for an unknown type', () => {
    expect(resolveFeatures({ type: 'platinum' as never })).toBeUndefined();
  });

  it('keeps the gold table', () => {
    expect(LEGACY_FEATURES.gold).toEqual(GOLD_FEATURES);
  });
});

describe('listFeatures', () => {
  it('turns a name into { name } and returns an object entry as is', () => {
    const history = { name: 'cms-content-history' };
    const reviewWorkflows = {
      name: 'review-workflows',
      numberOfWorkflows: 3,
      options: { stagesPerWorkflow: 5 },
    };

    const features = listFeatures(['sso', history, reviewWorkflows, 'a-future-feature']);

    expect(features).toEqual([
      { name: 'sso' },
      { name: 'cms-content-history' },
      { name: 'review-workflows', numberOfWorkflows: 3, options: { stagesPerWorkflow: 5 } },
      { name: 'a-future-feature' },
    ]);
    expect(features[1]).toBe(history);
    expect(features[2]).toBe(reviewWorkflows);
  });

  it('keeps every entry of a duplicated name', () => {
    expect(listFeatures(['sso', { name: 'sso', options: { a: 1 } }])).toEqual([
      { name: 'sso' },
      { name: 'sso', options: { a: 1 } },
    ]);
  });

  it('returns no features without features', () => {
    expect(listFeatures(undefined)).toEqual([]);
  });

  it('does not mutate the legacy features table', () => {
    const snapshot = cloneDeep(LEGACY_FEATURES);

    listFeatures(resolveFeatures({ type: 'gold' }));

    expect(LEGACY_FEATURES).toEqual(snapshot);
  });
});

describe('getFeature', () => {
  it('returns the first listed feature of that name', () => {
    const features = [{ name: 'audit-logs', options: { retentionDays: 30 } }, 'audit-logs'];

    expect(getFeature({ features }, 'audit-logs')).toBe(features[0]);
    expect(getFeature({ features: ['audit-logs'] }, 'audit-logs')).toEqual({ name: 'audit-logs' });
  });

  it('returns undefined for a feature the license does not list', () => {
    expect(getFeature({ features: ['sso'] }, 'audit-logs')).toBeUndefined();
    expect(getFeature({}, 'sso')).toBeUndefined();
  });

  it.each([10, 0, '10', 'unlimited'])('derives seat-limit from seats %p, kept as is', (seats) => {
    expect(getFeature({ features: [], seats: seats as number }, 'seat-limit')).toEqual({
      name: 'seat-limit',
      options: { seats },
    });
  });

  it.each([undefined, null])('has no seat-limit when seats is %p', (seats) => {
    expect(getFeature({ features: ['sso'], seats }, 'seat-limit')).toBeUndefined();
  });

  it('ignores a seat-limit listed in features', () => {
    const features = [{ name: 'seat-limit', options: { seats: 99 } }];

    expect(getFeature({ features }, 'seat-limit')).toBeUndefined();
    expect(getFeature({ features, seats: 5 }, 'seat-limit')).toEqual({
      name: 'seat-limit',
      options: { seats: 5 },
    });
  });
});
