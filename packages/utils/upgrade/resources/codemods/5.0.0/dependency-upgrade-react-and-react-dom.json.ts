import path from 'node:path';
import semver from 'semver';

import type { modules } from '../../../dist';

const REACT_DEP_NAME = 'react';
const REACT_DEP_PATH = `dependencies.${REACT_DEP_NAME}`;

const REACT_DOM_DEP_NAME = 'react-dom';
const REACT_DOM_DEP_PATH = `dependencies.${REACT_DOM_DEP_NAME}`;

const DEP_NEW_VERSION_RANGE = '^18.0.0';

/**
 * Specifically targets the root package.json and updates the react and react-dom dependency version.
 *
 * We first check if the react and react-dom dependency is listed in the package.json. If the dependency is
 * found, we verify its version.
 *
 * If the detected version does not satisfy the new version range, we replace it with the new one.
 *
 * Conversely, if no react or react-dom dependency is listed, we add it with the new version range.
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  const rootPackageJsonPath = path.join(cwd, 'package.json');

  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);

  if (j.has(REACT_DEP_PATH) && j.has(REACT_DOM_DEP_PATH)) {
    const currentReactVersion = j.get(REACT_DEP_PATH);
    const currentReactDOMVersion = j.get(REACT_DOM_DEP_PATH);

    // If the current version is not a string, then something is wrong, abort
    if (typeof currentReactVersion !== 'string' || typeof currentReactDOMVersion !== 'string') {
      return j.root();
    }

    const currentSatisfiesNew =
      semver.satisfies(currentReactVersion, DEP_NEW_VERSION_RANGE) &&
      semver.satisfies(currentReactDOMVersion, DEP_NEW_VERSION_RANGE);

    // if the current version satisfies the new range, keep it as is and abort
    if (currentSatisfiesNew) {
      return j.root();
    }

    // else, update the version with the new one
    j.set(REACT_DEP_PATH, DEP_NEW_VERSION_RANGE);
    j.set(REACT_DOM_DEP_PATH, DEP_NEW_VERSION_RANGE);
  }

  // If the dependency is not listed yet, add it
  else {
    j.set(REACT_DEP_PATH, DEP_NEW_VERSION_RANGE);
    j.set(REACT_DOM_DEP_PATH, DEP_NEW_VERSION_RANGE);
  }

  return j.root();
};

export default transform;
