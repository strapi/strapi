import {
  OBJECT_INSPECT_SHIM,
  POSTCSS_BROWSER_FALSE_SHIM,
  isPostcssBrowserFalseImport,
  objectInspectShimPlugin,
} from './browser-compat-shims';

describe('browser-compat shims (Vite admin)', () => {
  const plugin = objectInspectShimPlugin() as {
    resolveId: (id: string, importer?: string) => string | null;
    load: (id: string) => string | null;
  };

  describe('isPostcssBrowserFalseImport', () => {
    it('matches postcss/lib imports that rely on Node built-ins', () => {
      expect(isPostcssBrowserFalseImport('fs', '/project/node_modules/postcss/lib/input.js')).toBe(
        true
      );
      expect(
        isPostcssBrowserFalseImport('path', '/project/node_modules/postcss/lib/parser.js')
      ).toBe(true);
    });

    it('ignores the same ids outside postcss/lib', () => {
      expect(isPostcssBrowserFalseImport('fs', '/project/src/app.ts')).toBe(false);
    });
  });

  describe('objectInspectShimPlugin', () => {
    it('redirects object-inspect to the shim virtual module', () => {
      expect(plugin.resolveId('object-inspect')).toBe(OBJECT_INSPECT_SHIM);
    });

    it('redirects postcss browser-only imports to the shim virtual module', () => {
      expect(plugin.resolveId('fs', '/project/node_modules/postcss/lib/input.js')).toBe(
        POSTCSS_BROWSER_FALSE_SHIM
      );
    });

    it('returns null for unrelated imports', () => {
      expect(plugin.resolveId('fs', '/project/src/app.ts')).toBeNull();
      expect(plugin.resolveId('lodash')).toBeNull();
    });

    it('loads the object-inspect shim as a stringifying function', () => {
      expect(plugin.load(OBJECT_INSPECT_SHIM)).toContain('String(value)');
    });

    it('loads the postcss browser shim with stub exports', () => {
      const code = plugin.load(POSTCSS_BROWSER_FALSE_SHIM);

      expect(code).toContain('existsSync');
      expect(code).toContain('readFileSync');
      expect(code).toContain('export default shim');
    });
  });
});
