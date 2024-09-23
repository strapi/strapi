import path from 'node:path';

import type { modules } from '../../../dist';

/**
 * This codemod runs on the package.json of the Strapi project and updates
 * the sqlite dependency to better-sqlite3
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  const rootPackageJsonPath = path.join(cwd, 'package.json');

  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);

  let removed = false;

  const targetProperties = ['sqlite3', '@vscode/sqlite3'];

  targetProperties.forEach((targetProperty) => {
    const oldSqliteDependency = `dependencies.${targetProperty}`;
    if (j.has(oldSqliteDependency)) {
      j.remove(oldSqliteDependency);
      removed = true;
    }
  });

  if (removed && !j.has('dependencies.better-sqlite3')) {
    // TODO check this version when releasing V5
    j.set('dependencies.better-sqlite3', '9.4.3');
  }

  return j.root();
};

export default transform;
