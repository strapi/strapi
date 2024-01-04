import path from 'node:path';

import type { modules } from '../../../dist';

const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  const rootPackageJsonPath = path.join(cwd, 'package.json');

  if (file.path !== rootPackageJsonPath) {
    return file.json;
  }

  const j = json(file.json);

  const targetProperties = ['sqlite3', 'vscode/sqlite3', 'sqlite-legacy'];

  targetProperties.forEach((targetProperty) => {
    const oldSqliteDependency = `dependencies.${targetProperty}`;
    if (j.has(oldSqliteDependency)) {
      j.remove(oldSqliteDependency);
      j.set('dependencies.better-sqlite3', '9.0.0');
    }
  });

  return j.root();
};

export default transform;
