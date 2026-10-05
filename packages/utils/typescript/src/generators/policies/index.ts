import * as ts from 'typescript';

import {
  collectAppSources,
  emitRegistryDefinitions,
  filterRegisteredSources,
  isTypedSource,
  typeofImport,
  withDocComment,
} from '../common/sources';
import type { GeneratorOptions } from '../utils';

const { factory } = ts;

const REGISTRY = 'AppPolicies';
const CONFIG_HELPER = 'PolicyConfig';
const HANDLER_CONFIG_HELPER = 'PolicyHandlerConfig';

const NO_POLICY_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any policies yet.
 */
`;

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
 * Generate type definitions for the application's policies (global::* and api::*)
 *
 * Policies are typed from their source file, so only the ones with a source in src/policies or
 * src/api are emitted. Plugin and admin policies are left to the packages themselves
 * (Strapi.Registries.PackagePolicies), so registering application policies keeps them accepted.
 *
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
 * The import of a JS policy is an error type without `allowJs`, and one such entry turns every policy
 * reference into `any`. JS policies are registered as `unknown` without an import.
 * TODO @Nico with `allowJs`, a JSDoc-typed JS policy could register its config like a TS one
 */
export const generatePoliciesDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error('The policies generator needs the output directory to resolve source imports');
  }

  const sources = await collectAppSources(
    'policies',
    { global: strapi.dirs.app.policies, api: strapi.dirs.app.api },
    outDir,
    logger
  );
  const policiesDefinitions = filterRegisteredSources(sources, strapi.policies, logger);

  logger.debug(`Found ${policiesDefinitions.length} policies.`);

  if (policiesDefinitions.length === 0) {
    return { output: NO_POLICY_PLACEHOLDER_COMMENT, stats: {} };
  }

  const output = await emitRegistryDefinitions(
    REGISTRY,
    generateConfigHelpersDefinition(),
    policiesDefinitions,
    (source) =>
      isTypedSource(source)
        ? factory.createTypeReferenceNode(CONFIG_HELPER, [typeofImport(source)])
        : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  return { output, stats: {} };
};
