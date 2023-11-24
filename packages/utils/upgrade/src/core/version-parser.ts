import semver from 'semver';

import {
  createSemverRange,
  formatSemVer,
  isNextVersion,
  isSemVer,
  isVersionRelease,
  VersionRelease,
} from './version';

import type { SemVer, Version } from './version';

export interface VersionParser {
  setAvailable(versions: SemVer[] | null): VersionParser;
  nextMajor(): SemVer | undefined;
  nextMinor(): SemVer | undefined;
  nextPatch(): SemVer | undefined;
  latest(): SemVer | undefined;
  current(): SemVer | undefined;
  next(): SemVer | undefined;
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

    next() {
      return this.search(VersionRelease.Next);
    },

    current() {
      return this.search(VersionRelease.Current);
    },

    exact(version: SemVer) {
      return this.search(version);
    },

    search(version: Version) {
      const { current, available } = state;
      const currentAsString = current.raw as SemVer;

      if (!available) {
        return undefined;
      }

      let range: semver.Range;

      if (isSemVer(version)) {
        range = semver.gt(version, current)
          ? // If target > current, return a range
            createSemverRange(`>${currentAsString} <=${version}`)
          : // Else, return an exact match
            createSemverRange(`=${version}`);
      }

      if (isVersionRelease(version)) {
        switch (version) {
          /**
           * Only accept the same version as the current one
           */
          case VersionRelease.Current:
            range = createSemverRange(`=${currentAsString}`); // take exactly this version
            break;
          /**
           * Accept any version greater than the current one
           */
          case VersionRelease.Latest:
          case VersionRelease.Next:
            range = createSemverRange(`>${currentAsString}`);
            break;
          /**
           * Accept any version where
           * - The overall version is greater than the current one
           * - The major version is the same or +1
           */
          case VersionRelease.Major:
            const nextMajor = formatSemVer(current.inc('major'), 'x');
            range = createSemverRange(`>${currentAsString} <=${nextMajor}`);
            break;
          /**
           * Accept any version where
           * - The overall version is greater than the current one
           * - The major version is the same
           * - The minor version is either the same or +1
           */
          case VersionRelease.Minor:
            const nextMinor = formatSemVer(current.inc('minor'), 'x.x');
            range = createSemverRange(`>${currentAsString} <=${nextMinor}`);
            break;
          /**
           * Accept any version where
           * - The overall version is greater than the current one
           * - The major version is the same
           * - The minor version is the same
           * - The patch version is the same + 1
           */
          case VersionRelease.Patch:
            const nextPatch = formatSemVer(current.inc('patch'), 'x.x.x');
            range = createSemverRange(`>${currentAsString} <=${nextPatch}`);
            break;
          default:
            throw new Error(`Internal error: Invalid version release found: ${version}`);
        }
      }

      const matches = available
        // Removes invalid versions
        .filter((semVer) => range.test(semVer))
        // Sort from the oldest to the newest
        .sort(semver.compare)
        // Keep only the first item
        .at(0);

      const nearest = matches.at(0);
      const latest = matches.at(-1);

      if (!nearest || !latest) {
        return undefined;
      }

      const match = isNextVersion(version) ? nearest : latest;

      return match?.raw as SemVer;
    },
  };
};

export const nextMajor = (current: SemVer, available?: SemVer[]) => {
  return createVersionParser(current)
    .setAvailable(available ?? null)
    .nextMajor();
};
