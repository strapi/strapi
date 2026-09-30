import { cloneDeep } from 'lodash/fp';

import { LEGACY_FEATURES, resolveFeatures } from '../features';

const GOLD_FEATURES = [
  { name: 'sso', options: {} },
  { name: 'audit-logs', options: { retentionDays: null } },
  { name: 'review-workflows', options: {} },
  { name: 'cms-content-releases', options: {} },
  { name: 'cms-content-history', options: { retentionDays: 99999 } },
  { name: 'cms-advanced-preview', options: {} },
];

describe('resolveFeatures', () => {
  describe('legacy license, without features', () => {
    it('returns the gold features with their options', () => {
      expect(resolveFeatures({ type: 'gold' })).toEqual(GOLD_FEATURES);
      expect(resolveFeatures({ type: 'gold', features: undefined })).toEqual(GOLD_FEATURES);
      expect(resolveFeatures({ type: 'gold', features: null })).toEqual(GOLD_FEATURES);
    });

    it.each(['silver', 'bronze'])('returns no features for a %s license', (type) => {
      expect(resolveFeatures({ type })).toEqual([]);
    });

    it.each([['platinum'], [undefined], [42], ['toString'], ['constructor']])(
      'returns no features for an unknown type (%p)',
      (type) => {
        expect(resolveFeatures({ type })).toEqual([]);
      }
    );
  });

  describe('license with malformed features', () => {
    it.each([['sso'], [42], [{ name: 'sso' }]])(
      'returns no features when features is not an array (%p), even for gold',
      (features) => {
        expect(resolveFeatures({ type: 'gold', features })).toEqual([]);
      }
    );
  });

  describe('license with a features array', () => {
    it('returns exactly the listed features, whatever the type', () => {
      expect(resolveFeatures({ type: 'gold', features: ['sso'] })).toEqual([
        { name: 'sso', options: {} },
      ]);
      expect(resolveFeatures({ type: 'gold', features: [] })).toEqual([]);
    });

    it('turns a string entry into a feature with empty options', () => {
      expect(resolveFeatures({ features: ['sso', 'audit-logs'] })).toEqual([
        { name: 'sso', options: {} },
        { name: 'audit-logs', options: {} },
      ]);
    });

    it('keeps the options of an object entry', () => {
      expect(
        resolveFeatures({
          features: [{ name: 'cms-content-releases', options: { maximumReleases: 10 } }],
        })
      ).toEqual([{ name: 'cms-content-releases', options: { maximumReleases: 10 } }]);
    });

    it('sets empty options when an object entry has none', () => {
      expect(resolveFeatures({ features: [{ name: 'cms-content-history' }] })).toEqual([
        { name: 'cms-content-history', options: {} },
      ]);
    });

    it.each([[null], ['7'], [7], [true], [['retentionDays']]])(
      'sets empty options when the options are not an object (%p)',
      (options) => {
        expect(resolveFeatures({ features: [{ name: 'cms-content-history', options }] })).toEqual([
          { name: 'cms-content-history', options: {} },
        ]);
      }
    );

    it('keeps the other top-level keys of an object entry on the feature', () => {
      expect(
        resolveFeatures({
          features: [
            { name: 'sso', extra: true, options: { a: 1 } },
            { name: 'another', b: 2 },
          ],
        })
      ).toEqual([
        { name: 'sso', extra: true, options: { a: 1 } },
        { name: 'another', b: 2, options: {} },
      ]);
    });

    it('folds the legacy top-level limits of review-workflows into its options', () => {
      expect(
        resolveFeatures({
          features: [{ name: 'review-workflows', numberOfWorkflows: 3, stagesPerWorkflow: 5 }],
        })
      ).toEqual([
        {
          name: 'review-workflows',
          numberOfWorkflows: 3,
          stagesPerWorkflow: 5,
          options: { numberOfWorkflows: 3, stagesPerWorkflow: 5 },
        },
      ]);
    });

    it('keeps the options of an object entry without other top-level keys', () => {
      expect(
        resolveFeatures({
          features: [{ name: 'review-workflows', options: { numberOfWorkflows: 3 } }],
        })
      ).toEqual([{ name: 'review-workflows', options: { numberOfWorkflows: 3 } }]);
    });

    it('prefers options over the legacy top-level limits on a conflict', () => {
      expect(
        resolveFeatures({
          features: [
            {
              name: 'review-workflows',
              numberOfWorkflows: 3,
              stagesPerWorkflow: 5,
              options: { numberOfWorkflows: 10 },
            },
          ],
        })
      ).toEqual([
        {
          name: 'review-workflows',
          numberOfWorkflows: 3,
          stagesPerWorkflow: 5,
          options: { numberOfWorkflows: 10, stagesPerWorkflow: 5 },
        },
      ]);
    });

    it('folds the legacy top-level limits when the options are not an object', () => {
      expect(
        resolveFeatures({
          features: [{ name: 'review-workflows', numberOfWorkflows: 3, options: 7 }],
        })
      ).toEqual([
        { name: 'review-workflows', numberOfWorkflows: 3, options: { numberOfWorkflows: 3 } },
      ]);
    });

    it.each([
      ['audit-logs', 'retentionDays', 30],
      ['cms-content-history', 'retentionDays', 30],
      ['cms-content-releases', 'maximumReleases', 3],
    ])('does not fold a top-level key of %s into its options (%s)', (name, key, value) => {
      expect(resolveFeatures({ features: [{ name, [key]: value }] })).toEqual([
        { name, [key]: value, options: {} },
      ]);
    });

    it('drops the entries without a string name', () => {
      expect(
        resolveFeatures({
          features: [null, undefined, 42, true, [], {}, { name: 42 }, { options: {} }, 'sso'],
        })
      ).toEqual([{ name: 'sso', options: {} }]);
    });

    it('keeps the first entry of a duplicated name', () => {
      expect(
        resolveFeatures({
          features: [
            { name: 'audit-logs', options: { retentionDays: 30 } },
            'audit-logs',
            { name: 'audit-logs', options: { retentionDays: 90 } },
          ],
        })
      ).toEqual([{ name: 'audit-logs', options: { retentionDays: 30 } }]);
    });

    it('keeps the unknown names', () => {
      expect(
        resolveFeatures({ features: ['a-future-feature', { name: 'another', options: { a: 1 } }] })
      ).toEqual([
        { name: 'a-future-feature', options: {} },
        { name: 'another', options: { a: 1 } },
      ]);
    });
  });

  describe('immutability', () => {
    it('does not mutate the license payload and returns fresh objects', () => {
      const entry = { name: 'audit-logs', extra: true, options: { retentionDays: 30 } };
      const licenseInfo = { type: 'gold', features: [entry, 'sso'] };
      const snapshot = cloneDeep(licenseInfo);

      const [feature] = resolveFeatures(licenseInfo);

      expect(licenseInfo).toEqual(snapshot);
      expect(feature).not.toBe(entry);
      expect(feature.options).not.toBe(entry.options);
    });

    it('does not mutate the legacy features table', () => {
      const snapshot = cloneDeep(LEGACY_FEATURES);

      const features = resolveFeatures({ type: 'gold' });
      features.forEach((feature) => {
        feature.options.retentionDays = 1;
      });
      features.push({ name: 'another', options: {} });

      expect(LEGACY_FEATURES).toEqual(snapshot);
      expect(resolveFeatures({ type: 'gold' })).toEqual(GOLD_FEATURES);
    });
  });
});
