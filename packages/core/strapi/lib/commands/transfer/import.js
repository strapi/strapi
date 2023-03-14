'use strict';

const {
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createLocalStrapiDestinationProvider, DEFAULT_CONFLICT_STRATEGY },
  },
  engine: { createTransferEngine, DEFAULT_VERSION_STRATEGY, DEFAULT_SCHEMA_STRATEGY },
} = require('@strapi/data-transfer');

const { isObject } = require('lodash/fp');

const {
  buildTransferTable,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
  formatDiagnostic,
  loadersFactory,
  exitMessageText,
  abortTransfer,
} = require('./utils');
const { exitWith } = require('../utils/helpers');

/**
 * @typedef {import('@strapi/data-transfer/src/file/providers').ILocalFileSourceProviderOptions} ILocalFileSourceProviderOptions
 */

/**
 * @typedef ImportCommandOptions Options given to the CLI import command
 *
 * @property {string} [file] The file path to import
 * @property {string} [key] Encryption key, used when encryption is enabled
 * @property {(keyof import('@strapi/data-transfer/src/engine').TransferGroupFilter)[]} [only] If present, only include these filtered groups of data
 * @property {(keyof import('@strapi/data-transfer/src/engine').TransferGroupFilter)[]} [exclude] If present, exclude these filtered groups of data
 * @property {number|undefined} [throttle] Delay in ms after each record
 */

/**
 * Import command.
 *
 * It transfers data from a file to a local Strapi instance
 *
 * @param {ImportCommandOptions} opts
 */
module.exports = async (opts) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse arguments');
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
    throttle: opts.throttle,
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

  const { updateLoader } = loadersFactory();

  progress.on(`stage::start`, ({ stage, data }) => {
    updateLoader(stage, data).start();
  });

  progress.on('stage::finish', ({ stage, data }) => {
    updateLoader(stage, data).succeed();
  });

  progress.on('stage::progress', ({ stage, data }) => {
    updateLoader(stage, data);
  });

  const getTelemetryPayload = () => {
    return {
      eventProperties: {
        source: engine.sourceProvider.name,
        destination: engine.destinationProvider.name,
      },
    };
  };

  progress.on('transfer::start', async () => {
    console.log('Starting import...');
    await strapiInstance.telemetry.send('didDEITSProcessStart', getTelemetryPayload());
  });

  let results;
  try {
    // Abort transfer if user interrupts process
    ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
      process.removeAllListeners(signal);
      process.on(signal, () => abortTransfer({ engine, strapi }));
    });

    results = await engine.transfer();
  } catch (e) {
    await strapiInstance.telemetry.send('didDEITSProcessFail', getTelemetryPayload());
    exitWith(1, exitMessageText('import', true));
  }

  try {
    const table = buildTransferTable(results.engine);
    console.log(table.toString());
  } catch (e) {
    console.error('There was an error displaying the results of the transfer.');
  }

  await strapiInstance.telemetry.send('didDEITSProcessFinish', getTelemetryPayload());
  await strapiInstance.destroy();

  exitWith(0, exitMessageText('import'));
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
