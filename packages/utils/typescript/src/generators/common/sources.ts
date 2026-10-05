import path from 'node:path';
import fs, { type Dirent } from 'node:fs';
import * as ts from 'typescript';
import { kebabCase } from 'lodash';

import { emitDefinitions, format, pathExists } from '../utils';
import type { Logger } from '../utils';

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
    .sort((a, b) => a.uid.localeCompare(b.uid));
};

/**
 * Application tsconfigs do not enable `allowJs`, so the import of a JS source does not resolve and is
 * an error type. Unlike `any`, conditional types cannot map it to `unknown`.
 */
export const isTypedSource = (source: AppModuleSource) => path.extname(source.file) === '.ts';

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

export const withDocComment = <TNode extends ts.Node>(node: TNode, comment: string) =>
  ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);

/**
 * type <name><TModule> = TModule extends { default: infer TExport }
 *   ? TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport
 *   : unknown;
 *
 * Emitted in each file so that services.d.ts and controllers.d.ts stand alone.
 *
 * Resolves the type registered for a service or a controller from the type of its module: the return
 * type of the default export when it is a factory, the default export itself otherwise. A module
 * without a default export registers nothing usable at runtime; with strict types enabled, an
 * unregistered uid resolves to `unknown`, so the helper does the same rather than claiming a
 * permissive contract for it.
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
    unwrapFactory,
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
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface <registry> {
 *         '<uid>': <toValue(source)>;
 *       }
 *     }
 *   }
 * }
 *
 * The registries are global interfaces, so this augmentation merges with the base declaration and
 * with the application's own entries, whatever module resolution the application uses. Lookups and
 * route configs only consult it once the program opts into strict types.
 */
const generateRegistryExtensionDefinition = (
  registry: string,
  sources: AppModuleSource[],
  toValue: (source: AppModuleSource) => ts.TypeNode
) => {
  const properties = sources.map((source) =>
    factory.createPropertySignature(
      undefined,
      factory.createStringLiteral(source.uid, true),
      undefined,
      toValue(source)
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
      namespaceOf(GLOBAL_NAMESPACE, [
        namespaceOf(REGISTRIES_NAMESPACE, [
          factory.createInterfaceDeclaration(
            undefined,
            factory.createIdentifier(registry),
            undefined,
            undefined,
            properties
          ),
        ]),
      ]),
    ]),
    ts.NodeFlags.GlobalAugmentation
  );
};

/**
 * export {};
 *
 * <helpers>
 *
 * declare global { … <registry> … }
 *
 * The module marker turns the generated file into a module: the global augmentation is only allowed
 * in one. The helpers come first so that the file stands alone.
 */
export const emitRegistryDefinitions = async (
  registry: string,
  helpers: ts.Node[],
  sources: AppModuleSource[],
  toValue: (source: AppModuleSource) => ts.TypeNode
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
    generateRegistryExtensionDefinition(registry, sources, toValue),
  ];

  return format(emitDefinitions(allDefinitions));
};
