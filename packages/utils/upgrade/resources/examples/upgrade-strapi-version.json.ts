import path from 'node:path';

import type { modules } from '../../dist';

/**
 * Note: This transform file is only for development purposes and should be deleted before releasing
 */

const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  // Ignore files that are not the root package.json
  // Note: We could also find every file named package.json and update the dependencies for all of them
  const rootPackageJsonPath = path.join(cwd, 'package.json');
  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);
  const strapiDepAddress = 'dependencies.@strapi/strapi';

  if (j.has(strapiDepAddress)) {
    j.set(strapiDepAddress, '5.0.0');
  }

  return j.root();
};

export default transform;
