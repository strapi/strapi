import path from 'node:path';
import fs, { type Dirent } from 'node:fs';
import * as ts from 'typescript';
import { kebabCase } from 'lodash';

import { emitDefinitions, format, pathExists } from '../utils';
import type { Logger } from '../utils';
import { compareCodeUnits } from './compare';

/**
 * Shared by the generators of application modules (services, controllers, policies, middlewares):
 * they find the source files the loaders of @strapi/core register, derive the same uids, and write
 * one global registry each. Each generator keeps what it reads from a module type and which registry
 * it writes.
 */

const { factory } = ts;

const GLOBAL_NAMESPACE = 'Strapi';
const REGISTRIES_NAMESPACE = 'Registries';

// Ordered by precedence when several files resolve to the same uid
const SOURCE_EXTENSIONS = ['.ts', '.js'];

export type AppModuleSource = {
  uid: string;
  file: string;
  // Relative import of the source file from the generated directory (see `toImportSpecifier`)
  specifier: string;
};

/**
 * Directory of each module kind in an API (src/api/<api>/<kind>), and in src/ for the kinds the
 * loaders also register globally (policies, middlewares)
 */
export type AppModuleKind = 'services' | 'controllers' | 'policies' | 'middlewares';

/**
 * Mirror of the API loader's name normalization (@strapi/core, loaders/apis.ts): names already in
 * kebab-case are kept as is, anything else is kebab-cased. Both must agree for the generated uids
 * to match the ones registered at runtime. Global policies and middlewares (loaders/policies.ts,
 * loaders/middlewares.ts) are not normalized.
 */
const isKebabCase = (value: string) => /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const normalizeName = (name: string) => (isKebabCase(name) ? name : kebabCase(name));

const isSourceFile = (fd: Dirent) =>
  fd.isFile() && !fd.name.endsWith('.d.ts') && SOURCE_EXTENSIONS.includes(path.extname(fd.name));

const byExtensionPrecedence = (a: Dirent, b: Dirent) =>
  SOURCE_EXTENSIONS.indexOf(path.extname(a.name)) - SOURCE_EXTENSIONS.indexOf(path.extname(b.name));

/**
 * Extension of the JavaScript file each source extension compiles to. A relative import names the
 * compiled file: ECMAScript modules resolved with Node16 or NodeNext require the extension (TS2835),
 * and every other module resolution maps it back to the source.
 */
const OUTPUT_EXTENSIONS: Record<string, string> = {
  '.ts': '.js',
  '.js': '.js',
  '.mts': '.mjs',
  '.cts': '.cjs',
};

/**
 * Path of a source file relative to the generated directory, as a relative import names it: with
 * POSIX separators, a leading `./` or `../`, and the extension of the compiled file
 */
export const toImportSpecifier = (from: string, file: string) => {
  const extension = path.extname(file);
  const outputExtension = OUTPUT_EXTENSIONS[extension];

  if (outputExtension === undefined) {
    throw new Error(`Cannot import ${file}: unsupported source extension`);
  }

  const relative = path.relative(from, file.slice(0, -extension.length) + outputExtension);
  const specifier = relative.split(path.sep).join('/');

  return specifier.startsWith('.') ? specifier : `./${specifier}`;
};

/**
 * Add the source files of a directory to `sources`, under the uid returned by `toUID`
 */
const collectDirectorySources = async (
  dir: string,
  toUID: (basename: string) => string,
  sources: Map<string, AppModuleSource>,
  outDir: string,
  logger: Logger
) => {
  if ((await pathExists(dir)) === false) {
    return;
  }

  const sourceFDs = (await fs.promises.readdir(dir, { withFileTypes: true }))
    .filter(isSourceFile)
    .sort(byExtensionPrecedence);

  for (const sourceFD of sourceFDs) {
    const basename = path.basename(sourceFD.name, path.extname(sourceFD.name));
    const uid = toUID(basename);
    const file = path.join(dir, sourceFD.name);

    if (sources.has(uid)) {
      logger.warn(`Several source files resolve to ${uid}, ignoring ${file}`);
      continue;
    }

    sources.set(uid, {
      uid,
      file,
      specifier: toImportSpecifier(outDir, file),
    });
  }
};

