import path from 'node:path';
import fs, { type Dirent } from 'node:fs';
import * as ts from 'typescript';
import { kebabCase } from 'lodash';

import { emitDefinitions, format, pathExists } from '../utils';
import type { GeneratorOptions, Logger } from '../utils';

const { factory } = ts;

const GLOBAL_NAMESPACE = 'Strapi';
const REGISTRIES_NAMESPACE = 'Registries';
const REGISTRY = 'AppPolicies';
const CONFIG_HELPER = 'PolicyConfig';
const HANDLER_CONFIG_HELPER = 'PolicyHandlerConfig';

// Ordered by precedence when several files resolve to the same policy uid
const SOURCE_EXTENSIONS = ['.ts', '.js'];

const NO_POLICY_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any policies yet.
 */
`;

interface PolicySource {
  uid: string;
  file: string;
  // Extension-less path of the source file, relative to the generated directory
  specifier: string;
}

/**
 * Application tsconfigs do not enable `allowJs`, so the import of a JS policy does not resolve and is
 * an error type. Unlike `any`, conditional types cannot map it to `unknown`, and one such entry turns
 * every policy reference into `any`. JS policies are registered as `unknown` without an import.
 * TODO @Nico with `allowJs`, a JSDoc-typed JS policy could register its config like a TS one
 */
const isTypedSource = (source: PolicySource) => path.extname(source.file) === '.ts';

/**
 * Mirror of the API loader's name normalization (@strapi/core, loaders/apis.ts): names already in
 * kebab-case are kept as is, anything else is kebab-cased. Both must agree for the generated uids
 * to match the ones registered at runtime. Global policies (loaders/policies.ts) are not normalized.
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
 * Add the policy source files of a directory to `sources`, under the uid returned by `toUID`
 */
const collectDirectorySources = async (
  dir: string,
  toUID: (basename: string) => string,
  sources: Map<string, PolicySource>,
  outDir: string,
  logger: Logger
) => {
  if ((await pathExists(dir)) === false) {
    return;
  }

  const policyFDs = (await fs.promises.readdir(dir, { withFileTypes: true }))
    .filter(isSourceFile)
    .sort(byExtensionPrecedence);

  for (const policyFD of policyFDs) {
    const basename = path.basename(policyFD.name, path.extname(policyFD.name));
    const uid = toUID(basename);
    const file = path.join(dir, policyFD.name);

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
 * Collect the global policy source files (src/policies/<policy>.{ts,js} → global::<policy>) and the
 * ones of every API (src/api/<api>/policies/<policy>.{ts,js} → api::<api>.<policy>)
 */
const collectPolicySources = async (
  dirs: { policies: string; api: string },
  outDir: string,
  logger: Logger
): Promise<PolicySource[]> => {
  const sources = new Map<string, PolicySource>();

  await collectDirectorySources(
    dirs.policies,
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
        path.join(dirs.api, apiFD.name, 'policies'),
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
 * type PolicyHandlerConfig<THandler> = THandler extends (...args: infer TArgs) => unknown
 *   ? TArgs['length'] extends 0 | 1 ? undefined : 0 extends 1 & TArgs[1] ? unknown : TArgs[1]
 *   : unknown;
 *
 * type PolicyConfig<TModule> = TModule extends { default: infer TExport }
 *   ? PolicyHandlerConfig<TExport extends { handler: infer THandler } ? THandler : TExport>
 *   : unknown;
 *
 * Emitted in the file so that policies.d.ts stands alone, like the services and controllers helpers.
 *
 * Resolves the config a policy accepts from the type of its module: the second parameter of its
 * handler, for both runtime forms (a bare handler, or `{ handler, validator }`). A handler without
 * a config parameter takes none: `undefined`, as in PackagePolicies. An untyped (`any`) config and a
 * module without a default export resolve to `unknown`: one `any` entry would turn every policy
 * reference into `any`.
 * TODO @Nico a module without a default export registers nothing usable at runtime (resolving it
 * throws); `unknown` accepts any reference to it, like an untyped policy
 */
const generateConfigHelpersDefinition = () => {
  const args = factory.createTypeReferenceNode('TArgs');
  const configArg = factory.createIndexedAccessTypeNode(
    args,
    factory.createLiteralTypeNode(factory.createNumericLiteral(1))
  );

  const handlerConfig = factory.createConditionalTypeNode(
    factory.createTypeReferenceNode('THandler'),
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
      factory.createUnionTypeNode([
        factory.createLiteralTypeNode(factory.createNumericLiteral(0)),
        factory.createLiteralTypeNode(factory.createNumericLiteral(1)),
      ]),
      factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
      // 0 extends 1 & TArgs[1], true only when the config is `any`
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

  const unwrapHandler = factory.createConditionalTypeNode(
    factory.createTypeReferenceNode('TExport'),
    factory.createTypeLiteralNode([
      factory.createPropertySignature(
        undefined,
        'handler',
        undefined,
        factory.createInferTypeNode(factory.createTypeParameterDeclaration(undefined, 'THandler'))
      ),
    ]),
    factory.createTypeReferenceNode('THandler'),
    factory.createTypeReferenceNode('TExport')
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
    factory.createTypeReferenceNode(HANDLER_CONFIG_HELPER, [unwrapHandler]),
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  return [
    withDocComment(
      factory.createTypeAliasDeclaration(
        undefined,
        factory.createIdentifier(HANDLER_CONFIG_HELPER),
        [factory.createTypeParameterDeclaration(undefined, 'THandler')],
        handlerConfig
      ),
      '*\n * Config a policy handler accepts: its second parameter, `undefined` when it has none, `unknown`\n * when it is untyped.\n '
    ),
    withDocComment(
      factory.createTypeAliasDeclaration(
        undefined,
        factory.createIdentifier(CONFIG_HELPER),
        [factory.createTypeParameterDeclaration(undefined, 'TModule')],
        moduleConfig
      ),
      '*\n * Config accepted by the policy a policy module exports, as a bare handler or as\n * `{ handler, validator }`.\n '
    ),
  ];
};

/**
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface AppPolicies {
 *         'global::<policy>': PolicyConfig<typeof import('<relative path to the source>')>;
 *         'api::<api>.<policy>': PolicyConfig<typeof import('<relative path to the source>')>;
 *         'global::<js policy>': unknown;
 *       }
 *     }
 *   }
 * }
 *
 * The registries are global interfaces, so this augmentation merges with the base declaration and
 * with the application's own AppPolicies entries, whatever module resolution the application uses.
 * Lookups and route configs only consult it once the program opts into strict types.
 */
const generateRegistryExtensionDefinition = (sources: PolicySource[]) => {
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
 * Generate type definitions for the application's policies (global::* and api::*)
 *
 * Policies are typed from their source file, so only the ones with a source in src/policies or
 * src/api are emitted. Plugin and admin policies are left to the packages themselves
 * (Strapi.Registries.PackagePolicies), so registering application policies keeps them accepted.
 */
export const generatePoliciesDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error('The policies generator needs the output directory to resolve source imports');
  }

  const registeredUIDs = new Set(Object.keys(strapi.policies));
  const sources = await collectPolicySources(strapi.dirs.app, outDir, logger);

  const policiesDefinitions = sources
    .filter((source) => {
      if (!registeredUIDs.has(source.uid)) {
        logger.debug(`${source.uid} is not registered, ignoring ${source.file}`);
        return false;
      }

      return true;
    })
    .sort((a, b) => a.uid.localeCompare(b.uid));

  logger.debug(`Found ${policiesDefinitions.length} policies.`);

  if (policiesDefinitions.length === 0) {
    return { output: NO_POLICY_PLACEHOLDER_COMMENT, stats: {} };
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
    generateRegistryExtensionDefinition(policiesDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};
