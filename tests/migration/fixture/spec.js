'use strict';

/**
 * Migration fixture spec — single source of truth for seed volumes and validator checks.
 *
 * Rules:
 * - seed.published / seed.draftOnly = v4/v5 entity-service semantics at seed time.
 * - seed.perLocale.* = per-locale counts; row-count expectations multiply by locales.length.
 * - profiles: ['v4'] = skip when seeding/validating with dataOrigin v5 (hc-m2m case).
 * - targetsPerSource is seed-only metadata (not multiplied except via source count).
 * - checks lists validator check ids run for this content type when active in profile.
 */

module.exports = {
  locales: ['en', 'fr'],

  mediaFiles: 10,

  contentTypes: {
    'api::basic.basic': {
      key: 'basic',
      label: 'basic',
      profiles: ['v4', 'v5'],
      seed: { count: 5 },
      checks: ['rowCounts'],
    },

    'api::basic-dp.basic-dp': {
      key: 'basicDp',
      label: 'basic-dp',
      profiles: ['v4', 'v5'],
      seed: { published: 3, draftOnly: 2 },
      checks: ['rowCounts', 'draftPublishPair'],
    },

    'api::basic-dp-i18n.basic-dp-i18n': {
      key: 'basicDpI18n',
      label: 'basic-dp-i18n',
      profiles: ['v4', 'v5'],
      seed: { perLocale: { published: 3, draftOnly: 2 } },
      i18n: true,
      checks: ['rowCounts', 'draftPublishPair'],
    },

    'api::relation.relation': {
      key: 'relation',
      label: 'relation',
      profiles: ['v4', 'v5'],
      seed: { count: 5 },
      checks: ['rowCounts', 'relationTargets'],
    },

    'api::relation-dp.relation-dp': {
      key: 'relationDp',
      label: 'relation-dp',
      profiles: ['v4', 'v5'],
      seed: { published: 5, draftOnly: 3 },
      checks: [
        'rowCounts',
        'draftPublishPair',
        'joinTableParity',
        'relationApiParity',
        'entityGraph',
        'mediaParity',
        'nestedComponentParity',
        'dbMorphAndDz',
      ],
    },

    'api::relation-dp-i18n.relation-dp-i18n': {
      key: 'relationDpI18n',
      label: 'relation-dp-i18n',
      profiles: ['v4', 'v5'],
      seed: { perLocale: { published: 5, draftOnly: 3 } },
      i18n: true,
      checks: [
        'rowCounts',
        'draftPublishPair',
        'joinTableParity',
        'relationApiParity',
        'entityGraph',
        'mediaParity',
        'nestedComponentParity',
        'dbMorphAndDz',
      ],
    },

    'api::hc-m2m-source.hc-m2m-source': {
      key: 'hcM2mSource',
      label: 'hc-m2m-source',
      profiles: ['v4'],
      seed: { published: 15, draftOnly: 5, targetsPerSource: 10 },
      checks: ['rowCounts', 'draftPublishPair', 'relationApiParity'],
    },

    'api::hc-m2m-target.hc-m2m-target': {
      key: 'hcM2mTarget',
      label: 'hc-m2m-target',
      profiles: ['v4'],
      seed: { published: 15, draftOnly: 5 },
      checks: ['rowCounts', 'draftPublishPair'],
    },
  },
};
