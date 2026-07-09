import path from 'path';
import semver from 'semver';
import type { modules } from '../../../dist';

const DEP_NAME = 'better-sqlite3';
const DEV_DEP_PATH = `devDependencies.${DEP_NAME}`;
const DEP_PATH = `dependencies.${DEP_NAME}`;
const DEP_VERSION = '12.8.0';
const NON_SQLITE_DRIVERS = ['pg', 'mysql2'];

/**
 *
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  return moveToDevDependenciesForNonSqliteProjects(file, params);
};

export default transform;

// TODO: move this to a utility once we solve the issue where codemods are not transpiled properly
const moveToDevDependenciesForNonSqliteProjects = (
  file: modules.runner.json.JSONSourceFile,
  params: modules.runner.json.JSONTransformParams
) => {
  const { cwd, json } = params;

  // Return early if the file path is not the root package.json
  if (file.path !== path.join(cwd, 'package.json')) {
    return file.json;
  }

  const packageJson = json(file.json);

  const hasNonSqliteDriver = NON_SQLITE_DRIVERS.some((driver) =>
    packageJson.has(`dependencies.${driver}`)
  );

  if (!hasNonSqliteDriver) {
    return packageJson.root();
  }

  if (packageJson.has(DEP_PATH)) {
    const currentVersion = packageJson.get(DEP_PATH);
    packageJson.remove(DEP_PATH);
    packageJson.set(DEV_DEP_PATH, resolveTargetVersion(currentVersion, DEP_VERSION));
  } else if (packageJson.has(DEV_DEP_PATH)) {
    const currentVersion = packageJson.get(DEV_DEP_PATH);
    packageJson.set(DEV_DEP_PATH, resolveTargetVersion(currentVersion, DEP_VERSION));
  }

  return packageJson.root();
};

const resolveTargetVersion = (currentVersion: unknown, targetVersion: string) => {
  if (
    typeof currentVersion === 'string' &&
    semver.valid(currentVersion) &&
    semver.gt(currentVersion, targetVersion)
  ) {
    return currentVersion;
  }

  return targetVersion;
};