/**
 * Collect the global source files of a kind when `dirs.global` is given (src/<kind>/<name>.{ts,js}
 * → global::<name>), then the ones of every API (src/api/<api>/<kind>/<name>.{ts,js} →
 * api::<api>.<name>). The first file to resolve to a uid wins.
 */
export const collectAppSources = async (
  kind: AppModuleKind,
  dirs: { global?: string; api: string },
  outDir: string,
  logger: Logger
): Promise<AppModuleSource[]> => {
  const sources = new Map<string, AppModuleSource>();

  if (dirs.global !== undefined) {
    await collectDirectorySources(
      dirs.global,
      (basename) => `global::${basename}`,
      sources,
      outDir,
      logger
    );
  }

  if ((await pathExists(dirs.api)) === true) {
    const apiFDs = (await fs.promises.readdir(dirs.api, { withFileTypes: true })).filter(
      (fd) => fd.isDirectory() && !fd.name.startsWith('.')
    );

    for (const apiFD of apiFDs) {
      const apiName = normalizeName(apiFD.name);

      await collectDirectorySources(
        path.join(dirs.api, apiFD.name, kind),
        (basename) => `api::${apiName}.${normalizeName(basename)}`,
        sources,
        outDir,
        logger
      );
    }
  }

  return Array.from(sources.values());
};

/**
 * Keep the sources whose uid the running app registered, sorted by uid
 */
export const filterRegisteredSources = (
  sources: AppModuleSource[],
  registered: Record<string, unknown>,
  logger: Logger
) => {
  const registeredUIDs = new Set(Object.keys(registered));

  return sources
    .filter((source) => {
      if (!registeredUIDs.has(source.uid)) {
        logger.debug(`${source.uid} is not registered, ignoring ${source.file}`);
        return false;
      }

      return true;
    })
    .sort((a, b) => compareCodeUnits(a.uid, b.uid));
};

/**
 * Whether a source is a TypeScript file, which its import resolves to. The import of a JS source
 * resolves to the file `typesFileOf` finds, if any.
 */
export const isTypedSource = (source: AppModuleSource) => path.extname(source.file) === '.ts';

/**
 * The file TypeScript reads for the import of a source, or `undefined` when there is none:
 * - a TypeScript source itself;
 * - for a JS source, a sibling `<name>.d.ts`, which the import resolves to first, with or without
 *   `allowJs`;
 * - else the JS source itself when the application's tsconfig enables `allowJs`: TypeScript infers
 *   the type of its module, JSDoc included.
 *
 * Without either, the import of a JS source does not resolve: an error type, which no conditional
 * type maps to `unknown`. In a TypeScript application, a JS source only reaches the compiled
 * application, and so the registries, with `allowJs`; a JavaScript application loads it from `src`
 * and has no tsconfig.
 */
const typesFileOf = async (source: AppModuleSource, allowJs: boolean) => {
  if (isTypedSource(source) === true) {
    return source.file;
  }

  const declarationFile = `${source.file.slice(0, -path.extname(source.file).length)}.d.ts`;

  if ((await pathExists(declarationFile)) === true) {
    return declarationFile;
  }

  return allowJs === true ? source.file : undefined;
};

const hasModifier = (statement: ts.Statement, kind: ts.ModifierSyntaxKind) =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === kind);

/**
 * Whether a top-level statement is `export type <name>` or `export interface <name>`
 */
