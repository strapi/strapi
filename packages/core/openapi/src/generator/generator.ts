import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';

import type { Assembler } from '../assemblers';
import type { DocumentContextFactory } from '../context';
import type { PostProcessor } from '../post-processor';
import type { PreProcessor } from '../pre-processor';
import type { RouteCollector } from '../routes';
import type { DocumentContext } from '../types';

import type { GeneratorOptions, GeneratorOutput } from './types';

import { createDebugger } from '../utils';

const debug = createDebugger('generator');

export interface OpenAPIGeneratorConfig {
  preProcessors?: PreProcessor[];
  assemblers?: Assembler.Document[];
  postProcessors?: PostProcessor[];
}

export class OpenAPIGenerator {
  // Config
  private readonly _assemblers: Assembler.Document[];

  private readonly _preProcessors: PreProcessor[];

  private readonly _postProcessors: PostProcessor[];

  // Dependencies
  private readonly _strapi: Core.Strapi;

  private readonly _routeCollector: RouteCollector;

  // Factories
  private readonly _contextFactory: DocumentContextFactory;

  constructor(
    // Config
    config: OpenAPIGeneratorConfig,

    // Dependencies
    strapi: Core.Strapi,
    routeCollector: RouteCollector,

    // Factories
    contextFactory: DocumentContextFactory
  ) {
    // Config
    this._assemblers = config.assemblers ?? [];
    this._preProcessors = config.preProcessors ?? [];
    this._postProcessors = config.postProcessors ?? [];

    // Dependencies
    this._strapi = strapi;
    this._routeCollector = routeCollector;

    // Factories
    this._contextFactory = contextFactory;
  }

  generate(_options?: GeneratorOptions): GeneratorOutput {
    debug('generating a new OpenAPI document with the following options: %O', _options);

    const context = this._initContext(this._strapi);

    this
      // Init timers
      ._bootstrap(context)
      // Run registered pre-processors
      ._preProcess(context)
      // Run registered section assemblers
      ._assemble(context)
      // Run registered post-processors
      ._postProcess(context)
      // Clean up and set necessary properties
      ._finalize(context);

    const { data, stats } = context.output;

    return { document: data as OpenAPIV3_1.Document, durationMs: stats.time.elapsedTime };
  }

  private _initContext(strapi: Core.Strapi): DocumentContext {
    debug('collecting registered routes...');
    const routes = this._routeCollector.collect();

    debug('creating the initial document generation context...');
    return this._contextFactory.create({ strapi, routes });
  }

  private _bootstrap(context: DocumentContext) {
    const { timer } = context;

    timer.reset();

    const startedAt = timer.start();

    debug('started generation: %o', new Date(startedAt).toISOString());

    return this;
  }

  private _finalize(context: DocumentContext) {
    const { timer, output } = context;

    output.stats.time = timer.stop();

    const { endTime, elapsedTime } = output.stats.time;

    debug('completed generation: %O (elapsed: %Oms)', new Date(endTime).toISOString(), elapsedTime);

    return this;
  }

  private _preProcess(context: DocumentContext) {
    for (const preProcessor of this._preProcessors) {
      debug('running pre-processor: %s...', preProcessor.constructor.name);

      preProcessor.preProcess(context);
    }

    return this;
  }

  private _assemble(context: DocumentContext) {
    for (const assembler of this._assemblers) {
      debug('running assembler: %s...', assembler.constructor.name);

      assembler.assemble(context);
    }

    return this;
  }

  private _postProcess(context: DocumentContext) {
    for (const postProcessor of this._postProcessors) {
      debug('running post-processor: %s...', postProcessor.constructor.name);

      postProcessor.postProcess(context);
    }

    return this;
  }
}
