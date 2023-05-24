import { PassThrough, Transform, Readable, Writable } from 'stream';
import { extname } from 'path';
import { EOL } from 'os';
import { isEmpty, uniq, last, isNumber, difference, omit, set } from 'lodash/fp';
import { diff as semverDiff } from 'semver';
import type { Schema } from '@strapi/strapi';
import * as utils from '../utils';

import type {
  IAsset,
  IDestinationProvider,
  IEntity,
  ILink,
  IMetadata,
  ISourceProvider,
  ITransferEngine,
  ITransferEngineOptions,
  TransferProgress,
  ITransferResults,
  TransferStage,
  TransferTransform,
  IProvider,
  TransferFilters,
  TransferFilterPreset,
  SchemaDiffHandler,
  SchemaDiffHandlerContext,
  SchemaMap,
} from '../../types';
import type { Diff } from '../utils/json';

import { compareSchemas, validateProvider } from './validation';
import { filter, map } from '../utils/stream';

import { TransferEngineError, TransferEngineValidationError } from './errors';
import {
  createDiagnosticReporter,
  IDiagnosticReporter,
  ErrorDiagnosticSeverity,
} from './diagnostic';
import { DataTransferError } from '../errors';
import { runMiddleware } from '../utils/middleware';

export const TRANSFER_STAGES: ReadonlyArray<TransferStage> = Object.freeze([
  'entities',
  'links',
  'assets',
  'schemas',
  'configuration',
]);

export type TransferGroupFilter = Record<TransferFilterPreset, TransferFilters>;

/**
 * Preset filters for only/exclude options
 * */
export const TransferGroupPresets: TransferGroupFilter = {
  content: {
    links: true, // Example: content includes the entire links stage
    entities: true,
    // TODO: If we need to implement filtering on a running stage, it would be done like this, but we still need to implement it
    // [
    //   // Example: content processes the entities stage, but filters individual entities
    //   {
    //     filter(data) {
    //       return shouldIncludeThisData(data);
    //     },
    //   },
    // ],
  },
  files: {
    assets: true,
    links: true,
  },
  config: {
    configuration: true,
  },
};

export const DEFAULT_VERSION_STRATEGY = 'ignore';
export const DEFAULT_SCHEMA_STRATEGY = 'strict';

/**
 * Transfer Engine Class
 */
class TransferEngine<
  S extends ISourceProvider = ISourceProvider,
  D extends IDestinationProvider = IDestinationProvider
