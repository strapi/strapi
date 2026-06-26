'use strict';

const { factory } = require('typescript');

const imports = [];

module.exports = {
  getImports() {
    return imports;
  },

  addImport(type) {
    const hasType = imports.includes(type);

    if (!hasType) {
      imports.push(type);
    }
  },

  generateImportDefinition() {
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
  },
};
