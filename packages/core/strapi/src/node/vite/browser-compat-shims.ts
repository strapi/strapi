import type { PluginOption } from 'vite';

const OBJECT_INSPECT_SHIM = '\0strapi-object-inspect';
const POSTCSS_BROWSER_FALSE_SHIM = '\0strapi-postcss-browser-false';

const isPostcssBrowserFalseImport = (id: string, importer?: string) => {
  if (!importer || !/(^|[/\\])postcss[/\\]lib[/\\]/.test(importer)) {
    return false;
  }

  return ['path', 'url', 'fs', 'source-map-js', './terminal-highlight'].includes(id);
};

const objectInspectShimPlugin = (): PluginOption => ({
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
  isPostcssBrowserFalseImport,
  objectInspectShimPlugin,
};
