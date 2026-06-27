import type { Transform } from 'jscodeshift';

/**
 * Vite 8 replaced the `transformWithEsbuild` helper with `transformWithOxc`.
 *
 * This codemod renames the import (and its references) in a project's
 * `src/admin/vite.config.*`. It only rewrites references when the import is not
 * aliased, so a manual `import { transformWithEsbuild as foo }` is left for the
 * user to review rather than risking an incorrect rename.
 *
 * Note: depending on the use case `transformWithOxc` may behave differently from
 * `transformWithEsbuild`; review the migrated call sites.
 */
const VITE_ADMIN_CONFIG = /[\\/]src[\\/]admin[\\/]vite\.config\.(?:c|m)?[jt]sx?$/;

const OLD_NAME = 'transformWithEsbuild';
const NEW_NAME = 'transformWithOxc';

const transform: Transform = (file, api) => {
  if (!VITE_ADMIN_CONFIG.test(file.path)) {
    return file.source;
  }

  const { j } = api;
  const root = j.withParser('tsx')(file.source);

  let changed = false;

  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === 'vite')
    .forEach((path) => {
      (path.node.specifiers ?? []).forEach((specifier) => {
        if (specifier.type !== 'ImportSpecifier' || specifier.imported.name !== OLD_NAME) {
          return;
        }

        const isAliased = specifier.local != null && specifier.local.name !== OLD_NAME;

        // Update the imported name
        specifier.imported.name = NEW_NAME;
        changed = true;

        // For non-aliased imports the local binding is also `transformWithEsbuild`,
        // so rename the local and every reference to keep call sites valid.
        if (!isAliased) {
          if (specifier.local) {
            specifier.local.name = NEW_NAME;
          }

          root.find(j.Identifier, { name: OLD_NAME }).forEach((idPath) => {
            idPath.node.name = NEW_NAME;
          });
        }
      });
    });

  return changed ? root.toSource() : file.source;
};

export default transform;
