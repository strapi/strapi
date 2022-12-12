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
 * @property {number} [maxSizeJsonl] Maximum size for each .jsonl file
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

  const source = createSourceProvider();
  const destination = createDestinationProvider(opts);

  const engine = createTransferEngine(source, destination, {
    strategy: 'restore', // for an export to file, strategy will always be 'restore'
    versionMatching: 'ignore', // for an export to file, versionMatching will always be skipped
    transforms: {
      entities: [
        {
          filter(entity) {
            return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
          },
        },
      ],
    },
  });

  try {
    logger.log(`Starting export...`);

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
    process.exit(0);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }
};

/**
 * It creates a local strapi destination provider
 */
const createSourceProvider = () => {
  let strapi = null;

  return createLocalStrapiSourceProvider({
    async getStrapi() {
      if (!strapi) {
        strapi = await createStrapiInstance();
      }

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