const isExportedTypeDeclarationNamed = (
  statement: ts.Statement,
  name: string
): statement is ts.TypeAliasDeclaration | ts.InterfaceDeclaration =>
  (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
  statement.name.text === name &&
  hasModifier(statement, ts.SyntaxKind.ExportKeyword) === true &&
  hasModifier(statement, ts.SyntaxKind.DefaultKeyword) === false;

/**
 * Whether a type declaration can be referenced without type arguments, as the generated file does
 */
const hasDefaultTypeArguments = (
  statement: ts.TypeAliasDeclaration | ts.InterfaceDeclaration | ts.ClassDeclaration
) => (statement.typeParameters ?? []).every((parameter) => parameter.default !== undefined);

/**
 * How a module exports a type under a name, from the statement that exports it:
 * - `type`: the generated file can reference it;
 * - `generic`: a generic with a type parameter that has no default, which the generated file
 *   cannot reference without type arguments (TS2314);
 * - `value`: a variable or a function, which the generated file cannot reference as a type (TS2694).
 */
type TypeExport = 'type' | 'generic' | 'value';

/**
 * Whether a binding name, destructured or not, binds `name`
 */
const bindsName = (binding: ts.BindingName, name: string): boolean =>
  ts.isIdentifier(binding)
    ? binding.text === name
    : binding.elements.some(
        (element) => ts.isBindingElement(element) && bindsName(element.name, name) === true
      );

/**
 * Whether a top-level statement declares a value named `name`: a variable or a function
 */
const declaresValueNamed = (statement: ts.Statement, name: string) =>
  (ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(
      (declaration) => bindsName(declaration.name, name) === true
    )) ||
  (ts.isFunctionDeclaration(statement) && statement.name?.text === name);

/**
 * How a module exports the top-level declaration named `name` that an export specifier without
 * `from` names (`export { <name> }`, `export { type <name> as X }`):
 * - a type alias or an interface follows the rule of an exported declaration;
 * - a class or an enum is a type as well as a value, and a generic class follows the same rule;
 * - a variable or a function only is a value;
 * - anything else, such as an imported binding, is not followed and counts as a type.
 */
const localTypeExportOf = (statements: ts.NodeArray<ts.Statement>, name: string): TypeExport => {
  const types = statements.filter(
    (
      statement
    ): statement is ts.TypeAliasDeclaration | ts.InterfaceDeclaration | ts.ClassDeclaration =>
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name?.text === name
  );

  if (types.length > 0) {
    return types.every(hasDefaultTypeArguments) === true ? 'type' : 'generic';
  }

  if (
    statements.some(
      (statement) => ts.isEnumDeclaration(statement) && statement.name.text === name
    ) === true
  ) {
    return 'type';
  }

  if (statements.some((statement) => declaresValueNamed(statement, name)) === true) {
    return 'value';
  }

  return 'type';
};

/**
 * How a top-level statement exports a type under `name` (see `TypeExport`), or `undefined` when it
 * does not: `export type <name>`, `export interface <name>`, or an export specifier named `<name>`
 * (`export { <name> }`, `export { type X as <name> }`, `export type { X as <name> } from './x'`).
 *
 * A generic declaration only counts when each of its type parameters has a default: the generated
 * file references it without type arguments. A specifier without `from` is checked against the
 * top-level declaration it names (see `localTypeExportOf`). A re-export from another module is not
 * followed: when it names a value, or a generic without defaults, its reference in the generated
 * file does not resolve, and `tsc` reports it there.
 */
const typeExportOf = (
  statement: ts.Statement,
  name: string,
  statements: ts.NodeArray<ts.Statement>
): TypeExport | undefined => {
  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
    if (isExportedTypeDeclarationNamed(statement, name) === false) {
      return undefined;
    }

    return hasDefaultTypeArguments(statement) === true ? 'type' : 'generic';
  }

  if (
    ts.isExportDeclaration(statement) &&
    statement.exportClause !== undefined &&
    ts.isNamedExports(statement.exportClause)
  ) {
    const element = statement.exportClause.elements.find(
      (specifier) => specifier.name.text === name
    );

    if (element === undefined) {
      return undefined;
    }

    if (statement.moduleSpecifier !== undefined) {
      return 'type';
    }

    return localTypeExportOf(statements, (element.propertyName ?? element.name).text);
  }

  return undefined;
};

/**
 * How a source module exposes the value the loaders register, which `importDefault`
 * (@strapi/utils) reads from the compiled module:
 * - `default`: an ECMAScript module with a default export, which is registered;
 * - `export-equals`: a TypeScript `export =`, whose assigned value is registered;
 * - `commonjs`: a file without ECMAScript module syntax, or one that assigns `module.exports`,
 *   whose `module.exports` is registered;
 * - `no-default`: an ECMAScript module without a default export (named or type exports only,
 *   `export *`, which never re-exports `default`), which registers `undefined`.
 */
export type ModuleShape = 'default' | 'export-equals' | 'commonjs' | 'no-default';

/**
 * A source with its top-level statements and module shape (see `scanSources`)
 */
