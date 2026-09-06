type FixtureSpec = typeof import('./spec');

type DraftPublishSeedInput = { published: number; draftOnly: number };

type SimpleExpectation = {
  kind: 'simple';
  label: string;
  totalRows: number;
};

type DraftPublishExpectation = {
  kind: 'draftPublish';
  label: string;
  published: number;
  draftRows: number;
  totalRows: number;
};

type MediaExpectation = {
  kind: 'media';
  label: string;
  minRows: number;
};

type Expectation = SimpleExpectation | DraftPublishExpectation | MediaExpectation;

function deriveDraftPublishRows(
  { published, draftOnly }: DraftPublishSeedInput,
  multiplier: number,
  { localeCount = 1 }: { localeCount?: number } = {}
): { published: number; draftRows: number; totalRows: number } {
  const m = Number(multiplier) || 1;
  const pub = published * m * localeCount;
  const draftOnlyRows = draftOnly * m * localeCount;
  return {
    published: pub,
    draftRows: draftOnlyRows + pub,
    totalRows: pub * 2 + draftOnlyRows,
  };
}

function deriveExpectationsForProfile(
  spec: FixtureSpec,
  { profile, multiplier }: { profile: string; multiplier: number }
): Map<string, Expectation> {
  const m = Number(multiplier) || 1;
  const localeCount = spec.locales?.length || 1;
  const map = new Map<string, Expectation>();

  for (const [uid, entry] of Object.entries(spec.contentTypes)) {
    if (!entry.profiles.includes(profile as 'v4' | 'v5')) {
      continue;
    }

    const seed = entry.seed;

    if ('count' in seed && seed.count != null) {
      map.set(uid, {
        kind: 'simple',
        label: entry.label,
        totalRows: seed.count * m,
      });
    } else if ('perLocale' in seed && seed.perLocale) {
      map.set(uid, {
        kind: 'draftPublish',
        label: entry.label,
        ...deriveDraftPublishRows(seed.perLocale, m, { localeCount }),
      });
    } else {
      const dpSeed = seed as { published: number; draftOnly: number };
      map.set(uid, {
        kind: 'draftPublish',
        label: entry.label,
        ...deriveDraftPublishRows({ published: dpSeed.published, draftOnly: dpSeed.draftOnly }, m, {
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

function getSeedCountsForProfile(
  spec: FixtureSpec,
  { profile, multiplier }: { profile: string; multiplier: number }
): Record<string, unknown> {
  const m = Number(multiplier) || 1;
  const counts: Record<string, unknown> = {
    mediaFiles: spec.mediaFiles * m,
  };

  for (const entry of Object.values(spec.contentTypes)) {
    if (!entry.profiles.includes(profile as 'v4' | 'v5')) {
      continue;
    }

    const { key, seed } = entry;

    if ('count' in seed && seed.count != null) {
      counts[key] = seed.count * m;
    } else if ('perLocale' in seed && seed.perLocale) {
      counts[key] = {
        published: seed.perLocale.published * m,
        drafts: seed.perLocale.draftOnly * m,
      };
    } else {
      const dpSeed = seed as { published: number; draftOnly: number; targetsPerSource?: number };
      counts[key] = {
        published: dpSeed.published * m,
        drafts: dpSeed.draftOnly * m,
      };
      if (dpSeed.targetsPerSource != null) {
        counts.hcM2mTargetsPerSource = dpSeed.targetsPerSource;
      }
    }
  }

  return counts;
}

type ActiveEntry = { uid: string } & FixtureSpec['contentTypes'][string];

function getActiveEntriesForProfile(spec: FixtureSpec, dataOrigin: string): ActiveEntry[] {
  return Object.entries(spec.contentTypes)
    .filter(([, entry]) => entry.profiles.includes(dataOrigin as 'v4' | 'v5'))
    .map(([uid, entry]) => ({ uid, ...entry }));
}

module.exports = {
  deriveDraftPublishRows,
  deriveExpectationsForProfile,
  getSeedCountsForProfile,
  getActiveEntriesForProfile,
};
