import { resolve } from 'path';
import { statSync, existsSync } from 'fs';
import { yup, importDefault } from '@strapi/utils';

import type { Core } from '@strapi/types';

import { isAppDefinition } from '../app-definition/brand';

const srcSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    register: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
  })
  .noUnknown();

const validateSrcIndex = (srcIndex: unknown) => {
  return srcSchema.validateSync(srcIndex, { strict: true, abortEarly: false });
};

/**
 * Read the default export of `index.js` from `dir` without validating it.
 * Returns `undefined` when the file is absent. Used both by the legacy loader
 * and by the early brand-detection in `loadApplicationContext`.
 */
export const readSrcIndex = (dir: string): unknown => {
  if (!existsSync(dir)) {
    return undefined;
  }

  const pathToSrcIndex = resolve(dir, 'index.js');
  if (!existsSync(pathToSrcIndex) || statSync(pathToSrcIndex).isDirectory()) {
    return undefined;
  }

  return importDefault(pathToSrcIndex);
};

/**
 * Path-parametric core: load `index.js` from `dir`, validate it against the
 * `{ register, bootstrap, destroy }` contract, and assign it to `strapi.app`.
 * Shared by the legacy wrapper (`strapi.dirs.dist.src`) and the programmatic
 * `fromDisk` resolver.
 *
 * Brand-check before yup (ADR-0001): a `defineApp(...)` default export has
 * extra keys and would be rejected by `.noUnknown()`. Such modules are handled
 * by the programmatic path (`loadApplicationContext` detects the brand), so the
 * legacy validation is short-circuited here.
 */
export const loadSrcIndexFromDir = (strapi: Core.Strapi, dir: string) => {
  const srcIndex = readSrcIndex(dir);

  if (srcIndex === undefined) {
    return existsSync(dir) ? {} : undefined;
  }

  if (isAppDefinition(srcIndex)) {
    // Programmatic app exported from src/index — not a legacy lifecycle module.
    return;
  }

  try {
    validateSrcIndex(srcIndex);
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      strapi.stopWithError({ message: `Invalid file \`./src/index.js\`: ${e.message}` });
    }

    throw e;
  }

  strapi.app = srcIndex;
};

export default (strapi: Core.Strapi) => {
  return loadSrcIndexFromDir(strapi, strapi.dirs.dist.src);
};