export type ScannedAppModuleSource = AppModuleSource & {
  // Undefined when the source is not read: a JS source without a types file, or a file that cannot
  // be read
  module?: {
    // The file TypeScript reads for the source's import (see `typesFileOf`)
    file: string;
    shape: ModuleShape;
    statements: ts.NodeArray<ts.Statement>;
    // Whether TypeScript types the `module.exports` of a `commonjs` module (see
    // `typesCommonJsExports`)
    typedExports: boolean;
  };
};

/**
 * Whether an expression is `module.exports`
 */
const isModuleExports = (expression: ts.Expression) =>
  ts.isPropertyAccessExpression(expression) &&
  ts.isIdentifier(expression.expression) &&
  expression.expression.text === 'module' &&
  expression.name.text === 'exports';

/**
 * The target of a top-level assignment statement `<target> = <value>`, if the statement is one
 */
const assignmentTargetOf = (statement: ts.Statement) =>
  ts.isExpressionStatement(statement) &&
  ts.isBinaryExpression(statement.expression) &&
  statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ? statement.expression.left
    : undefined;

/**
 * Whether a top-level statement is `module.exports = <value>`
 */
const isModuleExportsAssignment = (statement: ts.Statement) => {
  const target = assignmentTargetOf(statement);

  return target !== undefined && isModuleExports(target) === true;
};

/**
 * Whether a top-level statement assigns CommonJS exports: `module.exports = <value>`,
 * `module.exports.<name> = <value>` or `exports.<name> = <value>`
 */
const isCommonJsExportAssignment = (statement: ts.Statement) => {
  const target = assignmentTargetOf(statement);

  if (target === undefined) {
    return false;
  }

  if (isModuleExports(target) === true) {
    return true;
  }

  return (
    ts.isPropertyAccessExpression(target) &&
    (isModuleExports(target.expression) === true ||
      (ts.isIdentifier(target.expression) && target.expression.text === 'exports'))
  );
};

/**
 * Whether TypeScript types the `module.exports` of a parsed `commonjs` module, which the loaders
 * register: only in a JS file without ECMAScript module syntax, which TypeScript reads as a
 * CommonJS module once it assigns exports. TypeScript does not type `module.exports` in a TypeScript
 * file, ignores it next to ECMAScript module syntax, and the import of a JS file without exports
 * fails with TS2306.
 *
 * Only top-level assignments are read: a file that assigns its exports in a nested block registers
 * `unknown`.
 */
const typesCommonJsExports = (sourceFile: ts.SourceFile) =>
  path.extname(sourceFile.fileName) === '.js' &&
  ts.isExternalModule(sourceFile) === false &&
  sourceFile.statements.some(isCommonJsExportAssignment) === true;

/**
 * Whether a top-level statement exports a runtime value as `default`: `export default <expression>`,
 * `export default function`, `export default class`, or an export specifier named `default`
 * (`export { x as default }`, `export { default } from './x'`, `export * as default from './x'`).
 * A type-only export (`export default interface`, `export { type X as default }`) has no runtime
 * value.
 */
const exportsDefaultValue = (statement: ts.Statement) => {
  if (ts.isExportAssignment(statement)) {
    return statement.isExportEquals !== true;
  }

  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return (
      hasModifier(statement, ts.SyntaxKind.ExportKeyword) === true &&
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword) === true
    );
  }

  if (
    ts.isExportDeclaration(statement) &&
    statement.isTypeOnly === false &&
    statement.exportClause !== undefined
  ) {
    if (ts.isNamespaceExport(statement.exportClause)) {
      return statement.exportClause.name.text === 'default';
    }

    return statement.exportClause.elements.some(
      (element) => element.isTypeOnly === false && element.name.text === 'default'
    );
  }

  return false;
};

/**
 * The shape of a parsed module (see `ModuleShape`), from its top-level statements only.
 *
 * A file that assigns `module.exports` is `commonjs` even with ECMAScript module syntax: the
 * assignment replaces the exports object of the compiled module, `__esModule` marker included.
 */
const moduleShapeOf = (sourceFile: ts.SourceFile): ModuleShape => {
  const { statements } = sourceFile;

  if (
    ts.isExternalModule(sourceFile) === false ||
    statements.some(isModuleExportsAssignment) === true
  ) {
    return 'commonjs';
  }

  if (
    statements.some(
      (statement) => ts.isExportAssignment(statement) && statement.isExportEquals === true
    ) === true
  ) {
    return 'export-equals';
  }

  return statements.some(exportsDefaultValue) === true ? 'default' : 'no-default';
};

