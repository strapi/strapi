import path from 'node:path';

import type { modules } from '../../../dist';

const STRAPI_I18N_DEP_NAME = '@strapi/plugin-i18n';
const STRAPI_I18N_DEP_PATH = `dependencies.${STRAPI_I18N_DEP_NAME}`;

/**
 * Specifically targets the root package.json and removes the @strapi/plugin-i18n dependency.
 *
 * Why? The i18n plugin is now a hard dependency of @strapi/strapi and isn't needed in the package.json anymore.
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  const rootPackageJsonPath = path.join(cwd, 'package.json');

  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);

  if (j.has(STRAPI_I18N_DEP_PATH)) {
    j.remove(STRAPI_I18N_DEP_PATH);
  }

  return j.root();
};

export default transform;
