'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const _ = require('lodash/fp');
const Table = require('cli-table3');
const fs = require('fs-extra');
const chalk = require('chalk');

const strapi = require('../../index');
const { readableBytes } = require('../utils');

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

const getDefaultExportName = () => {
  return `export_${yyyymmddHHMMSS()}`;
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
    async getStrapi() {
      return strapi(await strapi.compile()).load();
    },
  };
  const source = createLocalStrapiSourceProvider(sourceOptions);

  const file = _.isString(filename) && filename.length > 0 ? filename : getDefaultExportName();

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
    strategy: 'restore', // for an export to file, strategy will always be 'restore'
    versionMatching: 'ignore', // for an export to file, versionMatching will always be skipped
    exclude: opts.exclude,
  };
  const engine = createTransferEngine(source, destination, engineOptions);

  try {
    let resultData = [];
    logger.log(`Starting export...`);

    engine.progress.stream.on('start', ({ stage }) => {
      logger.log(`Starting transfer of ${stage}...`);
    });

    // engine.progress.stream..on('progress', ({ stage, data }) => {
    //   logger.log('progress');
    // });

    engine.progress.stream.on('complete', ({ stage, data }) => {
      logger.log(`...${stage} complete`);
      resultData = data;
    });

    const results = await engine.transfer();

    // Build pretty table
    const table = new Table({
      head: ['Type', 'Count', 'Size'],
    });

    let totalBytes = 0;
    let totalItems = 0;
    Object.keys(resultData).forEach((key) => {
      const item = resultData[key];

      table.push([
        { hAlign: 'left', content: chalk.bold(key) },
        { hAlign: 'right', content: item.count },
        { hAlign: 'right', content: `${readableBytes(item.bytes, 1, 11)} ` },
      ]);
      totalBytes += item.bytes;
      totalItems += item.count;

      if (item.aggregates) {
        Object.keys(item.aggregates).forEach((subkey) => {
          const subitem = item.aggregates[subkey];

          table.push([
            { hAlign: 'left', content: `-- ${chalk.bold(subkey)}` },
            { hAlign: 'right', content: subitem.count },
            { hAlign: 'right', content: `(${chalk.grey(readableBytes(subitem.bytes, 1, 11))})` },
          ]);
        });
      }
    });
    table.push([
      { hAlign: 'left', content: chalk.bold.green('Total') },
      { hAlign: 'right', content: chalk.bold.green(totalItems) },
      { hAlign: 'right', content: `${chalk.bold.green(readableBytes(totalBytes, 1, 11))} ` },
    ]);
    logger.log(table.toString());

    // TODO: once archiving is implemented, we need to check file extensions
    if (!fs.pathExistsSync(results.destination.file.path)) {
      logger.log(file);
      throw new Error('Export file not created');
    }

    logger.log(`
${chalk.bold('Export process has been completed successfully!')}
Export archive is in ${chalk.green(results.destination.file.path)}
`);
    process.exit(0);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }
};
