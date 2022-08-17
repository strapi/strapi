'use strict';

const ts = require('typescript');

const {
  addImport,
  generateImportDefinition,
  getImports,
} = require('../../../generators/schemas/imports');

describe('Imports', () => {
  test('When first loaded, the list of imports should be empty', () => {
    expect(getImports()).toHaveLength(0);
  });

  test('Can add new imports to the list', () => {
    addImport('foo');
    addImport('bar');

    expect(getImports()).toHaveLength(2);
  });

  test('When adding an already registered import, ignore it', () => {
    addImport('foo');

    expect(getImports()).toHaveLength(2);
  });

  test('Generate an import type definition containing the registered import', () => {
    const def = generateImportDefinition();

    expect(def.kind).toBe(ts.SyntaxKind.ImportDeclaration);

    // Module specifier
    expect(def.moduleSpecifier.kind).toBe(ts.SyntaxKind.StringLiteral);
    expect(def.moduleSpecifier.text).toBe('@strapi/strapi');

    // Import clause (should be named imports)
    expect(def.importClause.kind).toBe(ts.SyntaxKind.ImportClause);

    const { elements } = def.importClause.namedBindings;

    expect(elements).toHaveLength(2);

    // Import clauses
    getImports().forEach((namedImport, index) => {
      const element = elements[index];

      expect(element.kind).toBe(ts.SyntaxKind.ImportSpecifier);
      expect(element.name.kind).toBe(ts.SyntaxKind.Identifier);
      expect(element.name.escapedText).toBe(namedImport);
    });
  });
});
