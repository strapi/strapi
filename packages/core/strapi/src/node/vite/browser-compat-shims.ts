import type { PluginOption } from 'vite';

const OBJECT_INSPECT_SHIM = '\0strapi-object-inspect';
const POSTCSS_BROWSER_FALSE_SHIM = '\0strapi-postcss-browser-false';

/**
 * Vite 8 tightened `browser` / `module` field heuristics. Packages that relied on
 * postcss's `browser: false` mappings (Node built-ins under postcss/lib) no longer
 * get automatic stubs — we shim those imports here. `object-inspect` is replaced
 * with a minimal stringifier so admin chunks that pull it transitively still bundle.
 *
 * Other plugin deps with the same `browser`-field pattern are not covered yet; add
 * entries here or prefer a general resolve.conditions fix if more cases appear.
 */
const isPostcssBrowserFalseImport = (id: string, importer?: string) => {
  if (!importer || !/(^|[/\\])postcss[/\\]lib[/\\]/.test(importer)) {
    return false;
  }

  return ['path', 'url', 'fs', 'source-map-js', './terminal-highlight'].includes(id);
};

const browserCompatShimsPlugin = (): PluginOption => ({
  name: 'strapi:browser-compat-shims',
  enforce: 'pre',
  resolveId(id, importer) {
    if (id === 'object-inspect') {
      return OBJECT_INSPECT_SHIM;
    }

    if (isPostcssBrowserFalseImport(id, importer)) {
      return POSTCSS_BROWSER_FALSE_SHIM;
    }

    return null;
  },
  load(id) {
    if (id === OBJECT_INSPECT_SHIM) {
      return 'export default function inspect(value) { return String(value); }';
    }

    if (id === POSTCSS_BROWSER_FALSE_SHIM) {
      return [
        'const shim = {};',
        'export default shim;',
        'export const existsSync = undefined;',
        'export const readFileSync = undefined;',
        'export const dirname = undefined;',
        'export const join = undefined;',
        'export const isAbsolute = undefined;',
        'export const resolve = undefined;',
        'export const fileURLToPath = undefined;',
        'export const pathToFileURL = undefined;',
        'export const SourceMapConsumer = undefined;',
        'export const SourceMapGenerator = undefined;',
      ].join('\n');
    }

    return null;
  },
});

export {
  OBJECT_INSPECT_SHIM,
  POSTCSS_BROWSER_FALSE_SHIM,
  browserCompatShimsPlugin,
  isPostcssBrowserFalseImport,
};
