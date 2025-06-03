import type { JSCodeshift, Collection } from 'jscodeshift';

export const replaceJSXElement = (
  root: Collection,
  j: JSCodeshift,
  {
    oldElementName,
    newElementName,
    oldDependency,
  }: {
    oldElementName: string;
    newElementName: string;
    oldDependency: string;
  }
) => {
  // Find the import declaration for the old dependency
  const importDeclaration = root.find(j.ImportDeclaration, {
    source: { value: oldDependency },
  });

  if (importDeclaration.size() === 0) {
    return;
  }

  // Get the local name of the imported element
  const localName = importDeclaration
    .find(j.ImportSpecifier, {
      imported: { name: oldElementName },
    })
    .nodes()[0]?.local?.name;

  if (!localName) {
    return;
  }

  // Replace JSX elements
  root.findJSXElements(localName).forEach((path) => {
    const openingElement = path.node.openingElement;
    const closingElement = path.node.closingElement;

    if (j.JSXIdentifier.check(openingElement.name)) {
      openingElement.name.name = newElementName;
    }

    if (closingElement && j.JSXIdentifier.check(closingElement.name)) {
      closingElement.name.name = newElementName;
    }
  });
};
