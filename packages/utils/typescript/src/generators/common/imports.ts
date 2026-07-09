import * as ts from 'typescript';

const { factory } = ts;

const imports: string[] = [];

export function getImports(): string[] {
  return imports;
}

export function addImport(type: string): void {
  const hasType = imports.includes(type);

  if (!hasType) {
    imports.push(type);
  }
}

export function generateImportDefinition(): ts.ImportDeclaration[] {
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
