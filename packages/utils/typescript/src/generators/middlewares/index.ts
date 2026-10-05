import path from 'node:path';
import fs, { type Dirent } from 'node:fs';
import * as ts from 'typescript';
import { kebabCase } from 'lodash';

import { emitDefinitions, format, pathExists } from '../utils';
import type { GeneratorOptions, Logger } from '../utils';

const { factory } = ts;

const GLOBAL_NAMESPACE = 'Strapi';
const REGISTRIES_NAMESPACE = 'Registries';
const REGISTRY = 'AppMiddlewares';
const CONFIG_HELPER = 'MiddlewareConfig';
const FACTORY_CONFIG_HELPER = 'MiddlewareFactoryConfig';

// Ordered by precedence when several files resolve to the same middleware uid
const SOURCE_EXTENSIONS = ['.ts', '.js'];

const NO_MIDDLEWARE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any middlewares yet.
 */
`;

interface MiddlewareSource {
  uid: string;
  file: string;
  // Extension-less path of the source file, relative to the generated directory
  specifier: string;
}

/**
 * Application tsconfigs do not enable `allowJs`, so the import of a JS middleware does not resolve and
 * is an error type. Like JS policies (see the policies generator), JS middlewares are registered as
 * `unknown` without an import.
 * TODO @Nico with `allowJs`, a JSDoc-typed JS middleware could register its config like a TS one
 */
const isTypedSource = (source: MiddlewareSource) => path.extname(source.file) === '.ts';

/**
 * Mirror of the API loader's name normalization (@strapi/core, loaders/apis.ts): names already in
 * kebab-case are kept as is, anything else is kebab-cased. Both must agree for the generated uids
 * to match the ones registered at runtime. Global middlewares (loaders/middlewares.ts) are not
 * normalized.
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
 * Add the middleware source files of a directory to `sources`, under the uid returned by `toUID`
 */
const collectDirectorySources = async (
  dir: string,
  toUID: (basename: string) => string,
  sources: Map<string, MiddlewareSource>,
  outDir: string,
  logger: Logger
) => {
  if ((await pathExists(dir)) === false) {
    return;
  }

  const middlewareFDs = (await fs.promises.readdir(dir, { withFileTypes: true }))
    .filter(isSourceFile)
    .sort(byExtensionPrecedence);

  for (const middlewareFD of middlewareFDs) {
    const basename = path.basename(middlewareFD.name, path.extname(middlewareFD.name));
    const uid = toUID(basename);
    const file = path.join(dir, middlewareFD.name);

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
 * Collect the global middleware source files (src/middlewares/<middleware>.{ts,js} →
 * global::<middleware>) and the ones of every API (src/api/<api>/middlewares/<middleware>.{ts,js} →
 * api::<api>.<middleware>)
 */
const collectMiddlewareSources = async (
  dirs: { middlewares: string; api: string },
  outDir: string,
  logger: Logger
): Promise<MiddlewareSource[]> => {
  const sources = new Map<string, MiddlewareSource>();

  await collectDirectorySources(
    dirs.middlewares,
    (basename) => `global::${basename}`,
    sources,
    outDir,
    logger
  );

  if ((await pathExists(dirs.api)) === true) {
    const apiFDs = (await fs.promises.readdir(dirs.api, { withFileTypes: true })).filter(
      (fd) => fd.isDirectory() && !fd.name.startsWith('.')
    );

    for (const apiFD of apiFDs) {
      const apiName = normalizeName(apiFD.name);

      await collectDirectorySources(
        path.join(dirs.api, apiFD.name, 'middlewares'),
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
 * export {};
 *
 * Turns the generated file into a module: the global augmentation below is only allowed in one.
 */
const generateModuleMarker = () =>
  factory.createExportDeclaration(undefined, false, factory.createNamedExports([]));

const withDocComment = <TNode extends ts.Node>(node: TNode, comment: string) =>
  ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);

/**
 * type MiddlewareFactoryConfig<TFactory> = TFactory extends (...args: infer TArgs) => unknown
 *   ? TArgs['length'] extends 0 ? undefined : 0 extends 1 & TArgs[0] ? unknown : TArgs[0]
 *   : unknown;
 *
 * type MiddlewareConfig<TModule> = TModule extends { default: infer TExport }
 *   ? MiddlewareFactoryConfig<TExport>
 *   : unknown;
 *
 * Emitted in the file so that middlewares.d.ts stands alone, like the policies helpers.
 *
 * Resolves the config a middleware accepts from the type of its module: the first parameter of the
 * factory it exports. A factory without parameters takes no config: `undefined`, as in
 * PackageMiddlewares. An optional parameter keeps `undefined` in the config, so typed routes accept
 * the name alone. An untyped (`any`) config and a module without a default export resolve to
 * `unknown`, as for policies.
 * TODO @Nico a module without a default export registers `undefined` at runtime (a reference to it
 * throws "Middleware <uid> not found"); `unknown` accepts any reference to it, like an untyped one
 */
const generateConfigHelpersDefinition = () => {
  const args = factory.createTypeReferenceNode('TArgs');
  const configArg = factory.createIndexedAccessTypeNode(
    args,
    factory.createLiteralTypeNode(factory.createNumericLiteral(0))
  );

  const factoryConfig = factory.createConditionalTypeNode(
    factory.createTypeReferenceNode('TFactory'),
    factory.createFunctionTypeNode(
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          factory.createToken(ts.SyntaxKind.DotDotDotToken),
          'args',
          undefined,
          factory.createInferTypeNode(factory.createTypeParameterDeclaration(undefined, 'TArgs'))
        ),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
    ),
    factory.createConditionalTypeNode(
      factory.createIndexedAccessTypeNode(
        args,
        factory.createLiteralTypeNode(factory.createStringLiteral('length', true))
      ),
      factory.createLiteralTypeNode(factory.createNumericLiteral(0)),
      factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
      // 0 extends 1 & TArgs[0], true only when the config is `any`
      factory.createConditionalTypeNode(
        factory.createLiteralTypeNode(factory.createNumericLiteral(0)),
        factory.createIntersectionTypeNode([
          factory.createLiteralTypeNode(factory.createNumericLiteral(1)),
          configArg,
        ]),
        factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
        configArg
      )
    ),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  const moduleConfig = factory.createConditionalTypeNode(
    factory.createTypeReferenceNode('TModule'),
    factory.createTypeLiteralNode([
      factory.createPropertySignature(
        undefined,
        'default',
        undefined,
        factory.createInferTypeNode(factory.createTypeParameterDeclaration(undefined, 'TExport'))
      ),
    ]),
    factory.createTypeReferenceNode(FACTORY_CONFIG_HELPER, [
      factory.createTypeReferenceNode('TExport'),
    ]),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  return [
    withDocComment(
      factory.createTypeAliasDeclaration(
        undefined,
        factory.createIdentifier(FACTORY_CONFIG_HELPER),
        [factory.createTypeParameterDeclaration(undefined, 'TFactory')],
        factoryConfig
      ),
      '*\n * Config a middleware factory accepts: its first parameter, `undefined` when it has none,\n * `unknown` when it is untyped.\n '
    ),
    withDocComment(
      factory.createTypeAliasDeclaration(
        undefined,
        factory.createIdentifier(CONFIG_HELPER),
        [factory.createTypeParameterDeclaration(undefined, 'TModule')],
        moduleConfig
      ),
      '*\n * Config accepted by the factory a middleware module exports.\n '
    ),
  ];
};

/**
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface AppMiddlewares {
 *         'global::<middleware>': MiddlewareConfig<typeof import('<relative path to the source>')>;
 *         'api::<api>.<middleware>': MiddlewareConfig<typeof import('<relative path to the source>')>;
 *         'global::<js middleware>': unknown;
 *       }
 *     }
 *   }
 * }
 *
 * The registries are global interfaces, so this augmentation merges with the base declaration and
 * with the application's own AppMiddlewares entries, whatever module resolution the application
 * uses. Lookups and route configs only consult it once the program opts into strict types.
 */
const generateRegistryExtensionDefinition = (sources: MiddlewareSource[]) => {
  const properties = sources.map((source) =>
    factory.createPropertySignature(
      undefined,
      factory.createStringLiteral(source.uid, true),
      undefined,
      isTypedSource(source)
        ? factory.createTypeReferenceNode(CONFIG_HELPER, [
            factory.createImportTypeNode(
              factory.createLiteralTypeNode(factory.createStringLiteral(source.specifier, true)),
              undefined,
              undefined,
              undefined,
              true
            ),
          ])
        : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
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
            factory.createIdentifier(REGISTRY),
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
 * Generate type definitions for the application's middlewares (global::* and api::*)
 *
 * Middlewares are typed from their source file, so only the ones with a source in src/middlewares or
 * src/api are emitted. Bundled middlewares (strapi::*, admin::*, plugin::*) are left to the packages
 * themselves (Strapi.Registries.PackageMiddlewares), so registering application middlewares keeps
 * them accepted.
 */
export const generateMiddlewaresDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error(
      'The middlewares generator needs the output directory to resolve source imports'
    );
  }

  const registeredUIDs = new Set(Object.keys(strapi.middlewares));
  const sources = await collectMiddlewareSources(strapi.dirs.app, outDir, logger);

  const middlewaresDefinitions = sources
    .filter((source) => {
      if (!registeredUIDs.has(source.uid)) {
        logger.debug(`${source.uid} is not registered, ignoring ${source.file}`);
        return false;
      }

      return true;
    })
    .sort((a, b) => a.uid.localeCompare(b.uid));

  logger.debug(`Found ${middlewaresDefinitions.length} middlewares.`);

  if (middlewaresDefinitions.length === 0) {
    return { output: NO_MIDDLEWARE_PLACEHOLDER_COMMENT, stats: {} };
  }

  const allDefinitions = [
    // Module marker
    generateModuleMarker(),

    // Add a newline after the marker
    factory.createIdentifier('\n'),

    // Helpers
    ...generateConfigHelpersDefinition(),

    // Add a newline after the helpers
    factory.createIdentifier('\n'),

    // Global
    generateRegistryExtensionDefinition(middlewaresDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};
