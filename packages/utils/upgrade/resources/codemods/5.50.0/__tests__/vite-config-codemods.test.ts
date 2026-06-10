import jscodeshift from 'jscodeshift';
import type { Transform } from 'jscodeshift';

import removeSplitVendorChunkPlugin from '../vite-config-remove-split-vendor-chunk-plugin.code';
import renameDeprecatedOptions from '../vite-config-rename-deprecated-options.code';
import transformWithEsbuildToOxc from '../vite-config-transform-with-esbuild-to-oxc.code';

const ADMIN_CONFIG_PATH = '/project/src/admin/vite.config.ts';

const applyTransform = (
  transform: Transform,
  source: string,
  path: string = ADMIN_CONFIG_PATH
): string => {
  const j = jscodeshift.withParser('tsx');
  const api = {
    j,
    jscodeshift: j,
    stats() {},
    report() {},
  };

  const result = transform({ path, source }, api, {});

  return typeof result === 'string' ? result : source;
};

describe('vite 8 config codemods', () => {
  describe('remove splitVendorChunkPlugin', () => {
    test('removes the import specifier and its usage from the plugins array', () => {
      const source = `
        import { mergeConfig, splitVendorChunkPlugin } from 'vite';
        import react from '@vitejs/plugin-react-swc';

        export default (config) =>
          mergeConfig(config, {
            plugins: [react(), splitVendorChunkPlugin()],
          });
      `;

      const output = applyTransform(removeSplitVendorChunkPlugin, source);

      expect(output).not.toContain('splitVendorChunkPlugin');
      expect(output).toContain('mergeConfig');
      expect(output).toContain('react()');
    });

    test('removes the whole import when splitVendorChunkPlugin is the only specifier', () => {
      const source = `
        import { splitVendorChunkPlugin } from 'vite';

        export default (config) => ({ ...config, plugins: [splitVendorChunkPlugin()] });
      `;

      const output = applyTransform(removeSplitVendorChunkPlugin, source);

      expect(output).not.toContain('splitVendorChunkPlugin');
      expect(output).not.toContain("from 'vite'");
    });

    test('does not touch files outside src/admin/vite.config', () => {
      const source = `import { splitVendorChunkPlugin } from 'vite';`;

      const output = applyTransform(removeSplitVendorChunkPlugin, source, '/project/src/other.ts');

      expect(output).toBe(source);
    });
  });

  describe('rename deprecated options', () => {
    test('renames build.rollupOptions, optimizeDeps.esbuildOptions and top-level esbuild', () => {
      const source = `
        export default (config) => ({
          ...config,
          build: { rollupOptions: { input: 'x' } },
          optimizeDeps: { esbuildOptions: { target: 'es2020' } },
          esbuild: { jsx: 'automatic' },
        });
      `;

      const output = applyTransform(renameDeprecatedOptions, source);

      expect(output).toContain('rolldownOptions');
      expect(output).not.toContain('rollupOptions');
      expect(output).not.toContain('esbuildOptions');
      expect(output).toContain('oxc');
      expect(output).not.toMatch(/\besbuild\b/);
    });

    test('does not rename an unrelated esbuild key on a non-config object', () => {
      const source = `
        export default (config) => ({
          ...config,
          define: { esbuild: 'not-a-vite-option' },
        });
      `;

      const output = applyTransform(renameDeprecatedOptions, source);

      // `esbuild` here is nested inside `define` (an object with no Vite marker
      // keys of its own), so it must not be renamed to `oxc`.
      expect(output).toContain("esbuild: 'not-a-vite-option'");
    });
  });

  describe('transformWithEsbuild -> transformWithOxc', () => {
    test('renames the import and its references when not aliased', () => {
      const source = `
        import { transformWithEsbuild } from 'vite';

        export default async (config) => {
          await transformWithEsbuild('code', 'id');
          return config;
        };
      `;

      const output = applyTransform(transformWithEsbuildToOxc, source);

      expect(output).toContain('transformWithOxc');
      expect(output).not.toContain('transformWithEsbuild');
    });

    test('only renames the imported name for aliased imports', () => {
      const source = `
        import { transformWithEsbuild as tfe } from 'vite';

        export default async (config) => {
          await tfe('code', 'id');
          return config;
        };
      `;

      const output = applyTransform(transformWithEsbuildToOxc, source);

      expect(output).toContain('transformWithOxc as tfe');
      expect(output).toContain('tfe(');
      expect(output).not.toContain('transformWithEsbuild');
    });
  });
});