export type ScanOptions = {
  // Whether the application's tsconfig enables `allowJs` (see `typesFileOf`)
  allowJs?: boolean;
};

/**
 * Parse the file TypeScript reads for each source's import once (see `typesFileOf`), on its own, to
 * read its module shape (see `moduleTypeOf`) and its type exports (see `findTypeExports`) from its
 * top-level statements. A JS source is read from its sibling `<name>.d.ts`, or from the JS file
 * itself with `allowJs`.
 *
 * No program is built: type generation runs on every `strapi develop` start, before the
 * compilation, and a program would need the application's tsconfig and its whole dependency graph.
 *
 * A JS source without a types file is not read: its import does not resolve. A source that cannot
 * be read is kept unread with a warning: a TypeScript source registers the type its import
 * provides, without a contract, rather than stopping the generation; a JS source registers
 * `unknown`.
 */
export const scanSources = async (
  sources: AppModuleSource[],
  logger: Logger,
  { allowJs = false }: ScanOptions = {}
): Promise<ScannedAppModuleSource[]> =>
  Promise.all(
    sources.map(async (source): Promise<ScannedAppModuleSource> => {
      const file = await typesFileOf(source, allowJs);

      if (file === undefined) {
        logger.debug(
          `${source.uid}: ${source.file} has no sibling declaration file and \`allowJs\` is off, its import does not resolve`
        );
        return source;
      }

      let content: string;

      try {
        content = await fs.promises.readFile(file, 'utf8');
      } catch (error) {
        logger.warn(
          `Could not read ${file} to find its module shape and type exports, registering ${source.uid} ${
            isTypedSource(source) === true ? 'from its import' : 'as unknown'
          }: ${error instanceof Error ? error.message : String(error)}`
        );
        return source;
      }

      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        false,
        path.extname(file) === '.js' ? ts.ScriptKind.JS : ts.ScriptKind.TS
      );

      return {
        ...source,
        module: {
          file,
          shape: moduleShapeOf(sourceFile),
          statements: sourceFile.statements,
          typedExports: typesCommonJsExports(sourceFile),
        },
      };
    })
  );

/**
 * The uids of the scanned sources whose module exports a type named `name`, such as a service's
 * `ServiceContract` (see `scanSources`).
 *
 * Only top-level declarations and export specifiers are read (see `typeExportOf`). `export *` is
 * not followed, which keeps the type the source registers without a contract.
 */
export const findTypeExports = (
  sources: ScannedAppModuleSource[],
  name: string,
  logger: Logger
): Set<string> => {
  const uids = new Set<string>();

  for (const source of sources) {
    if (source.module === undefined) {
      continue;
    }

    const { statements } = source.module;
    const typeExports = new Set(
      statements.map((statement) => typeExportOf(statement, name, statements))
    );

    if (typeExports.has('type') === true) {
      uids.add(source.uid);
      continue;
    }

    if (typeExports.has('generic') === true) {
      logger.warn(
        `${source.file} exports ${name} with type parameters that have no default, typing ${source.uid} without it`
      );
    }

    if (typeExports.has('value') === true) {
      logger.warn(
        `${source.file} exports ${name} as a value rather than a type, typing ${source.uid} without it`
      );
    }

    if (
      statements.some(
        (statement) => ts.isExportDeclaration(statement) && statement.exportClause === undefined
      ) === true
    ) {
      logger.debug(`${source.uid}: \`export *\` is not followed to find a ${name} export`);
    }
  }

  return uids;
};

/**
 * A type export that replaces the inferred type of the sources that have it, such as a service's
 * `ServiceContract`.
 */
export type AppModuleContract = {
  // Name of the type export
  exportName: string;
  // Name of the generated helper that reads it (see `generateContractHelperDefinition`)
  helper: string;
  // Uids of the sources whose module exports it (see `findTypeExports`)
  uids: Set<string>;
};

