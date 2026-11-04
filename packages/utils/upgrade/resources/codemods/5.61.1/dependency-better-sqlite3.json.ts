import path from 'node:path';
import semver from 'semver';
import type { modules } from '../../../dist';

const DEP_NAME = 'better-sqlite3';
const DEP_PATH = `dependencies.${DEP_NAME}`;
const DEP_VERSION = '13.0.3';

/**
 * Upgrade better-sqlite3 to 13.x (Node >= 22, ships prebuilt N-API binaries)
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  return upgradeIfExists(file, params, DEP_PATH, DEP_VERSION);
};

export default transform;

// Codemods are transpiled one file at a time, so this helper cannot be imported from a shared module
const upgradeIfExists = (
  file: modules.runner.json.JSONSourceFile,
  params: modules.runner.json.JSONTransformParams,
  packagePath: string,
  targetVersion: string
) => {
  const { cwd, json } = params;

  // Return early if the file path is not the root package.json
  if (file.path !== path.join(cwd, 'package.json')) {
    return file.json;
  }

  const packageJson = json(file.json);

  // Check if the package exists
  if (packageJson.has(packagePath)) {
    const currentVersion = packageJson.get(packagePath);
    // ensure we only upgrade, not downgrade
    if (
      typeof currentVersion === 'string' &&
      semver.valid(currentVersion) &&
      semver.lt(currentVersion, targetVersion)
    ) {
      packageJson.set(packagePath, targetVersion);
    }
  }

  return packageJson.root();
};