> implements ITransferEngine
{
  sourceProvider: ISourceProvider;

  destinationProvider: IDestinationProvider;

  options: ITransferEngineOptions;

  #metadata: { source?: IMetadata; destination?: IMetadata } = {};

  #schema: { source?: SchemaMap; destination?: SchemaMap } = {};

  // Progress of the current stage
  progress: {
    // metrics on the progress such as size and record count
    data: TransferProgress;
    // stream that emits events
    stream: PassThrough;
  };

  diagnostics: IDiagnosticReporter;

  #handlers: {
    schemaDiff: SchemaDiffHandler[];
  } = {
    schemaDiff: [],
  };

  onSchemaDiff(handler: SchemaDiffHandler) {
    this.#handlers?.schemaDiff?.push(handler);
  }

  // Save the currently open stream so that we can access it at any time
  #currentStream?: Writable;

  constructor(sourceProvider: S, destinationProvider: D, options: ITransferEngineOptions) {
    this.diagnostics = createDiagnosticReporter();

    validateProvider('source', sourceProvider);
    validateProvider('destination', destinationProvider);

    this.sourceProvider = sourceProvider;
    this.destinationProvider = destinationProvider;
    this.options = options;

    this.progress = { data: {}, stream: new PassThrough({ objectMode: true }) };
  }

  /**
   * Report a fatal error and throw it
   */
  panic(error: Error) {
    this.reportError(error, 'fatal');

    throw error;
  }

  /**
   * Report an error diagnostic
   */
  reportError(error: Error, severity: ErrorDiagnosticSeverity) {
    this.diagnostics.report({
      kind: 'error',
      details: {
        severity,
        createdAt: new Date(),
        name: error.name,
        message: error.message,
        error,
      },
    });
  }

  /**
   * Report a warning diagnostic
   */
  reportWarning(message: string, origin?: string) {
    this.diagnostics.report({
      kind: 'warning',
      details: { createdAt: new Date(), message, origin },
    });
  }

  /**
   * Report an info diagnostic
   */
  reportInfo(message: string, params?: unknown) {
    this.diagnostics.report({
      kind: 'info',
      details: { createdAt: new Date(), message, params },
    });
  }

  /**
   * Create and return a transform stream based on the given stage and options.
   *
   * Allowed transformations includes 'filter' and 'map'.
   */
  #createStageTransformStream<T extends TransferStage>(
    key: T,
    options: { includeGlobal?: boolean } = {}
  ): PassThrough | Transform {
    const { includeGlobal = true } = options;
    const { throttle } = this.options;
    const { global: globalTransforms, [key]: stageTransforms } = this.options?.transforms ?? {};

    let stream = new PassThrough({ objectMode: true });

    const applyTransforms = <U>(transforms: TransferTransform<U>[] = []) => {
      for (const transform of transforms) {
        if ('filter' in transform) {
          stream = stream.pipe(filter(transform.filter));
        }

        if ('map' in transform) {
          stream = stream.pipe(map(transform.map));
        }
      }
    };

    if (includeGlobal) {
      applyTransforms(globalTransforms);
    }

    if (isNumber(throttle) && throttle > 0) {
      stream = stream.pipe(
        new PassThrough({
          objectMode: true,
          async transform(data, _encoding, callback) {
            await new Promise((resolve) => {
              setTimeout(resolve, throttle);
            });
            callback(null, data);
          },
        })
      );
    }

    applyTransforms(stageTransforms as TransferTransform<unknown>[]);

    return stream;
  }

  /**
   * Update the Engine's transfer progress data for a given stage.
   *
   * Providing aggregate options enable custom computation to get the size (bytes) or the aggregate key associated with the data
   */
  #updateTransferProgress<T = unknown>(
    stage: TransferStage,
    data: T,
    aggregate?: {
      size?: (value: T) => number;
      key?: (value: T) => string;
    }
  ) {
    if (!this.progress.data[stage]) {
      this.progress.data[stage] = { count: 0, bytes: 0, startTime: Date.now() };
    }

    const stageProgress = this.progress.data[stage];

    if (!stageProgress) {
      return;
    }

    const size = aggregate?.size?.(data) ?? JSON.stringify(data).length;
    const key = aggregate?.key?.(data);

    stageProgress.count += 1;
    stageProgress.bytes += size;

    // Handle aggregate updates if necessary
    if (key) {
      if (!stageProgress.aggregates) {
        stageProgress.aggregates = {};
      }

      const { aggregates } = stageProgress;

      if (!aggregates[key]) {
        aggregates[key] = { count: 0, bytes: 0 };
      }

      aggregates[key].count += 1;
      aggregates[key].bytes += size;
    }
  }

  /**
   * Create and return a PassThrough stream.
   *
   * Upon writing data into it, it'll update the Engine's transfer progress data and trigger stage update events.
   */
  #progressTracker(
    stage: TransferStage,
    aggregate?: {
      size?(value: unknown): number;
      key?(value: unknown): string;
    }
  ) {
    return new PassThrough({
      objectMode: true,
      transform: (data, _encoding, callback) => {
        this.#updateTransferProgress(stage, data, aggregate);
        this.#emitStageUpdate('progress', stage);
        callback(null, data);
      },
    });
  }

  /**
   * Shorthand method used to trigger transfer update events to every listeners
   */
  #emitTransferUpdate(type: 'init' | 'start' | 'finish' | 'error', payload?: object) {
    this.progress.stream.emit(`transfer::${type}`, payload);
  }

  /**
   * Shorthand method used to trigger stage update events to every listeners
   */
  #emitStageUpdate(
    type: 'start' | 'finish' | 'progress' | 'skip' | 'error',
    transferStage: TransferStage
  ) {
    this.progress.stream.emit(`stage::${type}`, {
      data: this.progress.data,
      stage: transferStage,
    });
  }

  /**
   * Run a version check between two strapi version (source and destination) using the strategy given to the engine during initialization.
   *
   * If there is a mismatch, throws a validation error.
   */
  #assertStrapiVersionIntegrity(sourceVersion?: string, destinationVersion?: string) {
    const strategy = this.options.versionStrategy || DEFAULT_VERSION_STRATEGY;

    const reject = () => {
      throw new TransferEngineValidationError(
        `The source and destination provide are targeting incompatible Strapi versions (using the "${strategy}" strategy). The source (${this.sourceProvider.name}) version is ${sourceVersion} and the destination (${this.destinationProvider.name}) version is ${destinationVersion}`,
        {
          check: 'strapi.version',
          strategy,
          versions: { source: sourceVersion, destination: destinationVersion },
        }
      );
    };

    if (
      !sourceVersion ||
      !destinationVersion ||
      strategy === 'ignore' ||
      destinationVersion === sourceVersion
    ) {
      return;
    }

    let diff;
    try {
      diff = semverDiff(sourceVersion, destinationVersion);
    } catch {
      reject();
    }

    if (!diff) {
      return;
    }

    const validPatch = ['prelease', 'build'];
    const validMinor = [...validPatch, 'patch', 'prepatch'];
    const validMajor = [...validMinor, 'minor', 'preminor'];
    if (strategy === 'patch' && validPatch.includes(diff)) {
      return;
    }
    if (strategy === 'minor' && validMinor.includes(diff)) {
      return;
    }
    if (strategy === 'major' && validMajor.includes(diff)) {
      return;
    }

    reject();
  }

  /**
   * Run a check between two set of schemas (source and destination) using the strategy given to the engine during initialization.
   *
   * If there are differences and/or incompatibilities between source and destination schemas, then throw a validation error.
   */
  #assertSchemasMatching(sourceSchemas: SchemaMap, destinationSchemas: SchemaMap) {
    const strategy = this.options.schemaStrategy || DEFAULT_SCHEMA_STRATEGY;

    if (strategy === 'ignore') {
      return;
    }

    const keys = uniq(Object.keys(sourceSchemas).concat(Object.keys(destinationSchemas)));
    const diffs: { [key: string]: Diff[] } = {};

    keys.forEach((key) => {
      const sourceSchema = sourceSchemas[key];
      const destinationSchema = destinationSchemas[key];
      const schemaDiffs = compareSchemas(sourceSchema, destinationSchema, strategy);

      if (schemaDiffs.length) {
        diffs[key] = schemaDiffs as Diff<Schema>[];
      }
    });

    if (!isEmpty(diffs)) {
      const formattedDiffs = Object.entries(diffs)
        .map(([uid, ctDiffs]) => {
          let msg = `- ${uid}:${EOL}`;

          msg += ctDiffs
            .sort((a, b) => (a.kind > b.kind ? -1 : 1))
            .map((diff) => {
              const path = diff.path.join('.');

              if (diff.kind === 'added') {
                return `${path} exists in destination schema but not in source schema and the data will not be transferred.`;
              }

              if (diff.kind === 'deleted') {
                return `${path} exists in source schema but not in destination schema and the data will not be transferred.`;
              }

              if (diff.kind === 'modified') {
                if (diff.types[0] === diff.types[1]) {
                  return `Schema value changed at "${path}": "${diff.values[0]}" (${diff.types[0]}) => "${diff.values[1]}" (${diff.types[1]})`;
                }

                return `Schema has differing data types at "${path}": "${diff.values[0]}" (${diff.types[0]}) => "${diff.values[1]}" (${diff.types[1]})`;
              }

              throw new TransferEngineValidationError(`Invalid diff found for "${uid}"`, {
                check: `schema on ${uid}`,
              });
            })
            .map((line) => `  - ${line}`)
            .join(EOL);

          return msg;
        })
        .join(EOL);

      throw new TransferEngineValidationError(
        `Invalid schema changes detected during integrity checks (using the ${strategy} strategy). Please find a summary of the changes below:\n${formattedDiffs}`,
        {
          check: 'schema.changes',
          strategy,
          diffs,
        }
      );
    }
  }

  shouldSkipStage(stage: TransferStage) {
    const { exclude, only } = this.options;

    // schemas must always be included
    if (stage === 'schemas') {
      return false;
    }

    // everything is included by default unless 'only' has been set
    let included = isEmpty(only);
    if (only?.length > 0) {
      included = only.some((transferGroup) => {
        return TransferGroupPresets[transferGroup][stage];
      });
    }

    if (exclude?.length > 0) {
      if (included) {
        included = !exclude.some((transferGroup) => {
          return TransferGroupPresets[transferGroup][stage];
        });
      }
    }

    return !included;
  }

  async #transferStage(options: {
    stage: TransferStage;
    source?: Readable;
    destination?: Writable;
    transform?: PassThrough;
    tracker?: PassThrough;
  }) {
    const { stage, source, destination, transform, tracker } = options;

    const updateEndTime = () => {
      const stageData = this.progress.data[stage];

      if (stageData) {
        stageData.endTime = Date.now();
      }
    };

    if (!source || !destination || this.shouldSkipStage(stage)) {
      // Wait until source and destination are closed
      const results = await Promise.allSettled(
        [source, destination].map((stream) => {
          // if stream is undefined or already closed, resolve immediately
          if (!stream || stream.destroyed) {
            return Promise.resolve();
          }

          // Wait until the close event is produced and then destroy the stream and resolve
          return new Promise((resolve, reject) => {
            stream.on('close', resolve).on('error', reject).destroy();
          });
        })
      );

      results.forEach((state) => {
        if (state.status === 'rejected') {
          this.reportWarning(state.reason, `transfer(${stage})`);
        }
      });

      this.#emitStageUpdate('skip', stage);

      return;
    }

    this.#emitStageUpdate('start', stage);

    await new Promise<void>((resolve, reject) => {
      let stream: Readable = source;

      if (transform) {
        stream = stream.pipe(transform);
      }

      if (tracker) {
        stream = stream.pipe(tracker);
      }

      this.#currentStream = stream
        .pipe(destination)
        .on('error', (e) => {
          updateEndTime();
          this.#emitStageUpdate('error', stage);
          this.reportError(e, 'error');
          destination.destroy(e);
          reject(e);
        })
        .on('close', () => {
          this.#currentStream = undefined;
          updateEndTime();
          resolve();
        });
    });

    this.#emitStageUpdate('finish', stage);
  }

  // Cause an ongoing transfer to abort gracefully
  async abortTransfer(): Promise<void> {
    const err = new TransferEngineError('fatal', 'Transfer aborted.');
    if (!this.#currentStream) {
      throw err;
    }
    this.#currentStream.destroy(err);
  }

  async init(): Promise<void> {
    // Resolve providers' resource and store
    // them in the engine's internal state
    await this.#resolveProviderResource();

    // Update the destination provider's source metadata
    const { source: sourceMetadata } = this.#metadata;

    if (sourceMetadata) {
      this.destinationProvider.setMetadata?.('source', sourceMetadata);
    }
  }

  /**
   * Run the bootstrap method in both source and destination providers
   */
  async bootstrap(): Promise<void> {
    const results = await Promise.allSettled([
      this.sourceProvider.bootstrap?.(),
      this.destinationProvider.bootstrap?.(),
    ]);

    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.panic(result.reason);
      }
    });
  }

  /**
   * Run the close method in both source and destination providers
   */
  async close(): Promise<void> {
    const results = await Promise.allSettled([
      this.sourceProvider.close?.(),
      this.destinationProvider.close?.(),
    ]);

    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.panic(result.reason);
      }
    });
  }

  async #resolveProviderResource() {
    const sourceMetadata = await this.sourceProvider.getMetadata();
    const destinationMetadata = await this.destinationProvider.getMetadata();

    if (sourceMetadata) {
      this.#metadata.source = sourceMetadata;
    }

    if (destinationMetadata) {
      this.#metadata.destination = destinationMetadata;
    }
  }

  async #getSchemas() {
    if (!this.#schema.source) {
      this.#schema.source = (await this.sourceProvider.getSchemas?.()) as SchemaMap;
    }

    if (!this.#schema.destination) {
      this.#schema.destination = (await this.destinationProvider.getSchemas?.()) as SchemaMap;
    }

    return {
      sourceSchema: this.#schema.source,
      destinationSchema: this.#schema.destination,
    };
  }

  async integrityCheck() {
    const sourceMetadata = await this.sourceProvider.getMetadata();
    const destinationMetadata = await this.destinationProvider.getMetadata();

    if (sourceMetadata && destinationMetadata) {
      this.#assertStrapiVersionIntegrity(
        sourceMetadata?.strapi?.version,
        destinationMetadata?.strapi?.version
      );
    }

    const { sourceSchema, destinationSchema } = await this.#getSchemas();

    try {
      if (sourceSchema && destinationSchema) {
        this.#assertSchemasMatching(sourceSchema, destinationSchema);
      }
    } catch (error) {
      // if this is a schema matching error, allow handlers to resolve it
      if (error instanceof TransferEngineValidationError && error.details?.details?.diffs) {
        const schemaDiffs = error.details?.details?.diffs as Record<string, Diff[]>;

        const context: SchemaDiffHandlerContext = {
          ignoredDiffs: {},
          diffs: schemaDiffs,
          source: this.sourceProvider,
          destination: this.destinationProvider,
        };

        // if we don't have any handlers, throw the original error
        if (isEmpty(this.#handlers.schemaDiff)) {
          throw error;
        }

        await runMiddleware<SchemaDiffHandlerContext>(context, this.#handlers.schemaDiff);

        // if there are any remaining diffs that weren't ignored
        const unresolvedDiffs = utils.json.diff(context.diffs, context.ignoredDiffs);
        if (unresolvedDiffs.length) {
          this.panic(
            new TransferEngineValidationError('Unresolved differences in schema', {
              check: 'schema.changes',
              unresolvedDiffs,
            })
          );
        }

        return;
      }

      throw error;
    }
  }

  async transfer(): Promise<ITransferResults<S, D>> {
    // reset data between transfers
    this.progress.data = {};

    try {
      this.#emitTransferUpdate('init');
      await this.bootstrap();
      await this.init();

      await this.integrityCheck();

      this.#emitTransferUpdate('start');

      await this.beforeTransfer();

      // Run the transfer stages
      await this.transferSchemas();
      await this.transferEntities();
      await this.transferAssets();
      await this.transferLinks();
      await this.transferConfiguration();
      // Gracefully close the providers
      await this.close();

      this.#emitTransferUpdate('finish');
    } catch (e: unknown) {
      this.#emitTransferUpdate('error', { error: e });

      const lastDiagnostic = last(this.diagnostics.stack.items);
      // Do not report an error diagnostic if the last one reported the same error
      if (
        e instanceof Error &&
        (!lastDiagnostic || lastDiagnostic.kind !== 'error' || lastDiagnostic.details.error !== e)
      ) {
        this.reportError(e, (e as DataTransferError).severity || 'fatal');
      }

      // Rollback the destination provider if an exception is thrown during the transfer
      // Note: This will be configurable in the future
      await this.destinationProvider.rollback?.(e as Error);

      throw e;
    }

    return {
      source: this.sourceProvider.results,
      destination: this.destinationProvider.results,
      engine: this.progress.data,
    };
  }

  async beforeTransfer(): Promise<void> {
    const runWithDiagnostic = async (provider: IProvider) => {
      try {
        await provider.beforeTransfer?.();
      } catch (error) {
        // Error happening during the before transfer step should be considered fatal errors
        if (error instanceof Error) {
          this.panic(error);
        } else {
          this.panic(
            new Error(`Unknwon error when executing "beforeTransfer" on the ${origin} provider`)
          );
        }
      }
    };

    await runWithDiagnostic(this.sourceProvider);
    await runWithDiagnostic(this.destinationProvider);
  }

  async transferSchemas(): Promise<void> {
    const stage: TransferStage = 'schemas';

    const source = await this.sourceProvider.createSchemasReadStream?.();
    const destination = await this.destinationProvider.createSchemasWriteStream?.();

    const transform = this.#createStageTransformStream(stage);
    const tracker = this.#progressTracker(stage, { key: (value: Schema) => value.modelType });

    await this.#transferStage({ stage, source, destination, transform, tracker });
  }

  async transferEntities(): Promise<void> {
    const stage: TransferStage = 'entities';

    const source = await this.sourceProvider.createEntitiesReadStream?.();
    const destination = await this.destinationProvider.createEntitiesWriteStream?.();

    const transform = this.#createStageTransformStream(stage).pipe(
      new Transform({
        objectMode: true,
        transform: async (entity: IEntity, _encoding, callback) => {
          const { destinationSchema: schemas } = await this.#getSchemas();

          if (!schemas) {
            return callback(null, entity);
          }

          // TODO: this would be safer if we only ignored things in ignoredDiffs, otherwise continue and let an error be thrown
          const availableContentTypes = Object.entries(schemas)
            .filter(([, schema]) => schema.modelType === 'contentType')
            .map(([uid]) => uid);

          // If the type of the transferred entity doesn't exist in the destination, then discard it
          if (!availableContentTypes.includes(entity.type)) {
            return callback(null, undefined);
          }

          const { type, data } = entity;
          const attributes = (schemas[type] as Record<string, unknown>).attributes as object;

          const attributesToRemove = difference(Object.keys(data), Object.keys(attributes));
          const updatedEntity = set('data', omit(attributesToRemove, data), entity);

          callback(null, updatedEntity);
        },
      })
    );
    const tracker = this.#progressTracker(stage, { key: (value: IEntity) => value.type });

    await this.#transferStage({ stage, source, destination, transform, tracker });
  }

  async transferLinks(): Promise<void> {
    const stage: TransferStage = 'links';

    const source = await this.sourceProvider.createLinksReadStream?.();
    const destination = await this.destinationProvider.createLinksWriteStream?.();

    const transform = this.#createStageTransformStream(stage).pipe(
      new Transform({
        objectMode: true,
        transform: async (link: ILink, _encoding, callback) => {
          const { destinationSchema: schemas } = await this.#getSchemas();

          if (!schemas) {
            return callback(null, link);
          }

          // TODO: this would be safer if we only ignored things in ignoredDiffs, otherwise continue and let an error be thrown
          const availableContentTypes = Object.entries(schemas)
            .filter(([, schema]) => schema.modelType === 'contentType')
            .map(([uid]) => uid);

          const isValidType = (uid: string) => availableContentTypes.includes(uid);

          if (!isValidType(link.left.type) || !isValidType(link.right.type)) {
            return callback(null, undefined); // ignore the link
          }

          callback(null, link);
        },
      })
    );

    const tracker = this.#progressTracker(stage);

    await this.#transferStage({ stage, source, destination, transform, tracker });
  }

  async transferAssets(): Promise<void> {
    const stage: TransferStage = 'assets';
    if (this.shouldSkipStage(stage)) {
      return;
    }

    const source = await this.sourceProvider.createAssetsReadStream?.();
    const destination = await this.destinationProvider.createAssetsWriteStream?.();

    const transform = this.#createStageTransformStream(stage);
    const tracker = this.#progressTracker(stage, {
      size: (value: IAsset) => value.stats.size,
      key: (value: IAsset) => extname(value.filename) || 'No extension',
    });

    await this.#transferStage({ stage, source, destination, transform, tracker });
  }

  async transferConfiguration(): Promise<void> {
    const stage: TransferStage = 'configuration';

    const source = await this.sourceProvider.createConfigurationReadStream?.();
    const destination = await this.destinationProvider.createConfigurationWriteStream?.();

    const transform = this.#createStageTransformStream(stage);
    const tracker = this.#progressTracker(stage);

    await this.#transferStage({ stage, source, destination, transform, tracker });
  }
}

export const createTransferEngine = <S extends ISourceProvider, D extends IDestinationProvider>(
  sourceProvider: S,
  destinationProvider: D,
  options: ITransferEngineOptions
): TransferEngine<S, D> => {
  return new TransferEngine<S, D>(sourceProvider, destinationProvider, options);
};

export * as errors from './errors';
