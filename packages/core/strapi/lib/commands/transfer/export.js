'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const { isObject, isString, isFinite, toNumber } = require('lodash/fp');
const fs = require('fs-extra');
const chalk = require('chalk');

const {
  getDefaultExportName,
  buildTransferTable,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
} = require('./utils');

/**
 * @typedef ImportCommandOptions Options given to the CLI import command
 *
 * @property {string} [file] The file path to import
 * @property {boolean} [encrypt] Used to encrypt the final archive
 * @property {string} [key] Encryption key, only useful when encryption is enabled
 * @property {boolean} [compress] Used to compress the final archive
 */

const logger = console;

const BYTES_IN_MB = 1024 * 1024;

/**
 * Import command.
 *
 * It transfers data from a local file to a local strapi instance
 *
 * @param {ImportCommandOptions} opts
 */
module.exports = async (opts) => {
  // Validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse command arguments');
    process.exit(1);
  }

  const strapi = await createStrapiInstance();

  const source = createSourceProvider(strapi);
  const destination = createDestinationProvider(opts);

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore', // for an export to file, versionStrategy will always be skipped
    schemaStrategy: 'ignore', // for an export to file, schemaStrategy will always be skipped
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

  let transferExitCode;
  logger.log(`Starting export...`);

  const progress = engine.progress.stream;

  const telemetryPayload = (/* payload */) => {
    return {
      eventProperties: {
        source: engine.sourceProvider.name,
        destination: engine.destinationProvider.name,
      },
    };
  };

  progress.on('transfer::start', async (payload) => {
    await strapi.telemetry.send('didDEITSProcessStart', telemetryPayload(payload));
  });

  progress.on('transfer::finish', async (payload) => {
    await strapi.telemetry.send('didDEITSProcessFinish', telemetryPayload(payload));
    transferExitCode = 0;
  });

  progress.on('transfer::error', async (payload) => {
    await strapi.telemetry.send('didDEITSProcessFail', telemetryPayload(payload));
    transferExitCode = 1;
  });

  try {
    const results = await engine.transfer();
    const outFile = results.destination.file.path;

    const table = buildTransferTable(results.engine);
    logger.log(table.toString());

    const outFileExists = await fs.pathExists(outFile);
    if (!outFileExists) {
      throw new Error(`Export file not created "${outFile}"`);
    }

    logger.log(`${chalk.bold('Export process has been completed successfully!')}`);
    logger.log(`Export archive is in ${chalk.green(outFile)}`);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }

  /*
   * We need to wait for the telemetry to finish before exiting the process.
   * The order of execution for the overall export function is:
   * - create providers and engine
   * - create progress callbacks
   * - await the engine transfer
   *   - having async calls inside, it allows the transfer::start to process
   * - the code block including the table printing executes
   * - *** any async code (for example, the fs.pathExists) after engine.transfer will execute next tick, therefore:
   * - the progress callbacks execute
   *
   * Because of that, we can't exit the process in the progress callbacks and instead have to wait for them to tell us it's safe to exit
   */
  const waitForExitCode = async (maxWait) => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      if (transferExitCode !== undefined) {
        process.exit(transferExitCode);
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }
    process.exit(0);
  };
  waitForExitCode(5000);
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
 * @param {ImportCommandOptions} opts
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
