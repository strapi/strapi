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
  // Extension-less path of the source file, relative to the generated directory
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

const toImportSpecifier = (from: string, to: string) => {
  const specifier = path.relative(from, to).split(path.sep).join('/');

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
      specifier: toImportSpecifier(outDir, path.join(dir, basename)),
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
 * Application tsconfigs do not enable `allowJs`, so the import of a JS source does not resolve and is
 * an error type. Unlike `any`, conditional types cannot map it to `unknown`.
 */
export const isTypedSource = (source: AppModuleSource) => path.extname(source.file) === '.ts';

const hasModifier = (statement: ts.Statement, kind: ts.ModifierSyntaxKind) =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === kind);

/**
 * Whether a top-level statement exports a type under `name`: `export type <name>`,
 * `export interface <name>`, or an export specifier named `<name>` (`export { <name> }`,
 * `export { type X as <name> }`, `export type { X as <name> } from './x'`).
 *
 * A specifier may name a value rather than a type: its reference then does not resolve, which the
 * generated contract helper maps to `unknown`.
 */
const exportsTypeNamed = (statement: ts.Statement, name: string) => {
  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
    return (
      statement.name.text === name &&
      hasModifier(statement, ts.SyntaxKind.ExportKeyword) === true &&
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword) === false
    );
  }

  if (
    ts.isExportDeclaration(statement) &&
    statement.exportClause !== undefined &&
    ts.isNamedExports(statement.exportClause)
  ) {
    return statement.exportClause.elements.some((element) => element.name.text === name);
  }

  return false;
};

/**
 * The uids of the TypeScript sources whose module exports a type named `name`, such as a service's
 * `ServiceContract`.
 *
 * Each source is parsed on its own, without a program: type generation runs on every `strapi develop`
 * start, before the compilation, and a program would need the application's tsconfig and its whole
 * dependency graph. Only top-level declarations and export specifiers are read (see
 * `exportsTypeNamed`). `export *` is not followed, and a source that cannot be read is skipped with a
 * warning: both keep the type the source registers without a contract, rather than stopping the
 * generation.
 *
 * JS sources are skipped: their import does not resolve without `allowJs` (see `isTypedSource`).
 */
export const findTypeExports = async (
  sources: AppModuleSource[],
  name: string,
  logger: Logger
): Promise<Set<string>> => {
  // TODO @Nico A JS source could get a contract from a sibling `<name>.d.ts` that exports it: the
  // extension-less import of the source resolves to that file without `allowJs`.
  const typedSources = sources.filter(isTypedSource);

  const verdicts = await Promise.all(
    typedSources.map(async (source) => {
      let content: string;

      try {
        content = await fs.promises.readFile(source.file, 'utf8');
      } catch (error) {
        logger.warn(
          `Could not read ${source.file} to find its ${name} export, typing ${source.uid} without it: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return false;
      }

      const sourceFile = ts.createSourceFile(
        source.file,
        content,
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TS
      );

      if (sourceFile.statements.some((statement) => exportsTypeNamed(statement, name)) === true) {
        return true;
      }

      if (
        sourceFile.statements.some(
          (statement) => ts.isExportDeclaration(statement) && statement.exportClause === undefined
        ) === true
      ) {
        logger.debug(`${source.uid}: \`export *\` is not followed to find a ${name} export`);
      }

      return false;
    })
  );

  return new Set(typedSources.filter((_, index) => verdicts[index] === true).map(({ uid }) => uid));
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
 * The type a service or controller source registers:
 * - `<contract helper><import('<source>').<contract export>>` when the module exports the contract;
 * - `<helper><typeof import('<source>')>` otherwise, which infers it from the default export;
 * - `unknown` for a JS source, whose import is an error type without `allowJs` (see `isTypedSource`).
 *
 * The contract does not depend on the default export, so the factory can be checked against its own
 * uid (`Core.ServiceFactory<uid>`). The inferred type does: the generators list those uids in a
 * marker registry (see `isInferredSource`), which the factory types reject.
 */
export const instanceTypeOf =
  (helper: string, logger: Logger, contract?: AppModuleContract) =>
  (source: AppModuleSource): ts.TypeNode => {
    if (isTypedSource(source) === false) {
      logger.debug(`${source.uid} has no TypeScript source, registering it as unknown`);
      return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    }

    if (contract !== undefined && contract.uids.has(source.uid) === true) {
      logger.debug(`${source.uid} exports ${contract.exportName}, registering it`);
      return factory.createTypeReferenceNode(contract.helper, [
        importedType(source, contract.exportName),
      ]);
    }

    return factory.createTypeReferenceNode(helper, [typeofImport(source)]);
  };

/**
 * Whether a source registers the type its module provides (see `instanceTypeOf`): a TypeScript
 * source whose module does not export the contract.
 */
export const isInferredSource = (contract: AppModuleContract) => (source: AppModuleSource) =>
  isTypedSource(source) === true && contract.uids.has(source.uid) === false;

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
 * Emitted in each file so that services.d.ts and controllers.d.ts stand alone.
 *
 * Resolves the type registered for a service or a controller from the type of its module: the return
 * type of the default export when it is a factory, the default export itself otherwise. A module
 * without a default export registers nothing usable at runtime; with strict types enabled, an
 * unregistered uid resolves to `unknown`, so the helper does the same rather than claiming a
 * permissive contract for it. A module typed `any` and a default export typed `any` resolve to
 * `unknown` too: `any` would match the factory branch and register `any`.
 *
 * TODO @Nico An import that no longer resolves (the source moved after the generation) is an error
 * type: it behaves as `any`, and no conditional type maps it to `unknown`. `skipLibCheck` hides the
 * TS2307 in the generated file, until the next generation drops the entry.
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
 * Emitted next to the instance helper only when at least one source exports a contract: an
 * application without contracts does not get it.
 *
 * A contract typed `any` registers `unknown`, as for an unregistered uid, rather than turning every
 * lookup of the uid into `any`.
 *
 * TODO @Nico A contract reference that no longer resolves to a type (the export was renamed after
 * the generation, names a value, or is a generic without defaults) is an error type: it behaves as
 * `any`, and no conditional type can map it to `unknown` (an alias instantiated with the error type
 * stays the error type). `skipLibCheck` hides the TS2694/TS2749/TS2314 in the generated file. The
 * next generation, on every `strapi develop` start, registers the source without its contract again.
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
export const emitRegistryDefinitions = async (
  registry: string,
  helpers: ts.Node[],
  sources: AppModuleSource[],
  toValue: (source: AppModuleSource) => ts.TypeNode,
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
