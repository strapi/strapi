import * as semver from 'semver';
import * as path from 'node:path';
import assert from 'node:assert';
import { readdirSync, statSync, existsSync } from 'node:fs';

import { isVersionRelease } from './version';
import * as f from './format';

import type { Logger, Version, SemVer } from '.';
import type { TransformFile, TransformFileKind } from '../types';

export interface CreateTransformsLoaderOptions {
  dir?: string;
  range: semver.Range;
  logger: Logger;
}

const INTERNAL_TRANSFORMS_DIR = path.join(__dirname, '..', '..', 'resources', 'transforms');
const TRANSFORM_CODEMOD_SUFFIX = 'code';
const TRANSFORM_JSON_SUFFIX = 'json';
const TRANSFORM_ALLOWED_KIND = [TRANSFORM_CODEMOD_SUFFIX, TRANSFORM_JSON_SUFFIX];
const TRANSFORM_EXT = 'ts';
const TRANSFORM_FILE_REGEXP = new RegExp(
  `^.+[.](${TRANSFORM_ALLOWED_KIND.join('|')})[.]${TRANSFORM_EXT}$`
);

export const createTransformsLoader = (options: CreateTransformsLoaderOptions) => {
  const { dir = INTERNAL_TRANSFORMS_DIR, range, logger } = options;

  assert(existsSync(dir), `Invalid transforms directory provided "${dir}"`);

  // TODO: Maybe add some more logs regarding what folders are accepted/discarded
  const versions = readdirSync(dir)
    // Only keep root directories
    .filter((filePath) => statSync(path.join(dir, filePath)).isDirectory())
    // Paths should be valid semver
    .filter((filePath): filePath is SemVer => semver.valid(filePath) !== null)
    // Should satisfy the given range
    .filter((filePath) => range.test(filePath))
    // Sort versions in ascending order
    .sort(semver.compare) as SemVer[];

  const fNbFound = f.highlight(versions.length.toString());
  const fRange = f.versionRange(range.raw);
  const fVersions = versions.map(f.version).join(', ');

  if (versions.length === 0) {
    throw new Error(`Could not find any upgrade matching the given range (${fRange})`);
  }

  logger.debug(`Found ${fNbFound} upgrades matching ${fRange} (${fVersions})`);

  // Note: We're casting the result as a SemVer since we know there is at least one item in the `versions` array
  const latest = versions.at(-1) as SemVer;

  /**
   * Verifies that the given version matches the available ones
   */
  const isValid = (version: AnyVersion) => {
    return version === 'latest' || versions.includes(version);
  };

  /**
   * Load code mods paths for a given version.
   *
   * Throws an error if the version can't be found or is invalid.
   */
  const load = (version: AnyVersion): TransformFile[] => {
    if (!isValid(version)) {
      // TODO: Use custom upgrade errors
      throw new Error(`Invalid version provided. Valid versions are ${versions.join(', ')}`);
    }

    const target = version === 'latest' ? latest : version;

    const fullPath = (filePath: string) => path.join(dir, version, filePath);

    const transformsPath = readdirSync(path.join(dir, target))
      .filter((filePath) => statSync(fullPath(filePath)).isFile())
      .filter((filePath) => TRANSFORM_FILE_REGEXP.test(filePath))
      .map<TransformFile>((filePath) => ({
        kind: parseTransformKind(filePath),
        path: filePath,
        fullPath: fullPath(filePath),
        formatted: pathToHumanReadableName(filePath),
        version: target,
      }));

    const fTarget = f.version(target);
    const fNbLoaded = f.highlight(transformsPath.length.toString());
    const fLoaded = transformsPath.map((p) => f.transform(p.path)).join(', ');

    let debugMessage = `Found ${fNbLoaded} transform(s) for ${fTarget}`;

    if (transformsPath.length > 0) {
      debugMessage += ` (${fLoaded})`;
    }

    logger.debug(debugMessage);

    return transformsPath;
  };

  const loadRange = (range: semver.Range): TransformFile[] => {
    const paths: TransformFile[] = [];

    logger.debug(`Loading transforms matching ${f.versionRange(range.raw)}`);

    for (const version of versions) {
      const isInRange = range.test(version);

      if (isInRange) {
        const transformsForVersion = load(version);
        paths.push(...transformsForVersion);
      }
    }

    return paths;
  };

  return {
    get availableVersions() {
      return versions;
    },

    get latest(): string | undefined {
      return latest;
    },

    isValid,
    load,
    loadRange,
  };
};

// TODO: We could add the transform kind to the formatted string
const pathToHumanReadableName = (path: string) => {
  return path
    .replace(`.${TRANSFORM_CODEMOD_SUFFIX}.${TRANSFORM_EXT}`, '')
    .replace(`.${TRANSFORM_JSON_SUFFIX}.${TRANSFORM_EXT}`, '')
    .replaceAll('-', ' ');
};

const parseTransformKind = (path: string): TransformFileKind => {
  const kind = path.split('.').at(-2) as TransformFileKind | undefined;

  assert(kind !== undefined);
  assert(TRANSFORM_ALLOWED_KIND.includes(kind));

  return kind;
};
