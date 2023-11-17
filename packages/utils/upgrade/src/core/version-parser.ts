import semver from 'semver';
import assert from 'node:assert';

import { isLatestVersion, isSemVer, isVersionRelease, VersionRelease } from './version';

import type { SemVer, Version } from './version';

export interface VersionParser {
  current: string;
  setAvailable(versions: SemVer[] | null): VersionParser;
  nextMajor(): SemVer | undefined;
  nextMinor(): SemVer | undefined;
  nextPatch(): SemVer | undefined;
  latest(): SemVer | undefined;
  exact(version: SemVer): SemVer | undefined;
  search(version: Version): SemVer | undefined;
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
      return this.search(VersionRelease.Major);
    },

    nextMinor() {
      return this.search(VersionRelease.Minor);
    },

    nextPatch() {
      return this.search(VersionRelease.Patch);
    },

    latest() {
      return this.search(VersionRelease.Latest);
    },

    exact(version: SemVer) {
      return this.search(version);
    },

    search(version: Version) {
      if (!state.available) {
        return undefined;
      }

      let versionFilter: (v: semver.SemVer) => boolean = () => false;

      if (isSemVer(version)) {
        assert(
          state.current.compare(version) === -1,
          `The given version should be greater than the current one (${state.current.raw}>${version})`
        );
        // {current} > {v} AND {v} <= {version}
        versionFilter = (v) => v.compare(state.current) === 1 && v.compare(version) <= 0;
      }

      if (isVersionRelease(version)) {
        versionFilter = (v) => {
          switch (version) {
            case VersionRelease.Latest:
              // match any version that is greater than the current one
              return v.compare(state.current) === 1;
            case VersionRelease.Major:
              // match any version which major release is greater than the current one
              return v.major > state.current.major;
            case VersionRelease.Minor:
              // match any version which minor release is greater than the current one
              return v.minor > state.current.minor;
            case VersionRelease.Patch:
              // match any version which patch release is greater than the current one
              return v.patch > state.current.patch;
            default:
              throw new Error(`Internal error: Invalid version release found: ${version}`);
          }
        };
      }

      const matches = state.available
        // Removes invalid versions
        .filter(versionFilter)
        // Sort from the oldest to the newest
        .sort(semver.compare);

      const nearest = matches.at(0);
      const latest = matches.at(-1);

      // TODO: In the following scenario: target=major, current=4.15.4, available=[4.16.0, 5.0.0, 5.2.0, 6.3.0]
      //       We might want to target 5.2.0 (currently, it'll return 5.0.0)
      const target = isSemVer(version) || isLatestVersion(version) ? latest : nearest;

      return target?.raw as SemVer | undefined;
    },
  };
};
