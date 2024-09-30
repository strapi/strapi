import path from 'node:path';
import semver from 'semver';
import { type modules } from '../../dist';

export const upgradeIfExists = (
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
