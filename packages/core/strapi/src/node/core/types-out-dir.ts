import type { Core } from '@strapi/types';

/**
 * Read the directory, relative to the app root, in which `strapi develop` should generate types.
 * Mirrors the `--out-dir` option of `strapi ts:generate-types`.
 *
 * Returns `undefined` when `typescript.outDir` is unset so the generator falls back to its default (`types`).
 *
 * @internal
 */
const getTypesOutDir = (strapi: Pick<Core.Strapi, 'config'>): string | undefined => {
  const outDir: unknown = strapi.config.get('typescript.outDir');

  if (outDir === undefined || outDir === null || outDir === '') {
    return undefined;
  }

  if (typeof outDir !== 'string') {
    throw new TypeError(
      `Invalid "typescript.outDir" config: expected a string, received ${typeof outDir}`
    );
  }

  return outDir;
};

export { getTypesOutDir };
