'use strict';

const { factory } = require('typescript');

const imports = [];

function getImports() {
  return imports;
}

function addImport(type) {
  const hasType = imports.includes(type);

  if (!hasType) {
    imports.push(type);
  }
}

function generateImportDefinition() {
  const formattedImports = imports
    .sort()
    .map((key) => factory.createImportSpecifier(false, undefined, factory.createIdentifier(key)));

  return [
    factory.createImportDeclaration(
      undefined,
      factory.createImportClause(true, undefined, factory.createNamedImports(formattedImports)),
      factory.createStringLiteral('@strapi/strapi'),
      undefined
    ),
  ];
}

module.exports = { getImports, addImport, generateImportDefinition };
