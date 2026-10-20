import path from 'node:path';

import type { modules } from '../../../dist';

const MODULE_PATH = 'compilerOptions.module';
const MODULE_RESOLUTION_PATH = 'compilerOptions.moduleResolution';

// TypeScript 6 deprecates these values (TS5107) and TypeScript 7 removes them (TS5108)
const DEPRECATED_MODULE_RESOLUTIONS = ['node', 'node10'];

/**
 * Removes the deprecated `"moduleResolution": "Node"` from the root tsconfig.json of an app.
 *
 * Apps generated before TypeScript 6 have `"module": "CommonJS"` with `"moduleResolution": "Node"`.
 * Without the option, TypeScript picks the default for CommonJS: `node10` on TypeScript 5 and
 * `bundler` on TypeScript 6 and 7. Setting `bundler` explicitly fails on TypeScript 5 (TS5095).
 *
 * Other tsconfig files, such as src/admin/tsconfig.json, are not changed.
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  const { cwd, json } = params;

  if (file.path !== path.join(cwd, 'tsconfig.json')) {
    return file.json;
  }

  const tsconfig = json(file.json);

  const moduleResolution = tsconfig.get(MODULE_RESOLUTION_PATH);
  const module = tsconfig.get(MODULE_PATH);

  if (
    typeof moduleResolution !== 'string' ||
    DEPRECATED_MODULE_RESOLUTIONS.includes(moduleResolution.toLowerCase()) === false
  ) {
    return tsconfig.root();
  }

  // TODO @Nico without `"module": "CommonJS"`, removing the option makes TypeScript 5 fall back to
  // `classic` resolution. Such tsconfigs (and values inherited through `extends`) are left for the
  // user to migrate manually.
  if (typeof module !== 'string' || module.toLowerCase() !== 'commonjs') {
    return tsconfig.root();
  }

  tsconfig.remove(MODULE_RESOLUTION_PATH);

  return tsconfig.root();
};

export default transform;
