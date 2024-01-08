import type { Codemod } from '../codemod';
import type { Version } from '../version';

export interface CodemodRepository {
  cwd: string;

  refresh(): this;

  findByRange(range: Version.Range): Codemod.VersionedCollection[];
  findByVersion(version: Version.SemVer): Codemod.List;

  exists(version: Version.SemVer): boolean;

  count(version: Version.SemVer): number;
  countRange(range: Version.Range): number;
}
