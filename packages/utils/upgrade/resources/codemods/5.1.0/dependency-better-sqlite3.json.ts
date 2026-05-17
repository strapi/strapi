import path from 'path';
import semver from 'semver';
import type { modules } from '../../../dist';

const DEP_NAME = 'better-sqlite3';
const DEV_DEP_PATH = `devDependencies.${DEP_NAME}`;
const DEP_PATH = `dependencies.${DEP_NAME}`;
const DEP_VERSION = '12.8.0';

/**
 * Codemod for 5.1.0:
 * - If better-sqlite3 is present in dependencies, move it to devDependencies
 *   (it is only needed for `strapi develop`, not production `strapi start`).
 * - If it already exists in devDependencies, just upgrade the version if needed.
 * - If it does not exist anywhere, do nothing (addDatabaseDependencies will add it).
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  // Only operate on the root package.json
  if (file.path !== path.join(cwd, 'package.json')) {
    return file.json;
  }

  const packageJson = json(file.json);

  const inDeps = packageJson.has(DEP_PATH);
  const inDevDeps = packageJson.has(DEV_DEP_PATH);

  // If present in dependencies, remove from there and ensure it is in devDependencies
  if (inDeps) {
    const currentVersion = packageJson.get(DEP_PATH);
    packageJson.remove(DEP_PATH);

    const targetVersion = getTargetVersion(currentVersion, DEP_VERSION);
    packageJson.set(DEV_DEP_PATH, targetVersion);
    return packageJson.root();
  }

  // If already in devDependencies, just upgrade if needed
  if (inDevDeps) {
    const currentVersion = packageJson.get(DEV_DEP_PATH);
    if (typeof currentVersion === 'string' && semver.valid(currentVersion) && semver.lt(currentVersion, DEP_VERSION)) {
      packageJson.set(DEV_DEP_PATH, DEP_VERSION);
    }
    return packageJson.root();
  }

  // Not present anywhere — leave it to addDatabaseDependencies
  return file.json;
};

export default transform;

function getTargetVersion(currentVersion: unknown, targetVersion: string): string {
  if (
    typeof currentVersion === 'string' &&
    semver.valid(currentVersion) &&
    semver.valid(targetVersion) &&
    semver.gt(currentVersion, targetVersion)
  ) {
    return currentVersion as string; // don't downgrade
  }
  return targetVersion;
}
