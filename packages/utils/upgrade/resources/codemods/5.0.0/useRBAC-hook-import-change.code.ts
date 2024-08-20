import type { Transform, ImportDeclaration, JSCodeshift, Collection } from 'jscodeshift';

const changeImportSpecifier = (
  root: Collection,
  j: JSCodeshift,
  options: { methodName: string; oldDependency: string; newDependency: string }
): void => {
  const { methodName, oldDependency, newDependency } = options;

  // Flag to check if the method was imported from the old dependency
  let methodImportedFromOldDependency = false;
  let methodAlias: string | undefined;

  // Remove the method from the old dependency and check if it was imported
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === oldDependency)
    .forEach((path) => {
      const importDeclaration: ImportDeclaration = path.node;

      // Check if the method is imported from the old dependency
      const methodExistsInOldDependency = importDeclaration.specifiers?.some(
        (specifier) =>
          specifier.type === 'ImportSpecifier' && specifier.imported.name === methodName
      );

      if (methodExistsInOldDependency) {
        methodImportedFromOldDependency = true;

        // Capture the alias if it exists
        const aliasSpecifier = importDeclaration.specifiers?.find(
          (specifier) =>
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.name === methodName &&
            specifier.local?.name !== methodName
        );
        if (aliasSpecifier && aliasSpecifier.local) {
          methodAlias = aliasSpecifier.local.name;
        }

        const updatedSpecifiers = importDeclaration.specifiers?.filter(
          (specifier) =>
            specifier.type === 'ImportSpecifier' && specifier.imported.name !== methodName
        );

        if (updatedSpecifiers && updatedSpecifiers.length > 0) {
          // Replace the import with the updated specifiers if there are other imports left
          j(path).replaceWith(j.importDeclaration(updatedSpecifiers, j.literal(oldDependency)));
        } else {
          // Remove the entire import statement if the specified method was the only import
          j(path).remove();
        }
      }
    });

  // Add new import dependency if the method was imported from the old dependency
  if (methodImportedFromOldDependency) {
    const dependencies = root
      .find(j.ImportDeclaration)
      .filter((path) => path.node.source.value === newDependency);

    dependencies.forEach((path) => {
      const importDeclaration: ImportDeclaration = path.node;

      const newSpecifier = j.importSpecifier(
        j.identifier(methodName),
        methodAlias ? j.identifier(methodAlias) : null
      );
      const specifiersArray = importDeclaration.specifiers || [];
      j(path).replaceWith(
        j.importDeclaration([...specifiersArray, newSpecifier], j.literal(newDependency))
      );
    });

    // Add the new import declaration if it doesn't already exist
    if (dependencies.length === 0) {
      const newImportDeclaration = j.importDeclaration(
        [
          j.importSpecifier(
            j.identifier(methodName),
            methodAlias ? j.identifier(methodAlias) : null
          ),
        ],
        j.literal(newDependency)
      );
      // Find the index of the first non-import declaration
      const body = root.get().node.program.body;
      const lastImportIndex = body.findIndex((node) => node.type !== 'ImportDeclaration');
      // Check if there are any import declarations
      if (lastImportIndex > -1) {
        // Insert the new import declaration just before the first non-import node
        body.splice(lastImportIndex, 0, newImportDeclaration);
      } else {
        // Check if 'use strict' exists at the beginning
        const hasUseStrict =
          body[0]?.type === 'ExpressionStatement' && body[0]?.expression?.value === 'use strict';
        // Add the new import after 'use strict' if it exists, otherwise at the beginning
        body.splice(hasUseStrict ? 1 : 0, 0, newImportDeclaration);
      }
    }
  }
};

/**
 * change useRBAC import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  changeImportSpecifier(root, j, {
    methodName: 'useRBAC',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  return root.toSource();
};

export default transform;
