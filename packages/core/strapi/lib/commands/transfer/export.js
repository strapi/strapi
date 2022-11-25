'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const { isObject, isString, isFinite } = require('lodash/fp');
const fs = require('fs-extra');

const chalk = require('chalk');
const strapi = require('../../index');
const { buildTransferTable, yyyymmddHHMMSS } = require('./util');

const getDefaultExportName = () => {
  return `export_${yyyymmddHHMMSS()}`;
};

const logger = console;

const BYTES_IN_MB = 1024 * 1024;

module.exports = async (opts) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }
  const filename = opts.file;

  /**
   * From local Strapi instance
   */
  const sourceOptions = {
    async getStrapi() {
      return strapi(await strapi.compile()).load();
    },
  };
  const source = createLocalStrapiSourceProvider(sourceOptions);

  const file = isString(filename) && filename.length > 0 ? filename : getDefaultExportName();

  /**
   * To a Strapi backup file
   */
  // treat any unknown arguments as filenames
  const destinationOptions = {
    file: {
      path: file,
      maxSize: isFinite(opts.maxSize) ? Math.floor(opts.maxSize) * BYTES_IN_MB : undefined,
      maxSizeJsonl: isFinite(opts.maxSizeJsonl)
        ? Math.floor(opts.maxSizeJsonl) * BYTES_IN_MB
        : undefined,
    },
    encryption: {
      enabled: opts.encrypt,
      key: opts.key,
    },
    compression: {
      enabled: opts.compress,
    },
  };
  const destination = createLocalFileDestinationProvider(destinationOptions);

  /**
   * Configure and run the transfer engine
   */
  const engineOptions = {
    strategy: 'restore', // for an export to file, strategy will always be 'restore'
    versionMatching: 'ignore', // for an export to file, versionMatching will always be skipped
    exclude: opts.exclude,
  };
  const engine = createTransferEngine(source, destination, engineOptions);

  try {
    logger.log(`Starting export...`);

    // eslint-disable-next-line no-unused-vars
    engine.progress.stream.on('start', ({ stage, data }) => {
      logger.log(`Starting transfer of ${stage}...`);
    });

    // engine.progress.stream.on('progress', ({ stage, data }) => {
    //   logger.log('progress', stage, data);
    // });

    // eslint-disable-next-line no-unused-vars
    engine.progress.stream.on('complete', ({ stage, data }) => {
      logger.log(`...${stage} complete`);
    });

    const results = await engine.transfer();
    const table = buildTransferTable(results.engine);
    logger.log(table.toString());

    if (!fs.pathExistsSync(results.destination.file.path)) {
      logger.log(file);
      throw new Error('Export file not created');
    }

    logger.log(`${chalk.bold('Export process has been completed successfully!')}`);
    logger.log(`Export archive is in ${chalk.green(results.destination.file.path)}`);
    process.exit(0);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }
};
