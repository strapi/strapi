import type { Codemod } from '../codemod';
import type { Version } from '../version';

export interface FindQuery {
  range?: Version.Range;
  uids?: string[];
}

export interface CodemodRepository {
  cwd: string;

  refresh(): this;

  find(query: FindQuery): Codemod.VersionedCollection[];

  findByVersion(version: Version.SemVer): Codemod.List;

  versionExists(version: Version.SemVer): boolean;
  has(uid: string): boolean;

  count(version: Version.SemVer): number;
}
