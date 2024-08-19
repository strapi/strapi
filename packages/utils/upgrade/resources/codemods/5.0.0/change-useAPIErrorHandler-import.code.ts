import type { Transform, ImportDeclaration, JSCodeshift, Collection } from 'jscodeshift';

const changeImportSpecifier = (
  root: Collection,
  j: JSCodeshift,
  options: { methodName: string; oldDependency: string; newDependency: string }
): void => {
  const { methodName, oldDependency, newDependency } = options;

  // Flag to check if the method was imported from the old dependency
  let methodImportedFromOldDependency = false;

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

      const newSpecifier = j.importSpecifier(j.identifier(methodName));
      importDeclaration.specifiers?.push(newSpecifier);
    });
    // Add the new import declaration if it doesn't already exist
    if (dependencies.length === 0) {
      const newImportDeclaration = j.importDeclaration(
        [j.importSpecifier(j.identifier(methodName))],
        j.literal(newDependency)
      );
      root.get().node.program.body.unshift(newImportDeclaration);
    }
  }
};

/**
 * change useAPIErrorHandler import from '@strapi/helper-plugin' to '@strapi/strapi/admin'
 */
const transform: Transform = (file, api) => {
  const { j } = api;

  const root = j.withParser('tsx')(file.source);

  changeImportSpecifier(root, j, {
    methodName: 'useAPIErrorHandler',
    oldDependency: '@strapi/helper-plugin',
    newDependency: '@strapi/strapi/admin',
  });

  return root.toSource();
};

export default transform;
