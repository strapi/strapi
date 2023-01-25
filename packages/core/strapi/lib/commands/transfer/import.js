'use strict';

const {
  providers: { createLocalFileSourceProvider },
} = require('@strapi/data-transfer/lib/file');
const {
  providers: { createLocalStrapiDestinationProvider, DEFAULT_CONFLICT_STRATEGY },
} = require('@strapi/data-transfer/lib/strapi');
const {
  createTransferEngine,
  DEFAULT_VERSION_STRATEGY,
  DEFAULT_SCHEMA_STRATEGY,
} = require('@strapi/data-transfer/lib/engine');

const { isObject } = require('lodash/fp');

const {
  buildTransferTable,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
  formatDiagnostic,
} = require('./utils');

/**
 * @typedef {import('@strapi/data-transfer').ILocalFileSourceProviderOptions} ILocalFileSourceProviderOptions
 */

const logger = console;

module.exports = async (opts) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }

  /**
   * From strapi backup file
   */
  const sourceOptions = getLocalFileSourceOptions(opts);

  const source = createLocalFileSourceProvider(sourceOptions);

  /**
   * To local Strapi instance
   */
  const strapiInstance = await createStrapiInstance();

  const destinationOptions = {
    async getStrapi() {
      return strapiInstance;
    },
    autoDestroy: false,
    strategy: opts.conflictStrategy || DEFAULT_CONFLICT_STRATEGY,
    restore: {
      entities: { exclude: DEFAULT_IGNORED_CONTENT_TYPES },
    },
  };
  const destination = createLocalStrapiDestinationProvider(destinationOptions);

  /**
   * Configure and run the transfer engine
   */
  const engineOptions = {
    versionStrategy: opts.versionStrategy || DEFAULT_VERSION_STRATEGY,
    schemaStrategy: opts.schemaStrategy || DEFAULT_SCHEMA_STRATEGY,
    exclude: opts.exclude,
    only: opts.only,
    rules: {
      links: [
        {
          filter(link) {
            return (
              !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.left.type) &&
              !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.right.type)
            );
          },
        },
      ],
      entities: [
        {
          filter: (entity) => !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type),
        },
      ],
    },
  };

  const engine = createTransferEngine(source, destination, engineOptions);

  engine.diagnostics.onDiagnostic(formatDiagnostic('import'));

  const progress = engine.progress.stream;
  const getTelemetryPayload = () => {
    return {
      eventProperties: {
        source: engine.sourceProvider.name,
        destination: engine.destinationProvider.name,
      },
    };
  };

  progress.on('transfer::start', async () => {
    logger.info('Starting import...');
    await strapiInstance.telemetry.send('didDEITSProcessStart', getTelemetryPayload());
  });

  try {
    const results = await engine.transfer();
    const table = buildTransferTable(results.engine);
    logger.info(table.toString());

    logger.info('Import process has been completed successfully!');
  } catch (e) {
    await strapiInstance.telemetry.send('didDEITSProcessFail', getTelemetryPayload());
    logger.error('Import process failed unexpectedly');
    logger.error(e);
    process.exit(1);
  }

  // Note: Telemetry can't be sent in a finish event, because it runs async after this block but we can't await it, so if process.exit is used it won't send
  await strapiInstance.telemetry.send('didDEITSProcessFinish', getTelemetryPayload());
  await strapiInstance.destroy();

  process.exit(0);
};

/**
 * Infer local file source provider options based on a given filename
 *
 * @param {{ file: string; key?: string }} opts
 *
 * @return {ILocalFileSourceProviderOptions}
 */
const getLocalFileSourceOptions = (opts) => {
  /**
   * @type {ILocalFileSourceProviderOptions}
   */
  const options = {
    file: { path: opts.file },
    compression: { enabled: !!opts.decompress },
    encryption: { enabled: !!opts.decrypt, key: opts.key },
  };

  return options;
};
