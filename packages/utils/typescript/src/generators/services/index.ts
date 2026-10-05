import path from 'node:path';
import fs, { type Dirent } from 'node:fs';
import * as ts from 'typescript';
import { kebabCase } from 'lodash';

import { emitDefinitions, format, pathExists } from '../utils';
import type { GeneratorOptions, Logger } from '../utils';

const { factory } = ts;

const GLOBAL_NAMESPACE = 'Strapi';
const REGISTRIES_NAMESPACE = 'Registries';
const REGISTRY = 'AppServices';
const INSTANCE_HELPER = 'ServiceInstance';

// Ordered by precedence when several files resolve to the same service uid
const SOURCE_EXTENSIONS = ['.ts', '.js'];

const NO_SERVICE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any services yet.
 */
`;

interface ServiceSource {
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
 * Collect the service source files of every API (src/api/<api>/services/<service>.{ts,js}) and
 * derive the uid the loader registers for each of them (api::<api>.<service>)
 */
const collectApiServiceSources = async (
  apiDir: string,
  outDir: string,
  logger: Logger
): Promise<ServiceSource[]> => {
  if ((await pathExists(apiDir)) === false) {
    return [];
  }

  const apiFDs = (await fs.promises.readdir(apiDir, { withFileTypes: true })).filter(
    (fd) => fd.isDirectory() && !fd.name.startsWith('.')
  );

  const sources = new Map<string, ServiceSource>();

  for (const apiFD of apiFDs) {
    const apiName = normalizeName(apiFD.name);
    const servicesDir = path.join(apiDir, apiFD.name, 'services');

    if ((await pathExists(servicesDir)) === false) {
      continue;
    }

    const serviceFDs = (await fs.promises.readdir(servicesDir, { withFileTypes: true }))
      .filter(isSourceFile)
      .sort(byExtensionPrecedence);

    for (const serviceFD of serviceFDs) {
      const basename = path.basename(serviceFD.name, path.extname(serviceFD.name));
      const uid = `api::${apiName}.${normalizeName(basename)}`;
      const file = path.join(servicesDir, serviceFD.name);

      if (sources.has(uid)) {
        logger.warn(`Several source files resolve to ${uid}, ignoring ${file}`);
        continue;
      }

      sources.set(uid, {
        uid,
        file,
        specifier: toImportSpecifier(outDir, path.join(servicesDir, basename)),
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
 * type ServiceInstance<TModule> = TModule extends { default: infer TExport }
 *   ? TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport
 *   : unknown;
 *
 * Resolves the type registered for a service from the type of its module: the return type of the
 * default export when it is a factory, the default export itself otherwise. A module without a
 * default export registers nothing usable at runtime; with strict types enabled, an unregistered
 * service resolves to `unknown`, so the helper does the same rather than claiming a permissive
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
    '*\n * Type of the service instance exposed by a service module: the return type of its default\n * export when it is a factory, the default export itself otherwise.\n ',
    true
  );
};

/**
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface AppServices {
 *         'api::<api>.<service>': ServiceInstance<typeof import('<relative path to the source>')>;
 *       }
 *     }
 *   }
 * }
 *
 * The registries are global interfaces, so this augmentation merges with the base declaration and
 * with the application's own AppServices entries, whatever module resolution the application uses.
 * Lookups only consult it once the program opts into strict types.
 */
const generateRegistryExtensionDefinition = (sources: ServiceSource[]) => {
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
 * Generate type definitions for the application's services (api::*)
 *
 * Services are typed from their source file, so only the ones with a source in src/api are emitted.
 * Plugin and admin services are left to the packages themselves (Strapi.Registries.PackageServices).
 */
export const generateServicesDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error('The services generator needs the output directory to resolve source imports');
  }

  const registeredUIDs = new Set(Object.keys(strapi.services));
  const sources = await collectApiServiceSources(strapi.dirs.app.api, outDir, logger);

  const servicesDefinitions = sources
    .filter((source) => {
      if (!registeredUIDs.has(source.uid)) {
        logger.debug(`${source.uid} is not registered, ignoring ${source.file}`);
        return false;
      }

      return true;
    })
    .sort((a, b) => a.uid.localeCompare(b.uid));

  logger.debug(`Found ${servicesDefinitions.length} services.`);

  if (servicesDefinitions.length === 0) {
    return { output: NO_SERVICE_PLACEHOLDER_COMMENT, stats: {} };
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
    generateRegistryExtensionDefinition(servicesDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};
