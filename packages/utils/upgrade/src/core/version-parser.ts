import semver from 'semver';

import type { SemVer } from '.';

export interface VersionParser {
  current: string;
  setAvailable(versions: SemVer[] | null): VersionParser;
  nextMajor(): SemVer | undefined;
}

export type CreateVersionParser = (current: SemVer) => VersionParser;

interface VersionState {
  current: semver.SemVer;
  available: semver.SemVer[] | null;
}

export const createVersionParser: CreateVersionParser = (current) => {
  const state: VersionState = {
    current: new semver.SemVer(current),
    available: null,
  };

  return {
    get current(): string {
      return state.current.raw;
    },

    setAvailable(versions: SemVer[] | null) {
      state.available = versions !== null ? versions.map((v) => new semver.SemVer(v)) : null;

      return this;
    },

    nextMajor() {
      // If no available versions have been provided, return the next natural major version
      if (!state.available) {
        return state.current.inc('major').raw as SemVer;
      }

      const next = state.available
        // Removes older versions
        .filter((v) => v.major > state.current.major)
        // Sort from the oldest to the newest
        .sort(semver.compare)
        // Keep only the first item
        .at(0);

      return next?.raw as SemVer;
    },
  };
};

export const nextMajor = (current: SemVer, available?: SemVer[]) => {
  return createVersionParser(current)
    .setAvailable(available ?? null)
    .nextMajor();
};
