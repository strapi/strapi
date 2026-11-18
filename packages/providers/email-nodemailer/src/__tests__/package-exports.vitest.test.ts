import fs from 'fs';
import path from 'path';

import { describe, expect, test } from 'vitest';

import packageJson from '../../package.json';

/**
 * Checks the built package: run it after `yarn build` (CI runs the Vitest unit tests after the
 * monorepo build). Every file the `exports` map names must exist, or consumers get
 * `MODULE_NOT_FOUND` for a subpath that TypeScript happily resolves.
 */
const packageRoot = path.resolve(__dirname, '../..');

type Conditions = string | { [condition: string]: Conditions };

const collectTargets = (subpath: string, conditions: Conditions): Array<[string, string]> => {
  if (typeof conditions === 'string') {
    return [[subpath, conditions]];
  }

  return Object.values(conditions).flatMap((nested) => collectTargets(subpath, nested));
};

const exportTargets = Object.entries(packageJson.exports as Record<string, Conditions>).flatMap(
  ([subpath, conditions]) => collectTargets(subpath, conditions)
);

describe('package exports', () => {
  test.each(exportTargets)('%s points to an existing file: %s', (_subpath, target) => {
    expect(fs.existsSync(path.join(packageRoot, target))).toBe(true);
  });
});