/**
 * Whether the generated file can import a source to read the type of its module (see
 * `moduleTypeOf`): a source with a types file (see `typesFileOf`), unless it is a `commonjs` module
 * whose exports TypeScript does not type (see `typesCommonJsExports`), and a TypeScript source that
 * could not be read.
 */
export const hasModuleType = (source: ScannedAppModuleSource) => {
  if (source.module === undefined) {
    return isTypedSource(source);
  }

  return source.module.shape !== 'commonjs' || source.module.typedExports === true;
};

/**
 * The type of a source's module as `importDefault` returns it, which the generated helpers read
 * through its `default` member, or `undefined` when the generated file cannot import it:
 * - `typeof import('<source>')` for an ECMAScript module, and for a TypeScript source that could not
 *   be read;
 * - `{ default: typeof import('<source>') }` for `export =`, and for a JS CommonJS module: the type
 *   of such a module is its assigned value, or its exports object, which `importDefault` wraps;
 * - `undefined` for a JS source without a types file, whose import is an error type (see
 *   `typesFileOf`), and for a CommonJS-style TypeScript source: TypeScript does not type
 *   `module.exports` in a `.ts` file, and importing a file without ECMAScript module syntax fails
 *   with TS2306 in the generated file, which stops the `strapi develop` compilation.
 *
 * The generators register a source without a module type as `unknown`.
 */
export const moduleTypeOf = (source: ScannedAppModuleSource): ts.TypeNode | undefined => {
  if (hasModuleType(source) === false) {
    return undefined;
  }

  if (source.module?.shape === 'export-equals' || source.module?.shape === 'commonjs') {
    return factory.createTypeLiteralNode([
      factory.createPropertySignature(undefined, 'default', undefined, typeofImport(source)),
    ]);
  }

  return typeofImport(source);
};

/**
 * The type a service or controller source registers:
 * - `<contract helper><import('<source>').<contract export>>` when the module exports the contract;
 * - `<helper><module type>` otherwise (see `moduleTypeOf`), which infers it from the default export;
 * - `unknown` for a source without a module type: a JS source without a types file, or a
 *   CommonJS-style TypeScript source.
 *
 * The contract does not depend on the default export, so the factory can be checked against its own
 * uid (`Core.ServiceFactory<uid>`). The inferred type does: the generators list those uids in a
 * marker registry (see `isInferredSource`), which the factory types reject.
 */
export const instanceTypeOf =
  (helper: string, logger: Logger, contract?: AppModuleContract) =>
  (source: ScannedAppModuleSource): ts.TypeNode => {
    const moduleType = moduleTypeOf(source);

    if (moduleType === undefined) {
      logger.debug(`${source.uid} has no module type to import, registering it as unknown`);
      return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    }

    if (contract?.uids.has(source.uid) === true) {
      logger.debug(`${source.uid} exports ${contract.exportName}, registering it`);
      return factory.createTypeReferenceNode(contract.helper, [
        importedType(source, contract.exportName),
      ]);
    }

    return factory.createTypeReferenceNode(helper, [moduleType]);
  };

/**
 * Whether a source registers the type its module provides (see `instanceTypeOf`): a source with a
 * module type whose module does not export the contract.
 */
export const isInferredSource = (contract: AppModuleContract) => (source: ScannedAppModuleSource) =>
  hasModuleType(source) === true && contract.uids.has(source.uid) === false;

/**
 * typeof import('<relative path to the source>')
 */
export const typeofImport = (source: AppModuleSource) =>
  factory.createImportTypeNode(
    factory.createLiteralTypeNode(factory.createStringLiteral(source.specifier, true)),
    undefined,
    undefined,
    undefined,
    true
  );

/**
 * import('<relative path to the source>').<name>
 */
const importedType = (source: AppModuleSource, name: string) =>
  factory.createImportTypeNode(
    factory.createLiteralTypeNode(factory.createStringLiteral(source.specifier, true)),
    undefined,
    factory.createIdentifier(name),
    undefined,
    false
  );

export const withDocComment = <TNode extends ts.Node>(node: TNode, comment: string) =>
  ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);

