import fs from 'node:fs';
import path from 'node:path';

import type { Transform } from 'jscodeshift';

type RunnerOptions = {
  dry?: boolean;
  projectRoot?: string;
};

/**
 * Strapi 5 plugins wire admin via package exports (`strapi/admin`); legacy root `strapi-admin.js` should go.
 * Only unlinks files directly under `options.projectRoot` (matches `--project-path`).
 */
const transform: Transform = (file, _api, options: RunnerOptions) => {
  const projectRoot = options.projectRoot;

  if (!projectRoot) {
    return file.source;
  }

  if (
    path.basename(file.path) !== 'strapi-admin.js' ||
    path.normalize(path.dirname(file.path)) !== path.normalize(projectRoot)
  ) {
    return file.source;
  }

  if (!options.dry) {
    fs.unlinkSync(file.path);
  }

  return undefined;
};

export default transform;
