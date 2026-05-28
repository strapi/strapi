'use strict';

/**
 * @param {{ published: number, draftOnly: number }} seed
 * @param {number} multiplier
 * @param {{ localeCount?: number }} opts
 */
function deriveDraftPublishRows({ published, draftOnly }, multiplier, { localeCount = 1 } = {}) {
  const m = Number(multiplier) || 1;
  const pub = published * m * localeCount;
  const draftOnlyRows = draftOnly * m * localeCount;
  return {
    published: pub,
    draftRows: draftOnlyRows + pub,
    totalRows: pub * 2 + draftOnlyRows,
  };
}

/**
 * @param {import('./spec')} spec
 * @param {{ profile: string, multiplier: number }} opts
 * @returns {Map<string, object>}
 */
function deriveExpectationsForProfile(spec, { profile, multiplier }) {
  const m = Number(multiplier) || 1;
  const localeCount = spec.locales?.length || 1;
  const map = new Map();

  for (const [uid, entry] of Object.entries(spec.contentTypes)) {
    if (!entry.profiles.includes(profile)) {
      continue;
    }

    const seed = entry.seed;

    if (seed.count != null) {
      map.set(uid, {
        kind: 'simple',
        label: entry.label,
        totalRows: seed.count * m,
      });
    } else if (seed.perLocale) {
      map.set(uid, {
        kind: 'draftPublish',
        label: entry.label,
        ...deriveDraftPublishRows(seed.perLocale, m, { localeCount }),
      });
    } else {
      map.set(uid, {
        kind: 'draftPublish',
        label: entry.label,
        ...deriveDraftPublishRows({ published: seed.published, draftOnly: seed.draftOnly }, m, {
          localeCount: 1,
        }),
      });
    }
  }

  map.set('__media__', {
    kind: 'media',
    label: 'media',
    minRows: spec.mediaFiles * m,
  });

  return map;
}

/**
 * @param {import('./spec')} spec
 * @param {{ profile: string, multiplier: number }} opts
 */
function getSeedCountsForProfile(spec, { profile, multiplier }) {
  const m = Number(multiplier) || 1;
  /** @type {Record<string, unknown>} */
  const counts = {
    mediaFiles: spec.mediaFiles * m,
  };

  for (const entry of Object.values(spec.contentTypes)) {
    if (!entry.profiles.includes(profile)) {
      continue;
    }

    const { key, seed } = entry;

    if (seed.count != null) {
      counts[key] = seed.count * m;
    } else if (seed.perLocale) {
      counts[key] = {
        published: seed.perLocale.published * m,
        drafts: seed.perLocale.draftOnly * m,
      };
    } else {
      counts[key] = {
        published: seed.published * m,
        drafts: seed.draftOnly * m,
      };
      if (seed.targetsPerSource != null) {
        counts.hcM2mTargetsPerSource = seed.targetsPerSource;
      }
    }
  }

  return counts;
}

/**
 * @param {import('./spec')} spec
 * @param {string} dataOrigin
 */
function getActiveEntriesForProfile(spec, dataOrigin) {
  return Object.entries(spec.contentTypes)
    .filter(([, entry]) => entry.profiles.includes(dataOrigin))
    .map(([uid, entry]) => ({ uid, ...entry }));
}

module.exports = {
  deriveDraftPublishRows,
  deriveExpectationsForProfile,
  getSeedCountsForProfile,
  getActiveEntriesForProfile,
};
