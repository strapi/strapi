import { Core } from '@strapi/types';
import { DocumentAssemblerFactory } from './assemblers';
import { DocumentContextFactory } from './context';
import { OpenAPIGenerator } from './generator';
import type { OpenAPIGeneratorConfig } from './generator/generator';
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

export interface GenerationOptions {
  type: 'admin' | 'content-api';
}

export const createGenerator = (
  strapi: Core.Strapi,
  options?: GenerationOptions
): OpenAPIGenerator => {
  const { type = 'content-api' } = options ?? {};

  const config: OpenAPIGeneratorConfig = {
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

  return new OpenAPIGenerator(config, strapi, routeCollector, contextFactory);
};
