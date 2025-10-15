import type { Core } from '@strapi/types';

import { DocumentAssemblerFactory } from './assemblers';
import { DocumentContextFactory } from './context';
import { OpenAPIGenerator } from './generator';
import { PostProcessorsFactory } from './post-processor';
import { PreProcessorFactory } from './pre-processor';
import {
  AdminRoutesProvider,
  ApiRoutesProvider,
  PluginRoutesProvider,
  RouteCollector,
  RouteMatcher,
  rules,
} from './routes';

import type { GenerationOptions } from './types';
import type { GeneratorOutput } from './generator';

/**
 * Generates an in-memory OpenAPI specification for Strapi routes.
 *
 * @experimental
 *
 * @param strapi - The Strapi application instance.
 * @param options - Optional configuration for the generation process.
 * @param options.type - The type of routes to generate documentation for, either 'admin' or 'content-api'.
 *                       Defaults to 'content-api'.
 * @returns An object containing the generated OpenAPI document and other relevant outputs.
 *
 * @example
 * ```typescript
 * import { generate } from '@strapi/openapi';
 *
 * // Assuming 'strapi' is your Strapi instance
 * const output = generate(strapi, { type: 'content-api' });
 * console.log(output.document);
 * ```
 *
 * @example
 * ```typescript
 * import { generate } from '@strapi/openapi';
 *
 * // Generate documentation for all route types (default)
 * const output = generate(strapi);
 * console.log(output.document);
 * ```
 */
export const generate = (strapi: Core.Strapi, options?: GenerationOptions): GeneratorOutput => {
  const { type = 'content-api' } = options ?? {};

  const config = {
    preProcessors: new PreProcessorFactory().createAll(),
    assemblers: new DocumentAssemblerFactory().createAll(),
    postProcessors: new PostProcessorsFactory().createAll(),
  };

  // Data sources for the Strapi routes
  const routeCollector = new RouteCollector(
    [
      new AdminRoutesProvider(strapi),
      new ApiRoutesProvider(strapi),
      new PluginRoutesProvider(strapi),
    ],

    new RouteMatcher([
      // Only match content-api routes
      rules.isOfType(type),
    ])
  );

  const contextFactory = new DocumentContextFactory();

  const generator = new OpenAPIGenerator(config, strapi, routeCollector, contextFactory);

  return generator.generate();
};

export type { GenerationOptions, GeneratorOutput };
