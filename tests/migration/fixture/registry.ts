const spec = require('./spec');

type ProfileConfig =
  | { dataOrigin: string; skipJoinParity: boolean; aliasOf?: undefined }
  | { aliasOf: string; dataOrigin?: undefined; skipJoinParity?: undefined };

const PROFILES: Record<string, ProfileConfig> = {
  'full-v4-origin': { dataOrigin: 'v4', skipJoinParity: false },
  'full-v5-origin': { dataOrigin: 'v5', skipJoinParity: false },
  'full-ladder': { dataOrigin: 'v4', skipJoinParity: true },
  full: { aliasOf: 'full-v4-origin' },
};

/** Global checks always run regardless of spec entry checks. */
const GLOBAL_CHECK_IDS = ['documentIdBackfill'];

/** Run order for validation sections. */
const CHECK_RUN_ORDER = [
  'rowCounts',
  'documentIdBackfill',
  'draftPublishPair',
  'relationTargets',
  'joinTableParity',
  'relationApiParity',
  'entityGraph',
  'mediaParity',
  'nestedComponentParity',
  'dbMorphAndDz',
];

function resolveProfileConfig(profileName: string): ProfileConfig {
  const profile = PROFILES[profileName];
  if (!profile) {
    throw new Error(
      `Unknown migration validator profile "${profileName}". Known: ${Object.keys(PROFILES).join(', ')}`
    );
  }
  if (profile.aliasOf) {
    return resolveProfileConfig(profile.aliasOf);
  }
  return profile;
}

type ActiveEntry = { uid: string; checks?: string[] };
type FixtureSpec = typeof spec;

function resolveCheckIds(
  _fixtureSpec: FixtureSpec,
  activeEntries: ActiveEntry[],
  flags: { skipJoinParity?: boolean } = {}
): string[] {
  const ids = new Set<string>(GLOBAL_CHECK_IDS);

  for (const entry of activeEntries) {
    for (const checkId of entry.checks || []) {
      ids.add(checkId);
    }
  }

  if (flags.skipJoinParity) {
    ids.delete('joinTableParity');
  }

  return CHECK_RUN_ORDER.filter((id) => ids.has(id));
}

function hasCheckForAnyEntry(
  _fixtureSpec: FixtureSpec,
  activeEntries: ActiveEntry[],
  checkId: string
): boolean {
  if (GLOBAL_CHECK_IDS.includes(checkId)) {
    return true;
  }
  return activeEntries.some((entry) => entry.checks?.includes(checkId));
}

module.exports = {
  PROFILES,
  GLOBAL_CHECK_IDS,
  CHECK_RUN_ORDER,
  resolveProfileConfig,
  resolveCheckIds,
  hasCheckForAnyEntry,
};
