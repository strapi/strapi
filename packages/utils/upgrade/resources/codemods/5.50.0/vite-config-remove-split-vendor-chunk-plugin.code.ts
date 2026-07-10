import type { Transform } from 'jscodeshift';

/**
 * Vite 8 removed the `splitVendorChunkPlugin` export. Any project whose
 * `src/admin/vite.config.*` imports and uses it will fail to load.
 *
 * This codemod removes the `splitVendorChunkPlugin` specifier from `vite`
 * imports and deletes any `splitVendorChunkPlugin()` call used as an element of
 * an array literal (e.g. the `plugins: [...]` array).
 */
const VITE_ADMIN_CONFIG = /[\\/]src[\\/]admin[\\/]vite\.config\.[cm]?[jt]sx?$/;

const PLUGIN_NAME = 'splitVendorChunkPlugin';

const transform: Transform = (file, api) => {
  // Only touch a Strapi admin Vite config
  if (!VITE_ADMIN_CONFIG.test(file.path)) {
    return file.source;
  }

  const { j } = api;
  const root = j.withParser('tsx')(file.source);

  let changed = false;

  // 1. Remove the `splitVendorChunkPlugin` specifier from any `vite` import
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === 'vite')
    .forEach((path) => {
      const specifiers = path.node.specifiers ?? [];

      const remaining = specifiers.filter(
        (specifier) =>
          !(specifier.type === 'ImportSpecifier' && specifier.imported.name === PLUGIN_NAME)
      );

      if (remaining.length === specifiers.length) {
        return;
      }

      changed = true;

      if (remaining.length === 0) {
        // The plugin was the only import, drop the whole declaration
        j(path).remove();
      } else {
        path.node.specifiers = remaining;
      }
    });

  // 2. Remove `splitVendorChunkPlugin()` calls used as array elements
  root.find(j.ArrayExpression).forEach((path) => {
    const elements = path.node.elements ?? [];

    const filtered = elements.filter(
      (element) =>
        !(
          element?.type === 'CallExpression' &&
          element.callee.type === 'Identifier' &&
          element.callee.name === PLUGIN_NAME
        )
    );

    if (filtered.length !== elements.length) {
      changed = true;
      path.node.elements = filtered;
    }
  });

  return changed ? root.toSource() : file.source;
};

export default transform;
