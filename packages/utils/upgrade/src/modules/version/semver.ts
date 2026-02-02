import semver from 'semver';

import * as Version from './types';

export const semVerFactory = (version: string): Version.SemVer => {
  return new semver.SemVer(version);
};

export const isLiteralSemVer = (str: string): str is Version.LiteralSemVer => {
  const tokens = str.split('.');

  return (
    tokens.length === 3 &&
    tokens.every((token) => !Number.isNaN(+token) && Number.isInteger(+token))
  );
};

export const isValidSemVer = (str: string) => semver.valid(str) !== null;

export const isSemverInstance = (value: unknown): value is semver.SemVer => {
  return value instanceof semver.SemVer;
};

export const isSemVerReleaseType = (str: string): str is Version.ReleaseType => {
  return Object.values(Version.ReleaseType).includes(str as Version.ReleaseType);
};
