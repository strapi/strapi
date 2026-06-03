import type { PluginOption } from 'vite';

/**
 * Local type stub for `@vitejs/plugin-react-swc`.
 *
 * The published 4.x declarations end with
 * `export { react as default, pluginForCjs as "module.exports" }`, a
 * string-named export that the TypeScript version pinned in this repo cannot
 * parse, which breaks `tsc --emitDeclarationOnly` for `@strapi/strapi`.
 *
 * The plugin's own types are never part of this package's public API surface
 * (it is only consumed for its runtime value inside `src/node/vite/config.ts`),
 * so we redirect type resolution here via the `paths` mapping in
 * `tsconfig.json`. Runtime/module resolution is unaffected and still loads the
 * real package. Remove this stub (and the `paths` entry) once the repo's
 * TypeScript is bumped to a version that parses string-named exports.
 */
interface Options {
  [key: string]: unknown;
}

declare const react: (options?: Options) => PluginOption[];

export default react;
