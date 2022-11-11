'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const _ = require('lodash/fp');

const fs = require('fs-extra');

const chalk = require('chalk');
const strapi = require('../../Strapi');

const pad = (n) => {
  return (n < 10 ? '0' : '') + String(n);
};

const yyyymmddHHMMSS = () => {
  const date = new Date();

  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

const getDefaultExportBackupName = () => {
  return `backup_${yyyymmddHHMMSS()}`;
};

const logger = console;

const BYTES_IN_MB = 1024 * 1024;

module.exports = async (filename, opts) => {
  // validate inputs from Commander
  if (!_.isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }
  /**
   * From local Strapi instance
   */
  const sourceOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const source = createLocalStrapiSourceProvider(sourceOptions);

  const file =
    _.isString(filename) && filename.length > 0 ? filename : getDefaultExportBackupName();

  /**
   * To a Strapi backup file
   */
  // treat any unknown arguments as filenames
  const destinationOptions = {
    file: {
      path: file,
      maxSize: _.isFinite(opts.maxSize) ? Math.floor(opts.maxSize) * BYTES_IN_MB : undefined,
      maxSizeJsonl: _.isFinite(opts.maxSizeJsonl)
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
    strategy: opts.conflictStrategy,
    versionMatching: opts.schemaComparison,
    exclude: opts.exclude,
  };
  const engine = createTransferEngine(source, destination, engineOptions);

  try {
    let resultData;
    console.log(`Starting export...`);
    engine.progressStream.on('data', ({ type, name, data }) => {
      if (type === 'complete') {
        // if (data[name]?.count) {
        //   console.log(`${chalk.green(name)}: ${data[name]?.count} items`);
        // }
        console.log(`.${name} complete`);
      } else if (type === 'start') {
        process.stdout.write(`Starting transfer of ${name}..`);
      } else if (type === 'progress') {
        // updated counts
        // console.log(`Updated ${type}`, data);
      } else {
        console.warn('unknown type/name', type, name);
      }
      resultData = data;
    });
    const results = await engine.transfer();
    console.table(resultData);
    // TODO: once archiving is implemented, we need to check file extensions
    if (!fs.pathExistsSync(file)) {
      logger.log(file);
      throw new Error('Export file not created');
    }
    logger.log(
      `Export process has been completed successfully! Export archive is in ${chalk.green(
        results.destination.file.path
      )}`
    );
    process.exit(0);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }
};
