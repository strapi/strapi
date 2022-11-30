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
      const appContext = await strapi.compile();
      const app = strapi(appContext);

      app.log.level = 'error';

      return app.load();
    },
  };
  const source = createLocalStrapiSourceProvider(sourceOptions);

  const file = isString(filename) && filename.length > 0 ? filename : getDefaultExportName();

  /**
   * To a Strapi backup file
   */
  const maxSize = _.isFinite(_.toNumber(opts.maxSize))
    ? _.toNumber(opts.maxSize) * BYTES_IN_MB
    : undefined;

  const maxSizeJsonl = _.isFinite(_.toNumber(opts.maxSizeJsonl))
    ? _.toNumber(opts.maxSizeJsonl) * BYTES_IN_MB
    : undefined;

  const destinationOptions = {
    file: {
      path: file,
      maxSize,
      maxSizeJsonl,
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

    engine.progress.stream.on('complete', ({ data }) => {
      resultData = data;
    });

    const results = await engine.transfer();

    // Build pretty table
    const table = new Table({
      head: ['Type', 'Count', 'Size'].map((text) => chalk.bold.blue(text)),
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
