import semver from 'semver';

import type { Version } from '../types';

export interface VersionParser {
  current: string;
  setAvailable(versions: Version.SemVer[] | null): VersionParser;
  nextMajor(): Version.SemVer | undefined;
}

export type CreateVersionParser = (current: Version.SemVer) => VersionParser;

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

    setAvailable(versions: Version.SemVer[] | null) {
      state.available = versions !== null ? versions.map((v) => new semver.SemVer(v)) : null;

      return this;
    },

    nextMajor() {
      // If no available versions have been provided, return the next natural major version
      if (!state.available) {
        return state.current.inc('major').raw as Version.SemVer;
      }

      const next = state.available
        // Removes older versions
        .filter((v) => v.major > state.current.major)
        // Sort from the oldest to the newest
        .sort(semver.compare)
        // Keep only the first item
        .at(0);

      return next?.raw as Version.SemVer;
    },
  };
};

export const nextMajor = (current: Version.SemVer, available?: Version.SemVer[]) => {
  return createVersionParser(current)
    .setAvailable(available ?? null)
    .nextMajor();
};
