export type Version = number;

export type LiteralVersion =
  | `${Version}`
  | `${Version}.${Version}`
  | `${Version}.${Version}.${Version}`;

export type LiteralSemVer = `${Version}.${Version}.${Version}`;

export type { SemVer, Range } from 'semver';

export enum ReleaseType {
  // Classic
  Major = 'major',
  Minor = 'minor',
  Patch = 'patch',
  // Other
  Latest = 'latest',
}
