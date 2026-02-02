import path from 'node:path';
import semver from 'semver';

import type { modules } from '../../../dist';

const DEP_NAME = 'styled-components';
const DEP_PATH = `dependencies.${DEP_NAME}`;

const DEP_NEW_VERSION_RANGE = '^6.0.0';

const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  const rootPackageJsonPath = path.join(cwd, 'package.json');

  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);

  if (j.has(DEP_PATH)) {
    const currentVersion = j.get(DEP_PATH);

    // If the current version is not a string, then something is wrong, abort
    if (typeof currentVersion !== 'string') {
      return j.root();
    }

    const currentSatisfiesNew = semver.satisfies(currentVersion, DEP_NEW_VERSION_RANGE);

    // if the current version satisfies the new range, keep it as is and abort
    if (currentSatisfiesNew) {
      return j.root();
    }

    // else, update the version with the new one
    j.set(DEP_PATH, DEP_NEW_VERSION_RANGE);
  }

  // If the dependency is not listed yet, add it
  else {
    j.set(DEP_PATH, DEP_NEW_VERSION_RANGE);
  }

  return j.root();
};

export default transform;
