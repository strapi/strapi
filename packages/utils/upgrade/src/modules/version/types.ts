export type Version = number;

export type LiteralVersion =
  | `${Version}`
  | `${Version}.${Version}`
  | `${Version}.${Version}.${Version}`;

export type LiteralSemVer = `${Version}.${Version}.${Version}`;

export type { SemVer, Range } from 'semver';

export const RELEASE_TYPES = {
  // Classic
  Major: 'major',
  Minor: 'minor',
  Patch: 'patch',
  // Other
  Latest: 'latest',
} as const;

export type ReleaseType = (typeof RELEASE_TYPES)[keyof typeof RELEASE_TYPES];