/**
 * type <name><TModule> = TModule extends { default: infer TExport }
 *   ? 0 extends 1 & TExport
 *     ? unknown
 *     : TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport
 *   : unknown;
 *
 * Emitted in each file so that services.ts and controllers.ts stand alone, and only when a source
 * registers its inferred type.
 *
 * Resolves the type registered for a service or a controller from the type of its module: the return
 * type of the default export when it is a factory, the default export itself otherwise. A module
 * without a default export registers nothing usable at runtime; with strict types enabled, an
 * unregistered uid resolves to `unknown`, so the helper does the same rather than claiming a
 * permissive contract for it. A module typed `any` and a default export typed `any` resolve to
 * `unknown` too: `any` would match the factory branch and register `any`.
 *
 * An import that no longer resolves (the source moved after the generation) is an error type, which
 * no conditional type maps to `unknown`. The generated file is a `.ts` file, so `tsc` reports the
 * TS2307 there, `skipLibCheck` or not, until the next generation drops the entry.
 */
export const generateInstanceHelperDefinition = (name: string, comment: string) => {
  const unwrapFactory = factory.createConditionalTypeNode(
    factory.createTypeReferenceNode('TExport'),
    factory.createFunctionTypeNode(
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          factory.createToken(ts.SyntaxKind.DotDotDotToken),
          'args',
          undefined,
          factory.createArrayTypeNode(factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))
        ),
      ],
      factory.createInferTypeNode(factory.createTypeParameterDeclaration(undefined, 'TInstance'))
    ),
    factory.createTypeReferenceNode('TInstance'),
    factory.createTypeReferenceNode('TExport')
  );

  // 0 extends 1 & TExport: only true when TExport is `any`
  const guardAny = factory.createConditionalTypeNode(
    factory.createLiteralTypeNode(factory.createNumericLiteral(0)),
    factory.createIntersectionTypeNode([
      factory.createLiteralTypeNode(factory.createNumericLiteral(1)),
      factory.createTypeReferenceNode('TExport'),
    ]),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
    unwrapFactory
  );

  const unwrapDefaultExport = factory.createConditionalTypeNode(
    factory.createTypeReferenceNode('TModule'),
    factory.createTypeLiteralNode([
      factory.createPropertySignature(
        undefined,
        'default',
        undefined,
        factory.createInferTypeNode(factory.createTypeParameterDeclaration(undefined, 'TExport'))
      ),
    ]),
    guardAny,
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  return withDocComment(
    factory.createTypeAliasDeclaration(
      undefined,
      factory.createIdentifier(name),
      [factory.createTypeParameterDeclaration(undefined, 'TModule')],
      unwrapDefaultExport
    ),
    comment
  );
};

/**
 * type <name><TContract> = 0 extends 1 & TContract ? unknown : TContract;
 *
 * Emitted only when at least one source exports a contract: an application without contracts does
 * not get it.
 *
 * A contract typed `any` registers `unknown`, as for an unregistered uid, rather than turning every
 * lookup of the uid into `any`.
 *
 * A contract reference that no longer resolves to a type (the export was renamed after the
 * generation, or a specifier names a value) is an error type, which no conditional type can map to
 * `unknown` (an alias instantiated with the error type stays the error type). The generated file is a
 * `.ts` file, so `tsc` reports the TS2694/TS2749 there, `skipLibCheck` or not. The next generation,
 * on every `strapi develop` start, registers the source without its contract again.
 */
export const generateContractHelperDefinition = (name: string, comment: string) =>
  withDocComment(
    factory.createTypeAliasDeclaration(
      undefined,
      factory.createIdentifier(name),
      [factory.createTypeParameterDeclaration(undefined, 'TContract')],
      factory.createConditionalTypeNode(
        factory.createLiteralTypeNode(factory.createNumericLiteral(0)),
        factory.createIntersectionTypeNode([
          factory.createLiteralTypeNode(factory.createNumericLiteral(1)),
          factory.createTypeReferenceNode('TContract'),
        ]),
        factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
        factory.createTypeReferenceNode('TContract')
      )
    ),
    comment
  );

/**
 * A registry that lists uids without typing them, such as the uids registered with their inferred
 * type. Each uid maps to `true`, which nothing reads: the marker never depends on a source.
 */
export type AppModuleMarker = {
  registry: string;
  uids: string[];
};

/**
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface <registry> {
 *         '<uid>': <value>;
 *       }
 *       …
 *     }
 *   }
 * }
 *
 * The registries are global interfaces, so this augmentation merges with the base declaration and
 * with the application's own entries, whatever module resolution the application uses. Lookups and
 * route configs only consult it once the program opts into strict types.
 */
