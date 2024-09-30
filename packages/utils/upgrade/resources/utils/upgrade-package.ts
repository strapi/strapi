import path from 'node:path';
import { type modules } from '../../dist';

export const upgradeIfExists = (
  file: modules.runner.json.JSONSourceFile,
  params: modules.runner.json.JSONTransformParams,
  packagePath: string,
  version: string
) => {
  const { cwd, json } = params;

  const rootPackageJsonPath = path.join(cwd, 'package.json');

  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);

  if (j.has(packagePath)) {
    j.set(packagePath, version);
  }

  return j.root();
};
