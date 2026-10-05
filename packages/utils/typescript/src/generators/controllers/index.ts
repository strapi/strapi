import path from 'node:path';
import fs, { type Dirent } from 'node:fs';
import * as ts from 'typescript';
import { kebabCase } from 'lodash';

import { emitDefinitions, format, pathExists } from '../utils';
import type { GeneratorOptions, Logger } from '../utils';

const { factory } = ts;

const GLOBAL_NAMESPACE = 'Strapi';
const REGISTRIES_NAMESPACE = 'Registries';
const REGISTRY = 'AppControllers';
const INSTANCE_HELPER = 'ControllerInstance';

// Ordered by precedence when several files resolve to the same controller uid
const SOURCE_EXTENSIONS = ['.ts', '.js'];

const NO_CONTROLLER_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any controllers yet.
 */
`;

interface ControllerSource {
  uid: string;
  file: string;
  // Extension-less path of the source file, relative to the generated directory
  specifier: string;
}

/**
 * Mirror of the API loader's name normalization (@strapi/core, loaders/apis.ts): names already in
 * kebab-case are kept as is, anything else is kebab-cased. Both must agree for the generated uids
 * to match the ones registered at runtime.
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
 * Collect the controller source files of every API (src/api/<api>/controllers/<controller>.{ts,js}) and
 * derive the uid the loader registers for each of them (api::<api>.<controller>)
 */
const collectApiControllerSources = async (
  apiDir: string,
  outDir: string,
  logger: Logger
): Promise<ControllerSource[]> => {
  if ((await pathExists(apiDir)) === false) {
    return [];
  }

  const apiFDs = (await fs.promises.readdir(apiDir, { withFileTypes: true })).filter(
    (fd) => fd.isDirectory() && !fd.name.startsWith('.')
  );

  const sources = new Map<string, ControllerSource>();

  for (const apiFD of apiFDs) {
    const apiName = normalizeName(apiFD.name);
    const controllersDir = path.join(apiDir, apiFD.name, 'controllers');

    if ((await pathExists(controllersDir)) === false) {
      continue;
    }

    const controllerFDs = (await fs.promises.readdir(controllersDir, { withFileTypes: true }))
      .filter(isSourceFile)
      .sort(byExtensionPrecedence);

    for (const controllerFD of controllerFDs) {
      const basename = path.basename(controllerFD.name, path.extname(controllerFD.name));
      const uid = `api::${apiName}.${normalizeName(basename)}`;
      const file = path.join(controllersDir, controllerFD.name);

      if (sources.has(uid)) {
        logger.warn(`Several source files resolve to ${uid}, ignoring ${file}`);
        continue;
      }

      sources.set(uid, {
        uid,
        file,
        specifier: toImportSpecifier(outDir, path.join(controllersDir, basename)),
      });
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

/**
 * type ControllerInstance<TModule> = TModule extends { default: infer TExport }
 *   ? TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport
 *   : unknown;
 *
 * Same helper as the services generator's ServiceInstance, emitted in each file so that
 * controllers.d.ts stands alone.
 * TODO @Nico share one helper file between services.d.ts and controllers.d.ts if more artifacts need it
 *
 * Resolves the type registered for a controller from the type of its module: the return type of the
 * default export when it is a factory, the default export itself otherwise. A module without a
 * default export registers nothing usable at runtime; with strict types enabled, an unregistered
 * controller resolves to `unknown`, so the helper does the same rather than claiming a permissive
 * contract for it.
 */
const generateInstanceHelperDefinition = () => {
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

  const helper = factory.createTypeAliasDeclaration(
    undefined,
    factory.createIdentifier(INSTANCE_HELPER),
    [factory.createTypeParameterDeclaration(undefined, 'TModule')],
    unwrapDefaultExport
  );

  return ts.addSyntheticLeadingComment(
    helper,
    ts.SyntaxKind.MultiLineCommentTrivia,
    '*\n * Type of the controller exposed by a controller module: the return type of its default export\n * when it is a factory, the default export itself otherwise.\n ',
    true
  );
};

/**
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface AppControllers {
 *         'api::<api>.<controller>': ControllerInstance<typeof import('<relative path to the source>')>;
 *       }
 *     }
 *   }
 * }
 *
 * The registries are global interfaces, so this augmentation merges with the base declaration and
 * with the application's own AppControllers entries, whatever module resolution the application uses.
 * Lookups only consult it once the program opts into strict types.
 */
const generateRegistryExtensionDefinition = (sources: ControllerSource[]) => {
  const properties = sources.map(({ uid, specifier }) =>
    factory.createPropertySignature(
      undefined,
      factory.createStringLiteral(uid, true),
      undefined,
      factory.createTypeReferenceNode(INSTANCE_HELPER, [
        factory.createImportTypeNode(
          factory.createLiteralTypeNode(factory.createStringLiteral(specifier, true)),
          undefined,
          undefined,
          undefined,
          true
        ),
      ])
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
 * Generate type definitions for the application's controllers (api::*)
 *
 * Controllers are typed from their source file, so only the ones with a source in src/api are emitted.
 * Plugin and admin controllers are left to the packages themselves (Strapi.Registries.PackageControllers).
 */
export const generateControllersDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error(
      'The controllers generator needs the output directory to resolve source imports'
    );
  }

  const registeredUIDs = new Set(Object.keys(strapi.controllers));
  const sources = await collectApiControllerSources(strapi.dirs.app.api, outDir, logger);

  const controllersDefinitions = sources
    .filter((source) => {
      if (!registeredUIDs.has(source.uid)) {
        logger.debug(`${source.uid} is not registered, ignoring ${source.file}`);
        return false;
      }

      return true;
    })
    .sort((a, b) => a.uid.localeCompare(b.uid));

  logger.debug(`Found ${controllersDefinitions.length} controllers.`);

  if (controllersDefinitions.length === 0) {
    return { output: NO_CONTROLLER_PLACEHOLDER_COMMENT, stats: {} };
  }

  const allDefinitions = [
    // Module marker
    generateModuleMarker(),

    // Add a newline after the marker
    factory.createIdentifier('\n'),

    // Helper
    generateInstanceHelperDefinition(),

    // Add a newline after the helper
    factory.createIdentifier('\n'),

    // Global
    generateRegistryExtensionDefinition(controllersDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};
