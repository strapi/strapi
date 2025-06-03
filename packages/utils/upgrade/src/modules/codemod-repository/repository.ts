import assert from 'node:assert';
import fse from 'fs-extra';
import semver from 'semver';
import path from 'node:path';

import { codemodFactory, constants } from '../codemod';
import { isRangeInstance, semVerFactory } from '../version';

import { INTERNAL_CODEMODS_DIRECTORY } from './constants';

import type { Codemod } from '../codemod';
import type { Version } from '../version';

import type { CodemodRepository as CodemodRepositoryInterface, FindQuery } from './types';

export class CodemodRepository implements CodemodRepositoryInterface {
  private groups: Record<Version.LiteralSemVer, Codemod.Codemod[]>;

  private versions: Version.SemVer[];

  public cwd: string;

  constructor(cwd: string) {
    assert(fse.existsSync(cwd), `Invalid codemods directory provided "${cwd}"`);

    this.cwd = cwd;

    this.groups = {};
    this.versions = [];
  }

  refresh() {
    this.refreshAvailableVersions();
    this.refreshAvailableFiles();

    return this;
  }

  count(version: Version.SemVer) {
    return this.findByVersion(version).length;
  }

  versionExists(version: Version.SemVer) {
    return version.raw in this.groups;
  }

  has(uid: string) {
    const result = this.find({ uids: [uid] });

    if (result.length !== 1) {
      return false;
    }

    const { codemods } = result[0];

    return codemods.length === 1 && codemods[0].uid === uid;
  }

  find(q: FindQuery) {
    const entries = Object.entries(this.groups) as Array<[Version.LiteralSemVer, Codemod.List]>;

    return (
      entries
        // Filter by range if provided in the query
        .filter(maybeFilterByRange)
        // Transform version/codemods tuples into regular objects
        .map<Codemod.VersionedCollection>(([version, codemods]) => ({
          version: semVerFactory(version),
          // Filter by UID if provided in the query
          codemods: codemods.filter(maybeFilterByUIDs),
        }))
        // Only return groups with at least 1 codemod
        .filter(({ codemods }) => codemods.length > 0)
    );

    function maybeFilterByRange([version]: [Version.LiteralSemVer, Codemod.List]) {
      if (!isRangeInstance(q.range)) {
        return true;
      }

      return q.range.test(version);
    }

    function maybeFilterByUIDs(codemod: Codemod.Codemod) {
      if (q.uids === undefined) {
        return true;
      }

      return q.uids.includes(codemod.uid);
    }
  }

  findByVersion(version: Version.SemVer) {
    const literalVersion = version.raw as Version.LiteralSemVer;
    const codemods = this.groups[literalVersion];

    return codemods ?? [];
  }

  findAll() {
    const entries = Object.entries(this.groups);

    return entries.map<Codemod.VersionedCollection>(([version, codemods]) => ({
      version: semVerFactory(version),
      codemods,
    }));
  }

  private refreshAvailableVersions() {
    this.versions = fse
      .readdirSync(this.cwd) // Only keep root directories
      .filter((filename) => fse.statSync(path.join(this.cwd, filename)).isDirectory())
      // Paths should be valid semver
      .filter((filename): filename is Version.LiteralSemVer => semver.valid(filename) !== null)
      // Transform files names to SemVer instances
      .map<Version.SemVer>((version) => semVerFactory(version))
      // Sort versions in ascending order
      .sort(semver.compare);

    return this;
  }

  private refreshAvailableFiles() {
    this.groups = {};

    for (const version of this.versions) {
      this.refreshAvailableFilesForVersion(version);
    }
  }

  private refreshAvailableFilesForVersion(version: Version.SemVer) {
    const literalVersion = version.raw as Version.LiteralSemVer;
    const versionDirectory = path.join(this.cwd, literalVersion);

    // Ignore obsolete versions
    if (!fse.existsSync(versionDirectory)) {
      return;
    }

    this.groups[literalVersion] = fse
      .readdirSync(versionDirectory)
      // Make sure the filenames are valid codemod files
      .filter((filename) => fse.statSync(path.join(versionDirectory, filename)).isFile())
      .filter((filename) => constants.CODEMOD_FILE_REGEXP.test(filename))
      // Transform the filenames into Codemod instances
      .map((filename) => {
        const kind = parseCodemodKindFromFilename(filename);
        const baseDirectory = this.cwd;

        return codemodFactory({ kind, baseDirectory, version, filename });
      });
  }
}

export const parseCodemodKindFromFilename = (filename: string): Codemod.Kind => {
  const kind = filename.split('.').at(-2) as Codemod.Kind | undefined;

  assert(kind !== undefined);
  assert(constants.CODEMOD_ALLOWED_SUFFIXES.includes(kind));

  return kind;
};

export const codemodRepositoryFactory = (cwd: string = INTERNAL_CODEMODS_DIRECTORY) => {
  return new CodemodRepository(cwd);
};
