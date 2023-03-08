'use strict';

const {
  file: {
    providers: { createLocalFileDestinationProvider },
  },
  strapi: {
    providers: { createLocalStrapiSourceProvider },
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');

const { isObject, isString, isFinite, toNumber } = require('lodash/fp');
const fs = require('fs-extra');
const chalk = require('chalk');

const { TransferEngineTransferError } = require('@strapi/data-transfer').engine.errors;
const {
  getDefaultExportName,
  buildTransferTable,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
  formatDiagnostic,
  loadersFactory,
} = require('./utils');
const { exitWith } = require('../utils/helpers');
/**
 * @typedef ExportCommandOptions Options given to the CLI import command
 *
 * @property {string} [file] The file path to import
 * @property {boolean} [encrypt] Used to encrypt the final archive
 * @property {string} [key] Encryption key, only useful when encryption is enabled
 * @property {boolean} [compress] Used to compress the final archive
 */

const BYTES_IN_MB = 1024 * 1024;

/**
 * Export command.
 *
 * It transfers data from a local Strapi instance to a file
 *
 * @param {ExportCommandOptions} opts
 */
module.exports = async (opts) => {
  // Validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse command arguments');
  }

  const strapi = await createStrapiInstance();

  const source = createSourceProvider(strapi);
  const destination = createDestinationProvider(opts);

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore', // for an export to file, versionStrategy will always be skipped
    schemaStrategy: 'ignore', // for an export to file, schemaStrategy will always be skipped
    exclude: opts.exclude,
    only: opts.only,
    transforms: {
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
          filter(entity) {
            return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
          },
        },
      ],
    },
  });

  engine.diagnostics.onDiagnostic(formatDiagnostic('export'));

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

  const getTelemetryPayload = (/* payload */) => {
    return {
      eventProperties: {
        source: engine.sourceProvider.name,
        destination: engine.destinationProvider.name,
      },
    };
  };

  progress.on('transfer::start', async () => {
    console.log(`Starting export...`);
    await strapi.telemetry.send('didDEITSProcessStart', getTelemetryPayload());
  });

  let results;
  let outFile;
  try {
    results = await engine.transfer();
    outFile = results.destination.file.path;
    const outFileExists = await fs.pathExists(outFile);
    if (!outFileExists) {
      throw new TransferEngineTransferError(`Export file not created "${outFile}"`);
    }
  } catch {
    await strapi.telemetry.send('didDEITSProcessFail', getTelemetryPayload());
    exitWith(1, 'Export process failed.');
  }

  await strapi.telemetry.send('didDEITSProcessFinish', getTelemetryPayload());
  try {
    const table = buildTransferTable(results.engine);
    console.log(table.toString());
  } catch (e) {
    console.error('There was an error displaying the results of the transfer.');
  }

  console.log(`${chalk.bold('Export process has been completed successfully!')}`);
  exitWith(0, `Export archive is in ${chalk.green(outFile)}`);
};

/**
 * It creates a local strapi destination provider
 */
const createSourceProvider = (strapi) => {
  return createLocalStrapiSourceProvider({
    async getStrapi() {
      return strapi;
    },
  });
};

/**
 * It creates a local file destination provider based on the given options
 *
 * @param {ExportCommandOptions} opts
 */
const createDestinationProvider = (opts) => {
  const { file, compress, encrypt, key, maxSizeJsonl } = opts;

  const filepath = isString(file) && file.length > 0 ? file : getDefaultExportName();

  const maxSizeJsonlInMb = isFinite(toNumber(maxSizeJsonl))
    ? toNumber(maxSizeJsonl) * BYTES_IN_MB
    : undefined;

  return createLocalFileDestinationProvider({
    file: {
      path: filepath,
      maxSizeJsonl: maxSizeJsonlInMb,
    },
    encryption: {
      enabled: encrypt,
      key: encrypt ? key : undefined,
    },
    compression: {
      enabled: compress,
    },
  });
};
