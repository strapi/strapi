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
 * @experimental
 */
export const generate = (strapi: Core.Strapi, options?: GenerationOptions): GeneratorOutput => {
  const { type = 'content-api' } = options ?? {};

  const config = {
    preProcessors: new PreProcessorFactory().createAll(),
    assemblers: new DocumentAssemblerFactory().createAll(),
    postProcessors: new PostProcessorsFactory().createAll(),
  };

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

export { GenerationOptions, GeneratorOutput };
