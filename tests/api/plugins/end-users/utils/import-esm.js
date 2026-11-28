'use strict';

/**
 * A real dynamic `import()`. It lives in plain JavaScript because the API tests transform
 * TypeScript with swc into CommonJS, which turns `import()` into a `require()`, and Jest cannot
 * `require()` an ES module.
 */
module.exports = {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  importEsm: (specifier) => import(specifier),
};
