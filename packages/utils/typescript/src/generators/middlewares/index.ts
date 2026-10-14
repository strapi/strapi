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

const REGISTRY = 'AppMiddlewares';
const CONFIG_HELPER = 'MiddlewareConfig';
const FACTORY_CONFIG_HELPER = 'MiddlewareFactoryConfig';

const NO_MIDDLEWARE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any middlewares yet.
 */
`;

/**
 * type MiddlewareFactoryConfig<TFactory> = TFactory extends (...args: infer TArgs) => unknown
 *   ? TFactory extends (config: never, ctx: { strapi: never }) => unknown
 *     ? TArgs['length'] extends 0
 *       ? undefined
 *       : 0 extends 1 & TArgs[0]
 *         ? unknown
 *         : TArgs[0] extends { request: unknown; response: unknown; app: unknown }
 *           ? never
 *           : TArgs[0]
 *     : never
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
 * A plain Koa handler `(ctx, next)` is not a factory: runtime calls it with the config and
 * `{ strapi }`, which breaks. A function whose second parameter cannot take `{ strapi }`
 * (Core.MiddlewareFactory) registers `never`, so typed routes reject its name. `never` stands for
 * the Strapi instance, so that the file needs no import and any context type a factory declares
 * accepts it.
 * A handler with one parameter `(ctx)`, or an untyped `next`, takes `{ strapi }`: a first parameter
 * with the required members of a Koa context (`request`, `response`, `app`) registers `never` too.
 * TODO @Nico a handler whose context is `any` still registers as a factory with an untyped config
 * (`unknown`); an opt-in `defineMiddleware` brand (new factory helpers, D15) would tell them apart
 * TODO @Nico a module without a default export registers `undefined` at runtime (a reference to it
 * throws "Middleware <uid> not found"); `unknown` accepts any reference to it, like an untyped one
 */
const generateConfigHelpersDefinition = () => {
  const args = factory.createTypeReferenceNode('TArgs');
  const configArg = factory.createIndexedAccessTypeNode(
    args,
    factory.createLiteralTypeNode(factory.createNumericLiteral(0))
  );

  const never = () => factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);

  // (config: never, ctx: { strapi: never }) => unknown, what runtime calls a middleware with
  const factorySignature = factory.createFunctionTypeNode(
    undefined,
    [
      factory.createParameterDeclaration(undefined, undefined, 'config', undefined, never()),
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'ctx',
        undefined,
        factory.createTypeLiteralNode([
          factory.createPropertySignature(undefined, 'strapi', undefined, never()),
        ])
      ),
    ],
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  // { request: unknown; response: unknown; app: unknown }, required members of a Koa context
  const koaContextShape = factory.createTypeLiteralNode(
    ['request', 'response', 'app'].map((member) =>
      factory.createPropertySignature(
        undefined,
        member,
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      )
    )
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
      factory.createTypeReferenceNode('TFactory'),
      factorySignature,
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
          // A Koa handler (ctx) or (ctx, next: any): its first parameter is a context
          factory.createConditionalTypeNode(configArg, koaContextShape, never(), configArg)
        )
      ),
      // A Koa handler (ctx, next): its `next` cannot take `{ strapi }`
      never()
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
      '*\n * Config a middleware factory accepts: its first parameter, `undefined` when it has none,\n * `unknown` when it is untyped, `never` when the function is not a factory (a Koa handler).\n '
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
 * Generate type definitions for the application's middlewares (global::* and api::*)
 *
 * Middlewares are typed from their source file, so only the ones with a source in src/middlewares or
 * src/api are emitted. Bundled middlewares (strapi::*, admin::*, plugin::*) are left to the packages
 * themselves (Strapi.Registries.PackageMiddlewares), so registering application middlewares keeps
 * them accepted.
 *
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
 * Like JS policies (see the policies generator), JS middlewares are registered as `unknown` without
 * an import.
 * TODO @Nico with `allowJs`, a JSDoc-typed JS middleware could register its config like a TS one
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

  const sources = await collectAppSources(
    'middlewares',
    { global: strapi.dirs.app.middlewares, api: strapi.dirs.app.api },
    outDir,
    logger
  );
  const middlewaresDefinitions = filterRegisteredSources(sources, strapi.middlewares, logger);

  logger.debug(`Found ${middlewaresDefinitions.length} middlewares.`);

  if (middlewaresDefinitions.length === 0) {
    return { output: NO_MIDDLEWARE_PLACEHOLDER_COMMENT, stats: {} };
  }

  const output = await emitRegistryDefinitions(
    REGISTRY,
    generateConfigHelpersDefinition(),
    middlewaresDefinitions,
    (source) =>
      isTypedSource(source)
        ? factory.createTypeReferenceNode(CONFIG_HELPER, [typeofImport(source)])
        : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );

  return { output, stats: {} };
};
