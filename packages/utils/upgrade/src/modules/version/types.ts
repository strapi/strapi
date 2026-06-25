export type Version = number;

export type LiteralVersion =
  | `${Version}`
  | `${Version}.${Version}`
  | `${Version}.${Version}.${Version}`;

export type LiteralSemVer = `${Version}.${Version}.${Version}`;

export type { SemVer, Range } from 'semver';

export const ReleaseType = {
  // Classic
  Major: 'major',
  Minor: 'minor',
  Patch: 'patch',
  // Other
  Latest: 'latest',
} as const satisfies Record<Capitalize<ReleaseType>, ReleaseType>;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ReleaseType = 'major' | 'minor' | 'patch' | 'latest';