const generateRegistryExtensionDefinition = (
  registries: { registry: string; entries: [uid: string, value: ts.TypeNode][] }[]
) => {
  const interfaces = registries.map(({ registry, entries }) =>
    factory.createInterfaceDeclaration(
      undefined,
      factory.createIdentifier(registry),
      undefined,
      undefined,
      entries.map(([uid, value]) =>
        factory.createPropertySignature(
          undefined,
          factory.createStringLiteral(uid, true),
          undefined,
          value
        )
      )
    )
  );

  const namespaceOf = (name: string, statements: ts.Statement[]) =>
    factory.createModuleDeclaration(
      undefined,
      factory.createIdentifier(name),
      factory.createModuleBlock(statements),
      ts.NodeFlags.Namespace
    );

  return factory.createModuleDeclaration(
    [factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    factory.createIdentifier('global'),
    factory.createModuleBlock([
      namespaceOf(GLOBAL_NAMESPACE, [namespaceOf(REGISTRIES_NAMESPACE, interfaces)]),
    ]),
    ts.NodeFlags.GlobalAugmentation
  );
};

/**
 * export {};
 *
 * <helpers>
 *
 * declare global { … <registry> … <markers> … }
 *
 * The module marker turns the generated file into a module: the global augmentation is only allowed
 * in one. The helpers come first so that the file stands alone. A marker without uids is not
 * emitted, so that the output of an application without such uids does not change.
 */
export const emitRegistryDefinitions = async <TSource extends AppModuleSource>(
  registry: string,
  helpers: ts.Node[],
  sources: TSource[],
  toValue: (source: TSource) => ts.TypeNode,
  markers: AppModuleMarker[] = []
) => {
  const allDefinitions = [
    // Module marker
    factory.createExportDeclaration(undefined, false, factory.createNamedExports([])),

    // Add a newline after the marker
    factory.createIdentifier('\n'),

    // Helpers
    ...helpers,

    // Add a newline after the helpers
    factory.createIdentifier('\n'),

    // Global
    generateRegistryExtensionDefinition([
      {
        registry,
        entries: sources.map((source): [string, ts.TypeNode] => [source.uid, toValue(source)]),
      },
      ...markers
        .filter((marker) => marker.uids.length > 0)
        .map((marker) => ({
          registry: marker.registry,
          entries: marker.uids.map((uid): [string, ts.TypeNode] => [
            uid,
            factory.createLiteralTypeNode(factory.createTrue()),
          ]),
        })),
    ]),
  ];

  return format(emitDefinitions(allDefinitions));
};

/**
 * Leave out the policy or middleware sources whose module has no default export, with a warning for
 * each.
 *
 * A module without a default export (`no-default`, see `ModuleShape`) registers `undefined` at
 * runtime, and a route that references it fails at startup (`Policy <name> not found.`,
 * `Middleware <uid> not found.`). Left out of the registry, a strict reference to it is rejected like
 * an unregistered name. The warning names the file: such a module is likely a mistake.
 *
 * Services and controllers keep such sources: their helpers resolve them to `unknown`, which a lookup
 * of an unregistered uid resolves to as well.
 *
 * A JS source typed from its sibling declaration file is kept: the shape of the declaration file
 * does not tell what the JS module registers (a CommonJS module registers its exports object). Its
 * helpers resolve it to `unknown` when the declaration file has no default export.
 */
export const omitSourcesWithoutDefault = <TSource extends ScannedAppModuleSource>(
  sources: TSource[],
  kind: 'policies' | 'middlewares',
  logger: Logger
): TSource[] =>
  sources.filter((source) => {
    if (source.module?.shape !== 'no-default' || source.module.file !== source.file) {
      return true;
    }

    const label = kind === 'policies' ? 'policy' : 'middleware';
    logger.warn(
      `Skipped ${source.uid} in the generated ${kind} types: ${source.file} has no default export, so Strapi registers nothing under ${source.uid} and a route that references it fails at startup. Export the ${label} with \`export default\`, or move the file out of the ${kind} directory if it is not a ${label}.`
    );
    return false;
  });
